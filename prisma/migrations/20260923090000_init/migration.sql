CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE');
CREATE TYPE "FilamentStatus" AS ENUM ('AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK');
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');
CREATE TYPE "TransactionType" AS ENUM ('STOCK_IN', 'REQUEST_ISSUED', 'USAGE_CONSUMED', 'ADJUSTMENT', 'RETURN');
CREATE TYPE "NotificationType" AS ENUM ('REQUEST_CREATED', 'REQUEST_ACCEPTED', 'REQUEST_REJECTED', 'LOW_STOCK', 'REQUEST_APPROVAL', 'FILAMENT_ISSUED', 'INVENTORY_CHANGE');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "employeeCode" TEXT,
  "department" TEXT,
  "phone" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Filament" (
  "id" TEXT NOT NULL,
  "filamentId" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "material" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "spoolSizeKg" DECIMAL(10,3) NOT NULL,
  "initialQuantityKg" DECIMAL(12,3) NOT NULL,
  "currentQuantityKg" DECIMAL(12,3) NOT NULL,
  "minimumStockKg" DECIMAL(12,3) NOT NULL,
  "costPerKg" DECIMAL(12,2) NOT NULL,
  "supplier" TEXT,
  "purchaseDate" TIMESTAMP(3),
  "batchNumber" TEXT,
  "storageLocation" TEXT,
  "status" "FilamentStatus" NOT NULL DEFAULT 'AVAILABLE',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Filament_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Filament_quantities_non_negative" CHECK ("initialQuantityKg" >= 0 AND "currentQuantityKg" >= 0 AND "minimumStockKg" >= 0 AND "costPerKg" >= 0)
);

CREATE TABLE "FilamentRequest" (
  "id" TEXT NOT NULL,
  "requestCode" TEXT NOT NULL,
  "managerId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "filamentId" TEXT NOT NULL,
  "requestedQuantityKg" DECIMAL(12,3) NOT NULL,
  "actualReceivedQuantityKg" DECIMAL(12,3),
  "purpose" TEXT NOT NULL,
  "notes" TEXT,
  "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
  "employeeRemarks" TEXT,
  "managerRemarks" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FilamentRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FilamentRequest_qty_positive" CHECK ("requestedQuantityKg" > 0 AND ("actualReceivedQuantityKg" IS NULL OR "actualReceivedQuantityKg" > 0))
);

CREATE TABLE "EmployeeFilamentBalance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "filamentId" TEXT NOT NULL,
  "quantityKg" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmployeeFilamentBalance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmployeeFilamentBalance_qty_non_negative" CHECK ("quantityKg" >= 0)
);

CREATE TABLE "UsageRecord" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "filamentId" TEXT NOT NULL,
  "requestId" TEXT,
  "projectOrderId" TEXT NOT NULL,
  "quantityUsedKg" DECIMAL(12,3) NOT NULL,
  "remainingQuantityKg" DECIMAL(12,3) NOT NULL,
  "notes" TEXT,
  "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UsageRecord_qty_positive" CHECK ("quantityUsedKg" > 0 AND "remainingQuantityKg" >= 0)
);

CREATE TABLE "InventoryTransaction" (
  "id" TEXT NOT NULL,
  "type" "TransactionType" NOT NULL,
  "filamentId" TEXT NOT NULL,
  "requestId" TEXT,
  "usageRecordId" TEXT,
  "actorId" TEXT,
  "employeeId" TEXT,
  "quantityKg" DECIMAL(12,3) NOT NULL,
  "warehousePreviousQtyKg" DECIMAL(12,3),
  "warehouseNewQtyKg" DECIMAL(12,3),
  "employeePreviousBalanceKg" DECIMAL(12,3),
  "employeeNewBalanceKg" DECIMAL(12,3),
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "before" JSONB,
  "after" JSONB,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_employeeCode_key" ON "User"("employeeCode");
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");
CREATE INDEX "User_email_idx" ON "User"("email");

CREATE UNIQUE INDEX "Filament_filamentId_key" ON "Filament"("filamentId");
CREATE INDEX "Filament_material_color_idx" ON "Filament"("material", "color");
CREATE INDEX "Filament_status_idx" ON "Filament"("status");
CREATE INDEX "Filament_active_idx" ON "Filament"("active");
CREATE INDEX "Filament_batchNumber_idx" ON "Filament"("batchNumber");

CREATE UNIQUE INDEX "FilamentRequest_requestCode_key" ON "FilamentRequest"("requestCode");
CREATE INDEX "FilamentRequest_managerId_status_idx" ON "FilamentRequest"("managerId", "status");
CREATE INDEX "FilamentRequest_employeeId_status_idx" ON "FilamentRequest"("employeeId", "status");
CREATE INDEX "FilamentRequest_filamentId_idx" ON "FilamentRequest"("filamentId");
CREATE INDEX "FilamentRequest_createdAt_idx" ON "FilamentRequest"("createdAt");

CREATE UNIQUE INDEX "EmployeeFilamentBalance_userId_filamentId_key" ON "EmployeeFilamentBalance"("userId", "filamentId");
CREATE INDEX "EmployeeFilamentBalance_filamentId_idx" ON "EmployeeFilamentBalance"("filamentId");

CREATE INDEX "UsageRecord_employeeId_usedAt_idx" ON "UsageRecord"("employeeId", "usedAt");
CREATE INDEX "UsageRecord_filamentId_usedAt_idx" ON "UsageRecord"("filamentId", "usedAt");
CREATE INDEX "UsageRecord_projectOrderId_idx" ON "UsageRecord"("projectOrderId");

CREATE INDEX "InventoryTransaction_filamentId_createdAt_idx" ON "InventoryTransaction"("filamentId", "createdAt");
CREATE INDEX "InventoryTransaction_type_createdAt_idx" ON "InventoryTransaction"("type", "createdAt");
CREATE INDEX "InventoryTransaction_employeeId_createdAt_idx" ON "InventoryTransaction"("employeeId", "createdAt");

CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

ALTER TABLE "Filament" ADD CONSTRAINT "Filament_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FilamentRequest" ADD CONSTRAINT "FilamentRequest_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FilamentRequest" ADD CONSTRAINT "FilamentRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FilamentRequest" ADD CONSTRAINT "FilamentRequest_filamentId_fkey" FOREIGN KEY ("filamentId") REFERENCES "Filament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeFilamentBalance" ADD CONSTRAINT "EmployeeFilamentBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeFilamentBalance" ADD CONSTRAINT "EmployeeFilamentBalance_filamentId_fkey" FOREIGN KEY ("filamentId") REFERENCES "Filament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_filamentId_fkey" FOREIGN KEY ("filamentId") REFERENCES "Filament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FilamentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_filamentId_fkey" FOREIGN KEY ("filamentId") REFERENCES "Filament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FilamentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_usageRecordId_fkey" FOREIGN KEY ("usageRecordId") REFERENCES "UsageRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
