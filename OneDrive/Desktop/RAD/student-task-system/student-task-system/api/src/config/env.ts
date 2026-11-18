import dotenv from "dotenv"
dotenv.config({ quiet: true })

const required = (key: string): string => {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required env variable: ${key}`)
  return value
}

export const env = {
  PORT: Number(process.env.PORT) || 5000,
  MONGODB_URI: required("MONGODB_URI"),
  DB_NAME: process.env.DB_NAME || "student_tasks",
  JWT_SECRET: required("JWT_SECRET"),
  JWT_REFRESH_SECRET: required("JWT_REFRESH_SECRET"),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  ADMIN_EMAIL: (process.env.ADMIN_EMAIL || "").trim().toLowerCase()
}
