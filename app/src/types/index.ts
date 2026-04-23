export type ItemStatus = 'backlog' | 'todo' | 'in-progress' | 'in-review' | 'done' | 'canceled'
export type Priority = 'none' | 'urgent' | 'high' | 'medium' | 'low'

export interface RoadmapItem {
  id: string
  identifier: string | null
  title: string
  description: string
  status: ItemStatus
  priority: Priority
  groupId: string
  categoryIds: string[]
  personaIds: string[]
  quarter: string
  year: number
  dueDate: string | null
  assigneeId: string | null
  assigneeName: string | null
  teamId: string | null
  teamName: string | null
  sourceUrl: string
  sourceId: string
  sourceType: 'linear'
  parentId: string | null
  createdAt: string
  updatedAt: string
}

export interface Persona {
  id: string
  name: string
  description: string
  color: string
  emoji: string
}

export interface Group {
  id: string
  name: string
  description: string | null
  color: string
  order: number
}

export interface Category {
  id: string
  name: string
  color: string
}

export interface MappingConfig {
  groupBy: 'project' | 'label' | 'team' | 'assignee'
  categorySource: 'label' | 'none'
  timeSource: 'dueDate' | 'createdAt' | 'updatedAt'
  teamFilter: string | null
  // Detail modal toggles
  showIdentifier: boolean
  showAssignee: boolean
  showTeam: boolean
}

export interface FilterState {
  groups: string[]
  categories: string[]
  personas: string[]
  quarters: string[]
  years: number[]
  statuses: ItemStatus[]
  priorities: Priority[]
  assignees: string[]
  search: string
}

export interface SavedView {
  id: string
  name: string
  description: string | null
  filters: FilterState
  timelineView: 'quarterly' | 'annual'
  density: 'expanded' | 'condensed'
  createdAt: string
  updatedAt: string
}

export interface TimePeriod {
  quarter: string
  year: number
}
