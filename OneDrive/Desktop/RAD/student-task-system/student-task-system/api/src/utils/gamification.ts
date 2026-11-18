import { dayKey } from "./date"

export const XP_BY_PRIORITY: Record<string, number> = {
  LOW: 10,
  MEDIUM: 20,
  HIGH: 35,
  URGENT: 50
}
export const ON_TIME_BONUS = 10
export const FOCUS_MINUTES_PER_XP = 5 // 1 XP for every 5 focused minutes

// Level L starts at 50 * (L-1)^2 XP  (L1: 0, L2: 50, L3: 200, L4: 450 ...)
export const xpForLevel = (level: number) => 50 * (level - 1) ** 2
export const levelFromXp = (xp: number) => Math.floor(Math.sqrt(xp / 50)) + 1

type StreakUser = { streak: number; longestStreak: number; lastActiveDay: string }

// Call whenever the student does something that counts (finish a task, focus session)
export const touchStreak = (user: StreakUser, offset: number, now = new Date()) => {
  const today = dayKey(now, offset)
  if (user.lastActiveDay === today) return
  const yesterday = dayKey(new Date(now.getTime() - 86_400_000), offset)
  user.streak = user.lastActiveDay === yesterday ? user.streak + 1 : 1
  user.longestStreak = Math.max(user.longestStreak, user.streak)
  user.lastActiveDay = today
}

// A streak that was not continued yesterday or today is already broken
export const effectiveStreak = (user: StreakUser, offset: number, now = new Date()) => {
  const today = dayKey(now, offset)
  const yesterday = dayKey(new Date(now.getTime() - 86_400_000), offset)
  return user.lastActiveDay === today || user.lastActiveDay === yesterday ? user.streak : 0
}

export const publicUser = (user: any, offset: number) => {
  const level = levelFromXp(user.xp)
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    roles: user.roles,
    xp: user.xp,
    level,
    levelStartXp: xpForLevel(level),
    nextLevelXp: xpForLevel(level + 1),
    streak: effectiveStreak(user, offset),
    longestStreak: user.longestStreak,
    createdAt: user.createdAt
  }
}
