import { model, Schema } from "mongoose"
import { jsonOptions } from "../utils/json"

export enum UserRole {
  ADMIN = "ADMIN",
  STUDENT = "STUDENT"
}

export interface IUser {
  name: string
  email: string
  password: string
  roles: UserRole[]
  xp: number
  streak: number
  longestStreak: number
  lastActiveDay: string // YYYY-MM-DD in the student's local day
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    roles: {
      type: [String],
      enum: Object.values(UserRole),
      default: [UserRole.STUDENT]
    },
    xp: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActiveDay: { type: String, default: "" }
  },
  { timestamps: true, toJSON: jsonOptions }
)

export const UserModel = model<IUser>("system_users", userSchema)
