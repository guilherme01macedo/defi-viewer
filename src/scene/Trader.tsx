import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Visit } from '../state/visits'
import { TRADER_RADIUS, TRADER_START_RADIUS, traderSpot } from './layout'

const WALK_IN = 1.4
const PAUSE = 1.2
const WALK_OUT = 1.4

const TRADER_COLORS = ['#f472b6', '#a78bfa', '#34d399', '#fb923c']

const smooth = (t: number) => t * t * (3 - 2 * t)

interface Props {
  visit: Visit
  onDone: (id: number) => void
}

// A little figure that walks up to the tank, pauses to pour (the App
// dispatches the swap at that moment), and walks away.
export function Trader({ visit, onDone }: Props) {
  const group = useRef<THREE.Group>(null)
  const startedAt = useRef<number | null>(null)
  const finished = useRef(false)

  const color = useMemo(
    () => (visit.whale ? '#818cf8' : TRADER_COLORS[visit.id % TRADER_COLORS.length]),
    [visit],
  )
  const scale = visit.whale ? 1.8 : 1

  useFrame(({ clock }) => {
    if (!group.current) return
    if (startedAt.current === null) startedAt.current = clock.elapsedTime
    const t = clock.elapsedTime - startedAt.current

    let radius: number
    let walking = true
    if (t < WALK_IN) {
      radius = THREE.MathUtils.lerp(TRADER_START_RADIUS, TRADER_RADIUS, smooth(t / WALK_IN))
    } else if (t < WALK_IN + PAUSE) {
      radius = TRADER_RADIUS
      walking = false
    } else if (t < WALK_IN + PAUSE + WALK_OUT) {
      radius = THREE.MathUtils.lerp(TRADER_RADIUS, TRADER_START_RADIUS, smooth((t - WALK_IN - PAUSE) / WALK_OUT))
    } else {
      if (!finished.current) {
        finished.current = true
        onDone(visit.id)
      }
      return
    }

    const spot = traderSpot(visit.angle, radius)
    const bob = walking ? Math.abs(Math.sin(t * 9)) * 0.07 : 0
    group.current.position.set(spot.x, bob, spot.z)
    group.current.lookAt(0, bob, 0)
  })

  return (
    <group ref={group} scale={scale}>
      <mesh position={[0, 0.42, 0]}>
        <capsuleGeometry args={[0.16, 0.45, 6, 12]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.92, 0]}>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
    </group>
  )
}
