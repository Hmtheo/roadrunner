import { useMemo } from 'react'
import type { Group, Category, RoadmapItem, ItemStatus, AggregatedCard } from '../types'
import { useRoadRunnerStore } from '../store/useRoadRunnerStore'
import { applyFilters } from '../utils/filterEngine'
import { getColumnKey, sortColumnKeys } from '../utils/timePeriod'
import { RoadmapCard } from './RoadmapCard'
import { AggregatedRoadmapCard } from './AggregatedRoadmapCard'

interface TimelineGridProps {
  groups: Group[]
  categories: Category[]
}

/** Derive a representative status from a group of items. */
function aggregateStatus(items: RoadmapItem[]): ItemStatus {
  if (items.every((i) => i.status === 'done')) return 'done'
  if (items.some((i) => i.status === 'in-progress' || i.status === 'in-review')) return 'in-progress'
  if (items.some((i) => i.status === 'todo')) return 'todo'
  return 'backlog'
}

/**
 * Aggregate a list of items by incrementId or epicId into AggregatedCard objects.
 * Items without the relevant id are left as individual items (returned separately).
 */
function aggregateItems(
  items: RoadmapItem[],
  granularity: 'increment' | 'epic',
): { aggregated: AggregatedCard[]; individual: RoadmapItem[] } {
  const key = granularity === 'increment' ? 'incrementId' : 'epicId'
  const nameKey = granularity === 'increment' ? 'incrementName' : 'epicName'

  const cardMap = new Map<string, { name: string; items: RoadmapItem[]; sourceUrl?: string }>()
  const individual: RoadmapItem[] = []

  items.forEach((item) => {
    const groupKey = item[key]
    if (!groupKey) {
      individual.push(item)
      return
    }
    if (!cardMap.has(groupKey)) {
      cardMap.set(groupKey, {
        name: (item[nameKey] as string | undefined) ?? groupKey,
        items: [],
        sourceUrl: item.sourceUrl,
      })
    }
    cardMap.get(groupKey)!.items.push(item)
  })

  const aggregated: AggregatedCard[] = Array.from(cardMap.entries()).map(([id, { name, items: cardItems, sourceUrl }]) => ({
    id,
    name,
    count: cardItems.length,
    status: aggregateStatus(cardItems),
    sourceUrl,
  }))

  return { aggregated, individual }
}

export function TimelineGrid({ groups, categories }: TimelineGridProps) {
  const { items, filters, timelineView, density, integration, cardGranularity } = useRoadRunnerStore()

  // Whether to aggregate cells (Jira only, increment or epic granularity)
  const useAggregation = integration === 'jira'

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
  const CELL_CAP = density === 'condensed' ? 4 : 5

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
              {(() => {
                const { jiraMappingConfig, integration: intg, mappingConfig } = useRoadRunnerStore.getState()
                if (intg === 'jira') {
                  if (jiraMappingConfig.groupBy === 'initiative') return 'Initiatives'
                  if (jiraMappingConfig.groupBy === 'epic') return 'Epics'
                  if (jiraMappingConfig.groupBy === 'assignee') return 'Assignees'
                  if (jiraMappingConfig.groupBy === 'label') return 'Labels'
                  return 'Projects'
                }
                if (mappingConfig.groupBy === 'assignee') return 'Assignees'
                if (mappingConfig.groupBy === 'label') return 'Labels'
                if (mappingConfig.groupBy === 'team') return 'Teams'
                return 'Projects'
              })()}
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

                  if (useAggregation) {
                    const { aggregated, individual } = aggregateItems(colItems, cardGranularity)
                    const allCards = [...aggregated.map((c) => ({ type: 'agg' as const, card: c })), ...individual.map((i) => ({ type: 'item' as const, item: i }))]
                    const overflow = allCards.length - CELL_CAP
                    return (
                      <td key={key} className={`align-top border-r border-zinc-700/30 p-3 ${cardSpacing}`}>
                        <div className={`flex flex-col ${cardSpacing}`}>
                          {allCards.slice(0, CELL_CAP).map((entry) =>
                            entry.type === 'agg'
                              ? <AggregatedRoadmapCard key={entry.card.id} card={entry.card} itemLabel={cardGranularity === 'increment' ? 'epic' : 'story'} />
                              : <RoadmapCard key={entry.item.id} item={entry.item} categories={categories} />
                          )}
                          {overflow > 0 && (
                            <p className="text-xs text-zinc-600 px-1">+{overflow} more</p>
                          )}
                        </div>
                      </td>
                    )
                  }

                  const overflow = colItems.length - CELL_CAP
                  return (
                    <td
                      key={key}
                      className={`align-top border-r border-zinc-700/30 p-3 ${cardSpacing}`}
                    >
                      <div className={`flex flex-col ${cardSpacing}`}>
                        {colItems.slice(0, CELL_CAP).map((item) => (
                          <RoadmapCard key={item.id} item={item} categories={categories} />
                        ))}
                        {overflow > 0 && (
                          <p className="text-xs text-zinc-600 px-1">+{overflow} more</p>
                        )}
                      </div>
                    </td>
                  )
                })}

                {/* Unscheduled column */}
                {hasUnscheduled && (() => {
                  const unscheduled = groupItems.filter((item) => !item.dueDate || !item.quarter)

                  if (useAggregation) {
                    const { aggregated, individual } = aggregateItems(unscheduled, cardGranularity)
                    const allCards = [...aggregated.map((c) => ({ type: 'agg' as const, card: c })), ...individual.map((i) => ({ type: 'item' as const, item: i }))]
                    const overflow = allCards.length - CELL_CAP
                    return (
                      <td className={`align-top p-3 ${cardSpacing}`}>
                        <div className={`flex flex-col ${cardSpacing}`}>
                          {allCards.slice(0, CELL_CAP).map((entry) =>
                            entry.type === 'agg'
                              ? <AggregatedRoadmapCard key={entry.card.id} card={entry.card} itemLabel={cardGranularity === 'increment' ? 'epic' : 'story'} />
                              : <RoadmapCard key={entry.item.id} item={entry.item} categories={categories} />
                          )}
                          {overflow > 0 && (
                            <p className="text-xs text-zinc-600 px-1">+{overflow} more</p>
                          )}
                        </div>
                      </td>
                    )
                  }

                  const unscheduledOverflow = unscheduled.length - CELL_CAP
                  return (
                    <td className={`align-top p-3 ${cardSpacing}`}>
                      <div className={`flex flex-col ${cardSpacing}`}>
                        {unscheduled.slice(0, CELL_CAP).map((item) => (
                          <RoadmapCard key={item.id} item={item} categories={categories} />
                        ))}
                        {unscheduledOverflow > 0 && (
                          <p className="text-xs text-zinc-600 px-1">+{unscheduledOverflow} more</p>
                        )}
                      </div>
                    </td>
                  )
                })()}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
