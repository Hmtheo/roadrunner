import { useState } from 'react'
import { X, Palette, Zap, LogOut, LogIn, Check } from 'lucide-react'
import { useRoadRunnerStore } from '../store/useRoadRunnerStore'

type SettingsTab = 'design' | 'linear' | 'account'

const ACCENT_COLORS = [
  { label: 'Indigo', value: 'indigo', hex: '#6366f1' },
  { label: 'Violet', value: 'violet', hex: '#8b5cf6' },
  { label: 'Sky',    value: 'sky',    hex: '#0ea5e9' },
  { label: 'Emerald',value: 'emerald',hex: '#10b981' },
  { label: 'Rose',   value: 'rose',   hex: '#f43f5e' },
  { label: 'Amber',  value: 'amber',  hex: '#f59e0b' },
]

export function SettingsModal() {
  const { isSettingsOpen, toggleSettings, dataSource, setDataSource, mappingConfig, setMappingConfig, density, setDensity } = useRoadRunnerStore()
  const [activeTab, setActiveTab] = useState<SettingsTab>('design')
  const [selectedAccent, setSelectedAccent] = useState('indigo')
  const isLoggedIn = false // placeholder — wire up in Phase 3

  if (!isSettingsOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={toggleSettings} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl w-full max-w-2xl pointer-events-auto max-h-[85vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-7 py-5 border-b border-zinc-700/50">
            <h2 className="text-base font-semibold text-zinc-100">Settings</h2>
            <button onClick={toggleSettings} className="text-zinc-400 hover:text-zinc-200">
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar nav */}
            <nav className="w-48 border-r border-zinc-700/50 p-3 space-y-1 flex-shrink-0">
              <NavItem
                icon={<Palette size={15} />}
                label="App Design"
                active={activeTab === 'design'}
                onClick={() => setActiveTab('design')}
              />
              <NavItem
                icon={<Zap size={15} />}
                label="Linear Config"
                active={activeTab === 'linear'}
                onClick={() => setActiveTab('linear')}
              />
              <NavItem
                icon={isLoggedIn ? <LogOut size={15} /> : <LogIn size={15} />}
                label="Account"
                active={activeTab === 'account'}
                onClick={() => setActiveTab('account')}
              />
            </nav>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-7">

              {/* App Design */}
              {activeTab === 'design' && (
                <div className="space-y-8">
                  <Section title="Density">
                    <div className="flex gap-3">
                      {(['expanded', 'condensed'] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => setDensity(d)}
                          className={`flex-1 py-3 rounded-lg border text-sm font-medium capitalize transition-colors ${
                            density === d
                              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">Controls card size and information density across the grid.</p>
                  </Section>

                  <Section title="Accent Color">
                    <div className="flex gap-2.5 flex-wrap">
                      {ACCENT_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setSelectedAccent(color.value)}
                          className="flex flex-col items-center gap-1.5 group"
                          title={color.label}
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                            style={{ backgroundColor: color.hex }}
                          >
                            {selectedAccent === color.value && <Check size={14} className="text-white" />}
                          </div>
                          <span className="text-xs text-zinc-500 group-hover:text-zinc-300">{color.label}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500 mt-3">Full theme theming coming in v2.</p>
                  </Section>

                  <Section title="Data Source">
                    <div className="flex gap-3">
                      {(['demo', 'linear'] as const).map((src) => (
                        <button
                          key={src}
                          onClick={() => setDataSource(src)}
                          className={`flex-1 py-3 rounded-lg border text-sm font-medium capitalize transition-colors ${
                            dataSource === src
                              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {src === 'demo' ? 'Demo Data' : 'Linear (Live)'}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">Demo uses mock data. Linear fetches live from your workspace.</p>
                  </Section>
                </div>
              )}

              {/* Linear Config */}
              {activeTab === 'linear' && (
                <div className="space-y-8">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Map Linear fields to RoadRunner display fields. Changes apply on next sync.
                  </p>

                  {/* Grid Structure */}
                  <ConfigSection title="Grid Structure" description="Controls how the timeline grid is built">
                    <MappingRow
                      field="Swimlane Rows"
                      description="What creates each horizontal row"
                      control={
                        <select
                          value={mappingConfig.groupBy}
                          onChange={(e) => setMappingConfig({ groupBy: e.target.value as 'project' | 'label' | 'team' | 'assignee' })}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="project">Issue → Project</option>
                          <option value="label">Issue → Label</option>
                          <option value="team">Issue → Team</option>
                          <option value="assignee">Issue → Assignee</option>
                        </select>
                      }
                    />
                    <MappingRow
                      field="Timeline Columns"
                      description="What drives quarter and year placement"
                      control={
                        <select
                          value={mappingConfig.timeSource}
                          onChange={(e) => setMappingConfig({ timeSource: e.target.value as 'dueDate' | 'createdAt' | 'updatedAt' })}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="dueDate">Issue → Due Date</option>
                          <option value="createdAt">Issue → Created Date</option>
                          <option value="updatedAt">Issue → Updated Date</option>
                        </select>
                      }
                    />
                  </ConfigSection>

                  {/* Card View */}
                  <ConfigSection title="Card View" description="Fields shown on each roadmap card">
                    <MappingRow
                      field="Title"
                      description="Primary card text"
                      control={<AutoField label="Issue → Title" />}
                    />
                    <MappingRow
                      field="Status"
                      description="Status badge colour and label"
                      control={<AutoField label="Issue → State" />}
                    />
                    <MappingRow
                      field="Priority"
                      description="Priority icon and weight"
                      control={<AutoField label="Issue → Priority" />}
                    />
                    <MappingRow
                      field="Category Dots"
                      description="Coloured dots shown bottom-right"
                      control={
                        <select
                          value={mappingConfig.categorySource}
                          onChange={(e) => setMappingConfig({ categorySource: e.target.value as 'label' | 'none' })}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="label">Issue → Labels</option>
                          <option value="none">Hidden</option>
                        </select>
                      }
                    />
                  </ConfigSection>

                  {/* Detail Modal */}
                  <ConfigSection title="Detail Modal" description="Additional fields shown when a card is opened">
                    <MappingRow
                      field="Description"
                      description="Body text of the item"
                      control={<AutoField label="Issue → Description" />}
                    />
                    <MappingRow
                      field="Identifier"
                      description="Issue ID shown as a tag (e.g. ENG-42)"
                      control={
                        <Toggle
                          enabled={mappingConfig.showIdentifier}
                          label="Issue → Identifier"
                          onChange={(v) => setMappingConfig({ showIdentifier: v })}
                        />
                      }
                    />
                    <MappingRow
                      field="Team"
                      description="The Linear team the issue belongs to"
                      control={
                        <Toggle
                          enabled={mappingConfig.showTeam}
                          label="Issue → Team"
                          onChange={(v) => setMappingConfig({ showTeam: v })}
                        />
                      }
                    />
                    <MappingRow
                      field="Assignee"
                      description="Person assigned to the issue"
                      control={
                        <Toggle
                          enabled={mappingConfig.showAssignee}
                          label="Issue → Assignee"
                          onChange={(v) => setMappingConfig({ showAssignee: v })}
                        />
                      }
                    />
                    <MappingRow
                      field="Created / Updated"
                      description="Timestamps shown at the bottom"
                      control={<AutoField label="Issue → Timestamps" />}
                    />
                  </ConfigSection>
                </div>
              )}

              {/* Account */}
              {activeTab === 'account' && (
                <div className="space-y-8">
                  <Section title="Session">
                    <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-4">
                      {isLoggedIn ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-zinc-200">Signed in</p>
                            <p className="text-xs text-zinc-500 mt-0.5">user@example.com</p>
                          </div>
                          <button className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors">
                            <LogOut size={14} />
                            Sign out
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-zinc-200">Not signed in</p>
                            <p className="text-xs text-zinc-500 mt-0.5">Sign in to save views and sync across devices</p>
                          </div>
                          <button className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                            <LogIn size={14} />
                            Sign in
                          </button>
                        </div>
                      )}
                    </div>
                  </Section>

                  <Section title="About">
                    <div className="space-y-2 text-sm text-zinc-400">
                      <div className="flex justify-between">
                        <span>Version</span>
                        <span className="text-zinc-300">2.0.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mode</span>
                        <span className="text-zinc-300 capitalize">{dataSource}</span>
                      </div>
                    </div>
                  </Section>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function NavItem({ icon, label, active, onClick }: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${
        active
          ? 'bg-zinc-700/60 text-zinc-100'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function MappingRow({ field, description, control }: {
  field: string
  description: string
  control: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-2 gap-4 px-4 py-3 items-center border-b border-zinc-700/30 last:border-0">
      <div>
        <p className="text-sm font-medium text-zinc-200">{field}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
      <div>{control}</div>
    </div>
  )
}

function AutoField({ label }: { label: string }) {
  return (
    <div className="px-3 py-1.5 text-sm text-zinc-500 bg-zinc-800/40 border border-zinc-700/50 rounded-md flex items-center justify-between">
      <span>{label}</span>
      <span className="text-xs text-zinc-600 ml-2">auto</span>
    </div>
  )
}

function Toggle({ enabled, label, onChange }: {
  enabled: boolean
  label: string
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-sm ${enabled ? 'text-zinc-300' : 'text-zinc-500'}`}>{label}</span>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 transition-colors duration-200 focus:outline-none ${
          enabled ? 'bg-indigo-600 border-indigo-600' : 'bg-zinc-700 border-zinc-700'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 mt-px ${
            enabled ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

function ConfigSection({ title, description, children }: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-3">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{title}</p>
        <p className="text-xs text-zinc-600 mt-0.5">{description}</p>
      </div>
      <div className="rounded-lg border border-zinc-700/50 overflow-hidden">
        <div className="grid grid-cols-2 px-4 py-2 bg-zinc-800/60 border-b border-zinc-700/50">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">RoadRunner Field</span>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Linear Source</span>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">{title}</p>
      {children}
    </div>
  )
}
