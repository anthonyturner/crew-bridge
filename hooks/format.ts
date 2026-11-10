/** Words and times as the pane and the activity log say them. */

/** A wall-clock time, `3:07 PM`. */
export function clockTime(at: number): string {
  const d = new Date(at)
  const h = d.getHours()
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** A span, `just now`, `12m` or `1h 5m`. */
export function minutes(ms: number): string {
  const m = Math.floor(ms / 60_000)
  return m < 1 ? 'just now' : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`
}

/** How many needs-tony items are open, as a sentence. */
export function waiting(count: number): string {
  return count > 0 ? `${count} ${count === 1 ? 'item waits' : 'items wait'} for you` : 'Nothing waits for you'
}
