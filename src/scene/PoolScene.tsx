import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Pool } from '../sim/pool'
import { Tank } from './Tank'

interface Props {
  pool: Pool
}

export function PoolScene({ pool }: Props) {
  return (
    <Canvas camera={{ position: [4.5, 3.5, 6], fov: 45 }}>
      <color attach="background" args={['#0b1020']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <directionalLight position={[-5, 4, -3]} intensity={0.4} />
      <Tank pool={pool} />
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[7, 48]} />
        <meshStandardMaterial color="#111a33" />
      </mesh>
      <OrbitControls
        target={[0, 1.5, 0]}
        enablePan={false}
        minDistance={4}
        maxDistance={14}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  )
}
