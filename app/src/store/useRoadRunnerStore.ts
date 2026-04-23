import { create } from 'zustand'
import type { RoadmapItem, Group, Category, Persona, FilterState, MappingConfig, SavedView } from '../types'
import { MOCK_ITEMS, MOCK_GROUPS, MOCK_CATEGORIES, MOCK_PERSONAS } from '../data/mockData'
import { applyFilters } from '../utils/filterEngine'
import { loadData } from '../services/dataService'

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
}

interface RoadRunnerStore {
  // Data
  items: RoadmapItem[]
  groups: Group[]
  categories: Category[]
  personas: Persona[]

  // UI state
  timelineView: 'quarterly' | 'annual'
  density: 'expanded' | 'condensed'
  filters: FilterState
  selectedItemId: string | null
  isFilterDrawerOpen: boolean
  isSettingsOpen: boolean

  // Data source
  dataSource: 'linear' | 'demo'
  mappingConfig: MappingConfig
  isLoading: boolean
  lastSyncedAt: string | null
  error: string | null

  // Saved views
  savedViews: SavedView[]
  currentViewId: string | null

  // Derived
  visibleItems: RoadmapItem[]

  // Actions
  setTimelineView: (view: 'quarterly' | 'annual') => void
  setDensity: (density: 'expanded' | 'condensed') => void
  setFilters: (filters: Partial<FilterState>) => void
  clearFilters: () => void
  selectItem: (id: string | null) => void
  toggleFilterDrawer: () => void
  toggleSettings: () => void
  setDataSource: (source: 'linear' | 'demo') => void
  setMappingConfig: (config: Partial<MappingConfig>) => void
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
  density: 'expanded',
  filters: DEFAULT_FILTERS,
  selectedItemId: null,
  isFilterDrawerOpen: false,
  isSettingsOpen: false,

  dataSource: 'demo',
  mappingConfig: { groupBy: 'project', categorySource: 'label', timeSource: 'dueDate', teamFilter: null, showIdentifier: false, showAssignee: false, showTeam: false },
  isLoading: false,
  lastSyncedAt: null,
  error: null,

  savedViews: [],
  currentViewId: null,

  get visibleItems() {
    return applyFilters(get().items, get().filters)
  },

  setTimelineView: (view) => set({ timelineView: view }),
  setDensity: (density) => set({ density }),

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

  syncData: async () => {
    const { dataSource, mappingConfig } = get()
    set({ isLoading: true, error: null })
    try {
      const data = await loadData(dataSource, mappingConfig)
      set({
        items: data.items,
        groups: data.groups,
        categories: data.categories,
        filters: DEFAULT_FILTERS,
        isLoading: false,
        lastSyncedAt: new Date().toISOString(),
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load data',
        isLoading: false,
      })
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
