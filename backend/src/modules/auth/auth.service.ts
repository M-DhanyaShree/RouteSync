import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { authRepository } from './auth.repository'
import { RegisterDto, LoginDto, UpdateLocationDto } from './auth.dto'
import { env } from '../../config/env'
import { AppError } from '../../middleware/error.middleware'
import { JwtAccessPayload, JwtRefreshPayload, User } from '../../shared/types/api.types'
import { prisma } from '../../config/database'

function generateAccessToken(user: User): string {
  const payload: JwtAccessPayload = { userId: user.id, role: user.role, email: user.email }
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN as any })
}

function generateRefreshToken(user: User): string {
  const payload: JwtRefreshPayload = { userId: user.id }
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any })
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

    // If student, create default student profile
    if (user.role === 'STUDENT') {
      try {
        await prisma.location.create({
          data: {
            userId: user.id,
            lat: 12.9716,
            lng: 77.5946,
            address: 'Bengaluru Central',
            isDefault: true,
          },
        })
      } catch {}
    }

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
    const loc = await prisma.location.findFirst({ where: { userId, isDefault: true } })
    return { ...sanitizeUser(user), location: loc }
  }

  async updateLocation(userId: string, dto: UpdateLocationDto) {
    const existing = await prisma.location.findFirst({ where: { userId, isDefault: true } })
    if (existing) {
      return prisma.location.update({
        where: { id: existing.id },
        data: {
          lat: dto.lat,
          lng: dto.lng,
          address: dto.address,
          label: dto.label || 'Home Pickup Point',
        },
      })
    } else {
      return prisma.location.create({
        data: {
          userId,
          lat: dto.lat,
          lng: dto.lng,
          address: dto.address,
          label: dto.label || 'Home Pickup Point',
          isDefault: true,
        },
      })
    }
  }

  async getLocation(userId: string) {
    const loc = await prisma.location.findFirst({ where: { userId, isDefault: true } })
    if (!loc) {
      return {
        lat: 12.9716,
        lng: 77.5946,
        address: 'MG Road, Bengaluru',
        label: 'Default Pickup Spot',
      }
    }
    return loc
  }
}

export const authService = new AuthService()

