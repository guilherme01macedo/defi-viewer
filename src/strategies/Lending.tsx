import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LEND_CHAPTERS,
  revealedLendFeatures,
  unlockedLendActions,
} from '../chapters/lendingChapters'
import { SCALE_POS } from '../scene/lending/layout'
import { LendingScene } from '../scene/lending/LendingScene'
import { ChapterPanel } from '../ui/ChapterPanel'
import { LendingHud } from '../ui/LendingHud'
import { OraclePanel } from '../ui/OraclePanel'
import { initialLending, underwater, useLending } from '../state/useLending'
import type { LendStats } from '../state/useLending'
import type { LendVisit } from '../state/lendVisits'

// One real second is two sim days, so interest is visible in seconds.
const TICK_MS = 1000
const DAYS_PER_TICK = 2

// How long the liquidator walks before the seizure dispatches.
const WALK_IN_MS = 1400

const USER_ANGLE = Math.atan2(SCALE_POS[0], SCALE_POS[2])
const USER_RADIUS = Math.hypot(SCALE_POS[0], SCALE_POS[2]) + 0.9

export function LendingStrategy() {
  const [state, dispatch] = useLending()
  const [chapterIndex, setChapterIndex] = useState(0)
  const [baseline, setBaseline] = useState<LendStats>(initialLending.stats)

  const [visits, setVisits] = useState<LendVisit[]>([])
  const nextVisitId = useRef(1)
  const timeouts = useRef<number[]>([])

  const chapter = LEND_CHAPTERS[chapterIndex]
  const actions = unlockedLendActions(chapterIndex)
  const features = revealedLendFeatures(chapterIndex)
  const taskDone = chapter.task ? chapter.task.isDone(state, baseline) : true

  const nextChapter = () => {
    setChapterIndex((i) => Math.min(i + 1, LEND_CHAPTERS.length - 1))
    setBaseline(state.stats)
  }

  const skipTutorial = () => {
    setChapterIndex(LEND_CHAPTERS.length - 1)
    setBaseline(state.stats)
  }

  const removeVisit = useCallback((id: number) => {
    setVisits((current) => current.filter((v) => v.id !== id))
  }, [])

  // The heartbeat: interest accrues and the oracle price drifts.
  useEffect(() => {
    const id = setInterval(() => {
      dispatch({
        type: 'tick',
        days: DAYS_PER_TICK,
        priceFactor: 1 + (Math.random() - 0.5) * 0.012,
      })
    }, TICK_MS)
    return () => clearInterval(id)
  }, [dispatch])

  // Liquidation watcher: when a position goes underwater, send a
  // liquidator walking. The state only changes when the walker arrives
  // (the reducer re-checks the health factor at that moment).
  const pendingLiq = useRef<Set<string>>(new Set())
  useEffect(() => {
    for (const target of underwater(state)) {
      const key = String(target.who)
      if (pendingLiq.current.has(key)) continue
      pendingLiq.current.add(key)
      const isUser = target.who === 'user'
      const visit: LendVisit = {
        id: nextVisitId.current++,
        angle: isUser ? USER_ANGLE : 0.45 + (Number(target.who) % 3) * 0.3,
        pauseRadius: isUser ? USER_RADIUS : 2.3,
        who: target.who,
      }
      setVisits((current) => [...current, visit])
      timeouts.current.push(
        window.setTimeout(() => {
          dispatch({ type: 'liquidate', who: visit.who, visitId: visit.id })
          pendingLiq.current.delete(key)
        }, WALK_IN_MS),
      )
    }
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
      <LendingScene
        state={state}
        features={features}
        visits={visits}
        onVisitDone={removeVisit}
      />
      <LendingHud
        state={state}
        dispatch={dispatch}
        actions={actions}
        features={features}
        onCrash={() => dispatch({ type: 'crash' })}
      />
      {features.has('oracle') && (
        <OraclePanel history={state.priceHistory} price={state.market.price} />
      )}
      <ChapterPanel
        chapter={chapter}
        index={chapterIndex}
        count={LEND_CHAPTERS.length}
        taskDone={taskDone}
        onNext={nextChapter}
        onSkip={skipTutorial}
      />
    </>
  )
}
