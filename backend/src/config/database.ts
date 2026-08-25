import { logger } from './logger'
import bcrypt from 'bcryptjs'

// In-Memory Database Store to guarantee instant, reliable execution without external MySQL
export class InMemoryPrisma {
  private _users: any[] = []
  private _groups: any[] = []
  private _groupMembers: any[] = []
  private _destinations: any[] = []
  private _locations: any[] = []
  private _attendance: any[] = []
  private _trips: any[] = []
  private _tripStops: any[] = []
  private _tripEvents: any[] = []
  private _notifications: any[] = []

  constructor() {
    this.seed()
  }

  seed() {
    // 1. Admin
    this._users.push({
      id: 'user-admin-01',
      name: 'Admin User',
      email: 'admin@routesync.app',
      passwordHash: bcrypt.hashSync('Admin@123', 10),
      role: 'ADMIN',
      phone: '+919000000000',
      avatarUrl: null,
      refreshToken: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // 2. Driver
    this._users.push({
      id: 'user-driver-01',
      name: 'Rajan Kumar',
      email: 'driver@routesync.app',
      passwordHash: bcrypt.hashSync('Driver@123', 10),
      role: 'DRIVER',
      phone: '+919111111111',
      avatarUrl: null,
      refreshToken: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // 3. Students
    const studentData = [
      { id: 'user-student-01', name: 'Aarav Sharma', email: 'aarav@routesync.app', phone: '+919222222221', lat: 12.9141, lng: 77.6101 },
      { id: 'user-student-02', name: 'Priya Nair', email: 'priya@routesync.app', phone: '+919222222222', lat: 12.9200, lng: 77.6150 },
      { id: 'user-student-03', name: 'Rohan Mehta', email: 'rohan@routesync.app', phone: '+919222222223', lat: 12.9080, lng: 77.6080 },
      { id: 'user-student-04', name: 'Sneha Gupta', email: 'sneha@routesync.app', phone: '+919222222224', lat: 12.9230, lng: 77.6200 },
      { id: 'user-student-05', name: 'Karthik Reddy', email: 'karthik@routesync.app', phone: '+919222222225', lat: 12.9050, lng: 77.6050 },
    ]

    for (const s of studentData) {
      this._users.push({
        id: s.id,
        name: s.name,
        email: s.email,
        passwordHash: bcrypt.hashSync('Student@123', 10),
        role: 'STUDENT',
        phone: s.phone,
        avatarUrl: null,
        refreshToken: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      this._locations.push({
        id: `loc-${s.id}`,
        userId: s.id,
        lat: s.lat,
        lng: s.lng,
        address: `${s.name}'s Home, Bengaluru`,
        label: 'PICKUP',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    // 4. Group
    const group = {
      id: 'group-01',
      name: 'Morning Route - Bengaluru',
      description: 'Daily morning school transport for South Bengaluru',
      driverId: 'user-driver-01',
      inviteCode: 'RS-DEMO-01',
      maxCapacity: 15,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this._groups.push(group)

    // 5. Destination
    this._destinations.push({
      id: 'dest-01',
      groupId: 'group-01',
      name: 'Greenwood Public School',
      lat: 12.9352,
      lng: 77.6245,
      address: 'Greenwood Public School, Koramangala, Bengaluru - 560034',
      order: 0,
    })

    // 6. Group Members
    for (const s of studentData) {
      this._groupMembers.push({
        id: `gm-${s.id}`,
        groupId: 'group-01',
        studentId: s.id,
        joinedAt: new Date(),
        isActive: true,
      })
    }

    // 7. Today's Attendance
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    studentData.forEach((s, idx) => {
      this._attendance.push({
        id: `att-${s.id}`,
        groupId: 'group-01',
        studentId: s.id,
        tripId: null,
        date: today,
        status: idx < 4 ? 'PRESENT' : 'ABSENT',
        markedAt: new Date(),
        isLocked: false,
      })
    })

    logger.info('🌱 In-memory database initialized and seeded with demo accounts')
  }

  private id(prefix: string) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`
  }

  user = {
    findUnique: async ({ where }: { where: { email?: string; id?: string } }) => {
      return this._users.find(u => (where.email && u.email === where.email) || (where.id && u.id === where.id)) || null
    },
    findFirst: async ({ where }: { where: any }) => {
      return this._users.find(u => {
        if (where.refreshToken && u.refreshToken === where.refreshToken) return true
        if (where.email && u.email === where.email) return true
        if (where.id && u.id === where.id) return true
        return false
      }) || null
    },
    create: async ({ data }: { data: any }) => {
      const newUser = {
        id: this.id('user'),
        avatarUrl: null,
        refreshToken: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      }
      this._users.push(newUser)
      return newUser
    },
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      const user = this._users.find(u => u.id === where.id)
      if (user) {
        Object.assign(user, data, { updatedAt: new Date() })
        return user
      }
      return null
    },
    deleteMany: async () => {
      this._users = []
      return { count: 0 }
    },
  }

  group = {
    findUnique: async ({ where, include }: { where: { id?: string; inviteCode?: string }; include?: any }) => {
      const g = this._groups.find(x => (where.id && x.id === where.id) || (where.inviteCode && x.inviteCode?.toUpperCase() === where.inviteCode?.toUpperCase()))
      if (!g) return null
      return this.enrichGroup(g, include)
    },
    findMany: async ({ where = {}, include, orderBy }: { where?: any; include?: any; orderBy?: any }) => {
      let list = this._groups.filter(g => {
        if (where.isActive !== undefined && g.isActive !== where.isActive) return false
        if (where.driverId && g.driverId !== where.driverId) return false
        if (where.members?.some) {
          const m = this._groupMembers.find(gm => gm.groupId === g.id && gm.studentId === where.members.some.studentId && (where.members.some.isActive === undefined || gm.isActive === where.members.some.isActive))
          if (!m) return false
        }
        return true
      })
      return list.map(g => this.enrichGroup(g, include))
    },
    create: async ({ data, include }: { data: any; include?: any }) => {
      const newGroup = {
        id: this.id('group'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      }
      this._groups.push(newGroup)
      return this.enrichGroup(newGroup, include)
    },
    update: async ({ where, data, select }: { where: { id: string }; data: any; select?: any }) => {
      const g = this._groups.find(x => x.id === where.id)
      if (g) {
        Object.assign(g, data, { updatedAt: new Date() })
        return g
      }
      return null
    },
    deleteMany: async () => {
      this._groups = []
      return { count: 0 }
    },
  }

  private enrichGroup(g: any, include?: any) {
    const res = { ...g }
    if (include?.driver) {
      const driver = this._users.find(u => u.id === g.driverId)
      res.driver = driver ? { id: driver.id, name: driver.name, phone: driver.phone, avatarUrl: driver.avatarUrl } : null
    }
    if (include?.destinations) {
      res.destinations = this._destinations.filter(d => d.groupId === g.id).sort((a, b) => (a.order || 0) - (b.order || 0))
    }
    if (include?.members) {
      const activeMembers = this._groupMembers.filter(gm => gm.groupId === g.id && gm.isActive)
      res.members = activeMembers.map(gm => {
        const student = this._users.find(u => u.id === gm.studentId)
        const locations = this._locations.filter(l => l.userId === gm.studentId && l.isDefault)
        return {
          ...gm,
          student: student ? {
            id: student.id,
            name: student.name,
            email: student.email,
            phone: student.phone,
            avatarUrl: student.avatarUrl,
            locations: locations.slice(0, 1),
          } : null,
        }
      })
    }
    if (include?._count) {
      res._count = {
        members: this._groupMembers.filter(gm => gm.groupId === g.id && gm.isActive).length,
      }
    }
    return res
  }

  groupMember = {
    findFirst: async ({ where }: { where: any }) => {
      return this._groupMembers.find(gm => {
        if (where.groupId && gm.groupId !== where.groupId) return false
        if (where.studentId && gm.studentId !== where.studentId) return false
        if (where.isActive !== undefined && gm.isActive !== where.isActive) return false
        return true
      }) || null
    },
    upsert: async ({ where, create, update }: any) => {
      const target = where.groupId_studentId || where
      let existing = this._groupMembers.find(gm => gm.groupId === target.groupId && gm.studentId === target.studentId)
      if (existing) {
        Object.assign(existing, update)
        return existing
      } else {
        const newGm = { id: this.id('gm'), joinedAt: new Date(), ...create }
        this._groupMembers.push(newGm)
        return newGm
      }
    },
    update: async ({ where, data }: any) => {
      const target = where.groupId_studentId || where
      const existing = this._groupMembers.find(gm => gm.groupId === target.groupId && gm.studentId === target.studentId)
      if (existing) {
        Object.assign(existing, data)
        return existing
      }
      return null
    },
    createMany: async ({ data }: { data: any[] }) => {
      data.forEach(d => this._groupMembers.push({ id: this.id('gm'), joinedAt: new Date(), isActive: true, ...d }))
      return { count: data.length }
    },
    deleteMany: async () => {
      this._groupMembers = []
      return { count: 0 }
    },
  }

  destination = {
    create: async ({ data }: { data: any }) => {
      const dest = { id: this.id('dest'), ...data }
      this._destinations.push(dest)
      return dest
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const idx = this._destinations.findIndex(d => d.id === where.id)
      if (idx !== -1) {
        const [deleted] = this._destinations.splice(idx, 1)
        return deleted
      }
      return null
    },
    deleteMany: async () => {
      this._destinations = []
      return { count: 0 }
    },
  }

  location = {
    findFirst: async ({ where }: { where: any }) => {
      return this._locations.find(l => {
        if (where.userId && l.userId !== where.userId) return false
        if (where.isDefault !== undefined && l.isDefault !== where.isDefault) return false
        return true
      }) || null
    },
    create: async ({ data }: { data: any }) => {
      const loc = { id: this.id('loc'), createdAt: new Date(), updatedAt: new Date(), ...data }
      this._locations.push(loc)
      return loc
    },
    deleteMany: async () => {
      this._locations = []
      return { count: 0 }
    },
  }

  attendance = {
    upsert: async ({ where, create, update, include }: any) => {
      const key = where.groupId_studentId_date || where
      const targetDate = new Date(key.date)
      targetDate.setHours(0, 0, 0, 0)

      let existing = this._attendance.find(a => {
        const d = new Date(a.date)
        d.setHours(0, 0, 0, 0)
        return a.groupId === key.groupId && a.studentId === key.studentId && d.getTime() === targetDate.getTime()
      })

      if (existing) {
        Object.assign(existing, update)
        return this.enrichAttendance(existing, include)
      } else {
        const newAtt = {
          id: this.id('att'),
          markedAt: new Date(),
          isLocked: false,
          ...create,
          date: targetDate,
        }
        this._attendance.push(newAtt)
        return this.enrichAttendance(newAtt, include)
      }
    },
    findMany: async ({ where = {}, include, orderBy, take, skip }: any) => {
      let list = this._attendance.filter(a => {
        if (where.groupId && a.groupId !== where.groupId) return false
        if (where.studentId && a.studentId !== where.studentId) return false
        if (where.date) {
          const reqD = new Date(where.date)
          reqD.setHours(0, 0, 0, 0)
          const curD = new Date(a.date)
          curD.setHours(0, 0, 0, 0)
          if (reqD.getTime() !== curD.getTime()) return false
        }
        return true
      })

      if (orderBy?.date === 'desc') {
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }

      if (skip) list = list.slice(skip)
      if (take) list = list.slice(0, take)

      return list.map(a => this.enrichAttendance(a, include))
    },
    findFirst: async ({ where }: any) => {
      return this._attendance.find(a => {
        if (where.groupId && a.groupId !== where.groupId) return false
        if (where.isLocked !== undefined && a.isLocked !== where.isLocked) return false
        if (where.date) {
          const reqD = new Date(where.date)
          reqD.setHours(0, 0, 0, 0)
          const curD = new Date(a.date)
          curD.setHours(0, 0, 0, 0)
          if (reqD.getTime() !== curD.getTime()) return false
        }
        return true
      }) || null
    },
    updateMany: async ({ where, data }: any) => {
      const reqD = where.date ? new Date(where.date) : null
      if (reqD) reqD.setHours(0, 0, 0, 0)

      let count = 0
      this._attendance.forEach(a => {
        const curD = new Date(a.date)
        curD.setHours(0, 0, 0, 0)
        if (where.groupId && a.groupId !== where.groupId) return
        if (reqD && reqD.getTime() !== curD.getTime()) return
        Object.assign(a, data)
        count++
      })
      return { count }
    },
    count: async ({ where }: any) => {
      return this._attendance.filter(a => {
        if (where.studentId && a.studentId !== where.studentId) return false
        if (where.status && a.status !== where.status) return false
        return true
      }).length
    },
    createMany: async ({ data }: { data: any[] }) => {
      data.forEach(d => {
        const date = new Date(d.date)
        date.setHours(0, 0, 0, 0)
        this._attendance.push({
          id: this.id('att'),
          markedAt: new Date(),
          isLocked: false,
          tripId: null,
          ...d,
          date,
        })
      })
      return { count: data.length }
    },
    deleteMany: async () => {
      this._attendance = []
      return { count: 0 }
    },
  }

  private enrichAttendance(a: any, include?: any) {
    const res = { ...a }
    if (include?.student) {
      const student = this._users.find(u => u.id === a.studentId)
      res.student = student ? { id: student.id, name: student.name, avatarUrl: student.avatarUrl, phone: student.phone } : null
    }
    if (include?.group) {
      const g = this._groups.find(x => x.id === a.groupId)
      res.group = g ? { id: g.id, name: g.name } : null
    }
    return res
  }

  trip = {
    create: async ({ data }: { data: any }) => {
      const newTrip = {
        id: this.id('trip'),
        status: 'PLANNED',
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: null,
        endedAt: null,
        plannedDistanceKm: null,
        actualDistanceKm: null,
        routePolyline: null,
        ...data,
      }
      this._trips.push(newTrip)
      return newTrip
    },
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      const trip = this._trips.find(t => t.id === where.id)
      if (trip) {
        Object.assign(trip, data, { updatedAt: new Date() })
        return trip
      }
      return null
    },
    findFirst: async ({ where, include }: any) => {
      const trip = this._trips.find(t => {
        if (where.groupId && t.groupId !== where.groupId) return false
        if (where.status && t.status !== where.status) return false
        return true
      })
      if (!trip) return null
      return this.enrichTrip(trip, include)
    },
    findUnique: async ({ where, include }: any) => {
      const trip = this._trips.find(t => t.id === where.id)
      if (!trip) return null
      return this.enrichTrip(trip, include)
    },
    deleteMany: async () => {
      this._trips = []
      return { count: 0 }
    },
  }

  private enrichTrip(t: any, include?: any) {
    const res = { ...t }
    if (include?.driver) {
      const driver = this._users.find(u => u.id === t.driverId)
      res.driver = driver ? { id: driver.id, name: driver.name, phone: driver.phone } : null
    }
    if (include?.stops) {
      res.stops = this._tripStops.filter(s => s.tripId === t.id).sort((a, b) => a.sequence - b.sequence)
    }
    if (include?.destination) {
      res.destination = this._destinations.find(d => d.id === t.destinationId) || null
    }
    return res
  }

  tripStop = {
    createMany: async ({ data }: { data: any[] }) => {
      data.forEach(d => {
        this._tripStops.push({
          id: this.id('stop'),
          status: 'PENDING',
          notified5min: false,
          notified2min: false,
          ...d,
        })
      })
      return { count: data.length }
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      return this._tripStops.find(s => s.id === where.id) || null
    },
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      const stop = this._tripStops.find(s => s.id === where.id)
      if (stop) {
        Object.assign(stop, data)
        return stop
      }
      return null
    },
    deleteMany: async () => {
      this._tripStops = []
      return { count: 0 }
    },
  }

  tripEvent = {
    create: async ({ data }: { data: any }) => {
      const evt = { id: this.id('event'), createdAt: new Date(), ...data }
      this._tripEvents.push(evt)
      return evt
    },
    deleteMany: async () => {
      this._tripEvents = []
      return { count: 0 }
    },
  }

  notification = {
    create: async ({ data }: { data: any }) => {
      const notif = { id: this.id('notif'), isRead: false, createdAt: new Date(), ...data }
      this._notifications.push(notif)
      return notif
    },
    findMany: async ({ where }: any) => {
      return this._notifications.filter(n => {
        if (where.userId && n.userId !== where.userId) return false
        if (where.isRead !== undefined && n.isRead !== where.isRead) return false
        return true
      })
    },
    deleteMany: async () => {
      this._notifications = []
      return { count: 0 }
    },
  }

  $disconnect = async () => {}
  $on = (_event: string, _cb: Function) => {}
}

export const prisma = new InMemoryPrisma() as any
