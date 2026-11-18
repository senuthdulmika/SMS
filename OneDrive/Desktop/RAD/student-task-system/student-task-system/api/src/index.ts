import { env } from "./config/env" // must be first: loads .env
import express, { type NextFunction, type Request, type Response } from "express"
import cors from "cors"
import mongoose from "mongoose"

import AuthRouter from "./routes/auth.routers"
import SubjectRouter from "./routes/subject.routers"
import TaskRouter from "./routes/task.routers"
import SessionRouter from "./routes/session.routers"
import StatsRouter from "./routes/stats.routers"
import AdminRouter from "./routes/admin.routers"

const app = express()

app.use(cors({ origin: env.CLIENT_ORIGIN.split(",").map((o) => o.trim()) }))
app.use(express.json({ limit: "1mb" }))

app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok", db: mongoose.connection.readyState === 1 })
})

app.use("/api/v1/auth", AuthRouter)
app.use("/api/v1/subjects", SubjectRouter)
app.use("/api/v1/tasks", TaskRouter)
app.use("/api/v1/sessions", SessionRouter)
app.use("/api/v1/stats", StatsRouter)
app.use("/api/v1/admin", AdminRouter)

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found..!" })
})

// Express 5 forwards rejected async handlers here
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ message: "Something went wrong..!" })
})

mongoose
  .connect(env.MONGODB_URI, { dbName: env.DB_NAME })
  .then(() => {
    console.log("DB connected..! (MongoDB Atlas)")
    app.listen(env.PORT, () => {
      console.log(`Server is running on http://localhost:${env.PORT}`)
    })
  })
  .catch((err) => {
    console.error("Fail to connect DB..!", err.message)
    process.exit(1)
  })
