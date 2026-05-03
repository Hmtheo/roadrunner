import type { AggregatedCard } from '../types'
import { STATUS_STYLES } from '../utils/statusColors'
import { useRoadRunnerStore } from '../store/useRoadRunnerStore'

interface AggregatedRoadmapCardProps {
  card: AggregatedCard
  /** Singular label for the items grouped inside, e.g. "epic" or "story" */
  itemLabel?: string
}

export function AggregatedRoadmapCard({ card, itemLabel = 'epic' }: AggregatedRoadmapCardProps) {
  const { density } = useRoadRunnerStore()
  const isCondensed = density === 'condensed'
  const statusStyle = STATUS_STYLES[card.status]

  const handleClick = () => {
    if (card.sourceUrl) window.open(card.sourceUrl, '_blank', 'noopener,noreferrer')
  }

  if (isCondensed) {
    return (
      <div
        onClick={handleClick}
        className="group bg-zinc-800/60 border border-zinc-700/50 rounded-md p-2 cursor-pointer hover:border-zinc-500 hover:bg-zinc-800 hover:shadow-lg transition-all"
      >
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusStyle.dot}`} />
          <span className="text-xs text-zinc-200 truncate flex-1">{card.name}</span>
          <span className="text-xs text-zinc-500 bg-zinc-700/50 rounded px-1 flex-shrink-0">
            {card.count}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      className="group bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-3 cursor-pointer hover:border-zinc-500 hover:bg-zinc-800 hover:shadow-lg hover:-translate-y-0.5 transition-all"
    >
      <p className="text-sm text-zinc-100 font-medium line-clamp-2 mb-2 leading-snug">
        {card.name}
      </p>

      <div className="flex items-center justify-between">
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusStyle.badge}`}>
          {statusStyle.label}
        </span>
        <span className="text-xs text-zinc-400 bg-zinc-700/60 rounded-full px-2 py-0.5 font-medium">
          {card.count} {card.count === 1 ? itemLabel : `${itemLabel}s`}
        </span>
      </div>
    </div>
  )
}
