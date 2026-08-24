import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { price } from '../../sim/pool'
import type { FarmState } from '../../state/useFarm'
import type { Visit } from '../../state/visits'
import type { LendVisit } from '../../state/lendVisits'
import type { FarmFeatureKey } from '../../chapters/farmChapters'
import { Flask } from '../Flask'
import { Flows } from '../Flows'
import { Trader } from '../Trader'
import { FLASK_GROUP } from '../layout'
import { GEM_COLOR, GOLD_COLOR, Tank } from '../Tank'
import { CollateralScale } from '../lending/CollateralScale'
import { LendingPoolTank } from '../lending/LendingPoolTank'
import { Liquidator } from '../lending/Liquidator'
import { SCALE_POS } from '../lending/layout'
import { FarmFlows } from './FarmFlows'
import { GEM_TANK_POS, GEM_TANK_SCALE } from './layout'

interface Props {
  state: FarmState
  features: Set<FarmFeatureKey>
  traderVisits: Visit[]
  onTraderDone: (id: number) => void
  liqVisits: LendVisit[]
  onLiqDone: (id: number) => void
}

export function FarmScene({
  state,
  features,
  traderVisits,
  onTraderDone,
  liqVisits,
  onLiqDone,
}: Props) {
  const showTank = features.has('tank')
  return (
    <Canvas camera={{ position: [4.5, 3.5, 6], fov: 45 }}>
      <color attach="background" args={['#0b1020']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <directionalLight position={[-5, 4, -3]} intensity={0.4} />
      {showTank && <Tank pool={state.pool} />}
      {features.has('market') && (
        <group position={GEM_TANK_POS} scale={GEM_TANK_SCALE}>
          <LendingPoolTank
            deposits={state.gemMarket.deposits}
            borrowed={state.gemMarket.borrowed}
            color={GEM_COLOR}
            title="GEM LENDERS"
          />
        </group>
      )}
      {features.has('scale') && (
        <CollateralScale
          position={SCALE_POS}
          collateral={state.goldLocked}
          debt={state.gemDebt}
          price={1 / price(state.pool, 'GEM')}
          collateralColor={GOLD_COLOR}
          debtColor={GEM_COLOR}
        />
      )}
      <group position={FLASK_GROUP}>
        <Flask position={[-0.55, 0, 0]} color={GEM_COLOR} label="GEM" balance={state.wallet.GEM} />
        <Flask position={[0.55, 0, 0]} color={GOLD_COLOR} label="GOLD" balance={state.wallet.GOLD} />
      </group>
      {showTank && <Flows events={state.poolEvents} visits={traderVisits} />}
      {features.has('scale') && (
        <FarmFlows events={state.farmEvents} visits={liqVisits} />
      )}
      {showTank &&
        traderVisits.map((visit) => (
          <Trader key={visit.id} visit={visit} onDone={onTraderDone} />
        ))}
      {liqVisits.map((visit) => (
        <Liquidator key={visit.id} visit={visit} onDone={onLiqDone} />
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
