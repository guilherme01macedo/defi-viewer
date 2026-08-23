import type { SimState, SimStats } from '../state/useSim'

// What the HUD lets the user do, and what the scene/UI shows.
// Both are cumulative: a chapter adds to everything before it.
export type ActionKey = 'swap' | 'addLiquidity' | 'withdraw' | 'autoTraders'
export type FeatureKey = 'tank' | 'curve' | 'lpPanel' | 'fees'

export interface Chapter {
  id: string
  title: string
  body: string
  unlocks?: ActionKey[]
  reveals?: FeatureKey[]
  task?: {
    label: string
    // `baseline` is a snapshot of the stats when the chapter opened,
    // so "make a swap" means one swap made during THIS chapter.
    isDone: (state: SimState, baseline: SimStats) => boolean
  }
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'tokens',
    title: 'Tokens and your wallet',
    body:
      'These two flasks are your wallet. The blue liquid is GEM and the ' +
      'yellow liquid is GOLD — fictional tokens you own. Nothing moves ' +
      'until you act.',
  },
  {
    id: 'pool',
    title: 'The pool',
    body:
      'This glass tank is a liquidity pool. It holds both tokens side by ' +
      'side, and the liquid levels are its reserves. Every trade in this ' +
      'world happens against the tank.',
    reveals: ['tank'],
  },
  {
    id: 'swaps',
    title: 'Swaps',
    body:
      'To trade, pour one token into the tank and take the other out. ' +
      'The pool itself is your counterparty — no other person is needed.',
    unlocks: ['swap'],
    task: {
      label: 'Make a swap (use the Act panel)',
      isDone: (s, b) => s.stats.userSwapCount > b.userSwapCount,
    },
  },
  {
    id: 'price',
    title: 'Price and the curve',
    body:
      'The pool sets the price from its levels: the scarcer side costs ' +
      'more. The curve shows every mix of reserves the tank allows. A swap ' +
      'slides the pool along it — never off it.',
    reveals: ['curve'],
    task: {
      label: 'Swap again and watch the dot slide',
      isDone: (s, b) => s.stats.userSwapCount > b.userSwapCount,
    },
  },
  {
    id: 'provide',
    title: 'Providing liquidity',
    body:
      'Now switch sides: be the pool. Deposit both tokens in the current ' +
      'ratio and receive shares — your slice of everything in the tank.',
    unlocks: ['addLiquidity'],
    task: {
      label: 'Add liquidity',
      isDone: (s, b) => s.stats.liquidityAddCount > b.liquidityAddCount,
    },
  },
  {
    id: 'fees',
    title: 'Fees',
    body:
      'Every swap pays a 0.3% fee that stays in the tank, so the tank ' +
      'slowly overfills. That extra liquid belongs to shareholders like ' +
      'you. Let the traders loose and watch the fees add up.',
    unlocks: ['autoTraders'],
    reveals: ['fees'],
    task: {
      label: 'Start the auto traders',
      isDone: (s, b) => s.stats.traderSwapCount > b.traderSwapCount,
    },
  },
  {
    id: 'il',
    title: 'Impermanent loss',
    body:
      'When the price drifts from where you deposited, your shares become ' +
      'worth less than simply holding both tokens. That gap is impermanent ' +
      'loss. Fees push the other way — the panel shows which side is winning.',
    reveals: ['lpPanel'],
  },
  {
    id: 'sandbox',
    title: 'Sandbox',
    body:
      'Everything is unlocked. Swap, deposit, withdraw, and let the ' +
      'traders run — it is all fictional, so break things.',
    unlocks: ['withdraw'],
  },
]

export function unlockedActions(index: number): Set<ActionKey> {
  const keys = CHAPTERS.slice(0, index + 1).flatMap((c) => c.unlocks ?? [])
  return new Set(keys)
}

export function revealedFeatures(index: number): Set<FeatureKey> {
  const keys = CHAPTERS.slice(0, index + 1).flatMap((c) => c.reveals ?? [])
  return new Set(keys)
}
