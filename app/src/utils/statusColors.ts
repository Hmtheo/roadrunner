import type { ItemStatus, Priority } from '../types'

export const STATUS_STYLES: Record<ItemStatus, { badge: string; dot: string; label: string }> = {
  backlog:     { badge: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',    dot: 'bg-slate-400',  label: 'Backlog' },
  todo:        { badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',    dot: 'bg-amber-400',  label: 'Todo' },
  'in-progress': { badge: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30', dot: 'bg-indigo-400', label: 'In Progress' },
  'in-review': { badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/30', dot: 'bg-purple-400', label: 'In Review' },
  done:        { badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30', dot: 'bg-emerald-400', label: 'Done' },
  canceled:    { badge: 'bg-zinc-600/20 text-zinc-400 border border-zinc-600/30',       dot: 'bg-zinc-500',   label: 'Canceled' },
}

export const PRIORITY_CONFIG: Record<Priority, { label: string; icon: string; color: string }> = {
  urgent: { label: 'Urgent',  icon: '!!', color: 'text-red-400' },
  high:   { label: 'High',    icon: '!',  color: 'text-orange-400' },
  medium: { label: 'Medium',  icon: '—',  color: 'text-yellow-400' },
  low:    { label: 'Low',     icon: '·',  color: 'text-slate-400' },
  none:   { label: 'None',    icon: '',   color: 'text-slate-600' },
}
