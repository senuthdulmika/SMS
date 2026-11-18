import { Router } from "express"
import { authenticate } from "../middlewares/auth"
import { createTask, deleteTask, getTask, listTasks, updateTask } from "../controllers/task.controller"

const router = Router()
router.use(authenticate)

router.get("/", listTasks)
router.post("/", createTask)
router.get("/:id", getTask)
router.put("/:id", updateTask)
router.delete("/:id", deleteTask)

export default router
