import { model, Schema, Types } from "mongoose"
import { jsonOptions } from "../utils/json"

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const
export const STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const
export type Priority = (typeof PRIORITIES)[number]
export type Status = (typeof STATUSES)[number]

export interface ITask {
  user: Types.ObjectId
  title: string
  description: string
  subject: Types.ObjectId | null
  priority: Priority
  status: Status
  dueDate: Date | null
  subtasks: { _id: Types.ObjectId; title: string; done: boolean }[]
  tags: string[]
  estimatedMinutes: number
  spentMinutes: number
  completedAt: Date | null
  xpAwarded: boolean
  createdAt: Date
  updatedAt: Date
}

const subtaskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    done: { type: Boolean, default: false }
  },
  { toJSON: jsonOptions }
)

const taskSchema = new Schema<ITask>(
  {
    user: { type: Schema.Types.ObjectId, ref: "system_users", required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 4000 },
    subject: { type: Schema.Types.ObjectId, ref: "subjects", default: null },
    priority: { type: String, enum: PRIORITIES, default: "MEDIUM" },
    status: { type: String, enum: STATUSES, default: "TODO" },
    dueDate: { type: Date, default: null },
    subtasks: { type: [subtaskSchema], default: [] },
    tags: { type: [String], default: [] },
    estimatedMinutes: { type: Number, default: 0, min: 0 },
    spentMinutes: { type: Number, default: 0, min: 0 },
    completedAt: { type: Date, default: null },
    xpAwarded: { type: Boolean, default: false }
  },
  { timestamps: true, toJSON: jsonOptions }
)

taskSchema.index({ user: 1, status: 1 })
taskSchema.index({ user: 1, dueDate: 1 })

export const TaskModel = model<ITask>("tasks", taskSchema)
