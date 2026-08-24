import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { LendingState } from '../../state/useLending'
import type { LendVisit } from '../../state/lendVisits'
import type { LendFeatureKey } from '../../chapters/lendingChapters'
import { Flask } from '../Flask'
import { GEM_COLOR, GOLD_COLOR } from '../Tank'
import { CollateralScale } from './CollateralScale'
import { LendFlows } from './LendFlows'
import { LendingPoolTank } from './LendingPoolTank'
import { Liquidator } from './Liquidator'
import { LEND_FLASKS, SCALE_POS } from './layout'

interface Props {
  state: LendingState
  features: Set<LendFeatureKey>
  visits: LendVisit[]
  onVisitDone: (id: number) => void
}

export function LendingScene({ state, features, visits, onVisitDone }: Props) {
  const showTank = features.has('poolTank')
  return (
    <Canvas camera={{ position: [4.5, 3.5, 6], fov: 45 }}>
      <color attach="background" args={['#0b1020']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <directionalLight position={[-5, 4, -3]} intensity={0.4} />
      {showTank && (
        <LendingPoolTank
          deposits={state.market.deposits}
          borrowed={state.market.borrowed}
        />
      )}
      {features.has('scale') && (
        <CollateralScale
          position={SCALE_POS}
          collateral={state.position.collateral}
          debt={state.position.debt}
          price={state.market.price}
        />
      )}
      <group position={LEND_FLASKS}>
        <Flask position={[-0.55, 0, 0]} color={GEM_COLOR} label="GEM" balance={state.wallet.GEM} />
        <Flask position={[0.55, 0, 0]} color={GOLD_COLOR} label="GOLD" balance={state.wallet.GOLD} />
      </group>
      {showTank && <LendFlows events={state.events} visits={visits} />}
      {visits.map((visit) => (
        <Liquidator key={visit.id} visit={visit} onDone={onVisitDone} />
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
