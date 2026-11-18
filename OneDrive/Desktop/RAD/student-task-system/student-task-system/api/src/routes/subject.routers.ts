import { Router } from "express"
import { authenticate } from "../middlewares/auth"
import { createSubject, deleteSubject, listSubjects, updateSubject } from "../controllers/subject.controller"

const router = Router()
router.use(authenticate)

router.get("/", listSubjects)
router.post("/", createSubject)
router.put("/:id", updateSubject)
router.delete("/:id", deleteSubject)

export default router
