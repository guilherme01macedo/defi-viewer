import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CHAPTERS,
  revealedFeatures,
  unlockedActions,
} from './chapters/chapters'
import { PoolScene } from './scene/PoolScene'
import { ChapterPanel } from './ui/ChapterPanel'
import { CurvePanel } from './ui/CurvePanel'
import { Hud } from './ui/Hud'
import { initialSim, useSim } from './state/useSim'
import type { SimStats } from './state/useSim'
import type { Visit } from './state/visits'

// How long a trader walks before reaching the tank; the swap (and its
// pour animation) dispatches at the moment of arrival.
const WALK_IN_MS = 1400

export default function App() {
  const [state, dispatch] = useSim()
  const [autoTraders, setAutoTraders] = useState(false)
  const [chapterIndex, setChapterIndex] = useState(0)
  // Stats snapshot from when the current chapter opened; chapter tasks
  // are judged against it ("one swap made during THIS chapter").
  const [baseline, setBaseline] = useState<SimStats>(initialSim.stats)

  const [visits, setVisits] = useState<Visit[]>([])
  const nextVisitId = useRef(1)
  const timeouts = useRef<number[]>([])

  const chapter = CHAPTERS[chapterIndex]
  const actions = unlockedActions(chapterIndex)
  const features = revealedFeatures(chapterIndex)
  const taskDone = chapter.task ? chapter.task.isDone(state, baseline) : true

  const nextChapter = () => {
    setChapterIndex((i) => Math.min(i + 1, CHAPTERS.length - 1))
    setBaseline(state.stats)
  }

  const skipTutorial = () => {
    setChapterIndex(CHAPTERS.length - 1)
    setBaseline(state.stats)
  }

  const removeVisit = useCallback((id: number) => {
    setVisits((current) => current.filter((v) => v.id !== id))
  }, [])

  useEffect(() => {
    if (!autoTraders) return
    const spawn = () => {
      const visit: Visit = {
        id: nextVisitId.current++,
        angle: 0.1 + Math.random() * 1.1,
        tokenIn: Math.random() < 0.5 ? 'GEM' : 'GOLD',
      }
      setVisits((current) => [...current, visit])
      timeouts.current.push(
        window.setTimeout(() => {
          dispatch({
            type: 'traderSwap',
            tokenIn: visit.tokenIn,
            amountIn: 5 + Math.random() * 20,
            visitId: visit.id,
          })
        }, WALK_IN_MS),
      )
    }
    spawn()
    const id = setInterval(spawn, 2800)
    return () => {
      clearInterval(id)
      timeouts.current.forEach(clearTimeout)
      timeouts.current = []
    }
  }, [autoTraders, dispatch])

  const triggerPriceShock = () => {
    const visit: Visit = {
      id: nextVisitId.current++,
      angle: 1.15,
      tokenIn: state.stats.priceShockCount % 2 === 0 ? 'GOLD' : 'GEM',
      whale: true,
    }
    setVisits((current) => [...current, visit])
    timeouts.current.push(
      window.setTimeout(() => {
        dispatch({ type: 'priceShock', visitId: visit.id })
      }, WALK_IN_MS),
    )
  }

  return (
    <div className="app">
      <PoolScene
        pool={state.pool}
        wallet={state.wallet}
        showTank={features.has('tank')}
        events={state.events}
        visits={visits}
        onVisitDone={removeVisit}
      />
      <Hud
        state={state}
        dispatch={dispatch}
        actions={actions}
        features={features}
        autoTraders={autoTraders}
        onToggleTraders={() => setAutoTraders((v) => !v)}
        onPriceShock={triggerPriceShock}
      />
      {features.has('curve') && <CurvePanel pool={state.pool} />}
      <ChapterPanel
        chapter={chapter}
        index={chapterIndex}
        count={CHAPTERS.length}
        taskDone={taskDone}
        onNext={nextChapter}
        onSkip={skipTutorial}
      />
    </div>
  )
}
