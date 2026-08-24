import { positionAmounts, price } from '../sim/pool'
import type { FarmState } from '../state/useFarm'

const fmt = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 2 })
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`

interface Props {
  state: FarmState
}

// The two legs of the farm, in GOLD, measured against their entry
// values. Every row derives from the sim's baselines and the rows sum
// exactly: fees + LP price move + debt hedge − interest = hedged net.
export function NetPanel({ state }: Props) {
  const { pool, wallet, gemDebt, lpEntryValue, debtBaseline, userFees, stats } =
    state

  let body = null
  if (lpEntryValue !== null && wallet.shares > 0) {
    const p = price(pool, 'GEM')
    const pos = positionAmounts(pool, wallet.shares)
    const lpNow = pos.gold + pos.gem * p
    const lpPnl = lpNow - lpEntryValue
    const fees = userFees.GOLD + userFees.GEM * p
    const lpPriceMove = lpPnl - fees
    const debtPnl = debtBaseline - gemDebt * p
    const interest = stats.interestPaid * p
    const debtHedge = debtPnl + interest
    const hedged = lpPnl + debtPnl
    const unhedged = lpPnl

    body = (
      <>
        <div className="row fees">Fees earned: +{fmt(fees)}</div>
        <div className={`row ${lpPriceMove >= 0 ? 'up' : 'down'}`}>
          LP price move: {signed(lpPriceMove)}
        </div>
        <div className={`row ${debtHedge >= 0 ? 'up' : 'down'}`}>
          Debt hedge: {signed(debtHedge)}
        </div>
        <div className="row down">Interest: −{fmt(interest)}</div>
        <div className={`row net ${hedged >= 0 ? 'up' : 'down'}`}>
          {hedged >= 0 ? '▲' : '▼'} Hedged net: {signed(hedged)}
        </div>
        <div className={`row muted`}>
          Without the hedge: {signed(unhedged)}
        </div>
      </>
    )
  } else {
    body = <div className="row muted">Add liquidity to start tracking.</div>
  }

  return (
    <div className="net-panel">
      <h2>Your farm (in GOLD)</h2>
      {body}
    </div>
  )
}
