import { Response } from "express"
import { AuthRequest } from "../middlewares/auth"
import { UserModel } from "../models/user.model"
import { TaskModel } from "../models/task.model"
import { SessionModel } from "../models/session.model"
import { levelFromXp } from "../utils/gamification"

export const adminOverview = async (_req: AuthRequest, res: Response) => {
  const [users, tasks, doneTasks, focus, perUser] = await Promise.all([
    UserModel.countDocuments(),
    TaskModel.countDocuments(),
    TaskModel.countDocuments({ status: "DONE" }),
    SessionModel.aggregate([{ $group: { _id: null, minutes: { $sum: "$minutes" } } }]),
    TaskModel.aggregate([
      {
        $group: {
          _id: "$user",
          tasks: { $sum: 1 },
          done: { $sum: { $cond: [{ $eq: ["$status", "DONE"] }, 1, 0] } }
        }
      }
    ])
  ])

  const taskMap = new Map(perUser.map((r) => [String(r._id), r]))
  const list = await UserModel.find().select("-password").sort({ xp: -1 }).limit(200)

  res.json({
    data: {
      totals: { users, tasks, doneTasks, focusMinutes: focus[0]?.minutes ?? 0 },
      users: list.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        roles: u.roles,
        xp: u.xp,
        level: levelFromXp(u.xp),
        longestStreak: u.longestStreak,
        tasks: taskMap.get(String(u._id))?.tasks ?? 0,
        done: taskMap.get(String(u._id))?.done ?? 0,
        createdAt: u.createdAt
      }))
    }
  })
}
