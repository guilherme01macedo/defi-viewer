import { useState } from 'react'
import { AmmStrategy } from './strategies/Amm'
import { LendingStrategy } from './strategies/Lending'

type Screen = 'home' | 'amm' | 'lending'

// Top-level router. Each strategy owns its own scene, chapters, and
// state; going back to the home screen unmounts it and resets it.
export default function App() {
  const [screen, setScreen] = useState<Screen>('home')

  if (screen === 'home') {
    return (
      <div className="app">
        <div className="home">
          <h1>DeFi Viewer</h1>
          <p className="home-tagline">
            Play with fictional tokens. Learn how a strategy moves value.
          </p>
          <div className="home-cards">
            <button className="home-card" onClick={() => setScreen('amm')}>
              <h2>Liquidity pools</h2>
              <p>
                Pour GEM and GOLD into a shared tank, earn fees from every
                swap, and meet impermanent loss.
              </p>
            </button>
            <button className="home-card" onClick={() => setScreen('lending')}>
              <h2>Lending</h2>
              <p>
                Lend GOLD for interest, then borrow against locked GEM — and
                keep the scale from tipping into liquidation.
              </p>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app with-back">
      <button className="back-button" onClick={() => setScreen('home')}>
        ← Strategies
      </button>
      {screen === 'amm' && <AmmStrategy />}
      {screen === 'lending' && <LendingStrategy />}
    </div>
  )
}
