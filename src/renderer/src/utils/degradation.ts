const MS_PER_DAY = 1000 * 60 * 60 * 24

/**
 * progress 0 → blue (hue 220), progress 1 → red (hue 0)
 * If dueDate is provided: progress = (7 - daysUntilDue) / 7
 *   → full blue when 7+ days away, full red when at or past due
 * Otherwise: progress = daysSinceCreation / 7
 */
function computeProgress(createdAt: string, dueDate?: string): number {
  if (dueDate) {
    const due = new Date(dueDate.includes('T') ? dueDate : dueDate + 'T00:00:00')
    const daysUntil = (due.getTime() - Date.now()) / MS_PER_DAY
    return Math.min(Math.max((7 - daysUntil) / 7, 0), 1)
  }
  const daysSince = (Date.now() - new Date(createdAt).getTime()) / MS_PER_DAY
  return Math.min(Math.max(daysSince / 7, 0), 1)
}

export function getDegradationColor(createdAt: string, dueDate?: string): string {
  const hue = Math.round(220 - computeProgress(createdAt, dueDate) * 220)
  return `hsl(${hue}, 75%, 55%)`
}

export function getDegradationBg(createdAt: string, dueDate?: string): string {
  const hue = Math.round(220 - computeProgress(createdAt, dueDate) * 220)
  return `hsl(${hue}, 30%, 14%)`
}
