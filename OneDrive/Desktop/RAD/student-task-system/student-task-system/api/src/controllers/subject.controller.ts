import { Response } from "express"
import { isValidObjectId } from "mongoose"
import { AuthRequest } from "../middlewares/auth"
import { SubjectModel } from "../models/subject.model"
import { TaskModel } from "../models/task.model"

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

export const listSubjects = async (req: AuthRequest, res: Response) => {
  const subjects = await SubjectModel.find({ user: req.user!.sub }).sort({ name: 1 })
  res.json({ data: subjects })
}

export const createSubject = async (req: AuthRequest, res: Response) => {
  const name = String(req.body?.name ?? "").trim()
  if (!name) { res.status(400).json({ message: "Subject name is required..!" }); return }

  const color = HEX_COLOR.test(req.body?.color) ? req.body.color : "#ef4444"
  const subject = await SubjectModel.create({
    user: req.user!.sub,
    name,
    code: String(req.body?.code ?? "").trim(),
    color
  })
  res.status(201).json({ data: subject })
}

export const updateSubject = async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id)
  if (!isValidObjectId(id)) { res.status(400).json({ message: "Invalid id..!" }); return }

  const subject = await SubjectModel.findOne({ _id: id, user: req.user!.sub })
  if (!subject) { res.status(404).json({ message: "Subject not found..!" }); return }

  if (typeof req.body?.name === "string" && req.body.name.trim()) subject.name = req.body.name.trim()
  if (typeof req.body?.code === "string") subject.code = req.body.code.trim()
  if (HEX_COLOR.test(req.body?.color)) subject.color = req.body.color

  await subject.save()
  res.json({ data: subject })
}

export const deleteSubject = async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id)
  if (!isValidObjectId(id)) { res.status(400).json({ message: "Invalid id..!" }); return }

  const subject = await SubjectModel.findOneAndDelete({ _id: id, user: req.user!.sub })
  if (!subject) { res.status(404).json({ message: "Subject not found..!" }); return }

  // keep the tasks, just detach them from the removed subject
  await TaskModel.updateMany({ user: req.user!.sub, subject: id }, { $set: { subject: null } })
  res.json({ message: "Deleted" })
}
