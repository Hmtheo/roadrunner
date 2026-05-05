export type ItemStatus = 'backlog' | 'todo' | 'in-progress' | 'in-review' | 'done' | 'canceled'
export type Priority = 'none' | 'urgent' | 'high' | 'medium' | 'low'
export type Integration = 'linear' | 'jira' | null
export type IntegrationStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface LinearCredentials {
  apiKey: string
}

export interface JiraCredentials {
  domain: string
  email: string
  apiToken: string
}

export interface JiraMappingConfig {
  productArea: string | null
  groupBy: 'initiative' | 'epic' | 'project' | 'label' | 'assignee'
  categorySource: 'label' | 'component' | 'none'
  timeSource: 'fixVersion' | 'dueDate' | 'createdAt' | 'updatedAt' | 'sprintEnd'
  showKey: boolean
  showAssignee: boolean
  showSprint: boolean
  showStoryPoints: boolean
}

export interface AggregatedCard {
  id: string
  name: string
  count: number
  status: ItemStatus
  sourceUrl?: string
}

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
  sourceType: 'linear' | 'jira'
  parentId: string | null
  createdAt: string
  updatedAt: string
  // Jira hierarchy — optional, not set for Linear/demo items
  epicId?: string
  epicName?: string
  incrementId?: string
  incrementName?: string
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
  /** Past years to reveal (only used when hidePastPeriods is true) */
  years: number[]
  statuses: ItemStatus[]
  priorities: Priority[]
  assignees: string[]
  search: string
  /** When true, items from years before the current year are hidden unless the year is in `years` */
  hidePastPeriods: boolean
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
