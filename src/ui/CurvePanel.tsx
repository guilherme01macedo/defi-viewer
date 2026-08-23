import type { Pool } from '../sim/pool'

const W = 240
const H = 190
const PAD = { left: 40, right: 12, top: 12, bottom: 32 }
const DOMAIN = 2600 // tokens shown on each axis

const plotW = W - PAD.left - PAD.right
const plotH = H - PAD.top - PAD.bottom

const toX = (gem: number) => PAD.left + (gem / DOMAIN) * plotW
const toY = (gold: number) => PAD.top + plotH - (gold / DOMAIN) * plotH

interface Props {
  pool: Pool
}

// The constant-product curve gold = k / gem, with the pool's current
// reserves as a dot riding on it. k grows a little with every fee, so
// the curve itself creeps outward as fees accrue.
export function CurvePanel({ pool }: Props) {
  const k = pool.reserves.GEM * pool.reserves.GOLD

  const points: string[] = []
  const gemMin = Math.max(k / DOMAIN, DOMAIN * 0.04)
  for (let i = 0; i <= 60; i++) {
    // log spacing keeps the steep left end of the hyperbola smooth
    const t = i / 60
    const gem = gemMin * Math.pow(DOMAIN / gemMin, t)
    const gold = k / gem
    points.push(`${toX(gem).toFixed(1)},${toY(gold).toFixed(1)}`)
  }

  const cx = toX(pool.reserves.GEM)
  const cy = toY(pool.reserves.GOLD)

  return (
    <div className="curve-panel">
      <h2>The pool can only slide along this curve</h2>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Constant product curve with current reserves">
        {/* axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} className="axis" />
        <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} className="axis" />

        {/* guides from the dot to each axis: the current reserves */}
        <line x1={PAD.left} y1={cy} x2={cx} y2={cy} className="guide" />
        <line x1={cx} y1={H - PAD.bottom} x2={cx} y2={cy} className="guide" />

        <polyline points={points.join(' ')} className="curve" />

        <g style={{ transform: `translate(${cx}px, ${cy}px)`, transition: 'transform 0.5s ease' }}>
          <circle r={7} className="dot-halo" />
          <circle r={4} className="dot-core" />
        </g>

        {/* axis titles, ink for text + a colored chip for token identity */}
        <rect x={W / 2 - 34} y={H - 13} width={7} height={7} rx={1.5} fill="#38bdf8" />
        <text x={W / 2 - 23} y={H - 6} className="axis-label">GEM in pool</text>
        <g transform={`rotate(-90 14 ${H / 2 + 34})`}>
          <rect x={14} y={H / 2 + 27} width={7} height={7} rx={1.5} fill="#fbbf24" />
          <text x={25} y={H / 2 + 34} className="axis-label">GOLD in pool</text>
        </g>
      </svg>
    </div>
  )
}
