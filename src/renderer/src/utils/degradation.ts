/**
 * Returns an HSL color string based on how many days have passed since createdAt.
 * Day 0 → hue 220 (blue), Day 7+ → hue 0 (red)
 */
export function getDegradationColor(createdAt: string): string {
  const msPerDay = 1000 * 60 * 60 * 24
  const daysSince = (Date.now() - new Date(createdAt).getTime()) / msPerDay
  const progress = Math.min(Math.max(daysSince / 7, 0), 1)
  const hue = Math.round(220 - progress * 220)
  return `hsl(${hue}, 75%, 55%)`
}

/**
 * Returns a subtle background color for the card based on task age.
 */
export function getDegradationBg(createdAt: string): string {
  const msPerDay = 1000 * 60 * 60 * 24
  const daysSince = (Date.now() - new Date(createdAt).getTime()) / msPerDay
  const progress = Math.min(Math.max(daysSince / 7, 0), 1)
  const hue = Math.round(220 - progress * 220)
  return `hsl(${hue}, 30%, 14%)`
}
