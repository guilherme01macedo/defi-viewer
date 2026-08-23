import { useReducer } from 'react'
import type { Pool, TokenId, Wallet } from '../sim/pool'
import {
  addLiquidity,
  createPool,
  matchingGoldAmount,
  removeLiquidity,
  swap,
} from '../sim/pool'

// Counters the chapter system reads to detect "the user did the thing".
export interface SimStats {
  userSwapCount: number
  liquidityAddCount: number
  traderSwapCount: number
  priceShockCount: number
  feesCollected: { GEM: number; GOLD: number }
}

// A state transition the scene can animate: what flowed, and where.
// The state alone cannot say "25 GOLD arrived from a trader" — events can.
export type FlowKind = 'userSwap' | 'traderSwap' | 'shock' | 'add' | 'remove'

export interface FlowEvent {
  id: number
  kind: FlowKind
  tokenIn?: TokenId
  amountIn?: number
  amountOut?: number
  gem?: number
  gold?: number
  visitId?: number
}

// Everything the app remembers. `entry` records what the user put in,
// so the HUD can compare the LP position against simply holding.
// `userFees` is the user's pro-rata cut of every fee paid while they
// held shares; it resets with `entry` on withdrawal.
export interface SimState {
  pool: Pool
  wallet: Wallet
  entry: { gem: number; gold: number } | null
  userFees: { GEM: number; GOLD: number }
  stats: SimStats
  events: FlowEvent[]
  nextEventId: number
}

export type SimAction =
  | { type: 'userSwap'; tokenIn: TokenId; amountIn: number }
  | { type: 'traderSwap'; tokenIn: TokenId; amountIn: number; visitId?: number }
  | { type: 'priceShock'; visitId?: number }
  | { type: 'addLiquidity'; gemAmount: number }
  | { type: 'removeAll' }

export const initialSim: SimState = {
  pool: createPool(1000, 1000),
  wallet: { GEM: 500, GOLD: 500, shares: 0 },
  entry: null,
  userFees: { GEM: 0, GOLD: 0 },
  stats: {
    userSwapCount: 0,
    liquidityAddCount: 0,
    traderSwapCount: 0,
    priceShockCount: 0,
    feesCollected: { GEM: 0, GOLD: 0 },
  },
  events: [],
  nextEventId: 1,
}

function pushEvent(
  state: SimState,
  event: Omit<FlowEvent, 'id'>,
): Pick<SimState, 'events' | 'nextEventId'> {
  return {
    events: [...state.events, { ...event, id: state.nextEventId }].slice(-10),
    nextEventId: state.nextEventId + 1,
  }
}

// The user's cut of one fee, credited at the moment the fee is paid.
// Swaps never change share counts, so the pre-swap fraction is exact.
function creditUserFees(
  state: SimState,
  tokenIn: TokenId,
  feePaid: number,
): SimState['userFees'] {
  if (state.wallet.shares === 0) return state.userFees
  const cut = feePaid * (state.wallet.shares / state.pool.totalShares)
  return {
    ...state.userFees,
    [tokenIn]: state.userFees[tokenIn] + cut,
  }
}

function collectFee(
  stats: SimStats,
  tokenIn: TokenId,
  feePaid: number,
): SimStats['feesCollected'] {
  return {
    ...stats.feesCollected,
    [tokenIn]: stats.feesCollected[tokenIn] + feePaid,
  }
}

export function simReducer(state: SimState, action: SimAction): SimState {
  switch (action.type) {
    case 'userSwap': {
      if (state.wallet[action.tokenIn] < action.amountIn) return state
      const result = swap(state.pool, action.tokenIn, action.amountIn)
      const wallet = { ...state.wallet }
      wallet[action.tokenIn] -= action.amountIn
      wallet[action.tokenIn === 'GEM' ? 'GOLD' : 'GEM'] += result.amountOut
      return {
        ...state,
        pool: result.pool,
        wallet,
        userFees: creditUserFees(state, action.tokenIn, result.feePaid),
        stats: {
          ...state.stats,
          userSwapCount: state.stats.userSwapCount + 1,
          feesCollected: collectFee(state.stats, action.tokenIn, result.feePaid),
        },
        ...pushEvent(state, {
          kind: 'userSwap',
          tokenIn: action.tokenIn,
          amountIn: action.amountIn,
          amountOut: result.amountOut,
        }),
      }
    }
    case 'traderSwap': {
      // Anonymous traders swap against the pool; their wallets are not tracked.
      const result = swap(state.pool, action.tokenIn, action.amountIn)
      return {
        ...state,
        pool: result.pool,
        userFees: creditUserFees(state, action.tokenIn, result.feePaid),
        stats: {
          ...state.stats,
          traderSwapCount: state.stats.traderSwapCount + 1,
          feesCollected: collectFee(state.stats, action.tokenIn, result.feePaid),
        },
        ...pushEvent(state, {
          kind: 'traderSwap',
          tokenIn: action.tokenIn,
          amountIn: action.amountIn,
          amountOut: result.amountOut,
          visitId: action.visitId,
        }),
      }
    }
    case 'priceShock': {
      // A whale trade: large enough to visibly bend the price.
      const tokenIn: TokenId =
        state.stats.priceShockCount % 2 === 0 ? 'GOLD' : 'GEM'
      const amountIn = state.pool.reserves[tokenIn] * 0.45
      const result = swap(state.pool, tokenIn, amountIn)
      return {
        ...state,
        pool: result.pool,
        userFees: creditUserFees(state, tokenIn, result.feePaid),
        stats: {
          ...state.stats,
          priceShockCount: state.stats.priceShockCount + 1,
          feesCollected: collectFee(state.stats, tokenIn, result.feePaid),
        },
        ...pushEvent(state, {
          kind: 'shock',
          tokenIn,
          amountIn,
          amountOut: result.amountOut,
          visitId: action.visitId,
        }),
      }
    }
    case 'addLiquidity': {
      const goldAmount = matchingGoldAmount(state.pool, action.gemAmount)
      if (
        state.wallet.GEM < action.gemAmount ||
        state.wallet.GOLD < goldAmount
      ) {
        return state
      }
      const result = addLiquidity(state.pool, action.gemAmount, goldAmount)
      return {
        ...state,
        pool: result.pool,
        wallet: {
          GEM: state.wallet.GEM - action.gemAmount,
          GOLD: state.wallet.GOLD - goldAmount,
          shares: state.wallet.shares + result.sharesMinted,
        },
        entry: {
          gem: (state.entry?.gem ?? 0) + action.gemAmount,
          gold: (state.entry?.gold ?? 0) + goldAmount,
        },
        stats: {
          ...state.stats,
          liquidityAddCount: state.stats.liquidityAddCount + 1,
        },
        ...pushEvent(state, {
          kind: 'add',
          gem: action.gemAmount,
          gold: goldAmount,
        }),
      }
    }
    case 'removeAll': {
      if (state.wallet.shares === 0) return state
      const result = removeLiquidity(state.pool, state.wallet.shares)
      return {
        ...state,
        pool: result.pool,
        wallet: {
          GEM: state.wallet.GEM + result.gemOut,
          GOLD: state.wallet.GOLD + result.goldOut,
          shares: 0,
        },
        entry: null,
        userFees: { GEM: 0, GOLD: 0 },
        ...pushEvent(state, {
          kind: 'remove',
          gem: result.gemOut,
          gold: result.goldOut,
        }),
      }
    }
  }
}

export function useSim() {
  return useReducer(simReducer, initialSim)
}
