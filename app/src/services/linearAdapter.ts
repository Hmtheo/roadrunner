import type { RoadmapItem, Group, Category, ItemStatus, Priority, MappingConfig } from '../types'
import { deriveTimePeriod } from '../utils/timePeriod'

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const sessionId = localStorage.getItem('rr-session') ?? ''
  const res = await fetch('/api/linear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-RR-Session': sessionId },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = body?.errors?.[0]?.message ?? body?.error ?? ''
    throw new Error(`Linear API error: ${res.status}${detail ? ` — ${detail}` : ''}`)
  }

  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'GraphQL error')

  return json.data as T
}

// ─── Status mapping ───────────────────────────────────────────────────────────

function mapStatus(stateType: string, stateName: string): ItemStatus {
  if (stateType === 'completed') return 'done'
  if (stateType === 'canceled') return 'canceled'
  if (stateType === 'started') {
    if (stateName.toLowerCase().includes('review')) return 'in-review'
    return 'in-progress'
  }
  if (stateType === 'unstarted') return 'todo'
  return 'backlog'
}

// ─── Priority mapping ─────────────────────────────────────────────────────────

function mapPriority(p: number): Priority {
  const map: Record<number, Priority> = { 0: 'none', 1: 'urgent', 2: 'high', 3: 'medium', 4: 'low' }
  return map[p] ?? 'none'
}

// ─── Fetch issues ─────────────────────────────────────────────────────────────

interface LinearIssue {
  id: string
  identifier: string
  title: string
  description: string | null
  url: string
  priority: number
  dueDate: string | null
  createdAt: string
  updatedAt: string
  parent: { id: string } | null
  state: { name: string; type: string }
  assignee: { id: string; name: string } | null
  project: { id: string; name: string } | null
  team: { id: string; name: string }
  labels: { nodes: { id: string; name: string; color: string }[] }
}

interface LinearProject {
  id: string
  name: string
  description: string | null
  color: string | null
  slugId: string
}

interface LinearLabel {
  id: string
  name: string
  color: string
}

interface LinearTeam {
  id: string
  name: string
}

const ISSUES_QUERY = `
  query Issues($after: String) {
    issues(first: 100, after: $after, filter: { state: { type: { nin: ["canceled"] } } }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id identifier title description url priority dueDate createdAt updatedAt
        parent { id }
        state { name type }
        assignee { id name }
        project { id name }
        team { id name }
        labels { nodes { id name color } }
      }
    }
  }
`

const PROJECTS_QUERY = `
  query {
    projects(first: 50) {
      nodes { id name description color slugId }
    }
  }
`

const LABELS_QUERY = `
  query {
    issueLabels(first: 100) {
      nodes { id name color }
    }
  }
`

const TEAMS_QUERY = `
  query {
    teams(first: 50) {
      nodes { id name }
    }
  }
`

type IssuesResponse = { issues: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: LinearIssue[] } }

async function fetchAllIssues(): Promise<LinearIssue[]> {
  const issues: LinearIssue[] = []
  let cursor: string | null = null

  do {
    const data: IssuesResponse = await gql<IssuesResponse>(ISSUES_QUERY, cursor ? { after: cursor } : {})
    issues.push(...data.issues.nodes)
    cursor = data.issues.pageInfo.hasNextPage ? data.issues.pageInfo.endCursor : null
  } while (cursor)

  return issues
}

// ─── Normalize ────────────────────────────────────────────────────────────────

function normalizeIssue(
  issue: LinearIssue,
  config: MappingConfig
): RoadmapItem {
  const timeValue =
    config.timeSource === 'createdAt' ? issue.createdAt :
    config.timeSource === 'updatedAt' ? issue.updatedAt :
    issue.dueDate
  const period = deriveTimePeriod(timeValue)
  const labelIds = issue.labels.nodes.map((l) => l.id)

  const groupId = (() => {
    if (config.groupBy === 'project') return issue.project?.id ?? 'no-project'
    if (config.groupBy === 'label') return issue.labels.nodes[0]?.id ?? 'no-label'
    if (config.groupBy === 'team') return issue.team?.id ?? 'no-team'
    if (config.groupBy === 'assignee') return issue.assignee?.id ?? 'unassigned'
    return issue.project?.id ?? 'no-project'
  })()

  const categoryIds = config.categorySource === 'label' ? labelIds : []

  return {
    id: issue.identifier,
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description ?? '',
    status: mapStatus(issue.state.type, issue.state.name),
    priority: mapPriority(issue.priority),
    groupId,
    categoryIds,
    personaIds: [],
    quarter: period?.quarter ?? '',
    year: period?.year ?? 0,
    dueDate: issue.dueDate,
    assigneeId: issue.assignee?.id ?? null,
    assigneeName: issue.assignee?.name ?? null,
    teamId: issue.team?.id ?? null,
    teamName: issue.team?.name ?? null,
    sourceUrl: issue.url,
    sourceId: issue.id,
    sourceType: 'linear',
    parentId: issue.parent?.id ?? null,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  }
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

export interface LinearData {
  items: RoadmapItem[]
  groups: Group[]
  categories: Category[]
}

export async function fetchLinearData(config: MappingConfig): Promise<LinearData> {
  const [rawIssues, projectsData, labelsData, teamsData] = await Promise.all([
    fetchAllIssues(),
    gql<{ projects: { nodes: LinearProject[] } }>(PROJECTS_QUERY),
    gql<{ issueLabels: { nodes: LinearLabel[] } }>(LABELS_QUERY),
    gql<{ teams: { nodes: LinearTeam[] } }>(TEAMS_QUERY),
  ])

  const projects = projectsData.projects.nodes
  const labels = labelsData.issueLabels.nodes
  const teams = teamsData.teams.nodes

  // Build groups based on mapping config
  const groups: Group[] = (() => {
    if (config.groupBy === 'project') {
      return projects.map((p, i) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        color: p.color ?? '#6366f1',
        order: i,
      }))
    }
    if (config.groupBy === 'label') {
      return labels.map((l, i) => ({
        id: l.id,
        name: l.name,
        description: null,
        color: l.color,
        order: i,
      }))
    }
    if (config.groupBy === 'team') {
      return teams.map((t, i) => ({
        id: t.id,
        name: t.name,
        description: null,
        color: '#6366f1',
        order: i,
      }))
    }
    // assignee — derive from issues
    const seen = new Map<string, Group>()
    rawIssues.forEach((issue, i) => {
      const id = issue.assignee?.id ?? 'unassigned'
      if (!seen.has(id)) {
        seen.set(id, {
          id,
          name: issue.assignee?.name ?? 'Unassigned',
          description: null,
          color: '#6366f1',
          order: i,
        })
      }
    })
    return [...seen.values()]
  })()

  // Categories always come from labels
  const categories: Category[] = labels.map((l) => ({
    id: l.id,
    name: l.name,
    color: l.color,
  }))

  const items = rawIssues.map((issue) => normalizeIssue(issue, config))

  return { items, groups, categories }
}
