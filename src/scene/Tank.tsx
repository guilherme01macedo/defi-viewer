import { Text } from '@react-three/drei'
import type { Pool } from '../sim/pool'
import { LiquidColumn } from './LiquidColumn'

export const GEM_COLOR = '#38bdf8'
export const GOLD_COLOR = '#fbbf24'

// 1000 tokens of reserve == 2 world units of liquid height.
const HEIGHT_PER_TOKEN = 2 / 1000
const CHAMBER = 1.6
const WALL_HEIGHT = 3.2

interface Props {
  pool: Pool
}

// The pool as a two-chambered glass tank. The liquid levels ARE the
// reserves; the ratio of the levels is the price.
export function Tank({ pool }: Props) {
  const gemHeight = pool.reserves.GEM * HEIGHT_PER_TOKEN
  const goldHeight = pool.reserves.GOLD * HEIGHT_PER_TOKEN
  const half = CHAMBER / 2 + 0.05

  return (
    <group>
      <LiquidColumn x={-half} width={CHAMBER} color={GEM_COLOR} targetHeight={gemHeight} />
      <LiquidColumn x={half} width={CHAMBER} color={GOLD_COLOR} targetHeight={goldHeight} />

      {/* glass walls */}
      <mesh position={[0, WALL_HEIGHT / 2, 0]}>
        <boxGeometry args={[CHAMBER * 2 + 0.3, WALL_HEIGHT, CHAMBER + 0.2]} />
        <meshStandardMaterial color="#a5f3fc" transparent opacity={0.08} depthWrite={false} />
      </mesh>
      {/* divider between the chambers */}
      <mesh position={[0, WALL_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.04, WALL_HEIGHT, CHAMBER + 0.2]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.35} />
      </mesh>

      <Text position={[-half, WALL_HEIGHT + 0.35, 0]} fontSize={0.32} color={GEM_COLOR}>
        GEM
      </Text>
      <Text position={[half, WALL_HEIGHT + 0.35, 0]} fontSize={0.32} color={GOLD_COLOR}>
        GOLD
      </Text>
    </group>
  )
}
