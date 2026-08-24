import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FARM_CHAPTERS,
  revealedFarmFeatures,
  unlockedFarmActions,
} from '../chapters/farmChapters'
import { FarmScene } from '../scene/farm/FarmScene'
import { SCALE_POS } from '../scene/lending/layout'
import { ChapterPanel } from '../ui/ChapterPanel'
import { FarmHud } from '../ui/FarmHud'
import { NetPanel } from '../ui/NetPanel'
import { price } from '../sim/pool'
import { farmUnderwater, initialFarm, useFarm } from '../state/useFarm'
import type { FarmStats } from '../state/useFarm'
import type { Visit } from '../state/visits'
import type { LendVisit } from '../state/lendVisits'

// Traders run from the start in this scene: they are the fee engine
// the whole strategy exists to milk.
const SPAWN_INTERVAL_MS = 2400
const WALK_IN_MS = 1400

// One real second is about one sim hour. Slower than the lending
// scene on purpose: at this pace the fee drip visibly outearns the
// interest drip, which is the whole point of the strategy.
const TICK_MS = 1000
const DAYS_PER_TICK = 1 / 24

const LIQ_ANGLE = Math.atan2(SCALE_POS[0], SCALE_POS[2])
const LIQ_RADIUS = Math.hypot(SCALE_POS[0], SCALE_POS[2]) + 0.9

export function FarmStrategy() {
  const [state, dispatch] = useFarm()
  const [chapterIndex, setChapterIndex] = useState(0)
  const [baseline, setBaseline] = useState<FarmStats>(initialFarm.stats)

  const [traderVisits, setTraderVisits] = useState<Visit[]>([])
  const [liqVisits, setLiqVisits] = useState<LendVisit[]>([])
  const nextVisitId = useRef(1)
  const timeouts = useRef<number[]>([])

  // Latest state for long-lived intervals (the spawner reads the price).
  const stateRef = useRef(state)
  stateRef.current = state

  const chapter = FARM_CHAPTERS[chapterIndex]
  const actions = unlockedFarmActions(chapterIndex)
  const features = revealedFarmFeatures(chapterIndex)
  const taskDone = chapter.task ? chapter.task.isDone(state, baseline) : true

  const nextChapter = () => {
    setChapterIndex((i) => Math.min(i + 1, FARM_CHAPTERS.length - 1))
    setBaseline(state.stats)
  }

  const skipTutorial = () => {
    setChapterIndex(FARM_CHAPTERS.length - 1)
    setBaseline(state.stats)
  }

  const removeTraderVisit = useCallback((id: number) => {
    setTraderVisits((current) => current.filter((v) => v.id !== id))
  }, [])

  const removeLiqVisit = useCallback((id: number) => {
    setLiqVisits((current) => current.filter((v) => v.id !== id))
  }, [])

  // Always-on traders against the pool.
  useEffect(() => {
    const spawn = () => {
      // Traders lean toward arbitrage: when GEM is expensive they mostly
      // sell it, and the price oscillates instead of wandering off. The
      // wobble is the point — chapter 5 shows the hedge absorbing it.
      const gemPrice = price(stateRef.current.pool, 'GEM')
      const arb: 'GEM' | 'GOLD' = gemPrice > 1 ? 'GEM' : 'GOLD'
      const visit: Visit = {
        id: nextVisitId.current++,
        angle: 0.1 + Math.random() * 1.1,
        tokenIn: Math.random() < 0.7 ? arb : arb === 'GEM' ? 'GOLD' : 'GEM',
      }
      setTraderVisits((current) => [...current, visit])
      timeouts.current.push(
        window.setTimeout(() => {
          dispatch({
            type: 'traderSwap',
            tokenIn: visit.tokenIn,
            amountIn: 10 + Math.random() * 30,
            visitId: visit.id,
          })
        }, WALK_IN_MS),
      )
    }
    spawn()
    const id = setInterval(spawn, SPAWN_INTERVAL_MS)
    return () => clearInterval(id)
  }, [dispatch])

  // The GEM interest drip.
  useEffect(() => {
    const id = setInterval(() => {
      dispatch({ type: 'tick', days: DAYS_PER_TICK })
    }, TICK_MS)
    return () => clearInterval(id)
  }, [dispatch])

  const triggerPriceShock = () => {
    const visit: Visit = {
      id: nextVisitId.current++,
      angle: 1.15,
      tokenIn: state.stats.shockCount % 2 === 0 ? 'GOLD' : 'GEM',
      whale: true,
    }
    setTraderVisits((current) => [...current, visit])
    timeouts.current.push(
      window.setTimeout(() => {
        dispatch({ type: 'priceShock', visitId: visit.id })
      }, WALK_IN_MS),
    )
  }

  // Liquidation watcher: same choreography as the lending strategy —
  // the state changes only when the liquidator reaches the scale.
  const liqPending = useRef(false)
  useEffect(() => {
    if (!farmUnderwater(state) || liqPending.current) return
    liqPending.current = true
    const visit: LendVisit = {
      id: nextVisitId.current++,
      angle: LIQ_ANGLE,
      pauseRadius: LIQ_RADIUS,
      who: 'user',
    }
    setLiqVisits((current) => [...current, visit])
    timeouts.current.push(
      window.setTimeout(() => {
        dispatch({ type: 'liquidate', visitId: visit.id })
        liqPending.current = false
      }, WALK_IN_MS),
    )
  }, [state, dispatch])

  useEffect(
    () => () => {
      timeouts.current.forEach(clearTimeout)
      timeouts.current = []
    },
    [],
  )

  return (
    <>
      <FarmScene
        state={state}
        features={features}
        traderVisits={traderVisits}
        onTraderDone={removeTraderVisit}
        liqVisits={liqVisits}
        onLiqDone={removeLiqVisit}
      />
      <FarmHud
        state={state}
        dispatch={dispatch}
        actions={actions}
        features={features}
        onPriceShock={triggerPriceShock}
      />
      {features.has('netPanel') && <NetPanel state={state} />}
      <ChapterPanel
        chapter={chapter}
        index={chapterIndex}
        count={FARM_CHAPTERS.length}
        taskDone={taskDone}
        onNext={nextChapter}
        onSkip={skipTutorial}
      />
    </>
  )
}
