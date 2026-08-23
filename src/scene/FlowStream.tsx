import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const TRAVEL = 0.55 // seconds one droplet is in the air
const STAGGER = 0.09

export interface StreamSpec {
  key: string
  from: THREE.Vector3
  to: THREE.Vector3
  color: string
  drops: number
  size: number
  delay: number
}

interface Props {
  spec: StreamSpec
  onDone: (key: string) => void
}

// A burst of droplets arcing from `from` to `to` along a quadratic
// bezier. Purely visual: it animates a flow the sim already applied.
export function FlowStream({ spec, onDone }: Props) {
  const group = useRef<THREE.Group>(null)
  const startedAt = useRef<number | null>(null)
  const finished = useRef(false)

  const ctrl = useMemo(() => {
    const mid = spec.from.clone().lerp(spec.to, 0.5)
    mid.y = Math.max(spec.from.y, spec.to.y) + 0.9
    return mid
  }, [spec])

  useFrame(({ clock }) => {
    if (!group.current) return
    if (startedAt.current === null) startedAt.current = clock.elapsedTime
    const t = clock.elapsedTime - startedAt.current - spec.delay

    group.current.children.forEach((child, i) => {
      const ti = (t - i * STAGGER) / TRAVEL
      if (ti < 0 || ti > 1) {
        child.visible = false
        return
      }
      child.visible = true
      // quadratic bezier
      const a = spec.from.clone().lerp(ctrl, ti)
      const b = ctrl.clone().lerp(spec.to, ti)
      child.position.copy(a.lerp(b, ti))
    })

    const total = spec.delay + TRAVEL + spec.drops * STAGGER
    if (!finished.current && t > total) {
      finished.current = true
      onDone(spec.key)
    }
  })

  return (
    <group ref={group}>
      {Array.from({ length: spec.drops }, (_, i) => (
        <mesh key={i} visible={false}>
          <sphereGeometry args={[spec.size, 10, 10]} />
          <meshStandardMaterial
            color={spec.color}
            emissive={spec.color}
            emissiveIntensity={0.35}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  )
}
