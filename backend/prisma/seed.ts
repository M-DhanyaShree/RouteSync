import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding RouteSync database...')

  // ── Clean up ──────────────────────────────────────────────
  await prisma.notification.deleteMany()
  await prisma.tripEvent.deleteMany()
  await prisma.tripStop.deleteMany()
  await prisma.attendance.deleteMany()
  await prisma.trip.deleteMany()
  await prisma.location.deleteMany()
  await prisma.groupMember.deleteMany()
  await prisma.destination.deleteMany()
  await prisma.group.deleteMany()
  await prisma.user.deleteMany()

  // ── Admin ─────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@routesync.app',
      passwordHash: await bcrypt.hash('Admin@123', 10),
      role: 'ADMIN',
      phone: '+919000000000',
    },
  })
  console.log('✅ Admin created:', admin.email)

  // ── Driver ────────────────────────────────────────────────
  const driver = await prisma.user.create({
    data: {
      name: 'Rajan Kumar',
      email: 'driver@routesync.app',
      passwordHash: await bcrypt.hash('Driver@123', 10),
      role: 'DRIVER',
      phone: '+919111111111',
    },
  })
  console.log('✅ Driver created:', driver.email)

  // ── Students ──────────────────────────────────────────────
  const studentData = [
    { name: 'Aarav Sharma', email: 'aarav@routesync.app', phone: '+919222222221', lat: 12.9141, lng: 77.6101 },
    { name: 'Priya Nair', email: 'priya@routesync.app', phone: '+919222222222', lat: 12.9200, lng: 77.6150 },
    { name: 'Rohan Mehta', email: 'rohan@routesync.app', phone: '+919222222223', lat: 12.9080, lng: 77.6080 },
    { name: 'Sneha Gupta', email: 'sneha@routesync.app', phone: '+919222222224', lat: 12.9230, lng: 77.6200 },
    { name: 'Karthik Reddy', email: 'karthik@routesync.app', phone: '+919222222225', lat: 12.9050, lng: 77.6050 },
  ]

  const students = await Promise.all(
    studentData.map(s =>
      prisma.user.create({
        data: {
          name: s.name,
          email: s.email,
          passwordHash: bcrypt.hashSync('Student@123', 10),
          role: 'STUDENT',
          phone: s.phone,
          locations: {
            create: {
              lat: s.lat,
              lng: s.lng,
              address: `${s.name}'s Home, Bengaluru`,
              label: 'PICKUP',
              isDefault: true,
            },
          },
        },
      })
    )
  )
  console.log(`✅ ${students.length} students created`)

  // ── Group ─────────────────────────────────────────────────
  const group = await prisma.group.create({
    data: {
      name: 'Morning Route - Bengaluru',
      description: 'Daily morning school transport for south Bengaluru',
      driverId: driver.id,
      inviteCode: 'RS-DEMO-01',
      maxCapacity: 15,
    },
  })
  console.log('✅ Group created:', group.name)

  // ── Destination ───────────────────────────────────────────
  await prisma.destination.create({
    data: {
      groupId: group.id,
      name: 'Greenwood Public School',
      lat: 12.9352,
      lng: 77.6245,
      address: 'Greenwood Public School, Koramangala, Bengaluru - 560034',
      order: 0,
    },
  })
  console.log('✅ Destination created')

  // ── Group Members ─────────────────────────────────────────
  await prisma.groupMember.createMany({
    data: students.map(s => ({
      groupId: group.id,
      studentId: s.id,
    })),
  })
  console.log('✅ Group members linked')

  // ── Today's Attendance ────────────────────────────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  await prisma.attendance.createMany({
    data: students.map((s, i) => ({
      groupId: group.id,
      studentId: s.id,
      date: today,
      status: i < 4 ? 'PRESENT' : 'ABSENT',
    })),
  })
  console.log('✅ Today\'s attendance seeded')

  console.log('\n🎉 Seed complete!')
  console.log('\n📋 Login credentials:')
  console.log('   Admin:   admin@routesync.app   / Admin@123')
  console.log('   Driver:  driver@routesync.app  / Driver@123')
  console.log('   Student: aarav@routesync.app   / Student@123')
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
