import { Response } from "express"
import { Types } from "mongoose"
import { AuthRequest } from "../middlewares/auth"
import { TaskModel } from "../models/task.model"
import { SessionModel } from "../models/session.model"
import { UserModel } from "../models/user.model"
import { dayKey, getOffset, lastNDayKeys } from "../utils/date"
import { effectiveStreak } from "../utils/gamification"

export const getOverview = async (req: AuthRequest, res: Response) => {
  const offset = getOffset(req)
  const now = new Date()
  const userId = new Types.ObjectId(req.user!.sub)

  const [tasks, user, focusAgg, recentSessions] = await Promise.all([
    TaskModel.find({ user: userId }).select(
      "status priority dueDate completedAt subject spentMinutes"
    ),
    UserModel.findById(userId),
    SessionModel.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, minutes: { $sum: "$minutes" }, sessions: { $sum: 1 } } }
    ]),
    SessionModel.find({ user: userId, startedAt: { $gte: new Date(now.getTime() - 9 * 86_400_000) } })
      .select("minutes startedAt")
  ])

  const todayKey = dayKey(now, offset)
  const weekEnd = dayKey(new Date(now.getTime() + 7 * 86_400_000), offset)

  const counts = { total: tasks.length, todo: 0, inProgress: 0, done: 0, overdue: 0, dueToday: 0, dueThisWeek: 0 }
  const bySubjectMap = new Map<string, { subject: string | null; total: number; done: number; minutes: number }>()

  for (const t of tasks) {
    if (t.status === "DONE") counts.done++
    else if (t.status === "IN_PROGRESS") counts.inProgress++
    else counts.todo++

    if (t.status !== "DONE" && t.dueDate) {
      const dk = dayKey(t.dueDate, offset)
      if (t.dueDate < now) counts.overdue++
      if (dk === todayKey) counts.dueToday++
      if (dk >= todayKey && dk <= weekEnd) counts.dueThisWeek++
    }

    const key = t.subject ? String(t.subject) : "none"
    const row = bySubjectMap.get(key) ?? { subject: t.subject ? String(t.subject) : null, total: 0, done: 0, minutes: 0 }
    row.total++
    if (t.status === "DONE") row.done++
    row.minutes += t.spentMinutes || 0
    bySubjectMap.set(key, row)
  }

  // Last 7 local days: tasks completed + minutes focused
  const days = lastNDayKeys(7, offset, now)
  const week = days.map((day) => ({ day, completed: 0, focusMinutes: 0 }))
  const idx = new Map(days.map((d, i) => [d, i]))

  for (const t of tasks) {
    if (t.status === "DONE" && t.completedAt) {
      const i = idx.get(dayKey(t.completedAt, offset))
      if (i !== undefined) week[i].completed++
    }
  }
  for (const s of recentSessions) {
    const i = idx.get(dayKey(s.startedAt, offset))
    if (i !== undefined) week[i].focusMinutes += s.minutes
  }

  const totalFocusMinutes = focusAgg[0]?.minutes ?? 0
  const focusSessions = focusAgg[0]?.sessions ?? 0
  const streak = user ? effectiveStreak(user, offset) : 0
  const longest = user?.longestStreak ?? 0

  const badges = [
    { id: "first", name: "First Blood", desc: "Complete your first task", earned: counts.done >= 1 },
    { id: "ten", name: "Double Digits", desc: "Complete 10 tasks", earned: counts.done >= 10 },
    { id: "hundred", name: "Centurion", desc: "Complete 100 tasks", earned: counts.done >= 100 },
    { id: "streak3", name: "On Fire", desc: "Reach a 3-day streak", earned: Math.max(streak, longest) >= 3 },
    { id: "streak7", name: "Week Warrior", desc: "Reach a 7-day streak", earned: Math.max(streak, longest) >= 7 },
    { id: "focus60", name: "In The Zone", desc: "Focus for 60 minutes in total", earned: totalFocusMinutes >= 60 },
    { id: "focus600", name: "Deep Work", desc: "Focus for 10 hours in total", earned: totalFocusMinutes >= 600 },
    { id: "clean", name: "Clean Slate", desc: "Finish all tasks (min. 5)", earned: counts.total >= 5 && counts.done === counts.total }
  ]

  res.json({
    data: {
      counts: {
        ...counts,
        completionRate: counts.total ? Math.round((counts.done / counts.total) * 100) : 0
      },
      week,
      bySubject: [...bySubjectMap.values()],
      totalFocusMinutes,
      focusSessions,
      badges
    }
  })
}
