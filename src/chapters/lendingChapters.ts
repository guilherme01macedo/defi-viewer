import type { LendingState, LendStats } from '../state/useLending'

// What the lending HUD lets the user do, and what the scene/UI shows.
// Both are cumulative: a chapter adds to everything before it.
export type LendActionKey =
  | 'deposit'
  | 'withdraw'
  | 'lock'
  | 'unlock'
  | 'borrow'
  | 'repay'
  | 'crash'
export type LendFeatureKey =
  | 'poolTank'
  | 'rates'
  | 'oracle'
  | 'scale'
  | 'healthPanel'

export interface LendChapter {
  id: string
  title: string
  body: string
  unlocks?: LendActionKey[]
  reveals?: LendFeatureKey[]
  task?: {
    label: string
    isDone: (state: LendingState, baseline: LendStats) => boolean
  }
}

export const LEND_CHAPTERS: LendChapter[] = [
  {
    id: 'pool',
    title: 'The lending pool',
    body:
      'This tank is a lending pool. Lenders fill it with GOLD, and ' +
      'borrowers take GOLD out of it — the faint outline is the part ' +
      'already lent out. Add your GOLD to the pool to become a lender.',
    reveals: ['poolTank'],
    unlocks: ['deposit'],
    task: {
      label: 'Deposit GOLD into the pool',
      isDone: (s, b) => s.stats.depositCount > b.depositCount,
    },
  },
  {
    id: 'interest',
    title: 'Interest',
    body:
      'Borrowers pay for the GOLD they took, and that interest flows to ' +
      'the lenders. The rate is not fixed: the more of the pool is lent ' +
      'out, the higher it climbs. Watch your deposit grow on its own.',
    reveals: ['rates'],
    task: {
      label: 'Earn 0.3 GOLD of interest (just wait)',
      isDone: (s, b) => s.stats.interestEarned - b.interestEarned >= 0.3,
    },
  },
  {
    id: 'borrow',
    title: 'Borrowing',
    body:
      'Now switch sides. To borrow GOLD you first lock GEM in a vault as ' +
      'collateral — the sealed flask on the scale. The oracle chart shows ' +
      'what your GEM is worth, and you can borrow up to 66% of that value.',
    reveals: ['oracle', 'scale'],
    unlocks: ['lock', 'borrow'],
    task: {
      label: 'Lock GEM, then borrow GOLD',
      isDone: (s, b) => s.stats.borrowCount > b.borrowCount,
    },
  },
  {
    id: 'health',
    title: 'The health factor',
    body:
      'The scale weighs your collateral against your debt. While the ' +
      'collateral side is heavy, you are safe. The red mark is the point ' +
      'where debt wins — a health factor of 1. Repaying debt eases the ' +
      'scale back.',
    reveals: ['healthPanel'],
    unlocks: ['repay'],
    task: {
      label: 'Repay some debt and watch the scale ease',
      isDone: (s, b) => s.stats.repayCount > b.repayCount,
    },
  },
  {
    id: 'liquidation',
    title: 'Liquidation',
    body:
      'If the GEM price falls, collateral gets lighter and the scale can ' +
      'tip. Then a liquidator repays the debt and takes collateral worth ' +
      '110% of it. Crash the market and watch it happen — and careful: if ' +
      'your own scale is near the mark, the crash takes you too.',
    unlocks: ['crash'],
    task: {
      label: 'Crash the market and witness a liquidation',
      isDone: (s, b) => s.stats.liquidationCount > b.liquidationCount,
    },
  },
  {
    id: 'sandbox',
    title: 'Sandbox',
    body:
      'Everything is unlocked: lend, withdraw, lock, borrow, repay, ' +
      'reclaim collateral, and crash the market. It is all fictional, so ' +
      'push your luck.',
    unlocks: ['withdraw', 'unlock'],
  },
]

export function unlockedLendActions(index: number): Set<LendActionKey> {
  const keys = LEND_CHAPTERS.slice(0, index + 1).flatMap((c) => c.unlocks ?? [])
  return new Set(keys)
}

export function revealedLendFeatures(index: number): Set<LendFeatureKey> {
  const keys = LEND_CHAPTERS.slice(0, index + 1).flatMap((c) => c.reveals ?? [])
  return new Set(keys)
}
