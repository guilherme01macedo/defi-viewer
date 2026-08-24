import type { FarmState, FarmStats } from '../state/useFarm'

// What the farm HUD lets the user do, and what the scene/UI shows.
// Both are cumulative: a chapter adds to everything before it.
export type FarmActionKey =
  | 'lock'
  | 'borrow'
  | 'addLp'
  | 'removeLp'
  | 'repay'
  | 'reclaim'
  | 'shock'
export type FarmFeatureKey = 'tank' | 'market' | 'scale' | 'netPanel' | 'health'

export interface FarmChapter {
  id: string
  title: string
  body: string
  unlocks?: FarmActionKey[]
  reveals?: FarmFeatureKey[]
  task?: {
    label: string
    isDone: (state: FarmState, baseline: FarmStats) => boolean
  }
}

export const FARM_CHAPTERS: FarmChapter[] = [
  {
    id: 'setup',
    title: 'Both tools on one stage',
    body:
      'You know this tank: the GEM/GOLD pool, with traders paying fees ' +
      'into it. You know the problem too — an LP position rides the ' +
      'price wherever the traders push it. This strategy earns the fees ' +
      'without the ride.',
    reveals: ['tank'],
  },
  {
    id: 'idea',
    title: 'Borrow what you pour',
    body:
      'The trick: do not buy the GEM you deposit — borrow it. If the ' +
      'GEM price falls, your LP loses value, but the debt you must repay ' +
      'gets cheaper by the same direction. The two legs pull against ' +
      'each other, and the fees are what remains.',
  },
  {
    id: 'short',
    title: 'Open the short',
    body:
      'Lock GOLD as collateral on the scale, then borrow GEM from the ' +
      'GEM lenders’ tank in the back. Note the swap of roles: this time ' +
      'GOLD is the collateral and GEM is the debt.',
    reveals: ['scale', 'market'],
    unlocks: ['lock', 'borrow'],
    task: {
      label: 'Lock 300 GOLD, then borrow 100 GEM',
      isDone: (s, b) => s.stats.borrowCount > b.borrowCount,
    },
  },
  {
    id: 'farm',
    title: 'Farm',
    body:
      'Now pour the borrowed GEM (with matching GOLD) into the pool. ' +
      'Your GEM exposure is near zero: the LP holds about as much GEM as ' +
      'you owe. The panel tracks both legs from this moment.',
    reveals: ['netPanel'],
    unlocks: ['addLp'],
    task: {
      label: 'Add the borrowed GEM as liquidity',
      isDone: (s, b) => s.stats.lpAddCount > b.lpAddCount,
    },
  },
  {
    id: 'test',
    title: 'The test',
    body:
      'Let the traders wobble the price. Watch the panel: the ' +
      '“without the hedge” row swings with every trade, but the hedged ' +
      'net barely moves — the debt leg absorbs what the LP leg feels. ' +
      'The fees keep dripping in either way.',
    task: {
      label: 'Sit through 6 trades and watch the rows',
      isDone: (s, b) => s.stats.traderSwapCount - b.traderSwapCount >= 6,
    },
  },
  {
    id: 'catches',
    title: 'The catches',
    body:
      'The hedge cancels direction, not size. Call in the whale: a huge ' +
      'move costs even the hedged position — that is impermanent loss ' +
      'leaking through. And a price pump inflates your GEM debt, so the ' +
      'scale can tip the other way. Interest ticks against you too.',
    reveals: ['health'],
    unlocks: ['shock', 'repay'],
    task: {
      label: 'Trigger a price shock and read the damage',
      isDone: (s, b) => s.stats.shockCount > b.shockCount,
    },
  },
  {
    id: 'sandbox',
    title: 'Sandbox',
    body:
      'Everything is unlocked: build the farm, unwind it, repay, reclaim, ' +
      'and stress it with whales. It is all fictional, so find the edge.',
    unlocks: ['removeLp', 'reclaim'],
  },
]

export function unlockedFarmActions(index: number): Set<FarmActionKey> {
  const keys = FARM_CHAPTERS.slice(0, index + 1).flatMap((c) => c.unlocks ?? [])
  return new Set(keys)
}

export function revealedFarmFeatures(index: number): Set<FarmFeatureKey> {
  const keys = FARM_CHAPTERS.slice(0, index + 1).flatMap((c) => c.reveals ?? [])
  return new Set(keys)
}
