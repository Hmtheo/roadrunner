import type { RoadmapItem, FilterState } from '../types'

export function applyFilters(items: RoadmapItem[], filters: FilterState): RoadmapItem[] {
  return items.filter(item => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!item.title.toLowerCase().includes(q)) return false
    }
    if (filters.groups.length > 0 && !filters.groups.includes(item.groupId)) return false
    if (filters.categories.length > 0 && !filters.categories.some(c => item.categoryIds.includes(c))) return false
    if (filters.personas.length > 0 && !filters.personas.some(p => item.personaIds.includes(p))) return false
    if (filters.statuses.length > 0 && !filters.statuses.includes(item.status)) return false
    if (filters.priorities.length > 0 && !filters.priorities.includes(item.priority)) return false
    if (filters.quarters.length > 0 && !filters.quarters.includes(item.quarter)) return false
    if (filters.years.length > 0 && !filters.years.includes(item.year)) return false
    if (filters.assignees.length > 0) {
      if (!item.assigneeId || !filters.assignees.includes(item.assigneeId)) return false
    }
    return true
  })
}

export function countActiveFilters(filters: FilterState): number {
  return (
    (filters.search ? 1 : 0) +
    filters.groups.length +
    filters.categories.length +
    filters.personas.length +
    filters.statuses.length +
    filters.priorities.length +
    filters.quarters.length +
    filters.years.length +
    filters.assignees.length
  )
}
