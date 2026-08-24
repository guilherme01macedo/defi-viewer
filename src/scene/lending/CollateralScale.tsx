import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { LIQ_THRESHOLD } from '../../sim/lending'
import { GEM_COLOR, GOLD_COLOR } from '../Tank'

// A true balance: the beam weighs the debt against the discounted
// collateral value. It is level exactly at health factor 1 — the red
// tick marks that line — and the heavier side hangs lower.
const PIVOT_Y = 2.05
const ARM = 0.9 // pan distance from the pivot along the beam
const PAN_DROP = 0.55
const FULL_AT = 500 // tokens that fill a pan's flask

interface Props {
  position: [number, number, number]
  collateral: number // collateral tokens locked
  debt: number // debt tokens owed
  price: number // price of the collateral token, in debt-token units
  collateralColor?: string
  collateralLabel?: string
  debtColor?: string
  debtLabel?: string
}

// tilt 0 = level = health factor 1; positive = debt side sinking.
function targetTilt(collateral: number, debt: number, price: number): number {
  if (debt <= 0) return -0.22 // collateral side rests down: nothing owed
  const value = collateral * price * LIQ_THRESHOLD
  const ratio = value <= 0 ? 10 : debt / value // 1 / health factor
  return THREE.MathUtils.clamp((ratio - 1) * 0.6, -0.32, 0.4)
}

export function CollateralScale({
  position,
  collateral,
  debt,
  price,
  collateralColor = GEM_COLOR,
  collateralLabel = 'COLLATERAL',
  debtColor = GOLD_COLOR,
  debtLabel = 'DEBT',
}: Props) {
  const beam = useRef<THREE.Group>(null)
  const leftPan = useRef<THREE.Group>(null)
  const rightPan = useRef<THREE.Group>(null)
  const leftRod = useRef<THREE.Mesh>(null)
  const rightRod = useRef<THREE.Mesh>(null)

  const collateralHeight = Math.min(collateral / FULL_AT, 1) * 0.8
  const debtHeight = Math.min(debt / FULL_AT, 1) * 0.8

  useFrame((_, delta) => {
    if (!beam.current || !leftPan.current || !rightPan.current) return
    const tilt = THREE.MathUtils.damp(
      -beam.current.rotation.z,
      targetTilt(collateral, debt, price),
      3,
      delta,
    )
    beam.current.rotation.z = -tilt
    // pans hang plumb from the beam tips, connected by rods
    for (const [panRef, rodRef, side] of [
      [leftPan, leftRod, -1],
      [rightPan, rightRod, 1],
    ] as const) {
      const tipX = side * ARM * Math.cos(tilt)
      const tipY = PIVOT_Y - side * ARM * Math.sin(tilt)
      panRef.current!.position.set(tipX, tipY - PAN_DROP, 0)
      rodRef.current!.position.set(tipX, tipY - PAN_DROP / 2, 0)
    }
  })

  return (
    <group position={position}>
      {/* base and post */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.3, 0.36, 0.16, 20]} />
        <meshStandardMaterial color="#475569" roughness={0.5} />
      </mesh>
      <mesh position={[0, PIVOT_Y / 2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, PIVOT_Y, 12]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} />
      </mesh>

      {/* beam */}
      <group ref={beam} position={[0, PIVOT_Y, 0]}>
        <mesh>
          <boxGeometry args={[ARM * 2 + 0.2, 0.06, 0.06]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.4} />
        </mesh>
      </group>

      {/* hanger rods, repositioned every frame to stay plumb */}
      <mesh ref={leftRod} position={[-ARM, PIVOT_Y - PAN_DROP / 2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, PAN_DROP, 8]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.4} />
      </mesh>
      <mesh ref={rightRod} position={[ARM, PIVOT_Y - PAN_DROP / 2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, PAN_DROP, 8]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.4} />
      </mesh>

      {/* the danger gauge: a red-tipped stake at the level line — the
          debt tip sinks to it at health factor 1, and past it the
          liquidator comes */}
      <mesh position={[ARM + 0.28, PIVOT_Y / 2, 0]}>
        <cylinderGeometry args={[0.018, 0.018, PIVOT_Y, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.5} />
      </mesh>
      <mesh position={[ARM + 0.28, PIVOT_Y, 0]}>
        <boxGeometry args={[0.14, 0.05, 0.14]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.4} />
      </mesh>

      {/* collateral pan: a sealed flask of GEM */}
      <group ref={leftPan} position={[-ARM, PIVOT_Y - PAN_DROP, 0]}>
        <mesh>
          <cylinderGeometry args={[0.36, 0.36, 0.05, 20]} />
          <meshStandardMaterial color="#475569" roughness={0.5} />
        </mesh>
        <mesh
          position={[0, 0.05 + collateralHeight / 2, 0]}
          scale={[1, Math.max(collateralHeight, 0.001), 1]}
        >
          <cylinderGeometry args={[0.24, 0.24, 1, 20]} />
          <meshStandardMaterial color={collateralColor} transparent opacity={0.9} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.29, 0.29, 0.9, 20, 1, true]} />
          <meshStandardMaterial
            color="#a5f3fc"
            transparent
            opacity={0.12}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        {/* the seal: locked while it backs a loan */}
        <mesh position={[0, 0.97, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.06, 20]} />
          <meshStandardMaterial color="#64748b" roughness={0.4} />
        </mesh>
      </group>

      {/* debt pan: the GOLD you owe */}
      <group ref={rightPan} position={[ARM, PIVOT_Y - PAN_DROP, 0]}>
        <mesh>
          <cylinderGeometry args={[0.36, 0.36, 0.05, 20]} />
          <meshStandardMaterial color="#475569" roughness={0.5} />
        </mesh>
        <mesh
          position={[0, 0.05 + debtHeight / 2, 0]}
          scale={[1, Math.max(debtHeight, 0.001), 1]}
        >
          <cylinderGeometry args={[0.24, 0.24, 1, 20]} />
          <meshStandardMaterial color={debtColor} transparent opacity={0.9} roughness={0.15} />
        </mesh>
      </group>

      <Text position={[-ARM, 2.65, 0]} fontSize={0.13} color={collateralColor}>
        {collateralLabel}
      </Text>
      <Text position={[ARM, 2.65, 0]} fontSize={0.13} color={debtColor}>
        {debtLabel}
      </Text>
      <Text position={[0, 3.0, 0]} fontSize={0.2} color="#94a3b8">
        YOUR VAULT
      </Text>
    </group>
  )
}
