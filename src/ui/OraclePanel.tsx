const W = 240
const H = 80
const PAD = 4

interface Props {
  history: number[]
  price: number
}

// The oracle's GEM price as a small ticker. In this world nobody sets
// the price by hand — the market drifts, and everyone reads the same
// feed.
export function OraclePanel({ history, price }: Props) {
  const min = Math.min(...history)
  const max = Math.max(...history)
  const span = Math.max(max - min, 0.02)
  const points = history
    .map((p, i) => {
      const x = PAD + (i / Math.max(history.length - 1, 1)) * (W - PAD * 2)
      const y = H - PAD - ((p - min) / span) * (H - PAD * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <div className="curve-panel">
      <h2>Price oracle</h2>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <polyline
          points={points}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="oracle-price">
        1 <span className="gem">GEM</span> ={' '}
        {price.toLocaleString('en-US', { maximumFractionDigits: 3 })}{' '}
        <span className="gold">GOLD</span>
      </div>
    </div>
  )
}
