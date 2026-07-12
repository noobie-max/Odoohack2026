-- ============================================================================
-- AssetFlow — Supabase demo seed
--
-- Run AFTER schema.sql. Re-runnable: clears all rows first.
-- All timestamps are relative to now() so demo scenarios stay fresh:
--   • AF-0001 held by Priya Shah, OVERDUE → re-allocating it triggers the
--     conflict block + transfer-request flow
--   • Conference Room B2 booked 09:00–10:00 today → booking 09:30–10:30
--     demonstrates overlap rejection; 10:00–11:00 shows back-to-back is fine
--   • Maintenance kanban populated across all five columns
--   • Open Q3 audit cycle with Missing + Damaged discrepancies
--
-- Demo credentials (all password: password123)
--   Admin:          admin@assetflow.com
--   Asset Manager:  arjun@assetflow.com
--   Dept Head:      a.rao@assetflow.com
--   Employee:       priya@assetflow.com
-- ============================================================================

BEGIN;

TRUNCATE "ActivityLog", "Notification", "AuditItem", "_AuditAuditors", "AuditCycle",
         "MaintenanceRequest", "Booking", "TransferRequest", "Allocation",
         "Asset", "AssetCategory", "User", "Department" CASCADE;

-- ─── Departments ────────────────────────────────────────────────────────────

INSERT INTO "Department" ("id", "name", "status") VALUES
  ('dept_eng', 'Engineering',      'ACTIVE'),
  ('dept_fac', 'Facilities',       'ACTIVE'),
  ('dept_fld', 'Field Ops (East)', 'INACTIVE');

-- ─── Users (bcrypt hash of "password123") ───────────────────────────────────

INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "departmentId") VALUES
  ('usr_admin',  'Admin User',   'admin@assetflow.com',  '$2b$12$cyBGR3f22QnpQK48lVel6.WbgouDFhLJ6eCWFL68EbC7acBOWFu2e', 'ADMIN',           'dept_eng'),
  ('usr_arjun',  'Arjun Rao',    'arjun@assetflow.com',  '$2b$12$cyBGR3f22QnpQK48lVel6.WbgouDFhLJ6eCWFL68EbC7acBOWFu2e', 'ASSET_MANAGER',   'dept_eng'),
  ('usr_asha',   'Asha Rao',     'a.rao@assetflow.com',  '$2b$12$cyBGR3f22QnpQK48lVel6.WbgouDFhLJ6eCWFL68EbC7acBOWFu2e', 'DEPARTMENT_HEAD', 'dept_eng'),
  ('usr_rajesh', 'Rajesh Mehta', 'r.mehta@assetflow.com','$2b$12$cyBGR3f22QnpQK48lVel6.WbgouDFhLJ6eCWFL68EbC7acBOWFu2e', 'DEPARTMENT_HEAD', 'dept_fac'),
  ('usr_priya',  'Priya Shah',   'priya@assetflow.com',  '$2b$12$cyBGR3f22QnpQK48lVel6.WbgouDFhLJ6eCWFL68EbC7acBOWFu2e', 'EMPLOYEE',        'dept_eng'),
  ('usr_raj',    'Raj Kumar',    'raj@assetflow.com',    '$2b$12$cyBGR3f22QnpQK48lVel6.WbgouDFhLJ6eCWFL68EbC7acBOWFu2e', 'EMPLOYEE',        'dept_eng'),
  ('usr_meena',  'Meena Nair',   'meena@assetflow.com',  '$2b$12$cyBGR3f22QnpQK48lVel6.WbgouDFhLJ6eCWFL68EbC7acBOWFu2e', 'EMPLOYEE',        'dept_fac'),
  ('usr_vikram', 'Vikram Singh', 'vikram@assetflow.com', '$2b$12$cyBGR3f22QnpQK48lVel6.WbgouDFhLJ6eCWFL68EbC7acBOWFu2e', 'EMPLOYEE',        'dept_fac');

UPDATE "Department" SET "headId" = 'usr_asha'   WHERE "id" = 'dept_eng';
UPDATE "Department" SET "headId" = 'usr_rajesh' WHERE "id" = 'dept_fac';

-- ─── Asset categories ───────────────────────────────────────────────────────

INSERT INTO "AssetCategory" ("id", "name", "customFields") VALUES
  ('cat_elec', 'Electronics',   '{"warrantyMonths": "24", "powerSpec": "AC adapter"}'),
  ('cat_furn', 'Furniture',     '{"material": "Wood/Metal"}'),
  ('cat_veh',  'Vehicles',      '{"fuelType": "Petrol", "seatingCapacity": "5"}'),
  ('cat_meet', 'Meeting Rooms', '{"capacity": "20"}');

-- ─── Featured assets ────────────────────────────────────────────────────────

INSERT INTO "Asset" ("id", "tag", "name", "categoryId", "serialNumber", "acquisitionDate", "acquisitionCost", "condition", "location", "isBookable", "status", "departmentId", "currentHolderId") VALUES
  ('ast_0001', 'AF-0001', 'Dell Laptop XPS 15',           'cat_elec', 'DL-XPS-2024-0001', now() - interval '18 months', 85000, 'Good',          '3rd Floor - Engineering Bay', false, 'ALLOCATED',         'dept_eng', 'usr_priya'),
  ('ast_0002', 'AF-0002', 'MacBook Pro 16"',              'cat_elec', 'MBP-16-2024-0002', now() - interval '14 months', 240000,'Good',          '3rd Floor - Engineering Bay', false, 'UNDER_MAINTENANCE', 'dept_eng', NULL),
  ('ast_0003', 'AF-0003', 'HP LaserJet Printer',          'cat_elec', 'HP-LJ-0003',       now() - interval '2 years',   45000, 'Fair',          'Facilities Office',           false, 'ALLOCATED',         'dept_fac', 'usr_meena'),
  ('ast_0004', 'AF-0004', 'Epson Projector',              'cat_elec', 'EP-PROJ-0004',     now() - interval '3 years',   60000, 'Under Service', 'Conference Hall B',           false, 'UNDER_MAINTENANCE', 'dept_fac', NULL),
  ('ast_0005', 'AF-0005', 'Air Conditioning Unit',        'cat_elec', NULL,               now() - interval '4 years',   55000, 'Good',          '2nd Floor - Block B',         false, 'UNDER_MAINTENANCE', 'dept_fac', NULL),
  ('ast_0006', 'AF-0006', 'UPS Power Backup',             'cat_elec', NULL,               now() - interval '2 years',   30000, 'Good',          'Server Room - 3rd Floor',     false, 'ALLOCATED',         'dept_eng', 'usr_raj'),
  ('ast_0007', 'AF-0007', 'Ergonomic Office Chair',       'cat_furn', NULL,               now() - interval '1 year',    15000, 'Good',          'Store Room',                  false, 'AVAILABLE',         NULL,       NULL),
  ('ast_0008', 'AF-0008', 'Conference Room B2',           'cat_meet', NULL,               NULL,                         NULL,  'Good',          '2nd Floor - Block B',         true,  'AVAILABLE',         'dept_fac', NULL),
  ('ast_0009', 'AF-0009', 'Company SUV — KA-01-MH-1234',  'cat_veh',  'VIN-2024-KA01',    now() - interval '20 months', 1800000,'Good',         'Basement Parking',            true,  'AVAILABLE',         NULL,       NULL),
  ('ast_0010', 'AF-0010', 'Training Room A',              'cat_meet', NULL,               NULL,                         NULL,  'Good',          '1st Floor - Block A',         true,  'AVAILABLE',         'dept_fac', NULL),
  ('ast_0121', 'AF-0121', 'Lenovo ThinkPad X1',           'cat_elec', NULL,               now() - interval '10 months', 120000,'Good',          'Engineering Bay',             false, 'ALLOCATED',         'dept_eng', 'usr_vikram');

-- Bulk filler assets AF-0011 … AF-0120 (keeps KPI numbers realistic)

INSERT INTO "Asset" ("id", "tag", "name", "categoryId", "condition", "status", "departmentId")
SELECT
  'ast_bulk_' || lpad(i::text, 4, '0'),
  'AF-'        || lpad(i::text, 4, '0'),
  'Asset '     || lpad(i::text, 4, '0'),
  CASE WHEN i % 3 = 0 THEN 'cat_furn' ELSE 'cat_elec' END,
  'Good',
  'AVAILABLE',
  CASE WHEN i % 2 = 0 THEN 'dept_eng' ELSE 'dept_fac' END
FROM generate_series(11, 120) AS i;

-- ─── Allocations ────────────────────────────────────────────────────────────
-- Two overdue, one active, one due back in 3 days (feeds “Upcoming returns”).

INSERT INTO "Allocation" ("id", "assetId", "employeeId", "departmentId", "allocatedDate", "expectedReturnDate", "status", "overdueNotifiedAt") VALUES
  ('alloc_priya',  'ast_0001', 'usr_priya',  'dept_eng', now() - interval '6 months',  now() - interval '12 days', 'OVERDUE', now() - interval '11 days'),
  ('alloc_raj',    'ast_0006', 'usr_raj',    'dept_eng', now() - interval '5 months',  now() - interval '40 days', 'OVERDUE', now() - interval '39 days'),
  ('alloc_meena',  'ast_0003', 'usr_meena',  'dept_fac', now() - interval '10 days',   now() + interval '30 days', 'ACTIVE',  NULL),
  ('alloc_vikram', 'ast_0121', 'usr_vikram', 'dept_fac', now() - interval '20 days',   now() + interval '3 days',  'ACTIVE',  NULL);

-- ─── Bookings ───────────────────────────────────────────────────────────────
-- Room B2 today 09:00–10:00 (conflict demo) and 10:00–11:00 (back-to-back OK).

INSERT INTO "Booking" ("id", "assetId", "requestedById", "departmentId", "startTime", "endTime", "status") VALUES
  ('book_b2_9',   'ast_0008', 'usr_vikram', 'dept_fac', date_trunc('day', now()) + interval '9 hours',                     date_trunc('day', now()) + interval '10 hours',                    'UPCOMING'),
  ('book_b2_10',  'ast_0008', 'usr_meena',  'dept_fac', date_trunc('day', now()) + interval '10 hours',                    date_trunc('day', now()) + interval '11 hours',                    'UPCOMING'),
  ('book_b2_tmw', 'ast_0008', 'usr_meena',  'dept_fac', date_trunc('day', now()) + interval '1 day' + interval '14 hours', date_trunc('day', now()) + interval '1 day' + interval '16 hours', 'UPCOMING'),
  ('book_suv',    'ast_0009', 'usr_priya',  NULL,       date_trunc('day', now()) + interval '14 hours',                    date_trunc('day', now()) + interval '17 hours',                    'UPCOMING');

-- ─── Maintenance requests (all five kanban columns + one rejected) ──────────

INSERT INTO "MaintenanceRequest" ("id", "assetId", "raisedById", "issueDescription", "priority", "status", "approvedById", "technicianName", "resolvedAt", "createdAt") VALUES
  ('mnt_pending',  'ast_0003', 'usr_meena',  'Printer is producing blurry output and paper jams frequently.',              'MEDIUM',   'PENDING',             NULL,        NULL,                 NULL,                       now() - interval '2 hours'),
  ('mnt_approved', 'ast_0004', 'usr_vikram', 'Projector lamp failing and image quality has deteriorated significantly.',   'HIGH',     'APPROVED',            'usr_arjun', NULL,                 NULL,                       now() - interval '3 days'),
  ('mnt_assigned', 'ast_0002', 'usr_raj',    'MacBook battery draining very fast and needs replacement urgently.',         'HIGH',     'TECHNICIAN_ASSIGNED', 'usr_arjun', 'Suresh IT Services', NULL,                       now() - interval '5 days'),
  ('mnt_progress', 'ast_0005', 'usr_rajesh', 'AC unit not cooling effectively — refrigerant recharge required.',           'CRITICAL', 'IN_PROGRESS',         'usr_admin', 'CoolAir HVAC',       NULL,                       now() - interval '7 days'),
  ('mnt_resolved', 'ast_0006', 'usr_priya',  'UPS battery backup was failing — battery replacement completed.',            'HIGH',     'RESOLVED',            'usr_arjun', 'PowerSys Ltd',       now() - interval '1 day',   now() - interval '10 days'),
  ('mnt_rejected', 'ast_0007', 'usr_vikram', 'Chair has a minor scratch on armrest.',                                      'LOW',      'REJECTED',            'usr_arjun', NULL,                 NULL,                       now() - interval '4 days');

-- ─── Audit cycle with discrepancies ─────────────────────────────────────────

INSERT INTO "AuditCycle" ("id", "name", "scopeDepartmentId", "startDate", "endDate", "status") VALUES
  ('audit_q3', 'Q3 — Engineering Department Audit', 'dept_eng', date_trunc('month', now()), date_trunc('month', now()) + interval '1 month', 'OPEN');

INSERT INTO "_AuditAuditors" ("A", "B") VALUES
  ('audit_q3', 'usr_arjun'),
  ('audit_q3', 'usr_asha');

INSERT INTO "AuditItem" ("id", "auditCycleId", "assetId", "expectedLocation", "verificationStatus", "notes") VALUES
  ('audititem_1', 'audit_q3', 'ast_0001', '3rd Floor - Engineering Bay', 'MISSING',  'Asset not found at expected location. Priya Shah not available for verification.'),
  ('audititem_2', 'audit_q3', 'ast_0002', '3rd Floor - Engineering Bay', 'DAMAGED',  'Screen has visible cracks on the bottom-left corner.'),
  ('audititem_3', 'audit_q3', 'ast_0006', 'Server Room - 3rd Floor',     'VERIFIED', ''),
  ('audititem_4', 'audit_q3', 'ast_0121', 'Engineering Bay',             'PENDING',  NULL);

-- ─── Notifications ──────────────────────────────────────────────────────────

INSERT INTO "Notification" ("id", "userId", "type", "message", "isRead", "createdAt") VALUES
  ('ntf_1', 'usr_admin',  'OVERDUE_RETURN',             'Asset AF-0001 (Dell Laptop XPS 15) is overdue for return — Priya Shah.',                              false, now() - interval '2 minutes'),
  ('ntf_2', 'usr_arjun',  'AUDIT_DISCREPANCY_FLAGGED',  'Audit discrepancy: Asset AF-0002 flagged as DAMAGED in "Q3 — Engineering Department Audit".',         false, now() - interval '18 minutes'),
  ('ntf_3', 'usr_admin',  'ASSET_ASSIGNED',             'Asset AF-0003 (HP LaserJet Printer) has been allocated to Meena Nair.',                               false, now() - interval '1 hour'),
  ('ntf_4', 'usr_arjun',  'MAINTENANCE_APPROVED',       'Maintenance request for AF-0004 (Epson Projector) has been approved.',                                false, now() - interval '3 hours'),
  ('ntf_5', 'usr_meena',  'TRANSFER_APPROVED',          'Transfer of AF-0009 to Vikram Singh has been approved.',                                              false, now() - interval '1 day'),
  ('ntf_6', 'usr_raj',    'MAINTENANCE_RESOLVED',       'Maintenance for AF-0006 (UPS Power Backup) has been resolved. Asset is now Available.',               true,  now() - interval '2 days'),
  ('ntf_7', 'usr_vikram', 'BOOKING_CONFIRMED',          'Booking confirmed for Conference Room B2 from 09:00 to 10:00.',                                       false, now() - interval '30 minutes'),
  ('ntf_8', 'usr_meena',  'BOOKING_CONFIRMED',          'Booking confirmed for Conference Room B2 from 10:00 to 11:00.',                                       true,  now() - interval '25 minutes'),
  ('ntf_9', 'usr_priya',  'BOOKING_CONFIRMED',          'Booking confirmed for Company SUV from 14:00 to 17:00.',                                              false, now() - interval '20 minutes');

-- ─── Activity log ───────────────────────────────────────────────────────────

INSERT INTO "ActivityLog" ("id", "userId", "action", "entityType", "entityId", "metadata", "createdAt") VALUES
  ('log_1', 'usr_admin',  'asset.allocate',      'Allocation',         'alloc_priya',  '{"assetTag": "AF-0001", "assetName": "Dell Laptop XPS 15", "employeeName": "Priya Shah"}', now() - interval '6 months'),
  ('log_2', 'usr_vikram', 'booking.create',      'Booking',            'book_b2_9',    '{"assetName": "Conference Room B2"}',                                                      now() - interval '30 minutes'),
  ('log_3', 'usr_meena',  'maintenance.raise',   'MaintenanceRequest', 'mnt_pending',  '{"assetTag": "AF-0003", "priority": "MEDIUM"}',                                            now() - interval '2 hours'),
  ('log_4', 'usr_arjun',  'maintenance.approve', 'MaintenanceRequest', 'mnt_approved', '{"assetTag": "AF-0004"}',                                                                  now() - interval '3 days'),
  ('log_5', 'usr_asha',   'audit.verify',        'AuditItem',          'audititem_1',  '{"status": "MISSING", "assetTag": "AF-0001"}',                                             now() - interval '18 minutes'),
  ('log_6', 'usr_arjun',  'asset.register',      'Asset',              'ast_0001',     '{"tag": "AF-0001", "name": "Dell Laptop XPS 15"}',                                         now() - interval '18 months');

-- ─── Pending transfer request (AF-0001: Priya → Raj) ────────────────────────

INSERT INTO "TransferRequest" ("id", "assetId", "fromEmployeeId", "toEmployeeId", "reason", "status") VALUES
  ('trf_1', 'ast_0001', 'usr_priya', 'usr_raj', 'Raj needs the laptop for the new ML project. Priya has moved to the mobile dev team and has a new device.', 'REQUESTED');

COMMIT;
