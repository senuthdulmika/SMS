import { Router } from "express"
import { authenticate } from "../middlewares/auth"
import { getOverview } from "../controllers/stats.controller"

const router = Router()
router.get("/overview", authenticate, getOverview)

export default router
