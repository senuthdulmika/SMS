import { Request } from "express"

// The client sends `x-tz-offset` = new Date().getTimezoneOffset() (minutes behind UTC).
// We use it so "today", streaks and weekly charts follow the student's local day.
export const getOffset = (req: Request): number => {
  const raw = Number(req.headers["x-tz-offset"])
  if (!Number.isFinite(raw)) return 0
  return Math.max(-840, Math.min(840, raw))
}

export const dayKey = (date: Date, offsetMin: number): string =>
  new Date(date.getTime() - offsetMin * 60_000).toISOString().slice(0, 10)

export const lastNDayKeys = (n: number, offsetMin: number, now = new Date()): string[] => {
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    keys.push(dayKey(new Date(now.getTime() - i * 86_400_000), offsetMin))
  }
  return keys
}
