import { model, Schema, Types } from "mongoose"
import { jsonOptions } from "../utils/json"

export interface ISubject {
  user: Types.ObjectId
  name: string
  code: string
  color: string
  createdAt: Date
}

const subjectSchema = new Schema<ISubject>(
  {
    user: { type: Schema.Types.ObjectId, ref: "system_users", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    code: { type: String, default: "", trim: true, maxlength: 20 },
    color: { type: String, default: "#ef4444" }
  },
  { timestamps: true, toJSON: jsonOptions }
)

export const SubjectModel = model<ISubject>("subjects", subjectSchema)
