import { useEffect, useState } from 'react'
import { PoolScene } from './scene/PoolScene'
import { Hud } from './ui/Hud'
import { useSim } from './state/useSim'

export default function App() {
  const [state, dispatch] = useSim()
  const [autoTraders, setAutoTraders] = useState(false)

  useEffect(() => {
    if (!autoTraders) return
    const id = setInterval(() => {
      dispatch({
        type: 'traderSwap',
        tokenIn: Math.random() < 0.5 ? 'GEM' : 'GOLD',
        amountIn: 5 + Math.random() * 20,
      })
    }, 1200)
    return () => clearInterval(id)
  }, [autoTraders, dispatch])

  return (
    <div className="app">
      <PoolScene pool={state.pool} />
      <Hud
        state={state}
        dispatch={dispatch}
        autoTraders={autoTraders}
        onToggleTraders={() => setAutoTraders((v) => !v)}
      />
    </div>
  )
}
