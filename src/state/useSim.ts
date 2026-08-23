import { useReducer } from 'react'
import type { Pool, TokenId, Wallet } from '../sim/pool'
import {
  addLiquidity,
  createPool,
  matchingGoldAmount,
  removeLiquidity,
  swap,
} from '../sim/pool'

// Everything the app remembers. `entry` records what the user put in,
// so the HUD can compare the LP position against simply holding.
export interface SimState {
  pool: Pool
  wallet: Wallet
  entry: { gem: number; gold: number } | null
}

export type SimAction =
  | { type: 'userSwap'; tokenIn: TokenId; amountIn: number }
  | { type: 'traderSwap'; tokenIn: TokenId; amountIn: number }
  | { type: 'addLiquidity'; gemAmount: number }
  | { type: 'removeAll' }

export const initialSim: SimState = {
  pool: createPool(1000, 1000),
  wallet: { GEM: 500, GOLD: 500, shares: 0 },
  entry: null,
}

export function simReducer(state: SimState, action: SimAction): SimState {
  switch (action.type) {
    case 'userSwap': {
      if (state.wallet[action.tokenIn] < action.amountIn) return state
      const result = swap(state.pool, action.tokenIn, action.amountIn)
      const wallet = { ...state.wallet }
      wallet[action.tokenIn] -= action.amountIn
      wallet[action.tokenIn === 'GEM' ? 'GOLD' : 'GEM'] += result.amountOut
      return { ...state, pool: result.pool, wallet }
    }
    case 'traderSwap': {
      // Anonymous traders swap against the pool; their wallets are not tracked.
      const result = swap(state.pool, action.tokenIn, action.amountIn)
      return { ...state, pool: result.pool }
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
      }
    }
    case 'removeAll': {
      if (state.wallet.shares === 0) return state
      const result = removeLiquidity(state.pool, state.wallet.shares)
      return {
        pool: result.pool,
        wallet: {
          GEM: state.wallet.GEM + result.gemOut,
          GOLD: state.wallet.GOLD + result.goldOut,
          shares: 0,
        },
        entry: null,
      }
    }
  }
}

export function useSim() {
  return useReducer(simReducer, initialSim)
}
