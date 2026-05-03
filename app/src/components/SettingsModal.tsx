import { useState } from 'react'
import {
  X, Palette, LogOut, LogIn, Check, Sun, Moon,
  Plug2, Zap, Link2, ChevronRight, CheckCircle2, AlertCircle, Loader2, Search,
} from 'lucide-react'
import { useRoadRunnerStore } from '../store/useRoadRunnerStore'
import type { JiraProject } from '../store/useRoadRunnerStore'
import type { MappingConfig, JiraMappingConfig, Integration, IntegrationStatus, LinearCredentials, JiraCredentials } from '../types'

type SettingsTab = 'design' | 'app-config' | 'linear-config' | 'jira-config' | 'account'

function TokenSecurityModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-[60] backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl w-full max-w-md pointer-events-auto">
          <div className="px-7 pt-7 pb-6 space-y-4">
            <h3 className="text-base font-semibold text-zinc-100">How we handle your API token</h3>
            <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
              <p>
                When you connect an integration, your API token is sent directly to our server and immediately stored in an encrypted session store. It is never saved in your browser.
              </p>
              <p>
                From that point on, your browser only holds a random session ID — a short code that has no value on its own. All requests to Linear or Jira are made server-side using your token, so it never travels through your device again.
              </p>
              <p>
                Sessions expire automatically after 30 days. You can revoke access at any time by disconnecting the integration in Settings.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 w-full py-2.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm font-medium text-zinc-100 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

const ACCENT_COLORS = [
  { label: 'Indigo', value: 'indigo', hex: '#6366f1' },
  { label: 'Violet', value: 'violet', hex: '#8b5cf6' },
  { label: 'Sky',    value: 'sky',    hex: '#0ea5e9' },
  { label: 'Emerald',value: 'emerald',hex: '#10b981' },
  { label: 'Rose',   value: 'rose',   hex: '#f43f5e' },
  { label: 'Amber',  value: 'amber',  hex: '#f59e0b' },
]

export function SettingsModal() {
  const {
    isSettingsOpen, toggleSettings,
    dataSource,
    mappingConfig, setMappingConfig,
    jiraMappingConfig, setJiraMappingConfig,
    density, setDensity,
    theme, setTheme,
    integration, integrationStatus, integrationError,
    linearCredentials, jiraCredentials, isLoading,
    connectLinear, connectJira, disconnectIntegration, syncData,
    jiraProjects, jiraProjectsLoading, selectJiraProductArea,
  } = useRoadRunnerStore()

  const [activeTab, setActiveTab] = useState<SettingsTab>('design')
  const [selectedAccent, setSelectedAccent] = useState('indigo')
  const [showTokenModal, setShowTokenModal] = useState(false)
  const isLoggedIn = false

  if (!isSettingsOpen) return null

  return (
    <>
      {showTokenModal && <TokenSecurityModal onClose={() => setShowTokenModal(false)} />}
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
            <nav className="w-48 border-r border-zinc-700/50 p-3 space-y-0.5 flex-shrink-0">
              <NavItem
                icon={<Palette size={15} />}
                label="App Design"
                active={activeTab === 'design'}
                onClick={() => setActiveTab('design')}
              />
              <NavItem
                icon={<Plug2 size={15} />}
                label="App Config"
                active={activeTab === 'app-config'}
                onClick={() => setActiveTab('app-config')}
              />
              {integration === 'linear' && (
                <SubNavItem
                  icon={<Zap size={13} />}
                  label="Linear Config"
                  active={activeTab === 'linear-config'}
                  onClick={() => setActiveTab('linear-config')}
                />
              )}
              {integration === 'jira' && (
                <SubNavItem
                  icon={<Link2 size={13} />}
                  label="Jira Config"
                  active={activeTab === 'jira-config'}
                  onClick={() => setActiveTab('jira-config')}
                />
              )}
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
                  <Section title="Theme">
                    <div className="flex gap-3">
                      <button
                        onClick={() => setTheme('dark')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-colors ${
                          theme === 'dark'
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Moon size={14} /> Dark
                      </button>
                      <button
                        onClick={() => setTheme('light')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-colors ${
                          theme === 'light'
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Sun size={14} /> Light
                      </button>
                    </div>
                  </Section>

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
                    <p className="text-xs text-zinc-500 mt-3">Full accent theming coming in v2.</p>
                  </Section>
                </div>
              )}

              {/* App Config */}
              {activeTab === 'app-config' && (
                <AppConfigPanel
                  integration={integration}
                  integrationStatus={integrationStatus}
                  integrationError={integrationError}
                  linearCredentials={linearCredentials}
                  jiraCredentials={jiraCredentials}
                  dataSource={dataSource}
                  isLoading={isLoading}
                  connectLinear={connectLinear}
                  connectJira={connectJira}
                  disconnectIntegration={disconnectIntegration}
                  syncData={syncData}
                  jiraProjects={jiraProjects}
                  jiraProjectsLoading={jiraProjectsLoading}
                  selectedProductArea={jiraMappingConfig.productArea ?? ''}
                  selectJiraProductArea={selectJiraProductArea}
                  onSubNav={(tab) => setActiveTab(tab)}
                  onShowTokenModal={() => setShowTokenModal(true)}
                />
              )}

              {/* Linear Config */}
              {activeTab === 'linear-config' && (
                <LinearConfigPanel mappingConfig={mappingConfig} setMappingConfig={setMappingConfig} />
              )}

              {/* Jira Config */}
              {activeTab === 'jira-config' && (
                <JiraConfigPanel mappingConfig={jiraMappingConfig} setMappingConfig={setJiraMappingConfig} />
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
                            <LogOut size={14} /> Sign out
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-zinc-200">Not signed in</p>
                            <p className="text-xs text-zinc-500 mt-0.5">Sign in to save views and sync across devices</p>
                          </div>
                          <button className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                            <LogIn size={14} /> Sign in
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

// ─── App Config Panel ──────────────────────────────────────────────────────────

interface AppConfigPanelProps {
  integration: Integration
  integrationStatus: IntegrationStatus
  integrationError: string | null
  linearCredentials: LinearCredentials | null
  jiraCredentials: JiraCredentials | null
  dataSource: 'linear' | 'demo'
  isLoading: boolean
  connectLinear: (apiKey: string) => Promise<void>
  connectJira: (domain: string, email: string, apiToken: string) => Promise<void>
  disconnectIntegration: () => void
  syncData: () => Promise<void>
  jiraProjects: JiraProject[]
  jiraProjectsLoading: boolean
  selectedProductArea: string
  selectJiraProductArea: (key: string) => Promise<void>
  onSubNav: (tab: SettingsTab) => void
  onShowTokenModal: () => void
}

function AppConfigPanel({
  integration, integrationStatus, integrationError,
  linearCredentials, jiraCredentials, isLoading,
  connectLinear, connectJira, disconnectIntegration, syncData,
  jiraProjects, jiraProjectsLoading, selectedProductArea, selectJiraProductArea,
  onSubNav, onShowTokenModal,
}: AppConfigPanelProps) {
  const [selected, setSelected] = useState<'linear' | 'jira' | null>(integration)
  const [linearKey, setLinearKey] = useState('')
  const [jiraDomain, setJiraDomain] = useState('dayforce.atlassian.net')
  const [jiraEmail, setJiraEmail] = useState('hugh.theodore@dayforce.com')
  const [jiraToken, setJiraToken] = useState('')

  const isConnecting = integrationStatus === 'connecting'
  const isConnected = integrationStatus === 'connected'

  function handleSelectIntegration(id: 'linear' | 'jira') {
    if (isConnected) return
    setSelected(id)
  }

  async function handleConnect() {
    if (selected === 'linear') {
      await connectLinear(linearKey.trim())
    } else if (selected === 'jira') {
      await connectJira(jiraDomain.trim(), jiraEmail.trim(), jiraToken.trim())
    }
  }

  function handleDisconnect() {
    disconnectIntegration()
    setSelected(null)
    setLinearKey('')
    setJiraDomain('dayforce.atlassian.net')
    setJiraEmail('hugh.theodore@dayforce.com')
    setJiraToken('')
  }

  const INTEGRATIONS = [
    {
      id: 'linear' as const,
      name: 'Linear',
      description: 'Project management for software teams',
      icon: <Zap size={20} className="text-indigo-400" />,
    },
    {
      id: 'jira' as const,
      name: 'Jira',
      description: 'Issue & project tracking by Atlassian',
      icon: <Link2 size={20} className="text-blue-400" />,
    },
  ]

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Integration</p>
        <div className="grid grid-cols-2 gap-3">
          {INTEGRATIONS.map((int) => {
            const isActive = (isConnected ? integration : selected) === int.id
            return (
              <button
                key={int.id}
                onClick={() => handleSelectIntegration(int.id)}
                disabled={isConnected && integration !== int.id}
                className={`text-left p-4 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-indigo-600/10 border-indigo-500/60'
                    : 'bg-zinc-800/60 border-zinc-700/50 hover:border-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  {int.icon}
                  {isActive && isConnected && <CheckCircle2 size={15} className="text-emerald-400" />}
                  {isActive && !isConnected && <ChevronRight size={15} className="text-zinc-500" />}
                </div>
                <p className="text-sm font-semibold text-zinc-100">{int.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{int.description}</p>
              </button>
            )
          })}
        </div>
        <div className="flex items-start justify-center gap-2 mt-3 px-4 py-2.5 rounded-lg bg-sky-100/80 border border-sky-300">
          <span className="text-sky-700 flex-shrink-0 text-sm mt-0.5">ℹ</span>
          <p className="text-xs text-sky-800 font-medium">
            This app does not store your API key.{' '}
            <button
              onClick={() => onShowTokenModal()}
              className="underline hover:text-sky-600 font-semibold"
            >
              See how we handle tokens.
            </button>
            {' '}Rotating your API keys every 30–60 days is recommended.
          </p>
        </div>
      </div>

      {/* Connected state */}
      {isConnected && (
        <div className="space-y-3">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
              <p className="text-sm font-medium text-emerald-300">
                Connected to {integration === 'linear' ? 'Linear' : 'Jira'}
              </p>
            </div>
            {integration === 'linear' && linearCredentials && (
              <p className="text-xs text-zinc-500 font-mono truncate">
                Key: {linearCredentials.apiKey.slice(0, 12)}••••••••
              </p>
            )}
            {integration === 'jira' && jiraCredentials && (
              <p className="text-xs text-zinc-500">
                {jiraCredentials.email} · {jiraCredentials.domain}
              </p>
            )}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => onSubNav(integration === 'linear' ? 'linear-config' : 'jira-config')}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Configure field mapping →
              </button>
              <span className="text-zinc-700">·</span>
              <button
                onClick={syncData}
                disabled={isLoading || !selectedProductArea}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition-colors"
              >
                {isLoading ? <Loader2 size={11} className="animate-spin" /> : null}
                {isLoading ? 'Syncing…' : 'Sync now'}
              </button>
              <span className="text-zinc-700">·</span>
              <button
                onClick={handleDisconnect}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* Product area picker — shown for Jira only */}
          {integration === 'jira' && (
            <JiraProjectPicker
              projects={jiraProjects}
              loading={jiraProjectsLoading}
              selected={selectedProductArea}
              onSelect={selectJiraProductArea}
              isSyncing={isLoading}
            />
          )}
        </div>
      )}

      {/* Auth form */}
      {!isConnected && selected === 'linear' && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Connect to Linear</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Personal API Key</label>
              <input
                type="password"
                value={linearKey}
                onChange={(e) => setLinearKey(e.target.value)}
                placeholder="lin_api_••••••••••••••••••••••"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <p className="text-xs text-zinc-500">
              Generate a key at{' '}
              <span className="text-zinc-400 font-mono">linear.app → Settings → API → Personal keys</span>
            </p>
          </div>
          {integrationError && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle size={13} /> {integrationError}
            </div>
          )}
          <button
            onClick={handleConnect}
            disabled={!linearKey.trim() || isConnecting}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
          >
            {isConnecting ? <><Loader2 size={14} className="animate-spin" /> Connecting…</> : 'Connect'}
          </button>
        </div>
      )}

      {!isConnected && selected === 'jira' && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Connect to Jira</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Workspace Domain</label>
              <input
                type="text"
                value={jiraDomain}
                onChange={(e) => setJiraDomain(e.target.value)}
                placeholder="yourcompany.atlassian.net"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Atlassian Email</label>
              <input
                type="email"
                value={jiraEmail}
                onChange={(e) => setJiraEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">API Token</label>
              <input
                type="password"
                value={jiraToken}
                onChange={(e) => setJiraToken(e.target.value)}
                placeholder="••••••••••••••••••••••••"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <p className="text-xs text-zinc-500">
              Generate a token at{' '}
              <span className="text-zinc-400 font-mono">id.atlassian.net → Security → API tokens</span>
            </p>
          </div>
          {integrationError && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle size={13} /> {integrationError}
            </div>
          )}
          <button
            onClick={handleConnect}
            disabled={!jiraDomain.trim() || !jiraEmail.trim() || !jiraToken.trim() || isConnecting}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
          >
            {isConnecting ? <><Loader2 size={14} className="animate-spin" /> Connecting…</> : 'Connect to Jira'}
          </button>
        </div>
      )}

      {!isConnected && !selected && (
        <p className="text-xs text-zinc-600 text-center py-2">Select an integration above to get started.</p>
      )}
    </div>
  )
}

// ─── Jira Project Picker ───────────────────────────────────────────────────────

function JiraProjectPicker({
  projects, loading, selected, onSelect, isSyncing,
}: {
  projects: JiraProject[]
  loading: boolean
  selected: string
  onSelect: (key: string) => Promise<void>
  isSyncing: boolean
}) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? projects.filter((p) =>
        p.key.toLowerCase().includes(query.toLowerCase()) ||
        p.name.toLowerCase().includes(query.toLowerCase())
      )
    : projects

  return (
    <div className="rounded-lg border border-zinc-700/50 overflow-hidden">
      <div className="px-4 py-3 bg-zinc-800/60 border-b border-zinc-700/50 flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Select Product Area</p>
        {selected && (
          <span className="text-xs text-emerald-400 font-mono font-medium">{selected} active</span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-zinc-500 text-xs">
          <Loader2 size={13} className="animate-spin" /> Loading projects…
        </div>
      ) : projects.length === 0 ? (
        <div className="py-6 text-center text-xs text-zinc-600">No projects found</div>
      ) : (
        <>
          <div className="px-3 py-2 border-b border-zinc-700/40">
            <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5">
              <Search size={12} className="text-zinc-500 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${projects.length} projects…`}
                className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto divide-y divide-zinc-700/30">
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-600">No matches for "{query}"</div>
            ) : (
              filtered.map((p) => {
                const isActive = p.key === selected
                return (
                  <button
                    key={p.key}
                    onClick={() => !isSyncing && onSelect(p.key)}
                    disabled={isSyncing}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-xs transition-colors disabled:cursor-wait ${
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-300'
                        : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="font-mono font-semibold text-zinc-400 w-20 flex-shrink-0">{p.key}</span>
                      <span className="truncate">{p.name}</span>
                    </span>
                    {isActive && (
                      isSyncing
                        ? <Loader2 size={11} className="animate-spin text-indigo-400 flex-shrink-0" />
                        : <CheckCircle2 size={13} className="text-indigo-400 flex-shrink-0" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Linear Config Panel ───────────────────────────────────────────────────────

function LinearConfigPanel({ mappingConfig, setMappingConfig }: {
  mappingConfig: MappingConfig
  setMappingConfig: (c: Partial<MappingConfig>) => void
}) {
  return (
    <div className="space-y-8">
      <p className="text-xs text-zinc-500 leading-relaxed">
        Map Linear fields to RoadRunner display fields. Changes apply on next sync.
      </p>

      <ConfigSection title="Grid Structure" description="Controls how the timeline grid is built">
        <MappingRow
          field="Swimlane Rows"
          description="What creates each horizontal row"
          control={
            <select
              value={mappingConfig.groupBy}
              onChange={(e) => setMappingConfig({ groupBy: e.target.value as MappingConfig['groupBy'] })}
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
              onChange={(e) => setMappingConfig({ timeSource: e.target.value as MappingConfig['timeSource'] })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="dueDate">Issue → Due Date</option>
              <option value="createdAt">Issue → Created Date</option>
              <option value="updatedAt">Issue → Updated Date</option>
            </select>
          }
        />
      </ConfigSection>

      <ConfigSection title="Card View" description="Fields shown on each roadmap card">
        <MappingRow field="Title" description="Primary card text" control={<AutoField label="Issue → Title" />} />
        <MappingRow field="Status" description="Status badge colour and label" control={<AutoField label="Issue → State" />} />
        <MappingRow field="Priority" description="Priority icon and weight" control={<AutoField label="Issue → Priority" />} />
        <MappingRow
          field="Category Dots"
          description="Coloured dots shown bottom-right"
          control={
            <select
              value={mappingConfig.categorySource}
              onChange={(e) => setMappingConfig({ categorySource: e.target.value as MappingConfig['categorySource'] })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="label">Issue → Labels</option>
              <option value="none">Hidden</option>
            </select>
          }
        />
      </ConfigSection>

      <ConfigSection title="Detail Modal" description="Additional fields shown when a card is opened">
        <MappingRow field="Description" description="Body text of the item" control={<AutoField label="Issue → Description" />} />
        <MappingRow
          field="Identifier"
          description="Issue ID shown as a tag (e.g. ENG-42)"
          control={<Toggle enabled={mappingConfig.showIdentifier} label="Issue → Identifier" onChange={(v) => setMappingConfig({ showIdentifier: v })} />}
        />
        <MappingRow
          field="Team"
          description="The Linear team the issue belongs to"
          control={<Toggle enabled={mappingConfig.showTeam} label="Issue → Team" onChange={(v) => setMappingConfig({ showTeam: v })} />}
        />
        <MappingRow
          field="Assignee"
          description="Person assigned to the issue"
          control={<Toggle enabled={mappingConfig.showAssignee} label="Issue → Assignee" onChange={(v) => setMappingConfig({ showAssignee: v })} />}
        />
        <MappingRow field="Created / Updated" description="Timestamps shown at the bottom" control={<AutoField label="Issue → Timestamps" />} />
      </ConfigSection>
    </div>
  )
}

// ─── Jira Config Panel ─────────────────────────────────────────────────────────

function JiraConfigPanel({ mappingConfig, setMappingConfig }: {
  mappingConfig: JiraMappingConfig
  setMappingConfig: (c: Partial<JiraMappingConfig>) => void
}) {
  return (
    <div className="space-y-8">
      <p className="text-xs text-zinc-500 leading-relaxed">
        Map Jira fields to RoadRunner display fields. Changes apply on next sync.
      </p>

      <ConfigSection title="Grid Structure" description="Controls how the timeline grid is built">
        <MappingRow
          field="Swimlane Rows"
          description="What creates each horizontal row"
          control={
            <select
              value={mappingConfig.groupBy}
              onChange={(e) => setMappingConfig({ groupBy: e.target.value as JiraMappingConfig['groupBy'] })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="initiative">Issue → Initiative</option>
              <option value="epic">Issue → Epic</option>
              <option value="project">Issue → Project</option>
              <option value="label">Issue → Label</option>
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
              onChange={(e) => setMappingConfig({ timeSource: e.target.value as JiraMappingConfig['timeSource'] })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="fixVersion">Issue → Fix Version (Increment)</option>
              <option value="dueDate">Issue → Due Date</option>
              <option value="sprintEnd">Issue → Sprint End Date</option>
              <option value="createdAt">Issue → Created Date</option>
              <option value="updatedAt">Issue → Updated Date</option>
            </select>
          }
        />
      </ConfigSection>

      <ConfigSection title="Card View" description="Fields shown on each roadmap card">
        <MappingRow field="Title" description="Primary card text" control={<AutoField label="Issue → Summary" />} />
        <MappingRow field="Status" description="Status badge colour and label" control={<AutoField label="Issue → Status" />} />
        <MappingRow field="Priority" description="Priority icon and weight" control={<AutoField label="Issue → Priority" />} />
        <MappingRow
          field="Category Dots"
          description="Coloured dots shown bottom-right"
          control={
            <select
              value={mappingConfig.categorySource}
              onChange={(e) => setMappingConfig({ categorySource: e.target.value as JiraMappingConfig['categorySource'] })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="label">Issue → Labels</option>
              <option value="component">Issue → Components</option>
              <option value="none">Hidden</option>
            </select>
          }
        />
      </ConfigSection>

      <ConfigSection title="Detail Modal" description="Additional fields shown when a card is opened">
        <MappingRow field="Description" description="Body text of the item" control={<AutoField label="Issue → Description" />} />
        <MappingRow
          field="Issue Key"
          description="Jira key shown as a tag (e.g. PROJ-42)"
          control={<Toggle enabled={mappingConfig.showKey} label="Issue → Key" onChange={(v) => setMappingConfig({ showKey: v })} />}
        />
        <MappingRow
          field="Assignee"
          description="Person assigned to the issue"
          control={<Toggle enabled={mappingConfig.showAssignee} label="Issue → Assignee" onChange={(v) => setMappingConfig({ showAssignee: v })} />}
        />
        <MappingRow
          field="Sprint"
          description="Active sprint name"
          control={<Toggle enabled={mappingConfig.showSprint} label="Issue → Sprint" onChange={(v) => setMappingConfig({ showSprint: v })} />}
        />
        <MappingRow
          field="Story Points"
          description="Estimation points"
          control={<Toggle enabled={mappingConfig.showStoryPoints} label="Issue → Story Points" onChange={(v) => setMappingConfig({ showStoryPoints: v })} />}
        />
        <MappingRow field="Created / Updated" description="Timestamps shown at the bottom" control={<AutoField label="Issue → Timestamps" />} />
      </ConfigSection>
    </div>
  )
}

// ─── Shared primitives ─────────────────────────────────────────────────────────

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
        active ? 'bg-zinc-700/60 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function SubNavItem({ icon, label, active, onClick }: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
        active ? 'bg-zinc-700/40 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
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
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Source Field</span>
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
