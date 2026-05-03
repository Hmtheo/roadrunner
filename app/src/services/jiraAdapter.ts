import type { RoadmapItem, Group, Category, ItemStatus, Priority, JiraMappingConfig } from '../types'
import { deriveTimePeriod } from '../utils/timePeriod'

export class JiraAuthError extends Error {
  constructor(detail?: string) {
    super(detail ? `Jira authentication failed — ${detail}` : 'Jira authentication failed')
    this.name = 'JiraAuthError'
  }
}

async function jiraFetch<T>(path: string, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<T> {
  const sessionId = localStorage.getItem('rr-session') ?? ''
  // Split path and query string — path goes as ?path=, rest as additional params
  const [pathPart, queryPart] = path.split('?')
  const url = `/api/jira-proxy?path=${encodeURIComponent(pathPart)}${queryPart ? `&${queryPart}` : ''}`
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-RR-Session': sessionId },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const respBody = await res.json().catch(() => ({}))
    const detail = respBody?.errorMessages?.[0] ?? respBody?.error ?? respBody?.detail ?? ''
    console.error('Jira API error:', { status: res.status, url, body: respBody })
    if (res.status === 401 || res.status === 403) {
      throw new JiraAuthError(detail)
    }
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

interface JiraFixVersion {
  id: string
  name: string
  releaseDate?: string
  released?: boolean
}

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
    // parent includes fields.summary and fields.issuetype for richer lookups
    parent?: {
      id: string
      key: string
      fields?: {
        summary?: string
        issuetype?: { name: string }
      }
    }
    fixVersions: JiraFixVersion[]
  }
  self: string
}

export interface JiraProject {
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

// ─── Initiative lookup ────────────────────────────────────────────────────────

export interface EpicHierarchyInfo {
  initiativeKey: string
  initiativeName: string
  incrementKey: string
  incrementName: string
}

interface JiraIncrementIssue {
  key: string
  fields: {
    summary: string
    issuetype: { name: string }
    parent?: {
      key: string
      fields?: { summary?: string; issuetype?: { name: string } }
    }
  }
}

/**
 * Fetch ROAD Increment issues to resolve their parent Initiative and capture increment names.
 * Hierarchy: Initiative → Increment → Epic (DTP) → Story
 */
async function fetchIncrementDetails(
  incrementKeys: string[],
): Promise<Map<string, { incrementName: string; initiativeKey: string }>> {
  const map = new Map<string, { incrementName: string; initiativeKey: string }>()
  if (incrementKeys.length === 0) return map

  const chunks: string[][] = []
  for (let i = 0; i < incrementKeys.length; i += 50) {
    chunks.push(incrementKeys.slice(i, i + 50))
  }

  for (const chunk of chunks) {
    const jql = `key in (${chunk.map((k) => `"${k}"`).join(',')})`
    try {
      const data = await jiraFetch<{ issues: JiraIncrementIssue[] }>(
        `search/jql?jql=${encodeURIComponent(jql)}&maxResults=50&fields=${encodeURIComponent('summary,parent,issuetype')}`,
      )
      data.issues.forEach((issue) => {
        const parentKey = issue.fields.parent?.key ?? issue.key
        map.set(issue.key, { incrementName: issue.fields.summary, initiativeKey: parentKey })
      })
    } catch (err) {
      console.error('Failed to fetch increment details:', err)
    }
  }

  return map
}

/**
 * Fetch Initiative issues by key to get their names.
 */
async function fetchInitiativeNames(initiativeKeys: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (initiativeKeys.length === 0) return map

  const chunks: string[][] = []
  for (let i = 0; i < initiativeKeys.length; i += 50) {
    chunks.push(initiativeKeys.slice(i, i + 50))
  }

  for (const chunk of chunks) {
    const jql = `key in (${chunk.map((k) => `"${k}"`).join(',')})`
    try {
      const data = await jiraFetch<{ issues: Array<{ key: string; fields: { summary: string } }> }>(
        `search/jql?jql=${encodeURIComponent(jql)}&maxResults=50&fields=${encodeURIComponent('summary')}`,
      )
      data.issues.forEach((issue) => map.set(issue.key, issue.fields.summary))
    } catch (err) {
      console.error('Failed to fetch initiative names:', err)
    }
  }

  return map
}

/**
 * Build a map from epicKey → full hierarchy info.
 * Goes two levels up: Epic → Increment (direct parent) → Initiative (increment's parent).
 */
async function buildEpicToHierarchyMap(issues: JiraIssue[]): Promise<Map<string, EpicHierarchyInfo>> {
  // Step 1: Collect unique Increment keys from Epic parents
  const epicToIncrementKey = new Map<string, string>()
  issues.forEach((issue) => {
    if (issue.fields.issuetype.name.toLowerCase() === 'epic' && issue.fields.parent?.key) {
      epicToIncrementKey.set(issue.key, issue.fields.parent.key)
    }
  })

  // Step 2: Fetch increment details (name + initiative key)
  const incrementDetails = await fetchIncrementDetails([...new Set(epicToIncrementKey.values())])

  // Step 3: Fetch initiative names
  const initiativeKeys = new Set([...incrementDetails.values()].map((d) => d.initiativeKey))
  const initiativeNames = await fetchInitiativeNames([...initiativeKeys])

  // Step 4: Build Epic → full hierarchy
  const map = new Map<string, EpicHierarchyInfo>()
  issues.forEach((issue) => {
    if (issue.fields.issuetype.name.toLowerCase() !== 'epic') return
    const incrementKey = epicToIncrementKey.get(issue.key)
    if (!incrementKey) return
    const incDetail = incrementDetails.get(incrementKey)
    if (!incDetail) return
    map.set(issue.key, {
      initiativeKey: incDetail.initiativeKey,
      initiativeName: initiativeNames.get(incDetail.initiativeKey) ?? incDetail.initiativeKey,
      incrementKey,
      incrementName: incDetail.incrementName,
    })
  })

  return map
}

// ─── Fix version → time period ────────────────────────────────────────────────

function fixVersionTimePeriod(fixVersions: JiraFixVersion[]): { quarter: string; year: number; date: string } | null {
  // Prefer the first fix version that has a release date
  const fv = fixVersions.find((v) => v.releaseDate) ?? fixVersions[0]
  if (!fv) return null
  if (fv.releaseDate) {
    const period = deriveTimePeriod(fv.releaseDate)
    if (period) return { ...period, date: fv.releaseDate }
  }
  // Parse quarter from the version name itself, e.g. "DTP 2026.3.0.0 UAT" → Q3 2026
  const match = fv.name.match(/(\d{4})\.(\d)/)
  if (match) {
    const year = parseInt(match[1])
    const quarter = `Q${match[2]}`
    return { quarter, year, date: '' }
  }
  return null
}

// ─── Fetch data ───────────────────────────────────────────────────────────────

// Max issues to fetch — DTP has 2000+ so we cap at 500 most-recent
const MAX_ISSUES = 500

async function fetchAllIssues(productArea: string): Promise<JiraIssue[]> {
  const issues: JiraIssue[] = []
  let nextPageToken: string | undefined = undefined
  const maxResults = 100

  // Fetch recent issues updated in the last 2 years — avoids loading ancient backlog
  const twoYearsAgo = new Date()
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
  const since = twoYearsAgo.toISOString().split('T')[0] // YYYY-MM-DD

  const jql = `project = "${productArea}" AND updated >= "${since}" ORDER BY updated DESC`
  // Include fixVersions and expanded parent (parent fields auto-included by Jira)
  const fields = 'summary,description,status,priority,duedate,created,updated,assignee,project,labels,components,issuetype,parent,fixVersions'

  // Jira Cloud REST API v3 /search/jql uses cursor-based pagination (nextPageToken + isLast)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const queryParts = [
      `jql=${encodeURIComponent(jql)}`,
      `maxResults=${maxResults}`,
      `fields=${encodeURIComponent(fields)}`,
    ]
    if (nextPageToken) queryParts.push(`nextPageToken=${encodeURIComponent(nextPageToken)}`)

    const data = await jiraFetch<{ issues: JiraIssue[]; nextPageToken?: string; isLast?: boolean }>(
      `search/jql?${queryParts.join('&')}`,
    )

    issues.push(...data.issues)

    if (data.isLast || !data.nextPageToken || data.issues.length === 0 || issues.length >= MAX_ISSUES) break
    nextPageToken = data.nextPageToken
  }

  return issues
}

export async function fetchProjects(): Promise<JiraProject[]> {
  const data = await jiraFetch<JiraProject[]>('project')
  return data
}

// ─── Normalize ────────────────────────────────────────────────────────────────

function normalizeIssue(
  issue: JiraIssue,
  config: JiraMappingConfig,
  epicHierarchyMap: Map<string, EpicHierarchyInfo>,
  epicSummaryMap: Map<string, string>,
): RoadmapItem {
  // ── Time placement ──
  let timeDate: string | null = null
  let quarter = ''
  let year = 0
  let dueDate = issue.fields.duedate ?? null

  if (config.timeSource === 'fixVersion') {
    const fvPeriod = fixVersionTimePeriod(issue.fields.fixVersions ?? [])
    if (fvPeriod) {
      quarter = fvPeriod.quarter
      year = fvPeriod.year
      dueDate = fvPeriod.date || dueDate
    }
  } else {
    timeDate =
      config.timeSource === 'createdAt' ? issue.fields.created :
      config.timeSource === 'updatedAt' ? issue.fields.updated :
      issue.fields.duedate ?? null
    const period = deriveTimePeriod(timeDate)
    if (period) {
      quarter = period.quarter
      year = period.year
    }
  }

  // ── Issue type flags ──
  const isEpic = issue.fields.issuetype.name.toLowerCase() === 'epic'
  const isInitiativeType = issue.fields.issuetype.name.toLowerCase() === 'initiative'

  // ── Hierarchy fields ──
  // For epics: use the hierarchy map directly.
  // For stories/tasks: look through their parent epic.
  const epicKey = isEpic ? issue.key : issue.fields.parent?.key
  const hierarchy = epicKey ? epicHierarchyMap.get(epicKey) : undefined

  const epicId = isEpic ? issue.key : (issue.fields.parent?.key ?? undefined)
  const epicName = isEpic
    ? issue.fields.summary
    : (epicKey ? (epicSummaryMap.get(epicKey) ?? undefined) : undefined)
  const incrementId = hierarchy?.incrementKey
  const incrementName = hierarchy?.incrementName

  // ── Group (swimlane row) ──
  const groupId = (() => {
    if (config.groupBy === 'initiative') {
      if (isInitiativeType) return issue.key
      if (isEpic) return hierarchy?.initiativeKey ?? 'no-initiative'
      // Story/Task: look up via parent epic
      const parentKey = issue.fields.parent?.key
      if (parentKey) {
        const parentHier = epicHierarchyMap.get(parentKey)
        if (parentHier) return parentHier.initiativeKey
      }
      return 'no-initiative'
    }
    if (config.groupBy === 'epic') {
      const parentKey = issue.fields.parent?.key
      if (parentKey) return parentKey
      if (isEpic) return issue.key
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

  // Build source URL from the self URL or fallback
  const domain = issue.self.includes('atlassian.net') ? issue.self.split('/rest/')[0] : ''
  const sourceUrl = domain
    ? `${domain}/browse/${issue.key}`
    : `https://jira.atlassian.net/browse/${issue.key}`

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
    quarter,
    year,
    dueDate,
    assigneeId: issue.fields.assignee?.accountId ?? null,
    assigneeName: issue.fields.assignee?.displayName ?? null,
    teamId: issue.fields.project.id,
    teamName: issue.fields.project.name,
    sourceUrl,
    sourceId: issue.id,
    sourceType: 'jira',
    parentId: issue.fields.parent?.id ?? null,
    createdAt: issue.fields.created,
    updatedAt: issue.fields.updated,
    epicId,
    epicName,
    incrementId,
    incrementName,
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

  // Build epic hierarchy map: epicKey → { initiativeKey, initiativeName, incrementKey, incrementName }
  // Two extra round-trips: one to fetch increment details, one for initiative names.
  const epicHierarchyMap = await buildEpicToHierarchyMap(rawIssues)

  // Build a quick epicKey → summary map for use in story normalisation
  const epicSummaryMap = new Map<string, string>()
  rawIssues.forEach((issue) => {
    if (issue.fields.issuetype.name.toLowerCase() === 'epic') {
      epicSummaryMap.set(issue.key, issue.fields.summary)
    }
  })

  // ── Build groups ──
  const groups: Group[] = (() => {
    if (config.groupBy === 'initiative') {
      // Collect unique initiatives from the hierarchy map
      const seen = new Map<string, { name: string; order: number }>()
      let order = 0
      epicHierarchyMap.forEach((hier) => {
        if (!seen.has(hier.initiativeKey)) {
          seen.set(hier.initiativeKey, { name: hier.initiativeName, order: order++ })
        }
      })
      // Also pick up raw Initiative issue types that may not be in any epic's chain
      rawIssues.forEach((issue) => {
        if (issue.fields.issuetype.name.toLowerCase() === 'initiative' && !seen.has(issue.key)) {
          seen.set(issue.key, { name: issue.fields.summary, order: order++ })
        }
      })
      const result = Array.from(seen.entries()).map(([id, { name, order: o }]) => ({
        id,
        name,
        description: null,
        color: '#6366f1',
        order: o,
      }))
      result.push({ id: 'no-initiative', name: 'No Initiative', description: null, color: '#94a3b8', order: order })
      return result
    }

    if (config.groupBy === 'epic') {
      const epics = new Map<string, string>()
      rawIssues.forEach((issue) => {
        if (issue.fields.issuetype.name.toLowerCase() === 'epic') {
          epics.set(issue.key, issue.fields.summary)
        }
      })
      const epicGroups = Array.from(epics.entries()).map(([key, name], i) => ({
        id: key, name, description: null, color: '#6366f1', order: i,
      }))
      epicGroups.push({ id: 'no-epic', name: 'No Epic', description: null, color: '#94a3b8', order: epicGroups.length })
      return epicGroups
    }

    if (config.groupBy === 'project') {
      return projects.map((p, i) => ({
        id: p.id, name: p.name, description: p.description ?? null, color: '#6366f1', order: i,
      }))
    }

    if (config.groupBy === 'label') {
      const labelSet = new Set<string>()
      rawIssues.forEach((issue) => issue.fields.labels.forEach((l) => labelSet.add(l)))
      return Array.from(labelSet).map((label, i) => ({
        id: label, name: label, description: null, color: '#6366f1', order: i,
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

  // ── Build categories ──
  const categories: Category[] = (() => {
    if (config.categorySource === 'label') {
      const labelSet = new Set<string>()
      rawIssues.forEach((issue) => issue.fields.labels.forEach((l) => labelSet.add(l)))
      return Array.from(labelSet).map((label) => ({ id: label, name: label, color: '#6366f1' }))
    }

    if (config.categorySource === 'component') {
      const componentMap = new Map<string, JiraComponent>()
      rawIssues.forEach((issue) => {
        issue.fields.components.forEach((c) => {
          if (!componentMap.has(c.id)) componentMap.set(c.id, c)
        })
      })
      return Array.from(componentMap.values()).map((c) => ({ id: c.id, name: c.name, color: '#6366f1' }))
    }

    return []
  })()

  const items = rawIssues.map((issue) => normalizeIssue(issue, config, epicHierarchyMap, epicSummaryMap))

  return { items, groups, categories }
}
