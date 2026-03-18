/** Returns the Monday of the given ISO week as a Date. */
function isoWeekMonday(year: number, week: number): Date {
  const jan4    = new Date(year, 0, 4)
  const jan4Dow = jan4.getDay() || 7
  const mon     = new Date(jan4)
  mon.setDate(jan4.getDate() - jan4Dow + 1 + (week - 1) * 7)
  return mon
}

/** Shift an ISO week string by N weeks (positive = forward, negative = back). */
export function offsetWeek(isoWeek: string, delta: number): string {
  const [yearStr, wStr] = isoWeek.split('-W')
  const year = parseInt(yearStr)
  const week = parseInt(wStr)
  const mon  = isoWeekMonday(year, week)
  mon.setDate(mon.getDate() + delta * 7)
  // Re-derive ISO year+week from the resulting Monday
  const d = new Date(mon)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1  = new Date(d.getFullYear(), 0, 4)
  const wNum   = 1 + Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  )
  return `${d.getFullYear()}-W${String(wNum).padStart(2, '0')}`
}

/** '2026-W10' → 'W10' */
export function weekLabel(isoWeek: string) {
  return isoWeek.replace(/^\d{4}-/, '')
}

/**
 * '2026-W10' → 'Mar 2–8'
 * ISO 8601: week starts Monday, Jan 4 is always in W01.
 */
export function weekDateRange(isoWeek: string): string {
  const [yearStr, wStr] = isoWeek.split('-W')
  const year = parseInt(yearStr)
  const week = parseInt(wStr)
  const mon = isoWeekMonday(year, week)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return mon.getMonth() === sun.getMonth()
    ? `${M[mon.getMonth()]} ${mon.getDate()}–${sun.getDate()}`
    : `${M[mon.getMonth()]} ${mon.getDate()}–${M[sun.getMonth()]} ${sun.getDate()}`
}
