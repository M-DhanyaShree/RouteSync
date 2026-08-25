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

export type Role = 'DRIVER' | 'STUDENT' | 'ADMIN'
export type TripStatus = 'PLANNED' | 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE'
export type StopStatus = 'PENDING' | 'ARRIVED' | 'SKIPPED'

export interface User {
  id: string
  name: string
  email: string
  passwordHash: string
  phone: string | null
  avatarUrl: string | null
  role: Role
  refreshToken: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Group {
  id: string
  name: string
  description: string | null
  driverId: string
  inviteCode: string
  maxCapacity: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface GroupMember {
  id: string
  groupId: string
  studentId: string
  joinedAt: Date
  isActive: boolean
}

export interface Destination {
  id: string
  groupId: string
  name: string
  lat: number
  lng: number
  address: string
  order: number
}

export interface Location {
  id: string
  userId: string
  lat: number
  lng: number
  address: string
  label: string
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Attendance {
  id: string
  groupId: string
  studentId: string
  tripId: string | null
  date: Date
  status: AttendanceStatus
  markedAt: Date
  isLocked: boolean
}

export interface Trip {
  id: string
  groupId: string
  driverId: string
  destinationId: string
  status: TripStatus
  startedAt: Date | null
  endedAt: Date | null
  plannedDistanceKm: number | null
  actualDistanceKm: number | null
  routePolyline: string | null
  createdAt: Date
  updatedAt: Date
}

export interface TripStop {
  id: string
  tripId: string
  studentId: string
  sequence: number
  plannedEta: Date
  actualArrival: Date | null
  status: StopStatus
  notified5min: boolean
  notified2min: boolean
}

export interface TripEvent {
  id: string
  tripId: string
  type: string
  data: any
  createdAt: Date
}

export interface Notification {
  id: string
  userId: string
  title: string
  body: string
  type: string
  metadata?: any
  isRead: boolean
  createdAt: Date
}

export interface JwtAccessPayload {
  userId: string
  email: string
  role: Role
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
