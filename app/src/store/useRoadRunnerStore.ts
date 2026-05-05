import { create } from 'zustand'
import type {
  RoadmapItem, Group, Category, Persona, FilterState, MappingConfig, SavedView,
  Integration, IntegrationStatus, LinearCredentials, JiraCredentials, JiraMappingConfig,
} from '../types'
import { MOCK_ITEMS, MOCK_GROUPS, MOCK_CATEGORIES, MOCK_PERSONAS } from '../data/mockData'
import { applyFilters } from '../utils/filterEngine'
import { loadData } from '../services/dataService'
import { JiraAuthError, fetchProjects as fetchJiraProjectsApi } from '../services/jiraAdapter'

const DEFAULT_FILTERS: FilterState = {
  groups: [],
  categories: [],
  personas: [],
  quarters: [],
  years: [],
  statuses: [],
  priorities: [],
  assignees: [],
  search: '',
  hidePastPeriods: true,
}

export interface JiraProject {
  id: string
  key: string
  name: string
}

interface RoadRunnerStore {
  // Data
  items: RoadmapItem[]
  groups: Group[]
  categories: Category[]
  personas: Persona[]

  // UI state
  timelineView: 'quarterly' | 'annual'
  cardGranularity: 'increment' | 'epic'
  density: 'expanded' | 'condensed'
  theme: 'dark' | 'light'
  filters: FilterState
  selectedItemId: string | null
  isFilterDrawerOpen: boolean
  isSettingsOpen: boolean

  // Data source
  dataSource: 'linear' | 'demo'
  mappingConfig: MappingConfig
  jiraMappingConfig: JiraMappingConfig
  isLoading: boolean
  lastSyncedAt: string | null
  error: string | null

  // Integration / auth
  integration: Integration
  integrationStatus: IntegrationStatus
  integrationError: string | null
  linearCredentials: LinearCredentials | null
  jiraCredentials: JiraCredentials | null

  // Jira projects (populated after connect, before product area selection)
  jiraProjects: JiraProject[]
  jiraProjectsLoading: boolean

  // Saved views
  savedViews: SavedView[]
  currentViewId: string | null

  // Derived
  visibleItems: RoadmapItem[]

  // Actions
  setTimelineView: (view: 'quarterly' | 'annual') => void
  setCardGranularity: (granularity: 'increment' | 'epic') => void
  setDensity: (density: 'expanded' | 'condensed') => void
  setTheme: (theme: 'dark' | 'light') => void
  setFilters: (filters: Partial<FilterState>) => void
  clearFilters: () => void
  selectItem: (id: string | null) => void
  toggleFilterDrawer: () => void
  toggleSettings: () => void
  setDataSource: (source: 'linear' | 'demo') => void
  setMappingConfig: (config: Partial<MappingConfig>) => void
  setJiraMappingConfig: (config: Partial<JiraMappingConfig>) => void
  selectJiraProductArea: (projectKey: string) => Promise<void>
  connectLinear: (apiKey: string) => Promise<void>
  connectJira: (domain: string, email: string, apiToken: string) => Promise<void>
  fetchJiraProjects: () => Promise<void>
  disconnectIntegration: () => void
  syncData: () => Promise<void>
  saveView: (name: string, description?: string) => void
  loadView: (id: string) => void
  deleteView: (id: string) => void
}

export const useRoadRunnerStore = create<RoadRunnerStore>((set, get) => ({
  items: MOCK_ITEMS,
  groups: MOCK_GROUPS,
  categories: MOCK_CATEGORIES,
  personas: MOCK_PERSONAS,

  timelineView: 'quarterly',
  cardGranularity: 'increment',
  density: 'expanded',
  theme: (localStorage.getItem('rr-theme') as 'dark' | 'light') ?? 'dark',
  filters: DEFAULT_FILTERS,
  selectedItemId: null,
  isFilterDrawerOpen: false,
  isSettingsOpen: false,

  dataSource: 'demo',
  mappingConfig: { groupBy: 'project', categorySource: 'label', timeSource: 'dueDate', teamFilter: null, showIdentifier: false, showAssignee: false, showTeam: false },
  jiraMappingConfig: (() => {
    const saved = localStorage.getItem('rr-jira-config')
    if (saved) {
      try { return JSON.parse(saved) } catch { /* fall through */ }
    }
    return { productArea: '', groupBy: 'initiative', categorySource: 'label', timeSource: 'fixVersion', showKey: false, showAssignee: false, showSprint: false, showStoryPoints: false }
  })(),
  isLoading: false,
  lastSyncedAt: null,
  error: null,

  integration: localStorage.getItem('rr-integration') as Integration ?? null,
  integrationStatus: localStorage.getItem('rr-session') ? 'connected' : 'idle',
  integrationError: null,
  linearCredentials: localStorage.getItem('rr-integration') === 'linear' ? { apiKey: '••••••••' } : null,
  jiraCredentials: localStorage.getItem('rr-integration') === 'jira'
    ? { domain: '', email: '', apiToken: '••••••••' }
    : null,

  jiraProjects: [],
  jiraProjectsLoading: false,

  savedViews: [],
  currentViewId: null,

  get visibleItems() {
    return applyFilters(get().items, get().filters)
  },

  setTimelineView: (view) => set({ timelineView: view }),
  setCardGranularity: (granularity) => set({ cardGranularity: granularity }),
  setDensity: (density) => set({ density }),
  setTheme: (theme) => {
    localStorage.setItem('rr-theme', theme)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    set({ theme })
  },

  setFilters: (partial) =>
    set((state) => ({ filters: { ...state.filters, ...partial } })),

  clearFilters: () => set({ filters: DEFAULT_FILTERS, currentViewId: null }),

  selectItem: (id) => set({ selectedItemId: id }),

  toggleFilterDrawer: () =>
    set((state) => ({ isFilterDrawerOpen: !state.isFilterDrawerOpen })),

  toggleSettings: () =>
    set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),

  setDataSource: async (source) => {
    set({ dataSource: source })
    await get().syncData()
  },

  setMappingConfig: (config) =>
    set((state) => ({ mappingConfig: { ...state.mappingConfig, ...config } })),

  setJiraMappingConfig: (config) =>
    set((state) => {
      const updated = { ...state.jiraMappingConfig, ...config }
      localStorage.setItem('rr-jira-config', JSON.stringify(updated))
      return { jiraMappingConfig: updated }
    }),

  selectJiraProductArea: async (projectKey) => {
    set((state) => {
      const updated = { ...state.jiraMappingConfig, productArea: projectKey }
      localStorage.setItem('rr-jira-config', JSON.stringify(updated))
      return { jiraMappingConfig: updated }
    })
    await get().syncData()
  },

  connectLinear: async (apiKey) => {
    set({ integrationStatus: 'connecting', integrationError: null })
    try {
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integration: 'linear', linearKey: apiKey }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Server error ${res.status}`)
      }
      const { sessionId } = await res.json()
      localStorage.setItem('rr-session', sessionId)
      localStorage.setItem('rr-integration', 'linear')
      set({ integration: 'linear', integrationStatus: 'connected', integrationError: null, linearCredentials: { apiKey: '••••••••' }, dataSource: 'linear' })
      await get().syncData()
    } catch (err) {
      set({ integrationStatus: 'error', integrationError: err instanceof Error ? err.message : 'Failed to save credentials' })
    }
  },

  connectJira: async (domain, email, apiToken) => {
    set({ integrationStatus: 'connecting', integrationError: null })
    try {
      const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integration: 'jira', jiraDomain: normalizedDomain, jiraEmail: email, jiraToken: apiToken }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Server error ${res.status}`)
      }
      const { sessionId } = await res.json()
      localStorage.setItem('rr-session', sessionId)
      localStorage.setItem('rr-integration', 'jira')
      // Reset product area so user must pick one for the new connection
      const freshConfig = { ...get().jiraMappingConfig, productArea: '' }
      localStorage.setItem('rr-jira-config', JSON.stringify(freshConfig))
      set({
        integration: 'jira',
        integrationStatus: 'connected',
        integrationError: null,
        jiraCredentials: { domain: normalizedDomain, email, apiToken: '••••••••' },
        jiraMappingConfig: freshConfig,
        items: [],
        groups: [],
        categories: [],
      })
      // Load projects list — user will pick one, which triggers the full sync
      await get().fetchJiraProjects()
    } catch (err) {
      set({ integrationStatus: 'error', integrationError: err instanceof Error ? err.message : 'Failed to save credentials' })
    }
  },

  fetchJiraProjects: async () => {
    set({ jiraProjectsLoading: true })
    try {
      const projects = await fetchJiraProjectsApi()
      set({ jiraProjects: projects.map((p) => ({ id: p.id, key: p.key, name: p.name })), jiraProjectsLoading: false })
    } catch (err) {
      console.error('Failed to fetch Jira projects:', err)
      set({ jiraProjectsLoading: false })
    }
  },

  disconnectIntegration: () => {
    const sessionId = localStorage.getItem('rr-session')
    if (sessionId) {
      fetch('/api/credentials', { method: 'DELETE', headers: { 'X-RR-Session': sessionId } }).catch(() => {})
    }
    ;['rr-session', 'rr-integration', 'rr-jira-config'].forEach((k) => localStorage.removeItem(k))
    set({
      integration: null,
      integrationStatus: 'idle',
      integrationError: null,
      linearCredentials: null,
      jiraCredentials: null,
      dataSource: 'demo',
      jiraProjects: [],
      jiraProjectsLoading: false,
      items: MOCK_ITEMS,
      groups: MOCK_GROUPS,
      categories: MOCK_CATEGORIES,
    })
  },

  syncData: async () => {
    const { integration, dataSource, mappingConfig, jiraMappingConfig } = get()
    set({ isLoading: true, error: null })
    try {
      const source = integration === 'jira' ? 'jira' : integration === 'linear' ? 'linear' : dataSource
      const config = integration === 'jira' ? jiraMappingConfig : mappingConfig
      const data = await loadData(source, config)
      set({
        items: data.items,
        groups: data.groups,
        categories: data.categories,
        dataSource: integration === 'linear' ? 'linear' : 'demo',
        filters: DEFAULT_FILTERS,
        isLoading: false,
        lastSyncedAt: new Date().toISOString(),
      })
    } catch (err) {
      if (err instanceof JiraAuthError) {
        // Session is invalid/expired — clear it and return to disconnected state
        ;['rr-session', 'rr-integration', 'rr-jira-config'].forEach((k) => localStorage.removeItem(k))
        set({
          integration: null,
          integrationStatus: 'idle',
          integrationError: 'Your Jira session expired. Please reconnect.',
          jiraCredentials: null,
          linearCredentials: null,
          dataSource: 'demo',
          error: null,
          isLoading: false,
        })
      } else {
        set({
          error: err instanceof Error ? err.message : 'Failed to load data',
          isLoading: false,
        })
      }
    }
  },

  saveView: (name, description) => {
    const { filters, timelineView, density } = get()
    const now = new Date().toISOString()
    const view: SavedView = {
      id: crypto.randomUUID(),
      name,
      description: description ?? null,
      filters: { ...filters },
      timelineView,
      density,
      createdAt: now,
      updatedAt: now,
    }
    set((state) => ({ savedViews: [...state.savedViews, view], currentViewId: view.id }))
  },

  loadView: (id) => {
    const view = get().savedViews.find((v) => v.id === id)
    if (!view) return
    set({
      filters: { ...view.filters },
      timelineView: view.timelineView,
      density: view.density,
      currentViewId: id,
    })
  },

  deleteView: (id) =>
    set((state) => ({
      savedViews: state.savedViews.filter((v) => v.id !== id),
      currentViewId: state.currentViewId === id ? null : state.currentViewId,
    })),
}))
