import { useMemo } from 'react'
import { useRoadRunnerStore } from '../store/useRoadRunnerStore'
import { applyFilters } from '../utils/filterEngine'
import type { ItemStatus, RoadmapItem } from '../types'

function aggregateStatus(items: RoadmapItem[]): ItemStatus {
  if (items.every((i) => i.status === 'done')) return 'done'
  if (items.some((i) => i.status === 'in-progress' || i.status === 'in-review')) return 'in-progress'
  if (items.some((i) => i.status === 'todo')) return 'todo'
  if (items.some((i) => i.status === 'canceled')) return 'canceled'
  return 'backlog'
}

export function StatsBar() {
  const { items, filters, integration, cardGranularity } = useRoadRunnerStore()
  const visible = useMemo(() => applyFilters(items, filters), [items, filters])

  // In Jira increment mode, count unique increments rather than raw epics
  const counted = useMemo(() => {
    if (integration === 'jira' && cardGranularity === 'increment') {
      const groups = new Map<string, RoadmapItem[]>()
      visible.forEach((item) => {
        const key = item.incrementId ?? `__individual__${item.id}`
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(item)
      })
      return Array.from(groups.values()).map((grpItems) => ({
        status: aggregateStatus(grpItems),
      }))
    }
    return visible.map((i) => ({ status: i.status }))
  }, [visible, integration, cardGranularity])

  const total = counted.length
  const done = counted.filter((i) => i.status === 'done').length
  const inProgress = counted.filter((i) => i.status === 'in-progress' || i.status === 'in-review').length
  const planned = counted.filter((i) => i.status === 'todo' || i.status === 'backlog').length
  const canceled = counted.filter((i) => i.status === 'canceled').length

  const label = integration === 'jira'
    ? cardGranularity === 'increment' ? 'increments' : 'epics'
    : 'items'

  return (
    <div className="border-t border-zinc-700/50 bg-zinc-900/80 px-6 py-2 flex items-center gap-6 text-xs text-zinc-400">
      <span><span className="text-zinc-200 font-medium">{total}</span> {label}</span>
      <span className="text-emerald-400"><span className="font-medium">{done}</span> done</span>
      <span className="text-indigo-400"><span className="font-medium">{inProgress}</span> in progress</span>
      <span className="text-amber-400"><span className="font-medium">{planned}</span> planned</span>
      {canceled > 0 && (
        <span className="text-zinc-500"><span className="font-medium">{canceled}</span> canceled</span>
      )}
    </div>
  )
}
