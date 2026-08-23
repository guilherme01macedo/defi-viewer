import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  x: number
  width: number
  color: string
  targetHeight: number
}

// A box of "liquid" that eases toward its target height, so state
// changes read as the tank filling or draining rather than snapping.
export function LiquidColumn({ x, width, color, targetHeight }: Props) {
  const mesh = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (!mesh.current) return
    const current = mesh.current.scale.y
    const next = THREE.MathUtils.damp(current, Math.max(targetHeight, 0.001), 4, delta)
    mesh.current.scale.y = next
    mesh.current.position.y = next / 2
  })

  return (
    <mesh ref={mesh} position={[x, targetHeight / 2, 0]} scale={[width, targetHeight, width]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.85}
        roughness={0.15}
        metalness={0.1}
      />
    </mesh>
  )
}
