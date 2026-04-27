import type { RoadmapItem, Group, Category, ItemStatus, Priority, JiraMappingConfig } from '../types'
import { deriveTimePeriod } from '../utils/timePeriod'

async function jiraFetch<T>(path: string, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<T> {
  const sessionId = localStorage.getItem('rr-session') ?? ''
  const url = `/api/jira/${path}`
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-RR-Session': sessionId },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = body?.errorMessages?.[0] ?? body?.error ?? ''
    console.error('Jira API error:', { status: res.status, url, body })
    throw new Error(`Jira API error: ${res.status} (${path})${detail ? ` — ${detail}` : ''}`)
  }

  return res.json()
}

// ─── Status mapping ───────────────────────────────────────────────────────────

function mapStatus(statusCategory: string): ItemStatus {
  const lower = statusCategory.toLowerCase()
  if (lower === 'done') return 'done'
  if (lower === 'indeterminate') return 'in-progress'
  if (lower === 'new' || lower === 'to do') return 'todo'
  return 'backlog'
}

// ─── Priority mapping ─────────────────────────────────────────────────────────

function mapPriority(priorityName?: string): Priority {
  if (!priorityName) return 'none'
  const lower = priorityName.toLowerCase()
  if (lower.includes('highest') || lower.includes('blocker')) return 'urgent'
  if (lower.includes('high')) return 'high'
  if (lower.includes('medium')) return 'medium'
  if (lower.includes('low') || lower.includes('lowest')) return 'low'
  return 'none'
}

// ─── Jira Types ───────────────────────────────────────────────────────────────

interface JiraIssue {
  id: string
  key: string
  fields: {
    summary: string
    description?: string
    status: {
      name: string
      statusCategory: { key: string }
    }
    priority?: { name: string }
    duedate?: string
    created: string
    updated: string
    assignee?: { accountId: string; displayName: string }
    project: { id: string; key: string; name: string }
    labels: string[]
    components: { id: string; name: string }[]
    issuetype: { name: string }
    parent?: { id: string; key: string }
  }
  self: string
}

interface JiraProject {
  id: string
  key: string
  name: string
  description?: string
  avatarUrls?: { '48x48'?: string }
}

interface JiraComponent {
  id: string
  name: string
  description?: string
}

// ─── Fetch data ───────────────────────────────────────────────────────────────

async function fetchAllIssues(productArea: string): Promise<JiraIssue[]> {
  const issues: JiraIssue[] = []
  let startAt = 0
  const maxResults = 100

  // Filter by product area
  const jql = `"Product Area" = "${productArea}" ORDER BY created DESC`
  const fields = 'summary,description,status,priority,duedate,created,updated,assignee,project,labels,components,issuetype,parent'

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Use GET with query parameters for /search/jql endpoint
    // Build query string manually to avoid + encoding (Jira needs %20 for spaces)
    const queryParts = [
      `jql=${encodeURIComponent(jql)}`,
      `startAt=${startAt}`,
      `maxResults=${maxResults}`,
      `fields=${encodeURIComponent(fields)}`
    ]
    const data = await jiraFetch<{ issues: JiraIssue[]; total: number; maxResults: number }>(
      `search/jql?${queryParts.join('&')}`
    )
    issues.push(...data.issues)
    startAt += data.maxResults
    if (issues.length >= data.total) break
  }

  return issues
}

async function fetchProjects(): Promise<JiraProject[]> {
  const data = await jiraFetch<JiraProject[]>('project')
  return data
}

export async function fetchProductAreas(): Promise<string[]> {
  try {
    // Simplified approach: fetch a small sample of issues and extract product area values
    // Using minimal fields to avoid 431 error
    const data = await jiraFetch<{ issues: Array<{ fields: Record<string, unknown> }> }>(
      'search',
      'POST',
      {
        jql: '',
        startAt: 0,
        maxResults: 50,
        fields: ['customfield_*']
      }
    )

    const productAreas = new Set<string>()

    // Look through all custom fields to find product area values
    data.issues.forEach(issue => {
      Object.entries(issue.fields).forEach(([key, value]) => {
        if (key.startsWith('customfield_')) {
          // Check if this looks like a product area field
          if (value && typeof value === 'object' && 'value' in value) {
            const val = String(value.value)
            // Only add if it looks like a product area (short string, caps)
            if (val.length < 20 && /^[A-Z]/.test(val)) {
              productAreas.add(val)
            }
          }
        }
      })
    })

    const areas = Array.from(productAreas).sort()
    return areas.length > 0 ? areas : ['DTP', 'Platform', 'Mobile', 'Web', 'API']
  } catch (error) {
    console.error('Failed to fetch product areas:', error)
    throw error
  }
}

// ─── Normalize ────────────────────────────────────────────────────────────────

function normalizeIssue(
  issue: JiraIssue,
  config: JiraMappingConfig
): RoadmapItem {
  const timeValue =
    config.timeSource === 'createdAt' ? issue.fields.created :
    config.timeSource === 'updatedAt' ? issue.fields.updated :
    issue.fields.duedate ?? null

  const period = deriveTimePeriod(timeValue)

  const groupId = (() => {
    if (config.groupBy === 'epic') {
      // If this issue has a parent, use parent's key as group
      const parentKey = issue.fields.parent?.key
      if (parentKey) return parentKey
      // If this is an epic itself, use its own key
      if (issue.fields.issuetype.name.toLowerCase() === 'epic') return issue.key
      return 'no-epic'
    }
    if (config.groupBy === 'project') return issue.fields.project.id
    if (config.groupBy === 'label') return issue.fields.labels[0] ?? 'no-label'
    if (config.groupBy === 'assignee') return issue.fields.assignee?.accountId ?? 'unassigned'
    return issue.fields.project.id
  })()

  const categoryIds = (() => {
    if (config.categorySource === 'label') return issue.fields.labels
    if (config.categorySource === 'component') return issue.fields.components.map((c) => c.id)
    return []
  })()

  return {
    id: issue.key,
    identifier: issue.key,
    title: issue.fields.summary,
    description: issue.fields.description ?? '',
    status: mapStatus(issue.fields.status.statusCategory.key),
    priority: mapPriority(issue.fields.priority?.name),
    groupId,
    categoryIds,
    personaIds: [],
    quarter: period?.quarter ?? '',
    year: period?.year ?? 0,
    dueDate: issue.fields.duedate ?? null,
    assigneeId: issue.fields.assignee?.accountId ?? null,
    assigneeName: issue.fields.assignee?.displayName ?? null,
    teamId: issue.fields.project.id,
    teamName: issue.fields.project.name,
    sourceUrl: issue.self.includes('atlassian.net')
      ? `${issue.self.split('/rest/')[0]}/browse/${issue.key}`
      : `https://jira.atlassian.net/browse/${issue.key}`,
    sourceId: issue.id,
    sourceType: 'linear', // Keep as 'linear' for now since type is limited
    parentId: issue.fields.parent?.id ?? null,
    createdAt: issue.fields.created,
    updatedAt: issue.fields.updated,
  }
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

export interface JiraData {
  items: RoadmapItem[]
  groups: Group[]
  categories: Category[]
}

export async function fetchJiraData(config: JiraMappingConfig): Promise<JiraData> {
  if (!config.productArea) {
    throw new Error('Product Area is required. Please select a product area in Jira Config.')
  }

  const [rawIssues, projects] = await Promise.all([
    fetchAllIssues(config.productArea),
    fetchProjects(),
  ])

  // Build epic map for grouping
  const epics = new Map<string, string>()
  rawIssues.forEach((issue) => {
    if (issue.fields.issuetype.name.toLowerCase() === 'epic') {
      epics.set(issue.key, issue.fields.summary)
    }
  })

  // Build groups based on mapping config
  const groups: Group[] = (() => {
    if (config.groupBy === 'epic') {
      const epicGroups = Array.from(epics.entries()).map(([key, name], i) => ({
        id: key,
        name,
        description: null,
        color: '#6366f1',
        order: i,
      }))
      // Add "no-epic" group for issues without epic
      epicGroups.push({
        id: 'no-epic',
        name: 'No Epic',
        description: null,
        color: '#94a3b8',
        order: epicGroups.length,
      })
      return epicGroups
    }

    if (config.groupBy === 'project') {
      return projects.map((p, i) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? null,
        color: '#6366f1',
        order: i,
      }))
    }

    if (config.groupBy === 'label') {
      const labelSet = new Set<string>()
      rawIssues.forEach((issue) => issue.fields.labels.forEach((l) => labelSet.add(l)))
      return Array.from(labelSet).map((label, i) => ({
        id: label,
        name: label,
        description: null,
        color: '#6366f1',
        order: i,
      }))
    }

    if (config.groupBy === 'assignee') {
      const seen = new Map<string, Group>()
      rawIssues.forEach((issue, i) => {
        const id = issue.fields.assignee?.accountId ?? 'unassigned'
        if (!seen.has(id)) {
          seen.set(id, {
            id,
            name: issue.fields.assignee?.displayName ?? 'Unassigned',
            description: null,
            color: '#6366f1',
            order: i,
          })
        }
      })
      return [...seen.values()]
    }

    return []
  })()

  // Build categories
  const categories: Category[] = (() => {
    if (config.categorySource === 'label') {
      const labelSet = new Set<string>()
      rawIssues.forEach((issue) => issue.fields.labels.forEach((l) => labelSet.add(l)))
      return Array.from(labelSet).map((label) => ({
        id: label,
        name: label,
        color: '#6366f1',
      }))
    }

    if (config.categorySource === 'component') {
      const componentMap = new Map<string, JiraComponent>()
      rawIssues.forEach((issue) => {
        issue.fields.components.forEach((c) => {
          if (!componentMap.has(c.id)) componentMap.set(c.id, c)
        })
      })
      return Array.from(componentMap.values()).map((c) => ({
        id: c.id,
        name: c.name,
        color: '#6366f1',
      }))
    }

    return []
  })()

  const items = rawIssues.map((issue) => normalizeIssue(issue, config))

  return { items, groups, categories }
}
