import { useMemo } from 'react'
import { useRoadRunnerStore } from '../store/useRoadRunnerStore'
import { applyFilters } from '../utils/filterEngine'

export function StatsBar() {
  const { items, filters } = useRoadRunnerStore()
  const visible = useMemo(() => applyFilters(items, filters), [items, filters])

  const done = visible.filter((i) => i.status === 'done').length
  const inProgress = visible.filter((i) => i.status === 'in-progress' || i.status === 'in-review').length
  const planned = visible.filter((i) => i.status === 'todo' || i.status === 'backlog').length
  const canceled = visible.filter((i) => i.status === 'canceled').length

  return (
    <div className="border-t border-zinc-700/50 bg-zinc-900/80 px-6 py-2 flex items-center gap-6 text-xs text-zinc-400">
      <span><span className="text-zinc-200 font-medium">{visible.length}</span> total</span>
      <span className="text-emerald-400"><span className="font-medium">{done}</span> done</span>
      <span className="text-indigo-400"><span className="font-medium">{inProgress}</span> in progress</span>
      <span className="text-amber-400"><span className="font-medium">{planned}</span> planned</span>
      {canceled > 0 && (
        <span className="text-zinc-500"><span className="font-medium">{canceled}</span> canceled</span>
      )}
    </div>
  )
}
