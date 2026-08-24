import { useCallback, useEffect, useRef, useState } from 'react'
import type { FarmEvent } from '../../state/useFarm'
import type { LendVisit } from '../../state/lendVisits'
import { FlowStream } from '../FlowStream'
import type { StreamSpec } from '../FlowStream'
import { GEM_COLOR, GOLD_COLOR } from '../Tank'
import { flaskTop } from '../layout'
import { collateralPanTop, walkerSpot } from '../lending/layout'
import { gemTankTop } from './layout'

const dropsFor = (amount: number) =>
  Math.min(Math.max(Math.round(amount / 8), 3), 10)

function streamsFor(e: FarmEvent, visits: LendVisit[]): StreamSpec[] {
  switch (e.kind) {
    case 'lock':
      return [
        {
          key: `${e.id}`,
          from: flaskTop('GOLD'),
          to: collateralPanTop(),
          color: GOLD_COLOR,
          drops: dropsFor(e.amount),
          size: 0.055,
          delay: 0,
        },
      ]
    case 'reclaim':
      return [
        {
          key: `${e.id}`,
          from: collateralPanTop(),
          to: flaskTop('GOLD'),
          color: GOLD_COLOR,
          drops: dropsFor(e.amount),
          size: 0.055,
          delay: 0,
        },
      ]
    case 'borrow':
      return [
        {
          key: `${e.id}`,
          from: gemTankTop(),
          to: flaskTop('GEM'),
          color: GEM_COLOR,
          drops: dropsFor(e.amount),
          size: 0.055,
          delay: 0,
        },
      ]
    case 'repay':
      return [
        {
          key: `${e.id}`,
          from: flaskTop('GEM'),
          to: gemTankTop(),
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
        : gemTankTop()
      return [
        // the liquidator repays the GEM debt to the lenders' tank...
        {
          key: `${e.id}-repay`,
          from: spot,
          to: gemTankTop(),
          color: GEM_COLOR,
          drops: dropsFor(e.gem ?? 0),
          size: 0.065,
          delay: 0,
        },
        // ...and seizes GOLD collateral from the scale
        {
          key: `${e.id}-seize`,
          from: collateralPanTop(),
          to: spot,
          color: GOLD_COLOR,
          drops: dropsFor(e.amount),
          size: 0.065,
          delay: 0.4,
        },
      ]
    }
  }
}

interface Props {
  events: FarmEvent[]
  visits: LendVisit[]
}

// Watches the farm's lending-side event feed; the pool-side events go
// through the shared Flows component instead.
export function FarmFlows({ events, visits }: Props) {
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
