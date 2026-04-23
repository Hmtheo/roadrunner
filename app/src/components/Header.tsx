import { RefreshCw, Settings, SlidersHorizontal } from 'lucide-react'
import { useRoadRunnerStore } from '../store/useRoadRunnerStore'
import { countActiveFilters } from '../utils/filterEngine'

export function Header() {
  const {
    timelineView, setTimelineView,
    density, setDensity,
    filters, toggleFilterDrawer,
    toggleSettings,
    dataSource, isLoading, lastSyncedAt, error,
    syncData,
  } = useRoadRunnerStore()

  const activeFilterCount = countActiveFilters(filters)

  const syncLabel = lastSyncedAt
    ? `Updated ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : null

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-700/50 bg-zinc-900/90 backdrop-blur sticky top-0 z-20">
        {/* Left — logo + data source */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">RR</span>
            </div>
            <span className="text-sm font-semibold text-zinc-100">RoadRunner</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${dataSource === 'linear' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-xs text-zinc-400">{dataSource === 'linear' ? 'Linear' : 'Demo'}</span>
            {syncLabel && <span className="text-xs text-zinc-600">· {syncLabel}</span>}
          </div>
        </div>

        {/* Center — timeline toggle + refresh */}
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-800 border border-zinc-700 rounded-lg p-0.5 gap-0.5">
            {(['quarterly', 'annual'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setTimelineView(view)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize ${
                  timelineView === view
                    ? 'bg-zinc-600 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {view}
              </button>
            ))}
          </div>

          <button
            onClick={syncData}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title={dataSource === 'linear' ? 'Refresh from Linear' : 'Reload demo data'}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Right — density + filter + settings */}
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-800 border border-zinc-700 rounded-lg p-0.5 gap-0.5">
            {(['condensed', 'expanded'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDensity(d)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize ${
                  density === d
                    ? 'bg-zinc-600 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            onClick={toggleFilterDrawer}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              activeFilterCount > 0
                ? 'bg-orange-500/20 border-orange-500/40 text-orange-300 hover:bg-orange-500/30'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <SlidersHorizontal size={13} />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-orange-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={toggleSettings}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Settings"
          >
            <Settings size={15} />
          </button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-red-900/40 border-b border-red-700/50 px-6 py-2 text-xs text-red-300 flex items-center justify-between">
          <span>⚠ {error}</span>
          <button onClick={syncData} className="underline hover:text-red-200">Retry</button>
        </div>
      )}

      {/* Loading bar */}
      {isLoading && (
        <div className="h-0.5 bg-zinc-800 overflow-hidden">
          <div className="h-full bg-indigo-500 animate-pulse w-full" />
        </div>
      )}
    </div>
  )
}
