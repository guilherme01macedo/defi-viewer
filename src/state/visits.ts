import type { TokenId } from '../sim/pool'

// A trader (or whale) currently walking to the tank. The App schedules
// the actual swap for when the figure arrives, so liquid never moves
// before someone is there to pour it.
export interface Visit {
  id: number
  angle: number
  tokenIn: TokenId
  whale?: boolean
}
