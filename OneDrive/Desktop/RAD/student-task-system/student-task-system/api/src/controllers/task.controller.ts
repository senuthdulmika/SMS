import { Response } from "express"
import { isValidObjectId } from "mongoose"
import { AuthRequest } from "../middlewares/auth"
import { PRIORITIES, STATUSES, TaskModel, type Status } from "../models/task.model"
import { SubjectModel } from "../models/subject.model"
import { UserModel } from "../models/user.model"
import { getOffset } from "../utils/date"
import { ON_TIME_BONUS, publicUser, touchStreak, XP_BY_PRIORITY } from "../utils/gamification"

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// Copy only the fields a student is allowed to set
const applyBody = async (task: any, body: any, userId: string): Promise<string | null> => {
  if (typeof body.title === "string") {
    if (!body.title.trim()) return "Title is required..!"
    task.title = body.title.trim().slice(0, 200)
  }
  if (typeof body.description === "string") task.description = body.description.slice(0, 4000)
  if (PRIORITIES.includes(body.priority)) task.priority = body.priority

  if ("dueDate" in body) {
    if (!body.dueDate) task.dueDate = null
    else {
      const d = new Date(body.dueDate)
      if (isNaN(d.getTime())) return "Invalid due date..!"
      task.dueDate = d
    }
  }

  if ("subject" in body) {
    if (!body.subject) task.subject = null
    else {
      if (!isValidObjectId(body.subject)) return "Invalid subject..!"
      const owned = await SubjectModel.exists({ _id: body.subject, user: userId })
      if (!owned) return "Subject not found..!"
      task.subject = body.subject
    }
  }

  if (Array.isArray(body.tags)) {
    task.tags = body.tags
      .map((t: unknown) => String(t).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10)
  }

  if (Array.isArray(body.subtasks)) {
    task.subtasks = body.subtasks
      .filter((s: any) => s && typeof s.title === "string" && s.title.trim())
      .slice(0, 30)
      .map((s: any) => ({
        ...(isValidObjectId(s.id) ? { _id: s.id } : {}),
        title: s.title.trim().slice(0, 200),
        done: Boolean(s.done)
      }))
  }

  if (body.estimatedMinutes !== undefined) {
    const n = Number(body.estimatedMinutes)
    task.estimatedMinutes = Number.isFinite(n) ? Math.max(0, Math.min(6000, Math.round(n))) : 0
  }
  return null
}

// Handles status moves + XP / streak rewards. Returns the XP gained.
const changeStatus = (task: any, user: any, status: Status, offset: number): number => {
  let xpGained = 0
  task.status = status

  if (status === "DONE") {
    task.completedAt = new Date()
    if (!task.xpAwarded) {
      const onTime = task.dueDate && task.completedAt <= task.dueDate
      xpGained = (XP_BY_PRIORITY[task.priority] ?? 10) + (onTime ? ON_TIME_BONUS : 0)
      task.xpAwarded = true // XP is awarded once per task, so un-doing/redoing cannot farm XP
      user.xp += xpGained
    }
    touchStreak(user, offset)
  } else {
    task.completedAt = null
  }
  return xpGained
}

export const listTasks = async (req: AuthRequest, res: Response) => {
  const filter: Record<string, any> = { user: req.user!.sub }
  const { status, subject, priority, q } = req.query

  if (typeof status === "string" && STATUSES.includes(status as Status)) filter.status = status
  if (typeof priority === "string" && PRIORITIES.includes(priority as any)) filter.priority = priority
  if (typeof subject === "string" && isValidObjectId(subject)) filter.subject = subject
  if (typeof q === "string" && q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim()), "i")
    filter.$or = [{ title: rx }, { description: rx }, { tags: rx }]
  }

  const tasks = await TaskModel.find(filter).sort({ createdAt: -1 }).limit(1000)
  res.json({ data: tasks })
}

export const getTask = async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id)
  if (!isValidObjectId(id)) { res.status(400).json({ message: "Invalid id..!" }); return }
  const task = await TaskModel.findOne({ _id: id, user: req.user!.sub })
  if (!task) { res.status(404).json({ message: "Task not found..!" }); return }
  res.json({ data: task })
}

export const createTask = async (req: AuthRequest, res: Response) => {
  const body = req.body ?? {}
  if (typeof body.title !== "string" || !body.title.trim()) {
    res.status(400).json({ message: "Title is required..!" })
    return
  }

  const task = new TaskModel({ user: req.user!.sub, title: body.title.trim() })
  const error = await applyBody(task, body, req.user!.sub)
  if (error) { res.status(400).json({ message: error }); return }

  let user = null
  let xpGained = 0
  const wantsDone = STATUSES.includes(body.status) ? (body.status as Status) : "TODO"
  if (wantsDone !== "TODO") {
    const u = await UserModel.findById(req.user!.sub)
    if (u) {
      xpGained = changeStatus(task, u, wantsDone, getOffset(req))
      await u.save()
      user = publicUser(u, getOffset(req))
    }
  }

  await task.save()
  res.status(201).json({ data: task, user, xpGained })
}

export const updateTask = async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id)
  if (!isValidObjectId(id)) { res.status(400).json({ message: "Invalid id..!" }); return }

  const task = await TaskModel.findOne({ _id: id, user: req.user!.sub })
  if (!task) { res.status(404).json({ message: "Task not found..!" }); return }

  const body = req.body ?? {}
  const error = await applyBody(task, body, req.user!.sub)
  if (error) { res.status(400).json({ message: error }); return }

  let user = null
  let xpGained = 0
  if (STATUSES.includes(body.status) && body.status !== task.status) {
    const u = await UserModel.findById(req.user!.sub)
    if (u) {
      xpGained = changeStatus(task, u, body.status, getOffset(req))
      await u.save()
      user = publicUser(u, getOffset(req))
    }
  }

  await task.save()
  res.json({ data: task, user, xpGained })
}

export const deleteTask = async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id)
  if (!isValidObjectId(id)) { res.status(400).json({ message: "Invalid id..!" }); return }
  const task = await TaskModel.findOneAndDelete({ _id: id, user: req.user!.sub })
  if (!task) { res.status(404).json({ message: "Task not found..!" }); return }
  res.json({ message: "Deleted" })
}
