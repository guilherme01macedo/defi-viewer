import type { Dispatch } from 'react'
import type { ActionKey, FeatureKey } from '../chapters/chapters'
import type { SimAction, SimState } from '../state/useSim'
import { positionAmounts, price } from '../sim/pool'

const fmt = (n: number, digits = 1) =>
  n.toLocaleString('en-US', { maximumFractionDigits: digits })

interface Props {
  state: SimState
  dispatch: Dispatch<SimAction>
  actions: Set<ActionKey>
  features: Set<FeatureKey>
  autoTraders: boolean
  onToggleTraders: () => void
  onPriceShock: () => void
}

export function Hud({
  state,
  dispatch,
  actions,
  features,
  autoTraders,
  onToggleTraders,
  onPriceShock,
}: Props) {
  const { pool, wallet, entry, userFees, stats } = state
  const gemPrice = price(pool, 'GEM')
  const sharePct =
    pool.totalShares === 0 ? 0 : (wallet.shares / pool.totalShares) * 100
  const showPool = features.has('tank')
  const anyAction = actions.size > 0

  // Value of the LP position vs simply holding the deposited tokens,
  // all measured in GOLD. The net splits exactly into two forces:
  // fees earned (tracked per fee) and price drift (the remainder,
  // which is the impermanent loss).
  let comparison: { fees: number; drift: number; net: number } | null = null
  if (entry && wallet.shares > 0) {
    const pos = positionAmounts(pool, wallet.shares)
    const lp = pos.gold + pos.gem * gemPrice
    const hold = entry.gold + entry.gem * gemPrice
    const fees = userFees.GOLD + userFees.GEM * gemPrice
    const net = lp - hold
    comparison = { fees, drift: net - fees, net }
  }

  return (
    <div className="hud">
      {showPool && (
        <section>
          <h2>Pool</h2>
          <div className="row"><span className="gem">GEM</span> {fmt(pool.reserves.GEM)}</div>
          <div className="row"><span className="gold">GOLD</span> {fmt(pool.reserves.GOLD)}</div>
          <div className="row">1 GEM = {fmt(gemPrice, 3)} GOLD</div>
          {features.has('fees') && (
            <div className="row fees">
              Tank fees (all shareholders): {fmt(stats.feesCollected.GEM, 1)} GEM
              + {fmt(stats.feesCollected.GOLD, 1)} GOLD
            </div>
          )}
        </section>
      )}

      <section>
        <h2>Your wallet</h2>
        <div className="row"><span className="gem">GEM</span> {fmt(wallet.GEM)}</div>
        <div className="row"><span className="gold">GOLD</span> {fmt(wallet.GOLD)}</div>
        {actions.has('addLiquidity') && (
          <div className="row">Pool share: {fmt(sharePct, 2)}%</div>
        )}
      </section>

      {anyAction && (
        <section>
          <h2>Act</h2>
          {actions.has('swap') && (
            <>
              <button onClick={() => dispatch({ type: 'userSwap', tokenIn: 'GOLD', amountIn: 25 })}>
                Swap 25 GOLD → GEM
              </button>
              <button onClick={() => dispatch({ type: 'userSwap', tokenIn: 'GEM', amountIn: 25 })}>
                Swap 25 GEM → GOLD
              </button>
            </>
          )}
          {actions.has('addLiquidity') && (
            <button onClick={() => dispatch({ type: 'addLiquidity', gemAmount: 100 })}>
              Add liquidity (100 GEM + matching GOLD)
            </button>
          )}
          {actions.has('withdraw') && (
            <button onClick={() => dispatch({ type: 'removeAll' })} disabled={wallet.shares === 0}>
              Withdraw all liquidity
            </button>
          )}
          {actions.has('autoTraders') && (
            <button onClick={onToggleTraders} className={autoTraders ? 'active' : ''}>
              {autoTraders ? 'Stop' : 'Start'} auto traders
            </button>
          )}
          {actions.has('priceShock') && (
            <button onClick={onPriceShock} className="shock">
              Price shock (whale trade)
            </button>
          )}
        </section>
      )}

      {features.has('lpPanel') && (
        <section>
          <h2>LP vs holding</h2>
          {comparison ? (
            <>
              <div className="row up">
                Fees you earned: +{fmt(comparison.fees, 2)} GOLD
              </div>
              <div className={`row ${comparison.drift >= 0 ? 'up' : 'down'}`}>
                Price drift: {comparison.drift >= 0 ? '+' : '−'}
                {fmt(Math.abs(comparison.drift), 2)} GOLD
              </div>
              <div className={`row net ${comparison.net >= 0 ? 'up' : 'down'}`}>
                {comparison.net >= 0 ? '▲' : '▼'} Net vs holding:{' '}
                {comparison.net >= 0 ? '+' : '−'}
                {fmt(Math.abs(comparison.net), 2)} GOLD
              </div>
            </>
          ) : (
            <div className="row muted">Add liquidity to start the comparison.</div>
          )}
        </section>
      )}
    </div>
  )
}
