import { prisma } from '../../config/database'
import { RegisterDto } from './auth.dto'
import { User } from '../../shared/types/api.types'

export class AuthRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } })
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } })
  }

  async create(data: RegisterDto & { passwordHash: string }): Promise<User> {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        phone: data.phone,
      },
    })
  }

  async setRefreshToken(userId: string, token: string | null): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: token },
    })
  }

  async findByRefreshToken(token: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { refreshToken: token } })
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })
  }
}

export const authRepository = new AuthRepository()
