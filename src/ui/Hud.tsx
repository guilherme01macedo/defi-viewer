import type { Dispatch } from 'react'
import type { SimAction, SimState } from '../state/useSim'
import { positionAmounts, price } from '../sim/pool'

const fmt = (n: number, digits = 1) =>
  n.toLocaleString('en-US', { maximumFractionDigits: digits })

interface Props {
  state: SimState
  dispatch: Dispatch<SimAction>
  autoTraders: boolean
  onToggleTraders: () => void
}

export function Hud({ state, dispatch, autoTraders, onToggleTraders }: Props) {
  const { pool, wallet, entry } = state
  const gemPrice = price(pool, 'GEM')
  const sharePct =
    pool.totalShares === 0 ? 0 : (wallet.shares / pool.totalShares) * 100

  // Value of the LP position vs simply holding the deposited tokens,
  // both measured in GOLD. Fee earnings are included automatically,
  // because fees live inside the reserves.
  let comparison: { lp: number; hold: number } | null = null
  if (entry && wallet.shares > 0) {
    const pos = positionAmounts(pool, wallet.shares)
    comparison = {
      lp: pos.gold + pos.gem * gemPrice,
      hold: entry.gold + entry.gem * gemPrice,
    }
  }

  return (
    <div className="hud">
      <section>
        <h2>Pool</h2>
        <div className="row"><span className="gem">GEM</span> {fmt(pool.reserves.GEM)}</div>
        <div className="row"><span className="gold">GOLD</span> {fmt(pool.reserves.GOLD)}</div>
        <div className="row">1 GEM = {fmt(gemPrice, 3)} GOLD</div>
      </section>

      <section>
        <h2>Your wallet</h2>
        <div className="row"><span className="gem">GEM</span> {fmt(wallet.GEM)}</div>
        <div className="row"><span className="gold">GOLD</span> {fmt(wallet.GOLD)}</div>
        <div className="row">Pool share: {fmt(sharePct, 2)}%</div>
      </section>

      <section>
        <h2>Act</h2>
        <button onClick={() => dispatch({ type: 'userSwap', tokenIn: 'GOLD', amountIn: 25 })}>
          Swap 25 GOLD → GEM
        </button>
        <button onClick={() => dispatch({ type: 'userSwap', tokenIn: 'GEM', amountIn: 25 })}>
          Swap 25 GEM → GOLD
        </button>
        <button onClick={() => dispatch({ type: 'addLiquidity', gemAmount: 100 })}>
          Add liquidity (100 GEM + matching GOLD)
        </button>
        <button onClick={() => dispatch({ type: 'removeAll' })} disabled={wallet.shares === 0}>
          Withdraw all liquidity
        </button>
        <button onClick={onToggleTraders} className={autoTraders ? 'active' : ''}>
          {autoTraders ? 'Stop' : 'Start'} auto traders
        </button>
      </section>

      {comparison && (
        <section>
          <h2>LP vs holding</h2>
          <div className="row">As LP: {fmt(comparison.lp, 1)} GOLD</div>
          <div className="row">If held: {fmt(comparison.hold, 1)} GOLD</div>
          <div className={`row ${comparison.lp >= comparison.hold ? 'up' : 'down'}`}>
            {comparison.lp >= comparison.hold ? '▲' : '▼'}{' '}
            {fmt(Math.abs(comparison.lp - comparison.hold), 2)} GOLD
          </div>
        </section>
      )}
    </div>
  )
}
