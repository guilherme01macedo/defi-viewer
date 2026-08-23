import { useEffect, useState } from 'react'
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

export default function App() {
  const [state, dispatch] = useSim()
  const [autoTraders, setAutoTraders] = useState(false)
  const [chapterIndex, setChapterIndex] = useState(0)
  // Stats snapshot from when the current chapter opened; chapter tasks
  // are judged against it ("one swap made during THIS chapter").
  const [baseline, setBaseline] = useState<SimStats>(initialSim.stats)

  const chapter = CHAPTERS[chapterIndex]
  const actions = unlockedActions(chapterIndex)
  const features = revealedFeatures(chapterIndex)
  const taskDone = chapter.task ? chapter.task.isDone(state, baseline) : true

  const nextChapter = () => {
    setChapterIndex((i) => Math.min(i + 1, CHAPTERS.length - 1))
    setBaseline(state.stats)
  }

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
      <PoolScene
        pool={state.pool}
        wallet={state.wallet}
        showTank={features.has('tank')}
      />
      <Hud
        state={state}
        dispatch={dispatch}
        actions={actions}
        features={features}
        autoTraders={autoTraders}
        onToggleTraders={() => setAutoTraders((v) => !v)}
      />
      {features.has('curve') && <CurvePanel pool={state.pool} />}
      <ChapterPanel
        chapter={chapter}
        index={chapterIndex}
        count={CHAPTERS.length}
        taskDone={taskDone}
        onNext={nextChapter}
      />
    </div>
  )
}
