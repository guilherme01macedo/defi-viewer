import { useReducer } from 'react'
import type { Pool, TokenId, Wallet } from '../sim/pool'
import {
  addLiquidity,
  createPool,
  matchingGoldAmount,
  price,
  removeLiquidity,
  swap,
} from '../sim/pool'
import {
  borrowApr,
  healthFactor,
  interestOn,
  liquidate,
  maxBorrow,
  LTV_MAX,
} from '../sim/lending'
import type { FlowEvent } from './useSim'

// Delta-neutral farming: LP the GEM/GOLD pool for fees, and cancel the
// GEM exposure by borrowing the GEM instead of buying it. The pool is
// the only price: the lending side reads the tank's level ratio.
//
// The lending helpers take "price of the collateral token in debt-token
// units". Collateral here is GOLD and debt is GEM, so every call passes
// the INVERSE of the pool's GEM price.

export interface FarmStats {
  traderSwapCount: number
  shockCount: number
  lockCount: number
  borrowCount: number
  lpAddCount: number
  repayCount: number
  liquidationCount: number
  interestPaid: number // GEM added to the user's debt by interest
}

// Streams for the lending side of the scene; pool events reuse FlowEvent.
export interface FarmEvent {
  id: number
  kind: 'lock' | 'borrow' | 'repay' | 'reclaim' | 'liquidate'
  amount: number // GOLD for lock/reclaim/liquidate seizure, GEM otherwise
  gem?: number // liquidations only: the GEM debt the liquidator repaid
  visitId?: number
}

export interface FarmState {
  pool: Pool
  gemMarket: { deposits: number; borrowed: number } // GEM lenders, offstage NPCs included
  wallet: Wallet
  goldLocked: number
  gemDebt: number
  // Cumulative GOLD value of the user's LP deposits at their entry
  // prices, and of their borrows at their borrow prices. The net panel
  // derives every row from these two baselines.
  lpEntryValue: number | null
  debtBaseline: number
  userFees: { GEM: number; GOLD: number }
  stats: FarmStats
  poolEvents: FlowEvent[]
  farmEvents: FarmEvent[]
  nextEventId: number
}

export type FarmAction =
  | { type: 'traderSwap'; tokenIn: TokenId; amountIn: number; visitId?: number }
  | { type: 'priceShock'; visitId?: number }
  | { type: 'lockGold'; amount: number }
  | { type: 'borrowGem'; amount: number }
  | { type: 'addFarmLiquidity'; gemAmount: number }
  | { type: 'removeLp' }
  | { type: 'repayGem'; amount: number }
  | { type: 'reclaimGold' }
  | { type: 'tick'; days: number }
  | { type: 'liquidate'; visitId?: number }

// A smaller pool than the AMM chapter, so the user's LP share (and
// with it the fee drip) is big enough to visibly outpace the interest.
export const initialFarm: FarmState = {
  pool: createPool(500, 500),
  gemMarket: { deposits: 1200, borrowed: 500 },
  wallet: { GEM: 100, GOLD: 700, shares: 0 },
  goldLocked: 0,
  gemDebt: 0,
  lpEntryValue: null,
  debtBaseline: 0,
  userFees: { GEM: 0, GOLD: 0 },
  stats: {
    traderSwapCount: 0,
    shockCount: 0,
    lockCount: 0,
    borrowCount: 0,
    lpAddCount: 0,
    repayCount: 0,
    liquidationCount: 0,
    interestPaid: 0,
  },
  poolEvents: [],
  farmEvents: [],
  nextEventId: 1,
}

function pushPoolEvent(
  state: FarmState,
  event: Omit<FlowEvent, 'id'>,
): Pick<FarmState, 'poolEvents' | 'nextEventId'> {
  return {
    poolEvents: [...state.poolEvents, { ...event, id: state.nextEventId }].slice(-10),
    nextEventId: state.nextEventId + 1,
  }
}

function pushFarmEvent(
  state: FarmState,
  event: Omit<FarmEvent, 'id'>,
): Pick<FarmState, 'farmEvents' | 'nextEventId'> {
  return {
    farmEvents: [...state.farmEvents, { ...event, id: state.nextEventId }].slice(-10),
    nextEventId: state.nextEventId + 1,
  }
}

function creditUserFees(
  state: FarmState,
  tokenIn: TokenId,
  feePaid: number,
): FarmState['userFees'] {
  if (state.wallet.shares === 0) return state.userFees
  const cut = feePaid * (state.wallet.shares / state.pool.totalShares)
  return { ...state.userFees, [tokenIn]: state.userFees[tokenIn] + cut }
}

const userPosition = (state: FarmState) => ({
  collateral: state.goldLocked,
  debt: state.gemDebt,
})

// GOLD priced in GEM: what the lending helpers expect here.
const inversePrice = (pool: Pool) => 1 / price(pool, 'GEM')

export const farmHealthFactor = (state: FarmState): number =>
  healthFactor(userPosition(state), inversePrice(state.pool))

export const farmMaxBorrow = (state: FarmState): number =>
  Math.min(
    maxBorrow(userPosition(state), inversePrice(state.pool)),
    state.gemMarket.deposits - state.gemMarket.borrowed,
  )

export const farmUnderwater = (state: FarmState): boolean =>
  farmHealthFactor(state) < 1

export function farmReducer(state: FarmState, action: FarmAction): FarmState {
  switch (action.type) {
    case 'traderSwap': {
      const result = swap(state.pool, action.tokenIn, action.amountIn)
      return {
        ...state,
        pool: result.pool,
        userFees: creditUserFees(state, action.tokenIn, result.feePaid),
        stats: {
          ...state.stats,
          traderSwapCount: state.stats.traderSwapCount + 1,
        },
        ...pushPoolEvent(state, {
          kind: 'traderSwap',
          tokenIn: action.tokenIn,
          amountIn: action.amountIn,
          amountOut: result.amountOut,
          visitId: action.visitId,
        }),
      }
    }
    case 'priceShock': {
      const tokenIn: TokenId = state.stats.shockCount % 2 === 0 ? 'GOLD' : 'GEM'
      const amountIn = state.pool.reserves[tokenIn] * 0.45
      const result = swap(state.pool, tokenIn, amountIn)
      return {
        ...state,
        pool: result.pool,
        userFees: creditUserFees(state, tokenIn, result.feePaid),
        stats: { ...state.stats, shockCount: state.stats.shockCount + 1 },
        ...pushPoolEvent(state, {
          kind: 'shock',
          tokenIn,
          amountIn,
          amountOut: result.amountOut,
          visitId: action.visitId,
        }),
      }
    }
    case 'lockGold': {
      const amount = Math.min(action.amount, state.wallet.GOLD)
      if (amount <= 0) return state
      return {
        ...state,
        wallet: { ...state.wallet, GOLD: state.wallet.GOLD - amount },
        goldLocked: state.goldLocked + amount,
        stats: { ...state.stats, lockCount: state.stats.lockCount + 1 },
        ...pushFarmEvent(state, { kind: 'lock', amount }),
      }
    }
    case 'borrowGem': {
      const amount = Math.min(action.amount, farmMaxBorrow(state))
      if (amount <= 0) return state
      const gemPrice = price(state.pool, 'GEM')
      return {
        ...state,
        wallet: { ...state.wallet, GEM: state.wallet.GEM + amount },
        gemDebt: state.gemDebt + amount,
        debtBaseline: state.debtBaseline + amount * gemPrice,
        gemMarket: {
          ...state.gemMarket,
          borrowed: state.gemMarket.borrowed + amount,
        },
        stats: { ...state.stats, borrowCount: state.stats.borrowCount + 1 },
        ...pushFarmEvent(state, { kind: 'borrow', amount }),
      }
    }
    case 'addFarmLiquidity': {
      const goldAmount = matchingGoldAmount(state.pool, action.gemAmount)
      if (
        state.wallet.GEM < action.gemAmount ||
        state.wallet.GOLD < goldAmount
      ) {
        return state
      }
      const result = addLiquidity(state.pool, action.gemAmount, goldAmount)
      const gemPrice = price(state.pool, 'GEM')
      // The farm starts when the first LP lands: re-anchor the debt
      // baseline (and the interest counter) at this price, so the panel
      // measures both legs from the same moment. Otherwise price moves
      // between borrowing and LPing would show up as hedge losses.
      const opening = state.lpEntryValue === null
      return {
        ...state,
        pool: result.pool,
        wallet: {
          GEM: state.wallet.GEM - action.gemAmount,
          GOLD: state.wallet.GOLD - goldAmount,
          shares: state.wallet.shares + result.sharesMinted,
        },
        lpEntryValue:
          (state.lpEntryValue ?? 0) + goldAmount + action.gemAmount * gemPrice,
        debtBaseline: opening ? state.gemDebt * gemPrice : state.debtBaseline,
        stats: {
          ...state.stats,
          lpAddCount: state.stats.lpAddCount + 1,
          interestPaid: opening ? 0 : state.stats.interestPaid,
        },
        ...pushPoolEvent(state, {
          kind: 'add',
          gem: action.gemAmount,
          gold: goldAmount,
        }),
      }
    }
    case 'removeLp': {
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
        lpEntryValue: null,
        userFees: { GEM: 0, GOLD: 0 },
        ...pushPoolEvent(state, {
          kind: 'remove',
          gem: result.gemOut,
          gold: result.goldOut,
        }),
      }
    }
    case 'repayGem': {
      const amount = Math.min(action.amount, state.gemDebt, state.wallet.GEM)
      if (amount <= 0) return state
      const newDebt = state.gemDebt - amount
      return {
        ...state,
        wallet: { ...state.wallet, GEM: state.wallet.GEM - amount },
        gemDebt: newDebt,
        // shrink the baseline in proportion, so the panel keeps comparing
        // the remaining debt against its own entry value
        debtBaseline:
          state.gemDebt > 0 ? state.debtBaseline * (newDebt / state.gemDebt) : 0,
        gemMarket: {
          ...state.gemMarket,
          borrowed: Math.max(0, state.gemMarket.borrowed - amount),
        },
        stats: { ...state.stats, repayCount: state.stats.repayCount + 1 },
        ...pushFarmEvent(state, { kind: 'repay', amount }),
      }
    }
    case 'reclaimGold': {
      const gemPrice = price(state.pool, 'GEM')
      const needed =
        state.gemDebt <= 0 ? 0 : (state.gemDebt * gemPrice) / LTV_MAX
      const amount = Math.max(0, state.goldLocked - needed)
      if (amount <= 0) return state
      return {
        ...state,
        wallet: { ...state.wallet, GOLD: state.wallet.GOLD + amount },
        goldLocked: state.goldLocked - amount,
        ...pushFarmEvent(state, { kind: 'reclaim', amount }),
      }
    }
    case 'tick': {
      // GEM debts accrue at the GEM market's utilization-driven rate.
      const apr = borrowApr({ ...state.gemMarket, price: 1 })
      const totalInterest = interestOn(state.gemMarket.borrowed, apr, action.days)
      const userInterest = interestOn(state.gemDebt, apr, action.days)
      return {
        ...state,
        gemMarket: {
          deposits: state.gemMarket.deposits + totalInterest,
          borrowed: state.gemMarket.borrowed + totalInterest,
        },
        gemDebt: state.gemDebt + userInterest,
        stats: {
          ...state.stats,
          interestPaid: state.stats.interestPaid + userInterest,
        },
      }
    }
    case 'liquidate': {
      const position = userPosition(state)
      const invPrice = inversePrice(state.pool)
      if (healthFactor(position, invPrice) >= 1) return state
      const result = liquidate(position, invPrice)
      return {
        ...state,
        goldLocked: result.position.collateral,
        gemDebt: 0,
        debtBaseline: 0,
        gemMarket: {
          ...state.gemMarket,
          borrowed: Math.max(0, state.gemMarket.borrowed - result.repaidGold),
        },
        stats: {
          ...state.stats,
          liquidationCount: state.stats.liquidationCount + 1,
        },
        ...pushFarmEvent(state, {
          kind: 'liquidate',
          amount: result.seizedGem, // GOLD seized (the collateral token here)
          gem: result.repaidGold, // GEM repaid (the debt token here)
          visitId: action.visitId,
        }),
      }
    }
  }
}

export function useFarm() {
  return useReducer(farmReducer, initialFarm)
}
