import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

const FLASK_HEIGHT = 1.3
const FULL_AT = 800 // tokens that fill the flask to the brim

interface Props {
  position: [number, number, number]
  color: string
  label: string
  balance: number
}

// A wallet flask: a glass cylinder whose liquid level is the balance.
export function Flask({ position, color, label, balance }: Props) {
  const liquid = useRef<THREE.Mesh>(null)
  const target = Math.min(balance / FULL_AT, 1) * (FLASK_HEIGHT - 0.1)

  useFrame((_, delta) => {
    if (!liquid.current) return
    const next = THREE.MathUtils.damp(
      liquid.current.scale.y,
      Math.max(target, 0.001),
      4,
      delta,
    )
    liquid.current.scale.y = next
    liquid.current.position.y = next / 2
  })

  return (
    <group position={position}>
      <mesh ref={liquid} position={[0, target / 2, 0]} scale={[1, target, 1]}>
        <cylinderGeometry args={[0.3, 0.3, 1, 24]} />
        <meshStandardMaterial color={color} transparent opacity={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0, FLASK_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.36, 0.36, FLASK_HEIGHT, 24, 1, true]} />
        <meshStandardMaterial
          color="#a5f3fc"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <Text position={[0, FLASK_HEIGHT + 0.3, 0]} fontSize={0.19} color={color}>
        {label}
      </Text>
    </group>
  )
}
