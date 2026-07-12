import { z } from 'zod'

// Auth
export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  // NOTE: No role field - signup always creates EMPLOYEE
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Asset
export const assetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  categoryId: z.string().min(1, 'Category is required'),
  serialNumber: z.string().optional(),
  acquisitionDate: z.string().optional(),
  acquisitionCost: z.number().optional(),
  condition: z.string().optional(),
  location: z.string().optional(),
  isBookable: z.boolean().default(false),
  departmentId: z.string().optional(),
})

// Allocation
export const allocationSchema = z.object({
  assetId: z.string().min(1),
  employeeId: z.string().min(1),
  expectedReturnDate: z.string().optional(),
})

export const returnSchema = z.object({
  allocationId: z.string().min(1),
  returnConditionNotes: z.string().optional(),
})

// Transfer
export const transferSchema = z.object({
  assetId: z.string().min(1),
  toEmployeeId: z.string().min(1),
  reason: z.string().optional(),
})

// Booking
export const bookingSchema = z.object({
  assetId: z.string().min(1),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
}).refine(
  (data) => new Date(data.startTime) < new Date(data.endTime),
  { message: 'End time must be after start time', path: ['endTime'] }
)

// Maintenance
export const maintenanceSchema = z.object({
  assetId: z.string().min(1),
  issueDescription: z.string().min(10, 'Please describe the issue in detail'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
})

export const maintenanceUpdateSchema = z.object({
  requestId: z.string().min(1),
  technicianName: z.string().optional(),
})

// Audit
export const auditCycleSchema = z.object({
  name: z.string().min(1, 'Cycle name is required'),
  scopeDepartmentId: z.string().optional(),
  scopeLocation: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  auditorIds: z.array(z.string()).min(1, 'At least one auditor is required'),
})

export const auditItemSchema = z.object({
  auditItemId: z.string().min(1),
  verificationStatus: z.enum(['PENDING', 'VERIFIED', 'MISSING', 'DAMAGED']),
  notes: z.string().optional(),
})

// Organization
export const departmentSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  headId: z.string().optional(),
  parentId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  customFields: z.record(z.string(), z.string()).optional(),
})

export const promoteUserSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN']),
  departmentId: z.string().optional(),
})
