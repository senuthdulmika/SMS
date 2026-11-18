import { Router } from "express"
import { authenticate, requireRole } from "../middlewares/auth"
import { adminOverview } from "../controllers/admin.controller"

const router = Router()
router.get("/overview", authenticate, requireRole("ADMIN"), adminOverview)

export default router
