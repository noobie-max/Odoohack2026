-- ============================================================================
-- AssetFlow — Supabase schema
-- Enterprise Asset & Resource Management System
--
-- Run this in the Supabase SQL Editor (or `psql $DATABASE_URL -f schema.sql`)
-- to create the full database schema. Follow with seed.sql for demo data.
--
-- Table/column names intentionally match the Prisma schema (quoted CamelCase)
-- so the app can connect to the same database via DATABASE_URL with zero
-- mapping changes.
-- ============================================================================
-- ─── Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE "Role" AS ENUM ('EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN');
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED');
CREATE TYPE "AllocationStatus" AS ENUM ('ACTIVE', 'RETURNED', 'OVERDUE');
CREATE TYPE "TransferStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');
CREATE TYPE "BookingStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');
CREATE TYPE "MaintenanceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS', 'RESOLVED');
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'MISSING', 'DAMAGED');
CREATE TYPE "AuditCycleStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- ─── Core organisation tables ───────────────────────────────────────────────
CREATE TABLE "Department" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "headId"    TEXT,
    "parentId"  TEXT,
    "status"    "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id"               TEXT NOT NULL,
    "name"             TEXT NOT NULL,
    "email"            TEXT NOT NULL,
    "passwordHash"     TEXT NOT NULL,
    "role"             "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "status"           "Status" NOT NULL DEFAULT 'ACTIVE',
    "resetToken"       TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "departmentId"     TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetCategory" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "customFields" JSONB,

    CONSTRAINT "AssetCategory_pkey" PRIMARY KEY ("id")
);

-- ─── Assets ─────────────────────────────────────────────────────────────────

CREATE TABLE "Asset" (
    "id"              TEXT NOT NULL,
    "tag"             TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "categoryId"      TEXT NOT NULL,
    "serialNumber"    TEXT,
    "acquisitionDate" TIMESTAMP(3),
    "acquisitionCost" DECIMAL(65,30),
    "condition"       TEXT,
    "location"        TEXT,
    "photoUrl"        TEXT,
    "customFieldValues" JSONB,
    "isBookable"      BOOLEAN NOT NULL DEFAULT false,
    "status"          "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "departmentId"    TEXT,
    "currentHolderId" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- ─── Allocation & transfer ──────────────────────────────────────────────────

CREATE TABLE "Allocation" (
    "id"                   TEXT NOT NULL,
    "assetId"              TEXT NOT NULL,
    "employeeId"           TEXT NOT NULL,
    "departmentId"         TEXT,
    "allocatedDate"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturnDate"   TIMESTAMP(3),
    "actualReturnDate"     TIMESTAMP(3),
    "returnConditionNotes" TEXT,
    "status"               "AllocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "overdueNotifiedAt"    TIMESTAMP(3),

    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransferRequest" (
    "id"             TEXT NOT NULL,
    "assetId"        TEXT NOT NULL,
    "fromEmployeeId" TEXT NOT NULL,
    "toEmployeeId"   TEXT NOT NULL,
    "reason"         TEXT,
    "status"         "TransferStatus" NOT NULL DEFAULT 'REQUESTED',
    "approvedById"   TEXT,
    "requestedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt"     TIMESTAMP(3),

    CONSTRAINT "TransferRequest_pkey" PRIMARY KEY ("id")
);

-- ─── Resource booking ───────────────────────────────────────────────────────

CREATE TABLE "Booking" (
    "id"            TEXT NOT NULL,
    "assetId"       TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "departmentId"  TEXT,
    "startTime"     TIMESTAMP(3) NOT NULL,
    "endTime"       TIMESTAMP(3) NOT NULL,
    "status"         "BookingStatus" NOT NULL DEFAULT 'UPCOMING',
    "reminderSentAt" TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- ─── Maintenance ────────────────────────────────────────────────────────────

CREATE TABLE "MaintenanceRequest" (
    "id"                     TEXT NOT NULL,
    "assetId"                TEXT NOT NULL,
    "raisedById"             TEXT NOT NULL,
    "issueDescription"       TEXT NOT NULL,
    "priority"               "Priority" NOT NULL DEFAULT 'MEDIUM',
    "photoUrl"               TEXT,
    "status"                 "MaintenanceStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById"           TEXT,
    "technicianName"         TEXT,
    "preMaintenanceHolderId" TEXT,
    "resolvedAt"             TIMESTAMP(3),
    "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceRequest_pkey" PRIMARY KEY ("id")
);

-- ─── Audit cycles ───────────────────────────────────────────────────────────

CREATE TABLE "AuditCycle" (
    "id"                TEXT NOT NULL,
    "name"              TEXT NOT NULL,
    "scopeDepartmentId" TEXT,
    "scopeLocation"     TEXT,
    "startDate"         TIMESTAMP(3) NOT NULL,
    "endDate"           TIMESTAMP(3) NOT NULL,
    "status"            "AuditCycleStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditCycle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditItem" (
    "id"                 TEXT NOT NULL,
    "auditCycleId"       TEXT NOT NULL,
    "assetId"            TEXT NOT NULL,
    "expectedLocation"   TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "notes"              TEXT,

    CONSTRAINT "AuditItem_pkey" PRIMARY KEY ("id")
);

-- Prisma implicit m-n join table: AuditCycle ↔ auditors (User)
CREATE TABLE "_AuditAuditors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- ─── Notifications & activity log ───────────────────────────────────────────

CREATE TABLE "Notification" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "type"       TEXT NOT NULL,
    "message"    TEXT NOT NULL,
    "entityType" TEXT,
    "entityId"   TEXT,
    "isRead"     BOOLEAN NOT NULL DEFAULT false,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityLog" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "action"     TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId"   TEXT NOT NULL,
    "metadata"   JSONB,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");
CREATE UNIQUE INDEX "Asset_tag_key" ON "Asset"("tag");
CREATE INDEX "Booking_assetId_startTime_endTime_idx" ON "Booking"("assetId", "startTime", "endTime");
CREATE UNIQUE INDEX "_AuditAuditors_AB_unique" ON "_AuditAuditors"("A", "B");
CREATE INDEX "_AuditAuditors_B_index" ON "_AuditAuditors"("B");

-- Hot-path lookups
CREATE INDEX "Asset_status_idx" ON "Asset"("status");
CREATE INDEX "Asset_categoryId_idx" ON "Asset"("categoryId");
CREATE INDEX "Allocation_assetId_status_idx" ON "Allocation"("assetId", "status");
CREATE INDEX "Allocation_employeeId_idx" ON "Allocation"("employeeId");
CREATE INDEX "MaintenanceRequest_assetId_idx" ON "MaintenanceRequest"("assetId");
CREATE INDEX "MaintenanceRequest_status_idx" ON "MaintenanceRequest"("status");
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- ─── Foreign keys ───────────────────────────────────────────────────────────

ALTER TABLE "Department" ADD CONSTRAINT "Department_headId_fkey" FOREIGN KEY ("headId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_fromEmployeeId_fkey" FOREIGN KEY ("fromEmployeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_toEmployeeId_fkey" FOREIGN KEY ("toEmployeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditItem" ADD CONSTRAINT "AuditItem_auditCycleId_fkey" FOREIGN KEY ("auditCycleId") REFERENCES "AuditCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditItem" ADD CONSTRAINT "AuditItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "_AuditAuditors" ADD CONSTRAINT "_AuditAuditors_A_fkey" FOREIGN KEY ("A") REFERENCES "AuditCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_AuditAuditors" ADD CONSTRAINT "_AuditAuditors_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Row Level Security ─────────────────────────────────────────────────────
-- The app connects through Prisma with the direct Postgres connection string,
-- which bypasses RLS (owner role). Enabling RLS with no policies locks the
-- auto-generated Supabase REST/GraphQL endpoints so data is never exposed
-- through the anon key.

ALTER TABLE "Department"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssetCategory"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Asset"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Allocation"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TransferRequest"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MaintenanceRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditCycle"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditItem"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityLog"        ENABLE ROW LEVEL SECURITY;
