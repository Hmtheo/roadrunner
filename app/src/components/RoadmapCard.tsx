import type { RoadmapItem, Category } from '../types'
import { STATUS_STYLES, PRIORITY_CONFIG } from '../utils/statusColors'
import { useRoadRunnerStore } from '../store/useRoadRunnerStore'

interface RoadmapCardProps {
  item: RoadmapItem
  categories: Category[]
}

export function RoadmapCard({ item, categories }: RoadmapCardProps) {
  const { density, selectItem } = useRoadRunnerStore()
  const isCondensed = density === 'condensed'

  const statusStyle = STATUS_STYLES[item.status]
  const priorityConfig = PRIORITY_CONFIG[item.priority]
  const itemCategories = categories.filter((c) => item.categoryIds.includes(c.id))

  if (isCondensed) {
    return (
      <div
        onClick={() => selectItem(item.id)}
        className="group bg-zinc-800/60 border border-zinc-700/50 rounded-md p-2 cursor-pointer hover:border-zinc-500 hover:bg-zinc-800 hover:shadow-lg transition-all"
      >
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusStyle.dot}`} />
          <span className="text-xs text-zinc-200 truncate">{item.title}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => selectItem(item.id)}
      className="group bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-3 cursor-pointer hover:border-zinc-500 hover:bg-zinc-800 hover:shadow-lg hover:-translate-y-0.5 transition-all"
    >
      <p className="text-sm text-zinc-100 font-medium line-clamp-2 mb-2 leading-snug">
        {item.title}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusStyle.badge}`}>
            {statusStyle.label}
          </span>
          {priorityConfig.icon && (
            <span className={`text-xs font-bold ${priorityConfig.color}`} title={priorityConfig.label}>
              {priorityConfig.icon}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {itemCategories.slice(0, 3).map((cat) => (
            <span
              key={cat.id}
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: cat.color }}
              title={cat.name}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
