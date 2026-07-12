import { PrismaClient, AssetStatus } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding AssetFlow database...')

  // Clear existing data in correct dependency order
  await prisma.activityLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.auditItem.deleteMany()
  await prisma.auditCycle.deleteMany()
  await prisma.maintenanceRequest.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.transferRequest.deleteMany()
  await prisma.allocation.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.assetCategory.deleteMany()
  await prisma.user.deleteMany()
  await prisma.department.deleteMany()

  console.log('  ✓ Cleared existing data')

  // ─── Departments ──────────────────────────────────────────────────────────
  const engDept = await prisma.department.create({
    data: { name: 'Engineering', status: 'ACTIVE' },
  })
  const facilDept = await prisma.department.create({
    data: { name: 'Facilities', status: 'ACTIVE' },
  })
  await prisma.department.create({
    data: { name: 'Field Ops (East)', status: 'INACTIVE' },
  })

  console.log('  ✓ Departments created')

  // ─── Users ────────────────────────────────────────────────────────────────
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@assetflow.com',
      passwordHash: await hash('password123', 12),
      role: 'ADMIN',
      departmentId: engDept.id,
    },
  })

  const assetManager = await prisma.user.create({
    data: {
      name: 'Arjun Rao',
      email: 'arjun@assetflow.com',
      passwordHash: await hash('password123', 12),
      role: 'ASSET_MANAGER',
      departmentId: engDept.id,
    },
  })

  const deptHeadEng = await prisma.user.create({
    data: {
      name: 'Asha Rao',
      email: 'a.rao@assetflow.com',
      passwordHash: await hash('password123', 12),
      role: 'DEPARTMENT_HEAD',
      departmentId: engDept.id,
    },
  })

  const deptHeadFac = await prisma.user.create({
    data: {
      name: 'Rajesh Mehta',
      email: 'r.mehta@assetflow.com',
      passwordHash: await hash('password123', 12),
      role: 'DEPARTMENT_HEAD',
      departmentId: facilDept.id,
    },
  })

  const priyaShah = await prisma.user.create({
    data: {
      name: 'Priya Shah',
      email: 'priya@assetflow.com',
      passwordHash: await hash('password123', 12),
      role: 'EMPLOYEE',
      departmentId: engDept.id,
    },
  })

  const rajKumar = await prisma.user.create({
    data: {
      name: 'Raj Kumar',
      email: 'raj@assetflow.com',
      passwordHash: await hash('password123', 12),
      role: 'EMPLOYEE',
      departmentId: engDept.id,
    },
  })

  const meenaNair = await prisma.user.create({
    data: {
      name: 'Meena Nair',
      email: 'meena@assetflow.com',
      passwordHash: await hash('password123', 12),
      role: 'EMPLOYEE',
      departmentId: facilDept.id,
    },
  })

  const vikramSingh = await prisma.user.create({
    data: {
      name: 'Vikram Singh',
      email: 'vikram@assetflow.com',
      passwordHash: await hash('password123', 12),
      role: 'EMPLOYEE',
      departmentId: facilDept.id,
    },
  })

  // Update dept heads
  await prisma.department.update({ where: { id: engDept.id }, data: { headId: deptHeadEng.id } })
  await prisma.department.update({ where: { id: facilDept.id }, data: { headId: deptHeadFac.id } })

  console.log('  ✓ Users created')

  // ─── Categories ───────────────────────────────────────────────────────────
  const elecCat = await prisma.assetCategory.create({
    data: { name: 'Electronics', customFields: { warrantyMonths: '24', powerSpec: 'AC adapter' } },
  })
  const furnCat = await prisma.assetCategory.create({
    data: { name: 'Furniture', customFields: { material: 'Wood/Metal' } },
  })
  const vehCat = await prisma.assetCategory.create({
    data: { name: 'Vehicles', customFields: { fuelType: 'Petrol', seatingCapacity: '5' } },
  })
  const meetingCat = await prisma.assetCategory.create({
    data: { name: 'Meeting Rooms', customFields: { capacity: '20' } },
  })

  console.log('  ✓ Categories created')

  // ─── Assets ───────────────────────────────────────────────────────────────
  // We create assets with explicit sequential tags to avoid collisions
  // Featured assets for demo scenarios
  const dellLaptop = await prisma.asset.create({
    data: {
      tag: 'AF-0001',
      name: 'Dell Laptop XPS 15',
      categoryId: elecCat.id,
      serialNumber: 'DL-XPS-2024-0001',
      acquisitionDate: new Date('2024-01-15'),
      acquisitionCost: 85000,
      condition: 'Good',
      location: '3rd Floor - Engineering Bay',
      isBookable: false,
      status: 'ALLOCATED',
      departmentId: engDept.id,
      currentHolderId: priyaShah.id,
    },
  })

  const macbook = await prisma.asset.create({
    data: {
      tag: 'AF-0002',
      name: 'MacBook Pro 16"',
      categoryId: elecCat.id,
      serialNumber: 'MBP-16-2024-0002',
      condition: 'Good',
      status: 'UNDER_MAINTENANCE',
      departmentId: engDept.id,
    },
  })

  const printer = await prisma.asset.create({
    data: {
      tag: 'AF-0003',
      name: 'HP LaserJet Printer',
      categoryId: elecCat.id,
      serialNumber: 'HP-LJ-0003',
      condition: 'Fair',
      status: 'ALLOCATED',
      location: 'Facilities Office',
      departmentId: facilDept.id,
      currentHolderId: meenaNair.id,
    },
  })

  const projector = await prisma.asset.create({
    data: {
      tag: 'AF-0004',
      name: 'Epson Projector',
      categoryId: elecCat.id,
      serialNumber: 'EP-PROJ-0004',
      condition: 'Under Service',
      location: 'Conference Hall B',
      status: 'UNDER_MAINTENANCE',
      departmentId: facilDept.id,
    },
  })

  const acUnit = await prisma.asset.create({
    data: {
      tag: 'AF-0005',
      name: 'Air Conditioning Unit',
      categoryId: elecCat.id,
      condition: 'Good',
      status: 'UNDER_MAINTENANCE',
      departmentId: facilDept.id,
    },
  })

  const ups = await prisma.asset.create({
    data: {
      tag: 'AF-0006',
      name: 'UPS Power Backup',
      categoryId: elecCat.id,
      condition: 'Good',
      status: 'ALLOCATED',
      departmentId: engDept.id,
      currentHolderId: rajKumar.id,
    },
  })

  const officeChair = await prisma.asset.create({
    data: {
      tag: 'AF-0007',
      name: 'Ergonomic Office Chair',
      categoryId: furnCat.id,
      condition: 'Good',
      location: 'Store Room',
      status: 'AVAILABLE',
      acquisitionCost: 15000,
    },
  })

  // Bookable resources
  const confRoomB2 = await prisma.asset.create({
    data: {
      tag: 'AF-0008',
      name: 'Conference Room B2',
      categoryId: meetingCat.id,
      location: '2nd Floor - Block B',
      isBookable: true,
      status: 'AVAILABLE',
      departmentId: facilDept.id,
    },
  })

  const companyVehicle = await prisma.asset.create({
    data: {
      tag: 'AF-0009',
      name: 'Company SUV — KA-01-MH-1234',
      categoryId: vehCat.id,
      serialNumber: 'VIN-2024-KA01',
      condition: 'Good',
      isBookable: true,
      status: 'AVAILABLE',
    },
  })

  const trainingRoom = await prisma.asset.create({
    data: {
      tag: 'AF-0010',
      name: 'Training Room A',
      categoryId: meetingCat.id,
      location: '1st Floor - Block A',
      isBookable: true,
      status: 'AVAILABLE',
      departmentId: facilDept.id,
    },
  })

  // Bulk filler assets to hit 113+ total
  const bulkAssets: { tag: string; name: string; categoryId: string; status: AssetStatus; departmentId?: string; condition: string }[] = []
  for (let i = 11; i <= 120; i++) {
    bulkAssets.push({
      tag: `AF-${String(i).padStart(4, '0')}`,
      name: `Asset ${String(i).padStart(4, '0')}`,
      categoryId: i % 3 === 0 ? furnCat.id : elecCat.id,
      status: 'AVAILABLE',
      departmentId: i % 2 === 0 ? engDept.id : facilDept.id,
      condition: 'Good',
    })
  }

  await prisma.asset.createMany({ data: bulkAssets })

  console.log('  ✓ Assets created')

  // ─── Allocations ──────────────────────────────────────────────────────────
  const priyaAllocation = await prisma.allocation.create({
    data: {
      assetId: dellLaptop.id,
      employeeId: priyaShah.id,
      departmentId: engDept.id,
      allocatedDate: new Date(Date.now() - 175 * 24 * 60 * 60 * 1000),
      expectedReturnDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // overdue
      status: 'OVERDUE',
      overdueNotifiedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
    },
  })

  // Active overdue allocation
  const rajAllocation = await prisma.allocation.create({
    data: {
      assetId: ups.id,
      employeeId: rajKumar.id,
      departmentId: engDept.id,
      allocatedDate: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
      expectedReturnDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // overdue
      status: 'OVERDUE',
      overdueNotifiedAt: new Date(Date.now() - 39 * 24 * 60 * 60 * 1000),
    },
  })

  // Active non-overdue allocation
  await prisma.allocation.create({
    data: {
      assetId: printer.id,
      employeeId: meenaNair.id,
      departmentId: facilDept.id,
      allocatedDate: new Date(),
      expectedReturnDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
    },
  })

  // Upcoming return (within 7 days)
  const laptop2 = await prisma.asset.create({
    data: {
      tag: 'AF-0121',
      name: 'Lenovo ThinkPad X1',
      categoryId: elecCat.id,
      condition: 'Good',
      status: 'ALLOCATED',
      departmentId: engDept.id,
      currentHolderId: vikramSingh.id,
    },
  })
  await prisma.allocation.create({
    data: {
      assetId: laptop2.id,
      employeeId: vikramSingh.id,
      departmentId: facilDept.id,
      allocatedDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      expectedReturnDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // due in 3 days
      status: 'ACTIVE',
    },
  })

  console.log('  ✓ Allocations created (2 overdue, 1 upcoming return in 3 days)')

  // ─── Bookings ─────────────────────────────────────────────────────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Existing booking 9:00–10:00 today for Room B2 (conflict demo)
  const existingBooking = await prisma.booking.create({
    data: {
      assetId: confRoomB2.id,
      requestedById: vikramSingh.id,
      departmentId: facilDept.id,
      startTime: new Date(today.getTime() + 9 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 10 * 60 * 60 * 1000),
      status: 'UPCOMING',
    },
  })

  // Back-to-back booking 10:00–11:00 (should work fine)
  await prisma.booking.create({
    data: {
      assetId: confRoomB2.id,
      requestedById: meenaNair.id,
      departmentId: facilDept.id,
      startTime: new Date(today.getTime() + 10 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 11 * 60 * 60 * 1000),
      status: 'UPCOMING',
    },
  })

  // Tomorrow 14:00–16:00
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  await prisma.booking.create({
    data: {
      assetId: confRoomB2.id,
      requestedById: meenaNair.id,
      departmentId: facilDept.id,
      startTime: new Date(tomorrow.getTime() + 14 * 60 * 60 * 1000),
      endTime: new Date(tomorrow.getTime() + 16 * 60 * 60 * 1000),
      status: 'UPCOMING',
    },
  })

  // Vehicle booking
  await prisma.booking.create({
    data: {
      assetId: companyVehicle.id,
      requestedById: priyaShah.id,
      startTime: new Date(today.getTime() + 14 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 17 * 60 * 60 * 1000),
      status: 'UPCOMING',
    },
  })

  console.log('  ✓ Bookings created — Room B2 has 9:00–10:00 slot booked for conflict demo')

  // ─── Maintenance Requests ─────────────────────────────────────────────────
  const pendingReq = await prisma.maintenanceRequest.create({
    data: {
      assetId: printer.id,
      raisedById: meenaNair.id,
      issueDescription: 'Printer is producing blurry output and paper jams frequently.',
      priority: 'MEDIUM',
      status: 'PENDING',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  })

  const approvedReq = await prisma.maintenanceRequest.create({
    data: {
      assetId: projector.id,
      raisedById: vikramSingh.id,
      issueDescription: 'Projector lamp failing and image quality has deteriorated significantly.',
      priority: 'HIGH',
      status: 'APPROVED',
      approvedById: assetManager.id,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  })

  const assignedReq = await prisma.maintenanceRequest.create({
    data: {
      assetId: macbook.id,
      raisedById: rajKumar.id,
      issueDescription: 'MacBook battery draining very fast and needs replacement urgently.',
      priority: 'HIGH',
      status: 'TECHNICIAN_ASSIGNED',
      approvedById: assetManager.id,
      technicianName: 'Suresh IT Services',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  })

  const inProgressReq = await prisma.maintenanceRequest.create({
    data: {
      assetId: acUnit.id,
      raisedById: deptHeadFac.id,
      issueDescription: 'AC unit not cooling effectively — refrigerant recharge required.',
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      approvedById: adminUser.id,
      technicianName: 'CoolAir HVAC',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  })

  const resolvedReq = await prisma.maintenanceRequest.create({
    data: {
      assetId: ups.id,
      raisedById: priyaShah.id,
      issueDescription: 'UPS battery backup was failing — battery replacement completed.',
      priority: 'HIGH',
      status: 'RESOLVED',
      approvedById: assetManager.id,
      technicianName: 'PowerSys Ltd',
      resolvedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  })

  const rejectedReq = await prisma.maintenanceRequest.create({
    data: {
      assetId: officeChair.id,
      raisedById: vikramSingh.id,
      issueDescription: 'Chair has a minor scratch on armrest.',
      priority: 'LOW',
      status: 'REJECTED',
      approvedById: assetManager.id,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
  })

  console.log('  ✓ Maintenance requests created across all 5 Kanban columns + 1 rejected')

  // ─── Audit Cycle ──────────────────────────────────────────────────────────
  const auditCycle = await prisma.auditCycle.create({
    data: {
      name: 'Q3 — Engineering Department Audit',
      scopeDepartmentId: engDept.id,
      startDate: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      status: 'OPEN',
      auditors: { connect: [{ id: assetManager.id }, { id: deptHeadEng.id }] },
    },
  })

  // Audit items with pre-set statuses for demo
  await prisma.auditItem.create({
    data: {
      auditCycleId: auditCycle.id,
      assetId: dellLaptop.id,
      expectedLocation: '3rd Floor - Engineering Bay',
      verificationStatus: 'MISSING',
      notes: 'Asset not found at expected location. Priya Shah not available for verification.',
    },
  })

  await prisma.auditItem.create({
    data: {
      auditCycleId: auditCycle.id,
      assetId: macbook.id,
      expectedLocation: '3rd Floor - Engineering Bay',
      verificationStatus: 'DAMAGED',
      notes: 'Screen has visible cracks on the bottom-left corner.',
    },
  })

  await prisma.auditItem.create({
    data: {
      auditCycleId: auditCycle.id,
      assetId: ups.id,
      expectedLocation: 'Server Room - 3rd Floor',
      verificationStatus: 'VERIFIED',
      notes: '',
    },
  })

  await prisma.auditItem.create({
    data: {
      auditCycleId: auditCycle.id,
      assetId: laptop2.id,
      expectedLocation: 'Engineering Bay',
      verificationStatus: 'PENDING',
    },
  })

  console.log('  ✓ Audit cycle created with 4 items (1 Missing, 1 Damaged, 1 Verified, 1 Pending)')

  // ─── Notifications ────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      // ALERTS bucket
      {
        userId: adminUser.id, type: 'OVERDUE_RETURN',
        message: 'Asset AF-0001 (Dell Laptop XPS 15) is overdue for return — Priya Shah.',
        createdAt: new Date(Date.now() - 2 * 60 * 1000),
      },
      {
        userId: assetManager.id, type: 'AUDIT_DISCREPANCY_FLAGGED',
        message: 'Audit discrepancy: Asset AF-0002 flagged as DAMAGED in "Q3 — Engineering Department Audit".',
        createdAt: new Date(Date.now() - 18 * 60 * 1000),
      },
      {
        userId: adminUser.id, type: 'ASSET_ASSIGNED',
        message: 'Asset AF-0003 (HP LaserJet Printer) has been allocated to Meena Nair.',
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
      },
      // APPROVALS bucket
      {
        userId: assetManager.id, type: 'MAINTENANCE_APPROVED',
        message: 'Maintenance request for AF-0004 (Epson Projector) has been approved.',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      },
      {
        userId: meenaNair.id, type: 'TRANSFER_APPROVED',
        message: 'Transfer of AF-0009 to Vikram Singh has been approved.',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        userId: rajKumar.id, type: 'MAINTENANCE_RESOLVED',
        message: 'Maintenance for AF-0006 (UPS Power Backup) has been resolved. Asset is now Available.',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        isRead: true,
      },
      // BOOKINGS bucket
      {
        userId: vikramSingh.id, type: 'BOOKING_CONFIRMED',
        message: 'Booking confirmed for Conference Room B2 from 09:00 to 10:00.',
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
      },
      {
        userId: meenaNair.id, type: 'BOOKING_CONFIRMED',
        message: 'Booking confirmed for Conference Room B2 from 10:00 to 11:00.',
        createdAt: new Date(Date.now() - 25 * 60 * 1000),
        isRead: true,
      },
      {
        userId: priyaShah.id, type: 'BOOKING_CONFIRMED',
        message: 'Booking confirmed for Company SUV from 14:00 to 17:00.',
        createdAt: new Date(Date.now() - 20 * 60 * 1000),
      },
    ],
  })

  console.log('  ✓ Notifications created across all 3 buckets')

  // ─── Activity Logs ────────────────────────────────────────────────────────
  await prisma.activityLog.createMany({
    data: [
      {
        userId: adminUser.id, action: 'asset.allocate', entityType: 'Allocation', entityId: priyaAllocation.id,
        metadata: { assetTag: 'AF-0001', assetName: 'Dell Laptop XPS 15', employeeName: 'Priya Shah' },
        createdAt: new Date(Date.now() - 175 * 24 * 60 * 60 * 1000),
      },
      {
        userId: vikramSingh.id, action: 'booking.create', entityType: 'Booking', entityId: existingBooking.id,
        metadata: { assetName: 'Conference Room B2', startTime: new Date(today.getTime() + 9 * 3600000).toISOString() },
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
      },
      {
        userId: meenaNair.id, action: 'maintenance.raise', entityType: 'MaintenanceRequest', entityId: pendingReq.id,
        metadata: { assetTag: 'AF-0003', priority: 'MEDIUM' },
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        userId: assetManager.id, action: 'maintenance.approve', entityType: 'MaintenanceRequest', entityId: approvedReq.id,
        metadata: { assetTag: 'AF-0004' },
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        userId: deptHeadEng.id, action: 'audit.verify', entityType: 'AuditItem', entityId: auditCycle.id,
        metadata: { status: 'MISSING', assetTag: 'AF-0001' },
        createdAt: new Date(Date.now() - 18 * 60 * 1000),
      },
      {
        userId: assetManager.id, action: 'asset.register', entityType: 'Asset', entityId: dellLaptop.id,
        metadata: { tag: 'AF-0001', name: 'Dell Laptop XPS 15' },
        createdAt: new Date(Date.now() - 540 * 24 * 60 * 60 * 1000),
      },
    ],
  })

  console.log('  ✓ Activity logs created')

  // ─── Pending Transfer Request ──────────────────────────────────────────────
  await prisma.transferRequest.create({
    data: {
      assetId: dellLaptop.id,
      fromEmployeeId: priyaShah.id,
      toEmployeeId: rajKumar.id,
      reason: 'Raj needs the laptop for the new ML project. Priya has moved to mobile dev team and has a new device.',
      status: 'REQUESTED',
    },
  })

  console.log('  ✓ Transfer request created')

  console.log(`
✅ Seed complete! Demo credentials:
   Admin:          admin@assetflow.com  / password123
   Asset Manager:  arjun@assetflow.com  / password123
   Dept Head Eng:  a.rao@assetflow.com  / password123
   Employee:       priya@assetflow.com  / password123

🎯 Demo scenarios pre-loaded:
   • AF-0001 allocated to Priya Shah (OVERDUE) — try direct re-allocation to trigger block
   • Conference Room B2 booked 09:00–10:00 today — try booking 09:30–10:30 for conflict
   • Back-to-back 10:00–11:00 also booked — shows back-to-back IS allowed
   • Maintenance Kanban: all 5 columns populated (Pending/Approved/Assigned/In Progress/Resolved)
   • Q3 Audit open: 2 flagged items (1 Missing, 1 Damaged)
   • 2 overdue allocations → dashboard banner fires
   • Pending transfer request on AF-0001 awaiting approval
`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
