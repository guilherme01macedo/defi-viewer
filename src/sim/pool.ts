// Pure simulation of a constant-product AMM pool (Uniswap v2 style).
// No Three.js, no React. This module is the source of truth; the scene
// only renders what happens here.

export type TokenId = 'GEM' | 'GOLD'

export interface Reserves {
  GEM: number
  GOLD: number
}

export interface Pool {
  reserves: Reserves
  totalShares: number
  feeRate: number
}

export interface Wallet {
  GEM: number
  GOLD: number
  shares: number
}

export const otherToken = (token: TokenId): TokenId =>
  token === 'GEM' ? 'GOLD' : 'GEM'

export function createPool(gem: number, gold: number, feeRate = 0.003): Pool {
  return {
    reserves: { GEM: gem, GOLD: gold },
    totalShares: Math.sqrt(gem * gold),
    feeRate,
  }
}

// Price of one unit of `token`, measured in the other token.
export function price(pool: Pool, token: TokenId): number {
  return pool.reserves[otherToken(token)] / pool.reserves[token]
}

export interface SwapQuote {
  amountOut: number
  feePaid: number
  priceImpact: number
}

export function quoteSwap(
  pool: Pool,
  tokenIn: TokenId,
  amountIn: number,
): SwapQuote {
  const tokenOut = otherToken(tokenIn)
  const reserveIn = pool.reserves[tokenIn]
  const reserveOut = pool.reserves[tokenOut]
  const feePaid = amountIn * pool.feeRate
  const amountInAfterFee = amountIn - feePaid
  const amountOut = (reserveOut * amountInAfterFee) / (reserveIn + amountInAfterFee)
  const spotPrice = price(pool, tokenIn)
  const effectivePrice = amountOut / amountIn
  return {
    amountOut,
    feePaid,
    priceImpact: 1 - effectivePrice / spotPrice,
  }
}

export interface SwapResult {
  pool: Pool
  amountOut: number
  feePaid: number
}

export function swap(
  pool: Pool,
  tokenIn: TokenId,
  amountIn: number,
): SwapResult {
  if (amountIn <= 0) throw new Error('amountIn must be positive')
  const tokenOut = otherToken(tokenIn)
  const { amountOut, feePaid } = quoteSwap(pool, tokenIn, amountIn)
  const reserves: Reserves = { ...pool.reserves }
  // The fee stays in the reserves, so k grows on every swap.
  // That growth is what liquidity providers earn.
  reserves[tokenIn] += amountIn
  reserves[tokenOut] -= amountOut
  return { pool: { ...pool, reserves }, amountOut, feePaid }
}

// For a proportional deposit: how much GOLD must join `gemAmount` of GEM.
export function matchingGoldAmount(pool: Pool, gemAmount: number): number {
  return (gemAmount * pool.reserves.GOLD) / pool.reserves.GEM
}

export interface AddLiquidityResult {
  pool: Pool
  sharesMinted: number
}

// Deposits must be proportional to the current reserves (use
// matchingGoldAmount to compute the GOLD side).
export function addLiquidity(
  pool: Pool,
  gemAmount: number,
  goldAmount: number,
): AddLiquidityResult {
  if (gemAmount <= 0 || goldAmount <= 0) {
    throw new Error('deposit amounts must be positive')
  }
  const sharesMinted = (gemAmount / pool.reserves.GEM) * pool.totalShares
  return {
    pool: {
      ...pool,
      reserves: {
        GEM: pool.reserves.GEM + gemAmount,
        GOLD: pool.reserves.GOLD + goldAmount,
      },
      totalShares: pool.totalShares + sharesMinted,
    },
    sharesMinted,
  }
}

export interface RemoveLiquidityResult {
  pool: Pool
  gemOut: number
  goldOut: number
}

export function removeLiquidity(
  pool: Pool,
  shares: number,
): RemoveLiquidityResult {
  if (shares <= 0 || shares > pool.totalShares) {
    throw new Error('invalid share amount')
  }
  const fraction = shares / pool.totalShares
  const gemOut = pool.reserves.GEM * fraction
  const goldOut = pool.reserves.GOLD * fraction
  return {
    pool: {
      ...pool,
      reserves: {
        GEM: pool.reserves.GEM - gemOut,
        GOLD: pool.reserves.GOLD - goldOut,
      },
      totalShares: pool.totalShares - shares,
    },
    gemOut,
    goldOut,
  }
}

// What `shares` would pay out right now.
export function positionAmounts(
  pool: Pool,
  shares: number,
): { gem: number; gold: number } {
  const fraction = pool.totalShares === 0 ? 0 : shares / pool.totalShares
  return {
    gem: pool.reserves.GEM * fraction,
    gold: pool.reserves.GOLD * fraction,
  }
}

// Impermanent loss for a price ratio r = priceNow / priceAtDeposit.
// Returns a fraction: -0.057 means the position is worth 5.7% less
// than simply holding both tokens. Fees are not included here — they
// offset the loss and are tracked separately by the caller.
export function impermanentLoss(priceRatio: number): number {
  if (priceRatio <= 0) throw new Error('price ratio must be positive')
  return (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1
}
