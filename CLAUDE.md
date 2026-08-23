# DeFi Viewer

An interactive 3D page that teaches DeFi to newcomers. The user plays with
fictional resources in a Three.js scene and learns how a strategy moves value.
No real money, no wallets, no chain connections — the simulation is the product.

## Audience

People who do not know DeFi. Every scene must work for someone who has never
heard the words "liquidity" or "collateral". Introduce the metaphor first, and
attach the jargon to it second.

## First strategy: AMM liquidity provision

The first (and current) focus is a constant-product AMM pool with two fictional
tokens: GEM and GOLD. The user deposits both into a pool, watches traders swap
against it, earns fees, and discovers impermanent loss when the price drifts.

The math under the hood is real:

- Constant product invariant: `x * y = k`
- Swap fee (0.3%) accrues to liquidity providers
- LP shares track proportional ownership of the reserves
- Impermanent loss is computed against a hold-both baseline

## Visual metaphor: liquid tanks

- A token is a colored liquid. GEM is one color, GOLD is another.
- The pool is a two-chambered glass tank. The liquid levels ARE the reserves.
- A swap pours liquid into one chamber and drains the other.
- The price is the ratio of the two levels, visible at a glance.
- The user's wallet is a set of flasks they pour from and into.

Keep the metaphor honest: every animation must map to a real state change in
the simulation. Never animate something the math did not do.

## Experience shape

A guided story in short chapters, each one interactive. After the last chapter
the scene unlocks into a free sandbox.

1. Tokens and your wallet
2. The pool — where tokens live together
3. Swaps — pouring one side, draining the other
4. Price — the ratio of the levels, and the x·y=k curve
5. Providing liquidity — your flasks join the tank
6. Fees — the trickle you earn from every swap
7. Impermanent loss — what price drift costs you vs. holding
8. Sandbox — everything unlocked, play freely

## Stack

Vite + TypeScript + React + @react-three/fiber + drei.
The chapter flow, HUD, and tooltips are ordinary React components. The 3D
scene is declarative R3F.

## Architecture principles

- `src/sim/` — pure TypeScript simulation (pool math, wallet, LP accounting).
  No Three.js, no React imports. Fully unit-tested. This is the source of truth.
- `src/scene/` — R3F components that render sim state. Rendering only, no math.
- `src/chapters/` — the narrative flow: chapter definitions, progression state.
- `src/ui/` — HUD, tooltips, chapter text overlays.

The sim emits state; the scene animates toward it. Interaction goes
UI → sim action → new state → scene reacts. The scene never mutates sim state
directly.

## Roadmap (later, not now)

Future strategies reuse the same world and resources:

- Lending and liquidation (collateral vault, health factor)
- Delta-neutral farming (builds on the AMM chapter)
