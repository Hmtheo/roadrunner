import type { RoadmapItem, FilterState } from '../types'

const CURRENT_YEAR = new Date().getFullYear()

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
    if (filters.assignees.length > 0) {
      if (!item.assigneeId || !filters.assignees.includes(item.assigneeId)) return false
    }

    // Past period visibility:
    // When hidePastPeriods is true (the default), past years are hidden unless
    // the user has explicitly selected them via the `years` list.
    if (filters.hidePastPeriods) {
      if (item.year < CURRENT_YEAR && !filters.years.includes(item.year)) return false
    }
    // When hidePastPeriods is false, all years are visible (no year restriction).

    return true
  })
}

export function countActiveFilters(filters: FilterState): number {
  // When hidePastPeriods is on, count each revealed past year as one active filter.
  // When hidePastPeriods is off (user turned off the default), count as 1.
  const pastYearCount = filters.hidePastPeriods ? filters.years.length : 1

  return (
    (filters.search ? 1 : 0) +
    filters.groups.length +
    filters.categories.length +
    filters.personas.length +
    filters.statuses.length +
    filters.priorities.length +
    filters.quarters.length +
    pastYearCount +
    filters.assignees.length
  )
}
