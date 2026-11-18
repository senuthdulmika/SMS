import { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"
import { env } from "../config/env"

export interface AuthRequest extends Request {
  user?: { sub: string; roles: string[] }
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (!authHeader) { res.status(401).json({ message: "Token not found..!" }); return }

  const token = authHeader.split(" ")[1]
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as unknown as {
      sub: string
      roles: string[]
    }
    req.user = { sub: payload.sub, roles: payload.roles }
    next()
  } catch {
    res.status(401).json({ message: "Invalid or expire token..!" })
  }
}

export const requireRole =
  (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.some((r) => req.user!.roles.includes(r))) {
      res.status(403).json({ message: "Forbidden..!" })
      return
    }
    next()
  }
