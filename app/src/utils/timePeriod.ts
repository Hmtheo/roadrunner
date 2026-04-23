import type { TimePeriod } from '../types'

export function deriveTimePeriod(dueDate: string | null): TimePeriod | null {
  if (!dueDate) return null
  const d = new Date(dueDate)
  if (isNaN(d.getTime())) return null
  const quarter = `Q${Math.floor(d.getMonth() / 3) + 1}`
  return { quarter, year: d.getFullYear() }
}

export function getColumnKey(quarter: string, year: number): string {
  return `${year}-${quarter}`
}

export function sortColumnKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const [yearA, qA] = a.split('-')
    const [yearB, qB] = b.split('-')
    if (yearA !== yearB) return Number(yearA) - Number(yearB)
    return qA.localeCompare(qB)
  })
}
