import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Pool, Wallet } from '../sim/pool'
import type { FlowEvent } from '../state/useSim'
import type { Visit } from '../state/visits'
import { Flask } from './Flask'
import { Flows } from './Flows'
import { FLASK_GROUP } from './layout'
import { GEM_COLOR, GOLD_COLOR, Tank } from './Tank'
import { Trader } from './Trader'

interface Props {
  pool: Pool
  wallet: Wallet
  showTank: boolean
  events: FlowEvent[]
  visits: Visit[]
  onVisitDone: (id: number) => void
}

export function PoolScene({ pool, wallet, showTank, events, visits, onVisitDone }: Props) {
  return (
    <Canvas camera={{ position: [4.5, 3.5, 6], fov: 45 }}>
      <color attach="background" args={['#0b1020']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <directionalLight position={[-5, 4, -3]} intensity={0.4} />
      {showTank && <Tank pool={pool} />}
      <group position={showTank ? FLASK_GROUP : [0, 0, 1]}>
        <Flask position={[-0.55, 0, 0]} color={GEM_COLOR} label="GEM" balance={wallet.GEM} />
        <Flask position={[0.55, 0, 0]} color={GOLD_COLOR} label="GOLD" balance={wallet.GOLD} />
      </group>
      {showTank && <Flows events={events} visits={visits} />}
      {showTank &&
        visits.map((visit) => (
          <Trader key={visit.id} visit={visit} onDone={onVisitDone} />
        ))}
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
