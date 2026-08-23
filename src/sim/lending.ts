// Pure lending-market simulation. No React, no Three.js.
//
// One market: suppliers deposit GOLD, borrowers lock GEM as collateral
// and take GOLD out. Interest flows from borrowers to suppliers. The
// GEM price comes from an external oracle value stored on the market.

export const LTV_MAX = 0.66 // borrow up to 66% of collateral value
export const LIQ_THRESHOLD = 0.8 // liquidation starts at 80%
export const LIQ_BONUS = 0.1 // liquidator's discount on seized collateral
export const BASE_RATE = 0.05 // borrow APR at 0% utilization
export const RATE_SLOPE = 0.45 // extra borrow APR at 100% utilization

export interface LendingMarket {
  deposits: number // GOLD supplied to the pool
  borrowed: number // GOLD currently out on loan
  price: number // oracle price of GEM, in GOLD
}

export interface Position {
  collateral: number // GEM locked
  debt: number // GOLD owed
}

export const utilization = (m: LendingMarket): number =>
  m.deposits <= 0 ? 0 : m.borrowed / m.deposits

export const borrowApr = (m: LendingMarket): number =>
  BASE_RATE + RATE_SLOPE * utilization(m)

// Suppliers share the interest that borrowers pay, so the supply rate
// is the borrow rate scaled by how much of the pool is lent out.
export const supplyApr = (m: LendingMarket): number =>
  borrowApr(m) * utilization(m)

export const healthFactor = (p: Position, price: number): number =>
  p.debt <= 0 ? Infinity : (p.collateral * price * LIQ_THRESHOLD) / p.debt

export const maxBorrow = (p: Position, price: number): number =>
  Math.max(0, p.collateral * price * LTV_MAX - p.debt)

// GOLD of interest a debt of `principal` accrues over `days`.
export const interestOn = (
  principal: number,
  apr: number,
  days: number,
): number => principal * apr * (days / 365)

export interface LiquidationResult {
  position: Position // debt cleared, seized collateral removed
  seizedGem: number // collateral handed to the liquidator
  repaidGold: number // debt the liquidator paid off
}

// The liquidator repays the whole debt and takes collateral worth the
// debt plus a bonus. Any collateral beyond that stays locked for the
// borrower.
export function liquidate(p: Position, price: number): LiquidationResult {
  const seizedGem = Math.min(p.collateral, (p.debt * (1 + LIQ_BONUS)) / price)
  return {
    position: { collateral: p.collateral - seizedGem, debt: 0 },
    seizedGem,
    repaidGold: p.debt,
  }
}
