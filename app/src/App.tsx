import { useEffect } from 'react'
import { useRoadRunnerStore } from './store/useRoadRunnerStore'
import { Header } from './components/Header'
import { TimelineGrid } from './components/TimelineGrid'
import { StatsBar } from './components/StatsBar'
import { FilterDrawer } from './components/FilterDrawer'
import { ItemDetailModal } from './components/ItemDetailModal'
import { SettingsModal } from './components/SettingsModal'

export default function App() {
  const { groups, categories, selectedItemId, selectItem, syncData } = useRoadRunnerStore()

  useEffect(() => {
    syncData()
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedItemId) {
          selectItem(null)
        } else if (useRoadRunnerStore.getState().isFilterDrawerOpen) {
          useRoadRunnerStore.getState().toggleFilterDrawer()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedItemId, selectItem])

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      <Header />
      <main className="flex-1 overflow-hidden flex flex-col">
        <TimelineGrid groups={groups} categories={categories} />
      </main>
      <StatsBar />
      <FilterDrawer />
      {selectedItemId && <ItemDetailModal />}
      <SettingsModal />
    </div>
  )
}
