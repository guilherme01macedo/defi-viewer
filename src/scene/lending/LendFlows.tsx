import { useCallback, useEffect, useRef, useState } from 'react'
import type { LendEvent } from '../../state/useLending'
import type { LendVisit } from '../../state/lendVisits'
import { FlowStream } from '../FlowStream'
import type { StreamSpec } from '../FlowStream'
import { GEM_COLOR, GOLD_COLOR } from '../Tank'
import { collateralPanTop, lendFlaskTop, tankTop, walkerSpot } from './layout'

const dropsFor = (amount: number) =>
  Math.min(Math.max(Math.round(amount / 8), 3), 10)

function streamsFor(e: LendEvent, visits: LendVisit[]): StreamSpec[] {
  const goldFlask = lendFlaskTop('GOLD')
  const gemFlask = lendFlaskTop('GEM')
  switch (e.kind) {
    case 'deposit':
    case 'repay':
      return [
        {
          key: `${e.id}`,
          from: goldFlask,
          to: tankTop(),
          color: GOLD_COLOR,
          drops: dropsFor(e.amount),
          size: 0.055,
          delay: 0,
        },
      ]
    case 'withdraw':
    case 'borrow':
      return [
        {
          key: `${e.id}`,
          from: tankTop(),
          to: goldFlask,
          color: GOLD_COLOR,
          drops: dropsFor(e.amount),
          size: 0.055,
          delay: 0,
        },
      ]
    case 'lock':
      return [
        {
          key: `${e.id}`,
          from: gemFlask,
          to: collateralPanTop(),
          color: GEM_COLOR,
          drops: dropsFor(e.amount),
          size: 0.055,
          delay: 0,
        },
      ]
    case 'unlock':
      return [
        {
          key: `${e.id}`,
          from: collateralPanTop(),
          to: gemFlask,
          color: GEM_COLOR,
          drops: dropsFor(e.amount),
          size: 0.055,
          delay: 0,
        },
      ]
    case 'liquidate': {
      const visit = visits.find((v) => v.id === e.visitId)
      const spot = visit
        ? walkerSpot(visit.angle, visit.pauseRadius).setY(1.15)
        : tankTop()
      const streams: StreamSpec[] = [
        // the liquidator repays the debt: GOLD returns to the pool
        {
          key: `${e.id}-repay`,
          from: spot,
          to: tankTop(),
          color: GOLD_COLOR,
          drops: dropsFor(e.gold ?? 0),
          size: 0.065,
          delay: 0,
        },
      ]
      // the user's collateral is on the scale; NPC vaults are off-scene
      if (e.who === 'user') {
        streams.push({
          key: `${e.id}-seize`,
          from: collateralPanTop(),
          to: spot,
          color: GEM_COLOR,
          drops: dropsFor(e.amount),
          size: 0.065,
          delay: 0.4,
        })
      }
      return streams
    }
    case 'crash':
      return []
  }
}

interface Props {
  events: LendEvent[]
  visits: LendVisit[]
}

// Watches the lending event feed and keeps a pool of live streams.
export function LendFlows({ events, visits }: Props) {
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
