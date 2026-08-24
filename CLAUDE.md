# DeFi Viewer

An interactive 3D page that teaches DeFi to newcomers. The user plays with
fictional resources in a Three.js scene and learns how a strategy moves value.
No real money, no wallets, no chain connections — the simulation is the product.

## Audience

People who do not know DeFi. Every scene must work for someone who has never
heard the words "liquidity" or "collateral". Introduce the metaphor first, and
attach the jargon to it second.

A home screen offers one card per strategy. Each strategy has its own scene,
its own chapters, and its own sandbox.

## Strategy 1: AMM liquidity provision

A constant-product AMM pool with two fictional tokens: GEM and GOLD. The user
deposits both into a pool, watches traders swap against it, earns fees, and
discovers impermanent loss when the price drifts.

The math under the hood is real:

- Constant product invariant: `x * y = k`
- Swap fee (0.3%) accrues to liquidity providers
- LP shares track proportional ownership of the reserves
- Impermanent loss is computed against a hold-both baseline

## Strategy 2: Lending and liquidation

One lending market for GOLD. The user lends first (deposit, watch interest
accrue), then borrows against locked GEM collateral and faces the health
factor. An oracle price drifts each tick, and a crash button teaches
liquidation.

The math under the hood is real:

- Utilization-based rates: `borrowAPR = 5% + 45% * utilization`, and the
  supply rate is the borrow rate scaled by utilization
- Interest is a flow, not a formula: each tick adds GOLD to the debts and
  credits the same GOLD to the depositors
- Max LTV 66%, liquidation threshold 80%, liquidation bonus 10%
- `healthFactor = collateral * price * 0.8 / debt`; below 1, a liquidator
  repays the debt and seizes collateral worth 110% of it

The lending scene has its own metaphors on top of the liquid language:

- The pool is a single tank. Solid GOLD is available liquidity; a faint
  column above it is the lent-out claim — a promise, not liquid.
- The user's vault is a balance scale: sealed GEM flask against GOLD debt.
  The beam is level exactly at health factor 1, and a red-tipped stake marks
  that line.
- Liquidations only happen when a red liquidator figure reaches the scene;
  the reducer re-checks the health factor at that moment.

## Visual metaphor: liquid tanks

- A token is a colored liquid. GEM is one color, GOLD is another.
- The pool is a two-chambered glass tank. The liquid levels ARE the reserves.
- A swap pours liquid into one chamber and drains the other.
- The price is the ratio of the two levels, visible at a glance.
- The user's wallet is a set of flasks they pour from and into.

Keep the metaphor honest: every animation must map to a real state change in
the simulation. Never animate something the math did not do.

## Strategy 3: Delta-neutral farming

The capstone: both instruments on one stage. The user locks GOLD as
collateral, borrows GEM from a mirrored GEM lending market, and LPs the
borrowed GEM into the pool. The fees are theirs, but the price exposure
mostly cancels: when GEM moves, the LP leg and the debt leg pull against
each other.

- The pool is the only price. The lending side reads the tank's level
  ratio, with the collateral and debt roles swapped (the helpers receive
  the inverse price).
- The debt baseline re-anchors when the first LP lands, so the net panel
  measures both legs from the same moment.
- The net panel's rows sum exactly: fees + LP price move + debt hedge −
  interest = hedged net, shown beside the unhedged net.
- Traders lean toward arbitrage, so the price oscillates around fair
  value. Small wobble is the proof that the hedge works.
- The catches are chapter six: a whale-sized move costs even the hedged
  position (impermanent loss), and a pump inflates the GEM debt toward
  liquidation.

## Experience shape

Each strategy is a guided story in short chapters, each one interactive.
After the last chapter the scene unlocks into a free sandbox. The AMM story
has eight chapters (tokens, pool, swaps, price, providing, fees, impermanent
loss, sandbox). The lending story has six (pool, interest, borrowing, health
factor, liquidation, sandbox). The farming story has seven (setup, the idea,
the short, farm, the test, the catches, sandbox).

## Stack

Vite + TypeScript + React + @react-three/fiber + drei.
The chapter flow, HUD, and tooltips are ordinary React components. The 3D
scene is declarative R3F.

## Architecture principles

- `src/sim/` — pure TypeScript simulation (pool math, lending math, LP
  accounting). No Three.js, no React imports. This is the source of truth.
- `src/state/` — reducers that apply sim math to app state and emit flow
  events the scene can animate.
- `src/scene/` — R3F components that render sim state. Rendering only, no math.
- `src/chapters/` — the narrative flow: chapter definitions, progression state.
- `src/ui/` — HUD, panels, chapter text overlays.
- `src/strategies/` — one component per strategy, wiring scene + HUD +
  chapters; `App.tsx` is only the home screen and the strategy switch.

The sim emits state; the scene animates toward it. Interaction goes
UI → sim action → new state → scene reacts. The scene never mutates sim state
directly.

## Roadmap (later, not now)

The three planned strategies have shipped. Candidates for a next wave,
all reusing the same world: staking with unbonding periods, a stableswap
pool, or leveraged looping on the lending market.
