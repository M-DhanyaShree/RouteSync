export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  errors?: any
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
    [key: string]: any
  }
}

export interface JwtAccessPayload {
  userId: string
  email: string
  role: 'DRIVER' | 'STUDENT' | 'ADMIN'
}

export interface JwtRefreshPayload {
  userId: string
}

export function ok<T>(message: string, data?: T, meta?: any): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    meta,
  }
}

export function fail(message: string, errors?: any): ApiResponse<null> {
  return {
    success: false,
    message,
    errors,
  }
}
