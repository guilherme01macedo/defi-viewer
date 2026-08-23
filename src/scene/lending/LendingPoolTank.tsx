import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import type { LendingMarket } from '../../sim/lending'
import { GOLD_COLOR } from '../Tank'

// 1500 tokens of GOLD == 2 world units, unless the pool would overflow
// the glass — then the scale shrinks so everything stays inside.
const HEIGHT_PER_TOKEN = 2 / 1500
const CHAMBER = 1.6
const WALL_HEIGHT = 3.2
const MAX_LIQUID = WALL_HEIGHT - 0.25

interface Props {
  market: LendingMarket
}

// The lending pool as a single glass tank. The solid GOLD is the
// liquidity still in the pool; the faint column above it is the claim
// on GOLD already lent out — a promise, not liquid.
export function LendingPoolTank({ market }: Props) {
  const solid = useRef<THREE.Mesh>(null)
  const ghost = useRef<THREE.Mesh>(null)

  const unit = Math.min(HEIGHT_PER_TOKEN, MAX_LIQUID / Math.max(market.deposits, 1))
  const availableHeight = (market.deposits - market.borrowed) * unit
  const ghostHeight = market.borrowed * unit

  useFrame((_, delta) => {
    if (!solid.current || !ghost.current) return
    const a = THREE.MathUtils.damp(
      solid.current.scale.y,
      Math.max(availableHeight, 0.001),
      4,
      delta,
    )
    solid.current.scale.y = a
    solid.current.position.y = a / 2
    const g = THREE.MathUtils.damp(
      ghost.current.scale.y,
      Math.max(ghostHeight, 0.001),
      4,
      delta,
    )
    ghost.current.scale.y = g
    ghost.current.position.y = a + g / 2
  })

  return (
    <group>
      {/* GOLD still in the pool */}
      <mesh ref={solid} scale={[CHAMBER, 0.001, CHAMBER]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={GOLD_COLOR}
          transparent
          opacity={0.85}
          roughness={0.15}
          metalness={0.1}
        />
      </mesh>
      {/* the lent-out claim: a promise, not liquid */}
      <mesh ref={ghost} scale={[CHAMBER, 0.001, CHAMBER]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={GOLD_COLOR}
          transparent
          opacity={0.14}
          roughness={0.4}
          depthWrite={false}
        />
      </mesh>

      {/* glass walls */}
      <mesh position={[0, WALL_HEIGHT / 2, 0]}>
        <boxGeometry args={[CHAMBER + 0.3, WALL_HEIGHT, CHAMBER + 0.3]} />
        <meshStandardMaterial color="#a5f3fc" transparent opacity={0.08} depthWrite={false} />
      </mesh>

      <Text position={[0, WALL_HEIGHT + 0.35, 0]} fontSize={0.3} color={GOLD_COLOR}>
        LENDING POOL
      </Text>
    </group>
  )
}
