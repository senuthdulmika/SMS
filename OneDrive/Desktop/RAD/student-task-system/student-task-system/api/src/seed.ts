// Fills Atlas with a demo student + sample data:  npm run seed
import { env } from "./config/env"
import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import { UserModel, UserRole } from "./models/user.model"
import { SubjectModel } from "./models/subject.model"
import { TaskModel } from "./models/task.model"
import { SessionModel } from "./models/session.model"
import { dayKey } from "./utils/date"

const DEMO_EMAIL = "demo@crimson.dev"
const DEMO_PASSWORD = "demo1234"

const inDays = (n: number, hour = 18) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(hour, 0, 0, 0)
  return d
}

async function main() {
  await mongoose.connect(env.MONGODB_URI, { dbName: env.DB_NAME })

  const old = await UserModel.findOne({ email: DEMO_EMAIL })
  if (old) {
    await Promise.all([
      TaskModel.deleteMany({ user: old._id }),
      SubjectModel.deleteMany({ user: old._id }),
      SessionModel.deleteMany({ user: old._id }),
      UserModel.deleteOne({ _id: old._id })
    ])
  }

  const user = await UserModel.create({
    name: "Demo Student",
    email: DEMO_EMAIL,
    password: await bcrypt.hash(DEMO_PASSWORD, 10),
    roles: [UserRole.STUDENT],
    xp: 185,
    streak: 4,
    longestStreak: 6,
    lastActiveDay: dayKey(new Date(), 0)
  })

  const [math, cs, phy, eng] = await SubjectModel.insertMany([
    { user: user._id, name: "Mathematics", code: "MA201", color: "#ef4444" },
    { user: user._id, name: "Computer Science", code: "CS101", color: "#f97316" },
    { user: user._id, name: "Physics", code: "PH110", color: "#e11d48" },
    { user: user._id, name: "English Literature", code: "EN150", color: "#a3a3a3" }
  ])

  const mk = (o: Record<string, unknown>): any => ({ user: user._id, ...o })
  await TaskModel.insertMany([
    mk({ title: "Calculus assignment 4", subject: math._id, priority: "URGENT", status: "IN_PROGRESS", dueDate: inDays(0, 23), estimatedMinutes: 90, spentMinutes: 35, tags: ["homework"],
      subtasks: [{ title: "Limits problems", done: true }, { title: "Derivative problems", done: false }, { title: "Integration problems", done: false }] }),
    mk({ title: "Data structures lab report", subject: cs._id, priority: "HIGH", status: "TODO", dueDate: inDays(2), estimatedMinutes: 120, tags: ["lab", "report"] }),
    mk({ title: "Build REST API mini project", subject: cs._id, priority: "HIGH", status: "IN_PROGRESS", dueDate: inDays(5), estimatedMinutes: 240, spentMinutes: 60, tags: ["project"],
      subtasks: [{ title: "Design schema", done: true }, { title: "Auth endpoints", done: true }, { title: "Tests", done: false }] }),
    mk({ title: "Revise Newton's laws", subject: phy._id, priority: "MEDIUM", status: "TODO", dueDate: inDays(3), estimatedMinutes: 45, tags: ["revision"] }),
    mk({ title: "Read chapters 5-7: Hamlet", subject: eng._id, priority: "LOW", status: "TODO", dueDate: inDays(7), estimatedMinutes: 60, tags: ["reading"] }),
    mk({ title: "Physics quiz prep", subject: phy._id, priority: "URGENT", status: "TODO", dueDate: inDays(-1), estimatedMinutes: 30, tags: ["quiz"] }),
    mk({ title: "Submit essay outline", subject: eng._id, priority: "MEDIUM", status: "DONE", dueDate: inDays(-2), completedAt: inDays(-3, 12), xpAwarded: true, tags: ["essay"] }),
    mk({ title: "Linear algebra worksheet", subject: math._id, priority: "HIGH", status: "DONE", dueDate: inDays(-1), completedAt: inDays(-1, 10), xpAwarded: true, tags: ["homework"] }),
    mk({ title: "Set up Git repository", subject: cs._id, priority: "LOW", status: "DONE", completedAt: new Date(), xpAwarded: true, tags: ["setup"] })
  ])

  await SessionModel.insertMany(
    [25, 25, 50, 25, 25, 25].map((minutes, i) => ({
      user: user._id,
      minutes,
      startedAt: inDays(-Math.floor(i / 2), 9 + i)
    }))
  )

  console.log("Seed complete.")
  console.log(`Demo login ->  ${DEMO_EMAIL}  /  ${DEMO_PASSWORD}`)
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
