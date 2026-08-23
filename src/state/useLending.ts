import { useReducer } from 'react'
import type { LendingMarket, Position } from '../sim/lending'
import {
  borrowApr,
  healthFactor,
  interestOn,
  liquidate,
  maxBorrow,
  LTV_MAX,
} from '../sim/lending'

// Counters the chapter system reads to detect "the user did the thing".
export interface LendStats {
  depositCount: number
  lockCount: number
  borrowCount: number
  repayCount: number
  crashCount: number
  liquidationCount: number
  userLiquidationCount: number
  interestEarned: number // lifetime GOLD credited to the user's deposit
}

// A state transition the scene can animate: what flowed, and for whom.
export type LendEventKind =
  | 'deposit'
  | 'withdraw'
  | 'lock'
  | 'unlock'
  | 'borrow'
  | 'repay'
  | 'liquidate'
  | 'crash'

export interface LendEvent {
  id: number
  kind: LendEventKind
  amount: number // GOLD for pours, GEM for lock/unlock/liquidate seizures
  who: 'user' | number // number = NPC borrower id
  visitId?: number
}

export interface NpcBorrower extends Position {
  id: number
}

export interface LendingState {
  market: LendingMarket
  wallet: { GEM: number; GOLD: number }
  supplied: number // the user's GOLD deposit, growing with interest
  position: Position // the user's collateral and debt
  npcs: NpcBorrower[]
  priceHistory: number[]
  stats: LendStats
  events: LendEvent[]
  nextEventId: number
}

export type LendAction =
  | { type: 'deposit'; amount: number }
  | { type: 'withdrawAll' }
  | { type: 'lock'; amount: number }
  | { type: 'unlock' }
  | { type: 'borrow'; amount: number }
  | { type: 'repay'; amount: number }
  | { type: 'crash'; visitId?: number }
  | { type: 'tick'; days: number; priceFactor: number }
  | { type: 'liquidate'; who: 'user' | number; visitId?: number }

// Three NPC borrowers with staggered health, so one crash liquidates
// one of them and a second crash reaches deeper.
const INITIAL_NPCS: NpcBorrower[] = [
  { id: 1, collateral: 600, debt: 300 }, // HF 1.6 at price 1
  { id: 2, collateral: 900, debt: 350 }, // HF 2.06
  { id: 3, collateral: 500, debt: 160 }, // HF 2.5
]

const initialBorrowed = INITIAL_NPCS.reduce((sum, n) => sum + n.debt, 0)

export const initialLending: LendingState = {
  market: { deposits: 2000, borrowed: initialBorrowed, price: 1 },
  wallet: { GEM: 500, GOLD: 500 },
  supplied: 0,
  position: { collateral: 0, debt: 0 },
  npcs: INITIAL_NPCS,
  priceHistory: [1],
  stats: {
    depositCount: 0,
    lockCount: 0,
    borrowCount: 0,
    repayCount: 0,
    crashCount: 0,
    liquidationCount: 0,
    userLiquidationCount: 0,
    interestEarned: 0,
  },
  events: [],
  nextEventId: 1,
}

function pushEvent(
  state: LendingState,
  event: Omit<LendEvent, 'id'>,
): Pick<LendingState, 'events' | 'nextEventId'> {
  return {
    events: [...state.events, { ...event, id: state.nextEventId }].slice(-10),
    nextEventId: state.nextEventId + 1,
  }
}

const pushPrice = (history: number[], price: number): number[] =>
  [...history, price].slice(-90)

// Positions the liquidator can act on right now. The reducer never
// liquidates on its own: the app dispatches `liquidate` when the
// liquidator character reaches the scale, so the animation and the
// state change happen together.
export function underwater(
  state: LendingState,
): Array<{ who: 'user' | number; position: Position }> {
  const found: Array<{ who: 'user' | number; position: Position }> = []
  for (const npc of state.npcs) {
    if (healthFactor(npc, state.market.price) < 1) {
      found.push({ who: npc.id, position: npc })
    }
  }
  if (healthFactor(state.position, state.market.price) < 1) {
    found.push({ who: 'user', position: state.position })
  }
  return found
}

export function lendingReducer(
  state: LendingState,
  action: LendAction,
): LendingState {
  switch (action.type) {
    case 'deposit': {
      const amount = Math.min(action.amount, state.wallet.GOLD)
      if (amount <= 0) return state
      return {
        ...state,
        market: { ...state.market, deposits: state.market.deposits + amount },
        wallet: { ...state.wallet, GOLD: state.wallet.GOLD - amount },
        supplied: state.supplied + amount,
        stats: { ...state.stats, depositCount: state.stats.depositCount + 1 },
        ...pushEvent(state, { kind: 'deposit', amount, who: 'user' }),
      }
    }
    case 'withdrawAll': {
      // The pool can only pay out GOLD that is not lent out.
      const available = state.market.deposits - state.market.borrowed
      const amount = Math.min(state.supplied, available)
      if (amount <= 0) return state
      return {
        ...state,
        market: { ...state.market, deposits: state.market.deposits - amount },
        wallet: { ...state.wallet, GOLD: state.wallet.GOLD + amount },
        supplied: state.supplied - amount,
        ...pushEvent(state, { kind: 'withdraw', amount, who: 'user' }),
      }
    }
    case 'lock': {
      const amount = Math.min(action.amount, state.wallet.GEM)
      if (amount <= 0) return state
      return {
        ...state,
        wallet: { ...state.wallet, GEM: state.wallet.GEM - amount },
        position: {
          ...state.position,
          collateral: state.position.collateral + amount,
        },
        stats: { ...state.stats, lockCount: state.stats.lockCount + 1 },
        ...pushEvent(state, { kind: 'lock', amount, who: 'user' }),
      }
    }
    case 'unlock': {
      // Return collateral the debt does not need at the max LTV.
      const { collateral, debt } = state.position
      const needed =
        debt <= 0 ? 0 : debt / (state.market.price * LTV_MAX)
      const amount = Math.max(0, collateral - needed)
      if (amount <= 0) return state
      return {
        ...state,
        wallet: { ...state.wallet, GEM: state.wallet.GEM + amount },
        position: { ...state.position, collateral: collateral - amount },
        ...pushEvent(state, { kind: 'unlock', amount, who: 'user' }),
      }
    }
    case 'borrow': {
      const liquidity = state.market.deposits - state.market.borrowed
      const amount = Math.min(
        action.amount,
        maxBorrow(state.position, state.market.price),
        liquidity,
      )
      if (amount <= 0) return state
      return {
        ...state,
        market: { ...state.market, borrowed: state.market.borrowed + amount },
        wallet: { ...state.wallet, GOLD: state.wallet.GOLD + amount },
        position: { ...state.position, debt: state.position.debt + amount },
        stats: { ...state.stats, borrowCount: state.stats.borrowCount + 1 },
        ...pushEvent(state, { kind: 'borrow', amount, who: 'user' }),
      }
    }
    case 'repay': {
      const amount = Math.min(
        action.amount,
        state.position.debt,
        state.wallet.GOLD,
      )
      if (amount <= 0) return state
      return {
        ...state,
        market: { ...state.market, borrowed: state.market.borrowed - amount },
        wallet: { ...state.wallet, GOLD: state.wallet.GOLD - amount },
        position: { ...state.position, debt: state.position.debt - amount },
        stats: { ...state.stats, repayCount: state.stats.repayCount + 1 },
        ...pushEvent(state, { kind: 'repay', amount, who: 'user' }),
      }
    }
    case 'crash': {
      const price = state.market.price * 0.6
      return {
        ...state,
        market: { ...state.market, price },
        priceHistory: pushPrice(state.priceHistory, price),
        stats: { ...state.stats, crashCount: state.stats.crashCount + 1 },
        ...pushEvent(state, {
          kind: 'crash',
          amount: 0,
          who: 'user',
          visitId: action.visitId,
        }),
      }
    }
    case 'tick': {
      // Interest first: every borrower's debt grows at the borrow rate,
      // and the whole of that interest lands on the suppliers.
      const apr = borrowApr(state.market)
      let totalInterest = 0
      const npcs = state.npcs.map((npc) => {
        if (npc.debt <= 0) return npc
        const interest = interestOn(npc.debt, apr, action.days)
        totalInterest += interest
        return { ...npc, debt: npc.debt + interest }
      })
      let position = state.position
      if (position.debt > 0) {
        const interest = interestOn(position.debt, apr, action.days)
        totalInterest += interest
        position = { ...position, debt: position.debt + interest }
      }
      const userCut =
        state.supplied > 0 && state.market.deposits > 0
          ? totalInterest * (state.supplied / state.market.deposits)
          : 0
      const price = state.market.price * action.priceFactor
      return {
        ...state,
        market: {
          deposits: state.market.deposits + totalInterest,
          borrowed: state.market.borrowed + totalInterest,
          price,
        },
        supplied: state.supplied + userCut,
        position,
        npcs,
        priceHistory: pushPrice(state.priceHistory, price),
        stats: {
          ...state.stats,
          interestEarned: state.stats.interestEarned + userCut,
        },
      }
    }
    case 'liquidate': {
      const target =
        action.who === 'user'
          ? state.position
          : state.npcs.find((n) => n.id === action.who)
      if (!target || healthFactor(target, state.market.price) >= 1) {
        return state
      }
      const result = liquidate(target, state.market.price)
      const market = {
        ...state.market,
        borrowed: state.market.borrowed - result.repaidGold,
      }
      const isUser = action.who === 'user'
      return {
        ...state,
        market,
        position: isUser ? result.position : state.position,
        npcs: isUser
          ? state.npcs
          : state.npcs.map((n) =>
              n.id === action.who ? { ...n, ...result.position } : n,
            ),
        stats: {
          ...state.stats,
          liquidationCount: state.stats.liquidationCount + 1,
          userLiquidationCount:
            state.stats.userLiquidationCount + (isUser ? 1 : 0),
        },
        ...pushEvent(state, {
          kind: 'liquidate',
          amount: result.seizedGem,
          who: action.who,
          visitId: action.visitId,
        }),
      }
    }
  }
}

export function useLending() {
  return useReducer(lendingReducer, initialLending)
}
