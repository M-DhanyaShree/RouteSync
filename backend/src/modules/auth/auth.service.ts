import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { authRepository } from './auth.repository'
import { RegisterDto, LoginDto } from './auth.dto'
import { env } from '../../config/env'
import { AppError } from '../../middleware/error.middleware'
import { JwtAccessPayload, JwtRefreshPayload } from '../../shared/types/api.types'
import { User } from '@prisma/client'

function generateAccessToken(user: User): string {
  const payload: JwtAccessPayload = { userId: user.id, role: user.role, email: user.email }
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN })
}

function generateRefreshToken(user: User): string {
  const payload: JwtRefreshPayload = { userId: user.id }
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN })
}

function sanitizeUser(user: User) {
  const { passwordHash, refreshToken, ...safe } = user
  return safe
}

export class AuthService {
  async register(dto: RegisterDto) {
    const existing = await authRepository.findByEmail(dto.email)
    if (existing) throw new AppError('Email already registered', 409)

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const user = await authRepository.create({ ...dto, passwordHash })

    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)
    await authRepository.setRefreshToken(user.id, refreshToken)

    return { user: sanitizeUser(user), accessToken, refreshToken }
  }

  async login(dto: LoginDto) {
    const user = await authRepository.findByEmail(dto.email)
    if (!user) throw new AppError('Invalid email or password', 401)
    if (!user.isActive) throw new AppError('Account is disabled', 403)

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new AppError('Invalid email or password', 401)

    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)
    await authRepository.setRefreshToken(user.id, refreshToken)

    return { user: sanitizeUser(user), accessToken, refreshToken }
  }

  async refresh(incomingRefreshToken: string) {
    let payload: JwtRefreshPayload
    try {
      payload = jwt.verify(incomingRefreshToken, env.JWT_REFRESH_SECRET) as JwtRefreshPayload
    } catch {
      throw new AppError('Invalid or expired refresh token', 401)
    }

    const user = await authRepository.findById(payload.userId)
    if (!user || user.refreshToken !== incomingRefreshToken) {
      throw new AppError('Refresh token reuse detected', 401)
    }

    const accessToken = generateAccessToken(user)
    const newRefreshToken = generateRefreshToken(user)
    await authRepository.setRefreshToken(user.id, newRefreshToken)

    return { accessToken, refreshToken: newRefreshToken, user: sanitizeUser(user) }
  }

  async logout(userId: string) {
    await authRepository.setRefreshToken(userId, null)
  }

  async getMe(userId: string) {
    const user = await authRepository.findById(userId)
    if (!user) throw new AppError('User not found', 404)
    return sanitizeUser(user)
  }
}

export const authService = new AuthService()
