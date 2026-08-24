import type { Dispatch } from 'react'
import type { FarmActionKey, FarmFeatureKey } from '../chapters/farmChapters'
import type { FarmAction, FarmState } from '../state/useFarm'
import { farmHealthFactor, farmMaxBorrow } from '../state/useFarm'
import { matchingGoldAmount, price } from '../sim/pool'
import { borrowApr, utilization, LTV_MAX } from '../sim/lending'

const fmt = (n: number, digits = 1) =>
  n.toLocaleString('en-US', { maximumFractionDigits: digits })
const pct = (n: number) => `${(n * 100).toFixed(1)}%`

export const LOCK_AMOUNT = 300
export const BORROW_AMOUNT = 100
export const LP_GEM_AMOUNT = 100
export const REPAY_AMOUNT = 50

interface Props {
  state: FarmState
  dispatch: Dispatch<FarmAction>
  actions: Set<FarmActionKey>
  features: Set<FarmFeatureKey>
  onPriceShock: () => void
}

export function FarmHud({ state, dispatch, actions, features, onPriceShock }: Props) {
  const { pool, gemMarket, wallet, goldLocked, gemDebt } = state
  const gemPrice = price(pool, 'GEM')
  const hf = farmHealthFactor(state)
  const borrowable = farmMaxBorrow(state)
  const lpGold = matchingGoldAmount(pool, LP_GEM_AMOUNT)
  const market = { ...gemMarket, price: 1 }
  const freeGold =
    gemDebt <= 0
      ? goldLocked
      : Math.max(0, goldLocked - (gemDebt * gemPrice) / LTV_MAX)
  const sharePct =
    pool.totalShares === 0 ? 0 : (wallet.shares / pool.totalShares) * 100

  return (
    <div className="hud">
      {features.has('tank') && (
        <section>
          <h2>Pool</h2>
          <div className="row"><span className="gem">GEM</span> {fmt(pool.reserves.GEM)}</div>
          <div className="row"><span className="gold">GOLD</span> {fmt(pool.reserves.GOLD)}</div>
          <div className="row">1 GEM = {fmt(gemPrice, 3)} GOLD</div>
        </section>
      )}

      {features.has('market') && (
        <section>
          <h2>GEM lenders</h2>
          <div className="row">
            <span className="gem">GEM</span> to borrow:{' '}
            {fmt(gemMarket.deposits - gemMarket.borrowed)}
          </div>
          <div className="row muted">
            Borrow rate: {pct(borrowApr(market))} APR at{' '}
            {pct(utilization(market))} used
          </div>
        </section>
      )}

      <section>
        <h2>Your wallet</h2>
        <div className="row"><span className="gem">GEM</span> {fmt(wallet.GEM)}</div>
        <div className="row"><span className="gold">GOLD</span> {fmt(wallet.GOLD)}</div>
        {wallet.shares > 0 && (
          <div className="row">Pool share: {fmt(sharePct, 2)}%</div>
        )}
      </section>

      {features.has('scale') && (
        <section>
          <h2>Your vault</h2>
          <div className="row">
            <span className="gold">GOLD</span> locked: {fmt(goldLocked)}
          </div>
          <div className="row">
            <span className="gem">GEM</span> debt: {fmt(gemDebt, 2)}
          </div>
          {features.has('health') && (
            <>
              <div
                className={`row ${
                  hf === Infinity ? '' : hf >= 1.25 ? 'up' : 'down'
                }`}
              >
                Health factor: {hf === Infinity ? '—' : fmt(hf, 2)}
              </div>
              <div className="row muted">
                Can still borrow: {fmt(borrowable)} GEM
              </div>
            </>
          )}
        </section>
      )}

      {actions.size > 0 && (
      <section>
        <h2>Act</h2>
        {actions.has('lock') && (
          <button
            disabled={wallet.GOLD < LOCK_AMOUNT}
            onClick={() => dispatch({ type: 'lockGold', amount: LOCK_AMOUNT })}
          >
            Lock {LOCK_AMOUNT} GOLD as collateral
          </button>
        )}
        {actions.has('borrow') && (
          <button
            disabled={borrowable < BORROW_AMOUNT}
            onClick={() => dispatch({ type: 'borrowGem', amount: BORROW_AMOUNT })}
          >
            Borrow {BORROW_AMOUNT} GEM
          </button>
        )}
        {actions.has('addLp') && (
          <button
            disabled={wallet.GEM < LP_GEM_AMOUNT || wallet.GOLD < lpGold}
            onClick={() =>
              dispatch({ type: 'addFarmLiquidity', gemAmount: LP_GEM_AMOUNT })
            }
          >
            Add liquidity ({LP_GEM_AMOUNT} GEM + matching GOLD)
          </button>
        )}
        {actions.has('removeLp') && (
          <button
            disabled={wallet.shares === 0}
            onClick={() => dispatch({ type: 'removeLp' })}
          >
            Withdraw all liquidity
          </button>
        )}
        {actions.has('repay') && (
          <button
            disabled={gemDebt <= 0 || wallet.GEM <= 0}
            onClick={() => dispatch({ type: 'repayGem', amount: REPAY_AMOUNT })}
          >
            Repay up to {REPAY_AMOUNT} GEM
          </button>
        )}
        {actions.has('reclaim') && (
          <button
            disabled={freeGold <= 0}
            onClick={() => dispatch({ type: 'reclaimGold' })}
          >
            Reclaim free collateral
          </button>
        )}
        {actions.has('shock') && (
          <button className="shock" onClick={onPriceShock}>
            Price shock (whale trade)
          </button>
        )}
      </section>
      )}
    </div>
  )
}
