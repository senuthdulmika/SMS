import { Router } from "express"
import { authenticate } from "../middlewares/auth"
import { createSession, listSessions } from "../controllers/session.controller"

const router = Router()
router.use(authenticate)

router.get("/", listSessions)
router.post("/", createSession)

export default router
