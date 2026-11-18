import { model, Schema, Types } from "mongoose"
import { jsonOptions } from "../utils/json"

export interface IFocusSession {
  user: Types.ObjectId
  task: Types.ObjectId | null
  minutes: number
  startedAt: Date
}

const sessionSchema = new Schema<IFocusSession>(
  {
    user: { type: Schema.Types.ObjectId, ref: "system_users", required: true },
    task: { type: Schema.Types.ObjectId, ref: "tasks", default: null },
    minutes: { type: Number, required: true, min: 1, max: 240 },
    startedAt: { type: Date, default: Date.now }
  },
  { timestamps: true, toJSON: jsonOptions }
)

sessionSchema.index({ user: 1, startedAt: -1 })

export const SessionModel = model<IFocusSession>("focus_sessions", sessionSchema)
