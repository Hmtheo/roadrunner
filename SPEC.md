# RoadRunner — Technical Specification

**Version:** 2.0 (Generalized)
**Status:** Pre-build
**Date:** April 9, 2026

---

## 1. What this is

RoadRunner is a local-first roadmap visualization tool that transforms project management data (starting with Linear) into a visually polished, filterable timeline grid. It exists because project management tools produce text-dense, hierarchy-buried output that is unusable for stakeholder communication.

This spec generalizes the original DTP+ PRD into a tool that works with any Linear workspace, with no domain-specific content hardcoded.

---

## 2. Architecture overview

```
┌──────────────────────────────────────────────┐
│  React + Vite + Tailwind (local dev)         │
│                                              │
│  ┌────────────┐    ┌─────────────────────┐   │
│  │  UI Layer   │◄──│  State (Zustand)     │   │
│  │  Grid/Cards │    │  Items, Filters,     │   │
│  │  Filters    │    │  Views, Config       │   │
│  │  Modals     │    └────────┬────────────┘   │
│  └────────────┘              │                │
│                    ┌─────────▼────────────┐   │
│                    │  Data Service Layer   │   │
│                    │  - Linear adapter     │   │
│                    │  - Mock data adapter  │   │
│                    └─────────┬────────────┘   │
│                              │                │
│                    ┌─────────▼────────────┐   │
│                    │  Anthropic API call   │   │
│                    │  w/ Linear MCP server │   │
│                    └─────────────────────┘    │
└──────────────────────────────────────────────┘
```

**Runtime data flow:**
1. App calls the Anthropic Messages API (`/v1/messages`) with the Linear MCP server attached
2. Claude fetches issues, projects, labels, statuses from Linear
3. Response is parsed into the app's normalized `RoadmapItem[]` format
4. UI renders the grid from normalized data

**Key env vars:**
- `VITE_ANTHROPIC_API_KEY` — Anthropic API key (calls happen from client in dev; would move server-side for production)

---

## 3. Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | React 18+ | Familiar, component model fits the grid |
| Build tool | Vite | Fast HMR, simple config |
| Styling | Tailwind CSS 3 | Utility-first, density toggles map to class swaps |
| State | Zustand | Lightweight, no boilerplate, good for filter state |
| API layer | Anthropic Messages API + Linear MCP | No Linear OAuth to build; piggyback on existing MCP connection |
| Icons | Lucide React | Clean, consistent, tree-shakeable |
| Deployment | Local only (v1) | GitHub repo, `npm run dev` |

---

## 4. Generalized data model

### 4.1 RoadmapItem (core entity)

Every card on the board maps to one `RoadmapItem`. This is the normalized shape — adapters transform source data (Linear, mock) into this format.

```ts
interface RoadmapItem {
  id: string
  title: string
  description: string                    // full description
  status: ItemStatus
  priority: Priority
  groupId: string                        // determines swim lane row
  categoryIds: string[]                  // labels/tags — color coding + filter
  quarter: string                        // derived: "Q1", "Q2", "Q3", "Q4"
  year: number                           // derived: 2026, 2027, 2028
  dueDate: string | null                 // ISO date string
  assigneeId: string | null
  assigneeName: string | null
  sourceUrl: string                      // deep link back to Linear
  sourceId: string                       // original Linear issue ID
  sourceType: 'linear'                   // extensible to 'jira' later
  parentId: string | null                // parent issue for hierarchy
  createdAt: string
  updatedAt: string
}

type ItemStatus = 'backlog' | 'todo' | 'in-progress' | 'in-review' | 'done' | 'canceled'
type Priority = 'none' | 'urgent' | 'high' | 'medium' | 'low'
```

### 4.2 Group (swim lane row)

Groups are what create the horizontal rows of the grid. The user configures which Linear field drives groups.

```ts
interface Group {
  id: string
  name: string
  description: string | null
  color: string                          // hex color for row swatch
  order: number                          // display order
}
```

**Group source options (user-configurable):**
- Linear Projects → each project becomes a group
- Linear Labels → each label becomes a group
- Linear Teams → each team becomes a group
- Assignee → each person becomes a group

### 4.3 Category (color dot / tag)

Categories are secondary classification applied as color dots on cards and as filter chips.

```ts
interface Category {
  id: string
  name: string
  color: string
}
```

**Category source:** Linear Labels (when not used as Groups).

### 4.4 MappingConfig

The user-facing configuration that tells RoadRunner how to interpret Linear data.

```ts
interface MappingConfig {
  groupBy: 'project' | 'label' | 'team' | 'assignee'
  categorySource: 'label' | 'none'       // what drives the color dot
  timeSource: 'dueDate'                   // v1 only supports due date
  teamFilter: string | null               // optional: only show issues from this team
}
```

### 4.5 FilterState

```ts
interface FilterState {
  groups: string[]           // groupId[]
  categories: string[]       // categoryId[]
  quarters: string[]         // "Q1" | "Q2" | "Q3" | "Q4"
  years: number[]            // 2026, 2027, etc.
  statuses: ItemStatus[]
  priorities: Priority[]
  assignees: string[]        // assigneeId[]
  search: string             // free text search on title
}
```

### 4.6 SavedView (in-memory only for v1)

```ts
interface SavedView {
  id: string
  name: string
  description: string | null
  filters: FilterState
  timelineView: 'quarterly' | 'annual'
  density: 'expanded' | 'condensed'
  createdAt: string
  updatedAt: string
}
```

### 4.7 TimePeriod derivation

Columns are derived from item due dates:

```ts
function deriveTimePeriod(dueDate: string | null): { quarter: string; year: number } | null {
  if (!dueDate) return null  // → "Unscheduled" column
  const d = new Date(dueDate)
  const month = d.getMonth()  // 0-indexed
  const quarter = `Q${Math.floor(month / 3) + 1}`
  return { quarter, year: d.getFullYear() }
}
```

Items with no due date land in an "Unscheduled" column at the right edge of the grid.

---

## 5. Linear adapter — data mapping

### 5.1 Field mapping

| RoadmapItem field | Linear source |
|---|---|
| `id` | Issue identifier (e.g., `PRO-7`) |
| `title` | Issue title |
| `description` | Issue description |
| `status` | Issue state type → mapped enum (see below) |
| `priority` | Issue priority → mapped enum |
| `groupId` | Depends on `MappingConfig.groupBy` |
| `categoryIds` | Issue labels (when labels aren't used for groups) |
| `dueDate` | Issue due date |
| `quarter` | Derived from `dueDate` |
| `year` | Derived from `dueDate` |
| `assigneeId` | Issue assignee ID |
| `assigneeName` | Issue assignee name |
| `sourceUrl` | Issue URL |
| `sourceId` | Issue ID (UUID) |
| `parentId` | Issue parent ID |

### 5.2 Status mapping

| Linear state type | RoadmapItem status |
|---|---|
| `backlog` | `backlog` |
| `unstarted` | `todo` |
| `started` | `in-progress` |
| `started` (name: "In Review") | `in-review` |
| `completed` | `done` |
| `canceled` | `canceled` |

### 5.3 Priority mapping

| Linear priority value | RoadmapItem priority |
|---|---|
| 0 | `none` |
| 1 | `urgent` |
| 2 | `high` |
| 3 | `medium` |
| 4 | `low` |

### 5.4 API call pattern

The app sends a structured prompt to the Anthropic Messages API with the Linear MCP server attached. The prompt asks Claude to fetch and return JSON:

```ts
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true"
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: `You are a data extraction assistant. Fetch Linear data and return ONLY valid JSON, no markdown fences, no preamble. Return the exact schema requested.`,
    messages: [{ role: "user", content: prompt }],
    mcp_servers: [{
      type: "url",
      url: "https://mcp.linear.app/mcp",
      name: "linear"
    }]
  })
})
```

**Three fetch prompts:**

1. **Fetch issues:** "List all issues in the workspace. For each issue return: id (identifier like PRO-7), title, description, status (state name), statusType (state type like backlog/started/completed/canceled), priority (numeric 0-4), priorityName, dueDate, assigneeId, assigneeName, projectId, projectName, labels (array of {id, name, color}), url, parentId, createdAt, updatedAt. Return as JSON array."

2. **Fetch projects:** "List all projects. For each return: id, name, description, color, url, status, startDate, targetDate, leadName. Return as JSON array."

3. **Fetch teams and statuses:** "List all teams with their issue statuses. Return as JSON: { teams: [{id, name, key}], statuses: {teamName: [{id, name, type}]} }"

---

## 6. UI specification

### 6.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│  Header                                                  │
│  [RoadRunner logo]  [Quarterly|Annual]  [Condensed|      │
│                     [Refresh ↻]         Expanded]        │
│                                         [Filter] [Views] │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│  Group   │  Q1 2026 │  Q2 2026 │  Q3 2026 │  ...        │
├──────────┼──────────┼──────────┼──────────┼─────────────┤
│  ████    │ [card]   │ [card]   │          │             │
│  Project │ [card]   │          │          │             │
│  Alpha   │          │          │          │             │
├──────────┼──────────┼──────────┼──────────┼─────────────┤
│  ████    │          │ [card]   │ [card]   │             │
│  Project │          │ [card]   │          │             │
│  Beta    │          │          │          │             │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│  Stats bar: 12 total | 3 done | 5 in progress | 4 planned│
└─────────────────────────────────────────────────────────┘
```

### 6.2 Header bar

- App name / logo (left)
- Timeline toggle: `Quarterly` | `Annual` (center-left)
- Data source indicator: "Linear" with green dot when connected, "Demo" with amber dot for mock data
- Refresh button: re-fetches from Linear
- Density toggle: `Condensed` | `Expanded` (right)
- Filter button with active count badge (right)
- Views dropdown (right)
- Settings gear icon (right)

### 6.3 RoadmapCard

Each card displays:

**Expanded mode:**
- Title (text-sm, truncate to 2 lines)
- Status badge (colored pill: blue=backlog, amber=todo, indigo=in-progress, purple=in-review, green=done, gray=canceled)
- Category dots (1-3 colored dots from labels)
- Priority indicator (icon: !! urgent, ! high, — medium, · low)
- Assignee avatar/initials (bottom-right)

**Condensed mode:**
- Title (text-xs, truncate to 1 line)
- Status dot (no text, just colored circle)
- Priority dot

**Card interaction:**
- Hover: subtle lift shadow + border highlight
- Click: opens ItemDetailModal

### 6.4 Filter drawer

Slides in from right. Sections:

1. **Search** — text input, filters on title (debounced 300ms)
2. **Group** — checkbox list with color swatch
3. **Category** — checkbox list with color dot
4. **Status** — toggle chip group
5. **Priority** — toggle chip group
6. **Quarter** — toggle chip group (only in quarterly view)
7. **Year** — toggle chip group
8. **Assignee** — checkbox list

Filter logic: OR within dimension, AND across dimensions. Same as the original PRD.

When filters are active:
- Header shows orange badge with count + "Clear" link
- Grid hides groups with zero visible items
- Empty state with "Clear filters" CTA if zero total results

### 6.5 Item detail modal

Centered overlay with:
- Title + status badge + priority indicator
- Description (rendered markdown)
- Group (color swatch + name)
- Categories (color dots + names)
- Timeline (quarter + year)
- Assignee
- Timestamps (created, updated)
- "Open in Linear" button → opens `sourceUrl` in new tab

### 6.6 Saved views panel

Dropdown from "Views" button:
- List of saved views with name + description
- "Save current view" option → modal collecting name + description
- Load: applies saved FilterState + timelineView + density
- Delete: removes from in-memory array (no confirmation needed for v1)

### 6.7 Settings modal

- **Data source toggle:** Linear (live) | Demo (mock data)
- **Mapping config:**
  - Group by: dropdown → Project | Label | Team | Assignee
  - Category source: dropdown → Label | None
  - Team filter: dropdown → [list of teams] | All teams
- **Linear connection status:** shows workspace name, last sync time

### 6.8 Density specifications

| Element | Expanded | Condensed |
|---|---|---|
| Group cell padding | `px-6 py-4` | `px-3 py-2` |
| Group color swatch | `40×40px` | `24×24px` |
| Group description | Visible | Hidden |
| Card padding | `p-3` | `p-2` |
| Card title | `text-sm`, 2-line clamp | `text-xs`, 1-line clamp |
| Card status | Badge with text | Dot only |
| Card spacing | `space-y-3` | `space-y-1.5` |
| Column min-width | `200px` | `160px` |

---

## 7. State management (Zustand)

```ts
interface RoadRunnerStore {
  // Data
  items: RoadmapItem[]
  groups: Group[]
  categories: Category[]

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

  // Actions
  setTimelineView: (view: 'quarterly' | 'annual') => void
  setDensity: (density: 'expanded' | 'condensed') => void
  setFilters: (filters: Partial<FilterState>) => void
  clearFilters: () => void
  selectItem: (id: string | null) => void
  toggleFilterDrawer: () => void
  setDataSource: (source: 'linear' | 'demo') => void
  setMappingConfig: (config: Partial<MappingConfig>) => void
  syncFromLinear: () => Promise<void>
  saveView: (name: string, description?: string) => void
  loadView: (id: string) => void
  deleteView: (id: string) => void
}
```

---

## 8. Mock data specification

Demo mode ships with ~40 items across 5 groups, spanning Q1 2026 through Q4 2027. The mock data should feel like a real product roadmap for a generic SaaS platform:

**Groups (5):**
- Platform Infrastructure (blue)
- User Experience (purple)
- Integrations (teal)
- Analytics & Reporting (amber)
- Security & Compliance (red)

**Categories (4):**
- New Feature (purple)
- Improvement (blue)
- Tech Debt (gray)
- Customer Request (green)

**Distribution:**
- ~8 items per group
- Status spread: 20% done, 30% in-progress, 40% todo/backlog, 10% canceled
- Priority spread: 10% urgent, 20% high, 40% medium, 30% low
- Time spread: weighted toward Q2-Q4 2026 with some items in 2027
- ~5 items with no due date → "Unscheduled"

---

## 9. File structure

```
roadrunner/
├── public/
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── TimelineGrid.tsx
│   │   ├── GroupRow.tsx
│   │   ├── PeriodColumn.tsx
│   │   ├── RoadmapCard.tsx
│   │   ├── FilterDrawer.tsx
│   │   ├── ItemDetailModal.tsx
│   │   ├── SavedViewsPanel.tsx
│   │   ├── SettingsModal.tsx
│   │   └── StatsBar.tsx
│   ├── data/
│   │   ├── mockData.ts
│   │   └── mockGroups.ts
│   ├── services/
│   │   ├── linearAdapter.ts          // Anthropic API + Linear MCP calls
│   │   └── dataService.ts            // routes to linear or mock adapter
│   ├── store/
│   │   └── useRoadRunnerStore.ts      // Zustand store
│   ├── types/
│   │   └── index.ts                   // all TypeScript interfaces
│   ├── utils/
│   │   ├── filterEngine.ts            // filter logic
│   │   ├── timePeriod.ts              // quarter derivation
│   │   └── statusColors.ts            // status → color mapping
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.local                         // VITE_ANTHROPIC_API_KEY
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 10. Build phases

### Phase 1 — Core grid + mock data

**Goal:** Fully functional roadmap grid rendering mock data. All UI interactions work. No API calls yet.

**Deliverables:**
1. Vite + React + Tailwind project scaffold
2. TypeScript types for all entities
3. Mock data (~40 items, 5 groups, 4 categories)
4. Zustand store with all state + actions
5. TimelineGrid with quarterly + annual column views
6. GroupRow with color swatch + name + description
7. RoadmapCard with status badge, category dots, priority indicator
8. Condensed/expanded density toggle
9. StatsBar with visible item counts
10. Quarter derivation from due dates
11. "Unscheduled" column for items without dates

**Done when:** Opening the app shows a fully rendered, visually polished roadmap grid with ~40 cards. Quarterly/annual toggle works. Density toggle works.

### Phase 2 — Filtering + detail

**Goal:** Full filter system + item detail modal.

**Deliverables:**
1. FilterDrawer with all 8 dimensions
2. Filter engine (OR within, AND across)
3. Active filter badge in header
4. Dynamic group hiding (hide empty rows)
5. Empty state with clear CTA
6. Search (debounced text filter on title)
7. ItemDetailModal with all fields
8. "Open in Linear" deep link (non-functional in demo mode)

**Done when:** Filters narrow the grid in real time. Clicking a card opens a detailed modal. Search works.

### Phase 3 — Linear integration

**Goal:** Live data from Linear replaces mock data.

**Deliverables:**
1. `linearAdapter.ts` — Anthropic API calls with Linear MCP
2. Issue fetching + normalization to `RoadmapItem[]`
3. Project/label/team fetching for groups + categories
4. Settings modal with mapping config UI
5. Data source toggle (Linear ↔ Demo)
6. Refresh button with loading state
7. Error handling (API failures, empty workspace, rate limits)
8. Connection status indicator in header

**Done when:** Flipping the data source to "Linear" shows real workspace data in the grid. Mapping config lets the user choose what drives rows and categories.

### Phase 4 — Saved views + polish

**Goal:** View management + visual polish.

**Deliverables:**
1. SavedViewsPanel dropdown
2. Save current view modal
3. Load/delete saved views
4. Keyboard shortcuts (Esc to close modals, / to focus search)
5. Animation polish (card hover, drawer slide, modal fade)
6. Responsive behavior (horizontal scroll for many columns)
7. README with setup instructions

**Done when:** The app is demo-ready. A user can open it, see a polished roadmap, filter it, save views, and switch between demo and live data.

---

## 11. Out of scope for v1

- Write-back to Linear (status updates, field edits)
- Persistence (Supabase, database)
- Authentication / user accounts
- External sharing / public URLs
- Export (PDF, PNG, slide deck)
- Drag-and-drop reordering
- Jira integration
- Multiple workspace support
- Real-time sync / webhooks
- Hierarchy toggle (parent/child depth switching)

---

## 12. Open questions

1. **API key exposure:** The Anthropic API key is in a client-side env var. Acceptable for local dev, but would need a proxy server for any deployment. Flag for v2.
2. **Rate limits:** Each "refresh" sends 2-3 API calls to Anthropic. Frequent refreshing could hit limits. Consider caching responses for 5 minutes.
3. **MCP auth persistence:** Does the Linear MCP connection require re-auth per session, or is it persistent via the Anthropic API? Needs testing.
4. **Large workspaces:** If a Linear workspace has 500+ issues, the single-prompt fetch approach may hit token limits. May need pagination strategy in v2.
