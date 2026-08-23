import { useCallback, useEffect, useRef, useState } from 'react'
import { otherToken } from '../sim/pool'
import type { FlowEvent } from '../state/useSim'
import type { Visit } from '../state/visits'
import { FlowStream } from './FlowStream'
import type { StreamSpec } from './FlowStream'
import { chamberTop, flaskTop, traderPourPoint } from './layout'
import { GEM_COLOR, GOLD_COLOR } from './Tank'

const FEE_COLOR = '#4ade80'
const TOKEN_COLOR = { GEM: GEM_COLOR, GOLD: GOLD_COLOR }

const dropsFor = (amount: number) =>
  Math.min(Math.max(Math.round(amount / 8), 3), 10)

function streamsFor(e: FlowEvent, visits: Visit[]): StreamSpec[] {
  if (e.kind === 'add' || e.kind === 'remove') {
    const reverse = e.kind === 'remove'
    return (['GEM', 'GOLD'] as const).map((token) => {
      const flask = flaskTop(token)
      const chamber = chamberTop(token)
      return {
        key: `${e.id}-${token}`,
        from: reverse ? chamber : flask,
        to: reverse ? flask : chamber,
        color: TOKEN_COLOR[token],
        drops: dropsFor(token === 'GEM' ? (e.gem ?? 0) : (e.gold ?? 0)),
        size: 0.055,
        delay: 0,
      }
    })
  }

  // swaps: tokenIn pours toward the tank, tokenOut pours back out,
  // and one green droplet lands last — the fee that stays behind.
  const tokenIn = e.tokenIn!
  const tokenOut = otherToken(tokenIn)
  const visit = visits.find((v) => v.id === e.visitId)
  const outside = traderPourPoint(visit?.angle ?? 0.6)
  const src = e.kind === 'userSwap' ? flaskTop(tokenIn) : outside
  const dst = e.kind === 'userSwap' ? flaskTop(tokenOut) : outside
  const big = e.kind === 'shock'
  return [
    {
      key: `${e.id}-in`,
      from: src,
      to: chamberTop(tokenIn),
      color: TOKEN_COLOR[tokenIn],
      drops: big ? 14 : dropsFor(e.amountIn ?? 0),
      size: big ? 0.09 : 0.055,
      delay: 0,
    },
    {
      key: `${e.id}-out`,
      from: chamberTop(tokenOut),
      to: dst,
      color: TOKEN_COLOR[tokenOut],
      drops: big ? 14 : dropsFor(e.amountOut ?? 0),
      size: big ? 0.09 : 0.055,
      delay: 0.35,
    },
    {
      key: `${e.id}-fee`,
      from: src,
      to: chamberTop(tokenIn),
      color: FEE_COLOR,
      drops: 1,
      size: 0.075,
      delay: 0.55,
    },
  ]
}

interface Props {
  events: FlowEvent[]
  visits: Visit[]
}

// Watches the sim's event feed and keeps a pool of live streams.
export function Flows({ events, visits }: Props) {
  const seen = useRef(0)
  const [streams, setStreams] = useState<StreamSpec[]>([])

  useEffect(() => {
    const fresh = events.filter((e) => e.id > seen.current)
    if (fresh.length === 0) return
    seen.current = events[events.length - 1].id
    const specs = fresh.flatMap((e) => streamsFor(e, visits))
    setStreams((current) => [...current, ...specs])
  }, [events, visits])

  const handleDone = useCallback((key: string) => {
    setStreams((current) => current.filter((s) => s.key !== key))
  }, [])

  return (
    <>
      {streams.map((spec) => (
        <FlowStream key={spec.key} spec={spec} onDone={handleDone} />
      ))}
    </>
  )
}
