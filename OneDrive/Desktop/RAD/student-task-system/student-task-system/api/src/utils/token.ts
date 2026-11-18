import jwt from "jsonwebtoken"
import { env } from "../config/env"

type TokenUser = { _id: { toString(): string }; roles: string[] }

export const signAccessToken = (user: TokenUser): string =>
  jwt.sign({ sub: user._id.toString(), roles: user.roles }, env.JWT_SECRET, {
    expiresIn: "30m"
  })

export const signRefreshToken = (user: TokenUser): string =>
  jwt.sign({ sub: user._id.toString() }, env.JWT_REFRESH_SECRET, {
    expiresIn: "7d"
  })
