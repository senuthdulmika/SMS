import { Request, Response } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { env } from "../config/env"
import { UserModel, UserRole } from "../models/user.model"
import { signAccessToken, signRefreshToken } from "../utils/token"
import { AuthRequest } from "../middlewares/auth"
import { getOffset } from "../utils/date"
import { publicUser } from "../utils/gamification"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const register = async (req: Request, res: Response) => {
  const name = String(req.body?.name ?? "").trim()
  const email = String(req.body?.email ?? "").trim().toLowerCase()
  const password = String(req.body?.password ?? "")

  if (!name || !email || !password) {
    res.status(400).json({ message: "name, email and password are required..!" })
    return
  }
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ message: "Invalid email..!" })
    return
  }
  if (password.length < 6) {
    res.status(400).json({ message: "Password must be at least 6 characters..!" })
    return
  }

  const extUser = await UserModel.findOne({ email })
  if (extUser) { res.status(400).json({ message: "User already exists..!" }); return }

  const hashedPassword = await bcrypt.hash(password, 10)
  const isAdmin = env.ADMIN_EMAIL && email === env.ADMIN_EMAIL

  await UserModel.create({
    name,
    email,
    password: hashedPassword,
    roles: [isAdmin ? UserRole.ADMIN : UserRole.STUDENT]
  })

  res.status(201).json({ message: "User registered successfully..!" })
}

export const login = async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase()
  const password = String(req.body?.password ?? "")

  if (!email || !password) {
    res.status(400).json({ message: "email or password missing..!" })
    return
  }

  const user = await UserModel.findOne({ email })
  if (!user) { res.status(401).json({ message: "User not found..!" }); return }

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) { res.status(401).json({ message: "Invalid credentials..!" }); return }

  res.status(200).json({
    message: "Success",
    data: {
      email: user.email,
      roles: user.roles,
      access_token: signAccessToken(user),
      refresh_token: signRefreshToken(user)
    }
  })
}

export const getMyDetails = async (req: AuthRequest, res: Response) => {
  const user = await UserModel.findById(req.user!.sub)
  if (!user) { res.status(404).json({ message: "user not found..!" }); return }
  res.status(200).json({ message: "Success", data: publicUser(user, getOffset(req)) })
}

export const getRefreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body ?? {}
  if (!refreshToken) { res.status(400).json({ message: "Token not found..!" }); return }

  try {
    const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as unknown as {
      sub: string
    }
    const user = await UserModel.findById(payload.sub)
    if (!user) { res.status(403).json({ message: "Invalid or expire token..!" }); return }

    res.status(200).json({ data: { accessToken: signAccessToken(user) } })
  } catch {
    res.status(403).json({ message: "Invalid or expire token..!" })
  }
}
