import { Response } from "express"
import { isValidObjectId } from "mongoose"
import { AuthRequest } from "../middlewares/auth"
import { SessionModel } from "../models/session.model"
import { TaskModel } from "../models/task.model"
import { UserModel } from "../models/user.model"
import { getOffset } from "../utils/date"
import { FOCUS_MINUTES_PER_XP, publicUser, touchStreak } from "../utils/gamification"

// Log a finished focus (pomodoro) session
export const createSession = async (req: AuthRequest, res: Response) => {
  const minutes = Math.round(Number(req.body?.minutes))
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) {
    res.status(400).json({ message: "minutes must be between 1 and 240..!" })
    return
  }

  let taskId = null
  if (req.body?.taskId) {
    if (!isValidObjectId(req.body.taskId)) { res.status(400).json({ message: "Invalid task..!" }); return }
    const task = await TaskModel.findOne({ _id: req.body.taskId, user: req.user!.sub })
    if (!task) { res.status(404).json({ message: "Task not found..!" }); return }
    task.spentMinutes += minutes
    await task.save()
    taskId = task._id
  }

  const session = await SessionModel.create({ user: req.user!.sub, task: taskId, minutes })

  const user = await UserModel.findById(req.user!.sub)
  let xpGained = 0
  let publicInfo = null
  if (user) {
    xpGained = Math.floor(minutes / FOCUS_MINUTES_PER_XP)
    user.xp += xpGained
    touchStreak(user, getOffset(req))
    await user.save()
    publicInfo = publicUser(user, getOffset(req))
  }

  res.status(201).json({ data: session, user: publicInfo, xpGained })
}

export const listSessions = async (req: AuthRequest, res: Response) => {
  const sessions = await SessionModel.find({ user: req.user!.sub })
    .sort({ startedAt: -1 })
    .limit(30)
  res.json({ data: sessions })
}
