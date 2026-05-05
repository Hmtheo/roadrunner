import { useCallback } from 'react'
import { X } from 'lucide-react'
import { useRoadRunnerStore } from '../store/useRoadRunnerStore'
import { countActiveFilters } from '../utils/filterEngine'
import type { ItemStatus, Priority } from '../types'

const STATUSES: ItemStatus[] = ['backlog', 'todo', 'in-progress', 'in-review', 'done', 'canceled']
const STATUS_LABELS: Record<ItemStatus, string> = {
  backlog: 'Backlog', todo: 'Todo', 'in-progress': 'In Progress',
  'in-review': 'In Review', done: 'Done', canceled: 'Canceled',
}

const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low', 'none']
const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low', none: 'None',
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

const CURRENT_YEAR = new Date().getFullYear()

export function FilterDrawer() {
  const {
    isFilterDrawerOpen, toggleFilterDrawer,
    filters, setFilters, clearFilters,
    groups, categories, personas,
    items,
  } = useRoadRunnerStore()

  const activeCount = countActiveFilters(filters)

  const allYears = [...new Set(items.map((i) => i.year).filter(Boolean))].sort() as number[]
  const pastYears = allYears.filter((y) => y < CURRENT_YEAR)

  const toggleArray = useCallback(<T,>(
    arr: T[],
    value: T,
    key: keyof typeof filters
  ) => {
    const next = arr.includes(value)
      ? arr.filter((v) => v !== value)
      : [...arr, value]
    setFilters({ [key]: next } as Partial<typeof filters>)
  }, [setFilters])

  if (!isFilterDrawerOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-30"
        onClick={toggleFilterDrawer}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-zinc-900 border-l border-zinc-700/50 z-40 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-100">Filters</span>
            {activeCount > 0 && (
              <span className="bg-orange-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-orange-400 hover:text-orange-300"
              >
                Clear all
              </button>
            )}
            <button onClick={toggleFilterDrawer} className="text-zinc-400 hover:text-zinc-200">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Search */}
          <section>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              placeholder="Filter by title..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </section>

          {/* Group */}
          <section>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Project
            </label>
            <div className="space-y-1.5">
              {groups.map((g) => (
                <label key={g.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.groups.includes(g.id)}
                    onChange={() => toggleArray(filters.groups, g.id, 'groups')}
                    className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: g.color }} />
                  <span className="text-sm text-zinc-300 group-hover:text-zinc-100">{g.name}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Category */}
          <section>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Category
            </label>
            <div className="space-y-1.5">
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(c.id)}
                    onChange={() => toggleArray(filters.categories, c.id, 'categories')}
                    className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-sm text-zinc-300 group-hover:text-zinc-100">{c.name}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Persona */}
          <section>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Persona
            </label>
            <div className="space-y-1.5">
              {personas.map((p) => (
                <label key={p.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.personas.includes(p.id)}
                    onChange={() => toggleArray(filters.personas, p.id, 'personas')}
                    className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="text-base leading-none">{p.emoji}</span>
                  <div className="min-w-0">
                    <span className="text-sm text-zinc-300 group-hover:text-zinc-100">{p.name}</span>
                    <p className="text-xs text-zinc-500 truncate">{p.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Status */}
          <section>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Status
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleArray(filters.statuses, s, 'statuses')}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    filters.statuses.includes(s)
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </section>

          {/* Priority */}
          <section>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Priority
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => toggleArray(filters.priorities, p, 'priorities')}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    filters.priorities.includes(p)
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </section>

          {/* Quarter */}
          <section>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Quarter
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUARTERS.map((q) => (
                <button
                  key={q}
                  onClick={() => toggleArray(filters.quarters, q, 'quarters')}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    filters.quarters.includes(q)
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </section>

          {/* Past years */}
          {pastYears.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Past years
                </label>
                <span className="text-xs text-zinc-600">hidden by default</span>
              </div>

              {filters.hidePastPeriods ? (
                <div className="space-y-1.5">
                  {pastYears.map((y) => (
                    <label key={y} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={filters.years.includes(y)}
                        onChange={() => toggleArray(filters.years, y, 'years')}
                        className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-zinc-300 group-hover:text-zinc-100">{y}</span>
                    </label>
                  ))}
                  <button
                    onClick={() => setFilters({ hidePastPeriods: false, years: [] })}
                    className="mt-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Show all past years
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2">
                  <span className="text-xs text-zinc-300">All past years visible</span>
                  <button
                    onClick={() => setFilters({ hidePastPeriods: true, years: [] })}
                    className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
                    title="Hide past years again"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  )
}
