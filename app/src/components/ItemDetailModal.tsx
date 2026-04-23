import { useState } from 'react'
import { X, ExternalLink, PlayCircle, ImageIcon } from 'lucide-react'
import { useRoadRunnerStore } from '../store/useRoadRunnerStore'
import { STATUS_STYLES, PRIORITY_CONFIG } from '../utils/statusColors'

type Tab = 'info' | 'demo'

export function ItemDetailModal() {
  const { selectedItemId, selectItem, items, groups, categories, personas, mappingConfig } = useRoadRunnerStore()
  const [activeTab, setActiveTab] = useState<Tab>('info')

  const item = items.find((i) => i.id === selectedItemId)
  if (!item) return null

  const group = groups.find((g) => g.id === item.groupId)
  const itemCategories = categories.filter((c) => item.categoryIds.includes(c.id))
  const itemPersonas = personas.filter((p) => item.personaIds.includes(p.id))
  const statusStyle = STATUS_STYLES[item.status]
  const priorityConfig = PRIORITY_CONFIG[item.priority]

  const quarterLabel = item.quarter && item.year ? `${item.quarter} ${item.year}` : 'Unscheduled'

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
        onClick={() => selectItem(null)}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl w-full max-w-2xl pointer-events-auto max-h-[85vh] flex flex-col">

          {/* Header */}
          <div className="flex items-start justify-between px-7 pt-7 pb-4">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle.badge}`}>
                  {statusStyle.label}
                </span>
                {priorityConfig.icon && (
                  <span className={`text-sm font-bold ${priorityConfig.color}`} title={priorityConfig.label}>
                    {priorityConfig.icon} {priorityConfig.label}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-semibold text-zinc-100 leading-snug">{item.title}</h2>
            </div>
            <button
              onClick={() => selectItem(null)}
              className="text-zinc-400 hover:text-zinc-200 flex-shrink-0 mt-1"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 px-7 border-b border-zinc-700/50">
            {(['info', 'demo'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-indigo-500 text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">

            {/* Info tab */}
            {activeTab === 'info' && (
              <div className="px-7 py-6 space-y-6">
                {item.description && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Description</p>
                    <p className="text-sm text-zinc-300 leading-relaxed">{item.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-5">
                  {group && (
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Project</p>
                      <span className="text-sm text-zinc-300">{group.name}</span>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Timeline</p>
                    <span className="text-sm text-zinc-300">{quarterLabel}</span>
                  </div>

                  {mappingConfig.showIdentifier && item.identifier && (
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Identifier</p>
                      <span className="text-xs font-mono px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-300">
                        {item.identifier}
                      </span>
                    </div>
                  )}

                  {mappingConfig.showTeam && item.teamName && (
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Team</p>
                      <span className="text-sm text-zinc-300">{item.teamName}</span>
                    </div>
                  )}

                  {mappingConfig.showAssignee && item.assigneeName && (
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Assignee</p>
                      <span className="text-sm text-zinc-300">{item.assigneeName}</span>
                    </div>
                  )}

                  {itemCategories.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Categories</p>
                      <div className="flex flex-wrap gap-1.5">
                        {itemCategories.map((cat) => (
                          <span key={cat.id} className="flex items-center gap-1 text-xs text-zinc-300">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {itemPersonas.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Personas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {itemPersonas.map((p) => (
                          <span
                            key={p.id}
                            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
                            style={{ color: p.color, borderColor: `${p.color}40`, backgroundColor: `${p.color}15` }}
                          >
                            {p.emoji} {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-zinc-500 pt-2 border-t border-zinc-800">
                  <div>
                    <p className="uppercase tracking-wider font-semibold mb-1">Created</p>
                    <p>{new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wider font-semibold mb-1">Updated</p>
                    <p>{new Date(item.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Demo tab */}
            {activeTab === 'demo' && (
              <div className="px-7 py-6 space-y-6">
                {/* Video placeholder */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Demo Video</p>
                  <div className="bg-zinc-800/60 border border-zinc-700/50 border-dashed rounded-xl aspect-video flex flex-col items-center justify-center gap-3 text-zinc-500 hover:border-zinc-500 hover:text-zinc-400 transition-colors cursor-pointer">
                    <PlayCircle size={36} />
                    <div className="text-center">
                      <p className="text-sm font-medium">Add a demo video</p>
                      <p className="text-xs mt-0.5">Paste a YouTube or Loom URL</p>
                    </div>
                  </div>
                </div>

                {/* Screenshots placeholder */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Screenshots</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="bg-zinc-800/60 border border-zinc-700/50 border-dashed rounded-lg aspect-video flex flex-col items-center justify-center gap-1.5 text-zinc-600 hover:border-zinc-500 hover:text-zinc-500 transition-colors cursor-pointer"
                      >
                        <ImageIcon size={18} />
                        <span className="text-xs">Add image</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {item.sourceUrl && item.sourceUrl !== '#' && (
            <div className="px-7 py-4 border-t border-zinc-700/50">
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <ExternalLink size={14} />
                Open in Linear
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
