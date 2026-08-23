import type { Dispatch } from 'react'
import type { LendActionKey, LendFeatureKey } from '../chapters/lendingChapters'
import type { LendAction, LendingState } from '../state/useLending'
import {
  borrowApr,
  healthFactor,
  maxBorrow,
  supplyApr,
  utilization,
  LTV_MAX,
} from '../sim/lending'

const fmt = (n: number, digits = 1) =>
  n.toLocaleString('en-US', { maximumFractionDigits: digits })
const pct = (n: number) => `${(n * 100).toFixed(1)}%`

export const DEPOSIT_AMOUNT = 200
export const LOCK_AMOUNT = 200
export const BORROW_AMOUNT = 100
export const REPAY_AMOUNT = 100

interface Props {
  state: LendingState
  dispatch: Dispatch<LendAction>
  actions: Set<LendActionKey>
  features: Set<LendFeatureKey>
  onCrash: () => void
}

export function LendingHud({ state, dispatch, actions, features, onCrash }: Props) {
  const { market, wallet, supplied, position, stats } = state
  const available = market.deposits - market.borrowed
  const hf = healthFactor(position, market.price)
  const borrowable = Math.min(maxBorrow(position, market.price), available)
  const freeCollateral =
    position.debt <= 0
      ? position.collateral
      : Math.max(
          0,
          position.collateral - position.debt / (market.price * LTV_MAX),
        )

  return (
    <div className="hud">
      {features.has('poolTank') && (
        <section>
          <h2>Lending pool</h2>
          <div className="row">
            <span className="gold">GOLD</span> in pool: {fmt(available)}
          </div>
          <div className="row muted">Lent out: {fmt(market.borrowed)}</div>
          {features.has('rates') && (
            <>
              <div className="row">Utilization: {pct(utilization(market))}</div>
              <div className="row">Borrowers pay: {pct(borrowApr(market))} APR</div>
              <div className="row fees">Lenders earn: {pct(supplyApr(market))} APR</div>
            </>
          )}
        </section>
      )}

      {actions.has('deposit') && (
        <section>
          <h2>Your deposit</h2>
          <div className="row">
            <span className="gold">GOLD</span> supplied: {fmt(supplied, 2)}
          </div>
          <div className="row fees">
            Interest earned: +{fmt(stats.interestEarned, 2)}
          </div>
        </section>
      )}

      <section>
        <h2>Your wallet</h2>
        <div className="row">
          <span className="gem">GEM</span> {fmt(wallet.GEM)}
        </div>
        <div className="row">
          <span className="gold">GOLD</span> {fmt(wallet.GOLD)}
        </div>
      </section>

      {features.has('scale') && (
        <section>
          <h2>Your vault</h2>
          <div className="row">
            <span className="gem">GEM</span> locked: {fmt(position.collateral)}
          </div>
          <div className="row">
            <span className="gold">GOLD</span> debt: {fmt(position.debt, 2)}
          </div>
          {features.has('healthPanel') && (
            <>
              <div
                className={`row ${
                  hf === Infinity ? '' : hf >= 1.25 ? 'up' : 'down'
                }`}
              >
                Health factor: {hf === Infinity ? '—' : fmt(hf, 2)}
              </div>
              <div className="row muted">Can still borrow: {fmt(borrowable)} GOLD</div>
            </>
          )}
        </section>
      )}

      <section>
        <h2>Act</h2>
        {actions.has('deposit') && (
          <button
            disabled={wallet.GOLD < DEPOSIT_AMOUNT}
            onClick={() => dispatch({ type: 'deposit', amount: DEPOSIT_AMOUNT })}
          >
            Deposit {DEPOSIT_AMOUNT} GOLD
          </button>
        )}
        {actions.has('withdraw') && (
          <button
            disabled={supplied <= 0 || available <= 0}
            onClick={() => dispatch({ type: 'withdrawAll' })}
          >
            Withdraw your deposit
          </button>
        )}
        {actions.has('lock') && (
          <button
            disabled={wallet.GEM < LOCK_AMOUNT}
            onClick={() => dispatch({ type: 'lock', amount: LOCK_AMOUNT })}
          >
            Lock {LOCK_AMOUNT} GEM as collateral
          </button>
        )}
        {actions.has('borrow') && (
          <button
            disabled={borrowable < BORROW_AMOUNT}
            onClick={() => dispatch({ type: 'borrow', amount: BORROW_AMOUNT })}
          >
            Borrow {BORROW_AMOUNT} GOLD
          </button>
        )}
        {actions.has('repay') && (
          <button
            disabled={position.debt <= 0 || wallet.GOLD <= 0}
            onClick={() => dispatch({ type: 'repay', amount: REPAY_AMOUNT })}
          >
            Repay up to {REPAY_AMOUNT} GOLD
          </button>
        )}
        {actions.has('unlock') && (
          <button
            disabled={freeCollateral <= 0}
            onClick={() => dispatch({ type: 'unlock' })}
          >
            Reclaim free collateral
          </button>
        )}
        {actions.has('crash') && (
          <button className="shock" onClick={onCrash}>
            Crash the market (−40%)
          </button>
        )}
      </section>
    </div>
  )
}
