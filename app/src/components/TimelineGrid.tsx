import { useMemo } from 'react'
import type { Group, Category } from '../types'
import { useRoadRunnerStore } from '../store/useRoadRunnerStore'
import { applyFilters } from '../utils/filterEngine'
import { getColumnKey, sortColumnKeys } from '../utils/timePeriod'
import { RoadmapCard } from './RoadmapCard'

interface TimelineGridProps {
  groups: Group[]
  categories: Category[]
}

export function TimelineGrid({ groups, categories }: TimelineGridProps) {
  const { items, filters, timelineView, density } = useRoadRunnerStore()

  const visibleItems = useMemo(() => applyFilters(items, filters), [items, filters])

  const { columns, columnKeys } = useMemo(() => {
    const keySet = new Set<string>()
    visibleItems.forEach((item) => {
      if (item.dueDate && item.quarter && item.year) {
        if (timelineView === 'quarterly') {
          keySet.add(getColumnKey(item.quarter, item.year))
        } else {
          keySet.add(String(item.year))
        }
      }
    })
    const sorted = sortColumnKeys([...keySet])
    const cols = sorted.map((key) => {
      if (timelineView === 'quarterly') {
        const [year, quarter] = key.split('-')
        return { key, label: `${quarter} ${year}` }
      }
      return { key, label: key }
    })
    return { columns: cols, columnKeys: sorted }
  }, [visibleItems, timelineView])

  const hasUnscheduled = visibleItems.some((item) => !item.dueDate || !item.quarter)

  const visibleGroups = useMemo(() =>
    groups.filter((g) =>
      visibleItems.some((item) => item.groupId === g.id)
    ).sort((a, b) => a.order - b.order),
    [groups, visibleItems]
  )

  const minColWidth = density === 'condensed' ? '160px' : '200px'
  const groupCellPadding = density === 'condensed' ? 'px-3 py-2' : 'px-6 py-4'
  const cardSpacing = density === 'condensed' ? 'space-y-1.5' : 'space-y-3'

  if (visibleGroups.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        No items match the current filters.{' '}
        <button
          onClick={() => useRoadRunnerStore.getState().clearFilters()}
          className="ml-1 text-indigo-400 hover:text-indigo-300 underline"
        >
          Clear filters
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="border-collapse min-w-full">
        <thead>
          <tr className="bg-zinc-900/80 sticky top-0 z-10">
            <th className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-r border-zinc-700/50 w-48 px-6 py-3">
              Projects
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ minWidth: minColWidth }}
                className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-r border-zinc-700/50 px-4 py-3"
              >
                {col.label}
              </th>
            ))}
            {hasUnscheduled && (
              <th
                style={{ minWidth: minColWidth }}
                className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-700/50 px-4 py-3"
              >
                Unscheduled
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {visibleGroups.map((group) => {
            const groupItems = visibleItems.filter((i) => i.groupId === group.id)

            return (
              <tr key={group.id} className="border-b border-zinc-700/30 hover:bg-zinc-800/20 transition-colors">
                {/* Group cell */}
                <td className={`border-r border-zinc-700/50 align-top ${groupCellPadding}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-100 leading-tight">{group.name}</p>
                  </div>
                </td>

                {/* Period columns */}
                {columnKeys.map((key) => {
                  const colItems = groupItems.filter((item) => {
                    if (!item.dueDate || !item.quarter) return false
                    if (timelineView === 'quarterly') {
                      return getColumnKey(item.quarter, item.year) === key
                    }
                    return String(item.year) === key
                  })

                  return (
                    <td
                      key={key}
                      className={`align-top border-r border-zinc-700/30 p-3 ${cardSpacing}`}
                    >
                      <div className={`flex flex-col ${cardSpacing}`}>
                        {colItems.map((item) => (
                          <RoadmapCard key={item.id} item={item} categories={categories} />
                        ))}
                      </div>
                    </td>
                  )
                })}

                {/* Unscheduled column */}
                {hasUnscheduled && (
                  <td className={`align-top p-3 ${cardSpacing}`}>
                    <div className={`flex flex-col ${cardSpacing}`}>
                      {groupItems
                        .filter((item) => !item.dueDate || !item.quarter)
                        .map((item) => (
                          <RoadmapCard key={item.id} item={item} categories={categories} />
                        ))}
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
