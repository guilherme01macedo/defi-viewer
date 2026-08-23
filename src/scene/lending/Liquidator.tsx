import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { LendVisit } from '../../state/lendVisits'
import { LIQUIDATOR_START_RADIUS, walkerSpot } from './layout'

const WALK_IN = 1.4
const PAUSE = 1.6
const WALK_OUT = 1.4
const COLOR = '#ef4444'

const smooth = (t: number) => t * t * (3 - 2 * t)

interface Props {
  visit: LendVisit
  onDone: (id: number) => void
}

// The liquidator: a red figure that walks in, repays the debt, seizes
// the collateral (the app dispatches `liquidate` at the pause), and
// leaves with its cut.
export function Liquidator({ visit, onDone }: Props) {
  const group = useRef<THREE.Group>(null)
  const startedAt = useRef<number | null>(null)
  const finished = useRef(false)

  useFrame(({ clock }) => {
    if (!group.current) return
    if (startedAt.current === null) startedAt.current = clock.elapsedTime
    const t = clock.elapsedTime - startedAt.current

    let radius: number
    let walking = true
    if (t < WALK_IN) {
      radius = THREE.MathUtils.lerp(
        LIQUIDATOR_START_RADIUS,
        visit.pauseRadius,
        smooth(t / WALK_IN),
      )
    } else if (t < WALK_IN + PAUSE) {
      radius = visit.pauseRadius
      walking = false
    } else if (t < WALK_IN + PAUSE + WALK_OUT) {
      radius = THREE.MathUtils.lerp(
        visit.pauseRadius,
        LIQUIDATOR_START_RADIUS,
        smooth((t - WALK_IN - PAUSE) / WALK_OUT),
      )
    } else {
      if (!finished.current) {
        finished.current = true
        onDone(visit.id)
      }
      return
    }

    const spot = walkerSpot(visit.angle, radius)
    const bob = walking ? Math.abs(Math.sin(t * 9)) * 0.07 : 0
    group.current.position.set(spot.x, bob, spot.z)
    group.current.lookAt(0, bob, 0)
  })

  return (
    <group ref={group} scale={1.15}>
      <mesh position={[0, 0.42, 0]}>
        <capsuleGeometry args={[0.16, 0.45, 6, 12]} />
        <meshStandardMaterial color={COLOR} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.92, 0]}>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshStandardMaterial color={COLOR} roughness={0.4} />
      </mesh>
    </group>
  )
}
