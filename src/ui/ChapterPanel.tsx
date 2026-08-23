// The panel only needs text, so any strategy's chapter type fits.
export interface ChapterInfo {
  title: string
  body: string
  task?: { label: string }
}

interface Props {
  chapter: ChapterInfo
  index: number
  count: number
  taskDone: boolean
  onNext: () => void
  onSkip: () => void
}

export function ChapterPanel({ chapter, index, count, taskDone, onNext, onSkip }: Props) {
  const isLast = index === count - 1
  return (
    <div className="chapter">
      {!isLast && (
        <button className="chapter-skip" onClick={onSkip}>
          Skip tutorial →
        </button>
      )}
      <div className="chapter-dots">
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            className={`dot ${i === index ? 'current' : i < index ? 'done' : ''}`}
          />
        ))}
      </div>
      <h1>
        <span className="chapter-num">{index + 1}.</span> {chapter.title}
      </h1>
      <p>{chapter.body}</p>
      {chapter.task && (
        <p className={`chapter-task ${taskDone ? 'task-done' : ''}`}>
          {taskDone ? '✓ Done — ' : '→ '}
          {chapter.task.label}
        </p>
      )}
      {!isLast && (
        <button className="chapter-next" onClick={onNext} disabled={!taskDone}>
          Next
        </button>
      )}
    </div>
  )
}
