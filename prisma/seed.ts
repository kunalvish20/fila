import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function status(current: number, min: number) {
  if (current <= 0) return 'OUT_OF_STOCK' as const;
  if (current <= min) return 'LOW_STOCK' as const;
  return 'AVAILABLE' as const;
}

async function main() {
  const passwordHash = await bcrypt.hash('Admin@12345', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@filament.local' },
    update: {},
    create: { name: 'Admin User', email: 'admin@filament.local', passwordHash, role: 'ADMIN', employeeCode: 'ADM-001', department: 'Operations' }
  });
  const manager = await prisma.user.upsert({
    where: { email: 'manager@filament.local' },
    update: {},
    create: { name: 'Production Manager', email: 'manager@filament.local', passwordHash, role: 'MANAGER', employeeCode: 'MGR-001', department: 'Production' }
  });
  const employeeA = await prisma.user.upsert({
    where: { email: 'employee@filament.local' },
    update: {},
    create: { name: 'Amit Operator', email: 'employee@filament.local', passwordHash, role: 'EMPLOYEE', employeeCode: 'EMP-001', department: '3D Printing' }
  });
  const employeeB = await prisma.user.upsert({
    where: { email: 'neha@filament.local' },
    update: {},
    create: { name: 'Neha Operator', email: 'neha@filament.local', passwordHash, role: 'EMPLOYEE', employeeCode: 'EMP-002', department: '3D Printing' }
  });

  const filaments = [
    { filamentId: 'FIL-PLA-BLK-001', brand: 'eSun', material: 'PLA+', color: 'Matte Black', spoolSizeKg: 1, initialQuantityKg: 12, currentQuantityKg: 10.8, minimumStockKg: 2, costPerKg: 1150, supplier: '3D Bazaar', batchNumber: 'ES-PLA-BLK-0926', storageLocation: 'Rack A1' },
    { filamentId: 'FIL-PETG-CLR-002', brand: 'WOL3D', material: 'PETG', color: 'Transparent Clear', spoolSizeKg: 1, initialQuantityKg: 5, currentQuantityKg: 1.2, minimumStockKg: 1.5, costPerKg: 1350, supplier: 'WOL3D India', batchNumber: 'WO-PETG-CLR-0916', storageLocation: 'Rack A2' },
    { filamentId: 'FIL-TPU-RED-003', brand: 'Sunlu', material: 'TPU', color: 'Red', spoolSizeKg: 1, initialQuantityKg: 3, currentQuantityKg: 0, minimumStockKg: 1, costPerKg: 2200, supplier: 'Sunlu Store', batchNumber: 'SN-TPU-RED-0826', storageLocation: 'Rack B1' },
    { filamentId: 'FIL-ABS-WHT-004', brand: 'Robu', material: 'ABS', color: 'White', spoolSizeKg: 1, initialQuantityKg: 8, currentQuantityKg: 7.5, minimumStockKg: 2, costPerKg: 980, supplier: 'Robu.in', batchNumber: 'RB-ABS-WHT-0726', storageLocation: 'Dry Box 1' },
    { filamentId: 'FIL-RES-GRY-005', brand: 'Anycubic', material: 'Resin', color: 'Grey', spoolSizeKg: 1, initialQuantityKg: 6, currentQuantityKg: 4.4, minimumStockKg: 1, costPerKg: 1800, supplier: 'Anycubic India', batchNumber: 'AC-RES-GRY-0626', storageLocation: 'Resin Cabinet' }
  ];

  for (const item of filaments) {
    const filament = await prisma.filament.upsert({
      where: { filamentId: item.filamentId },
      update: {},
      create: { ...item, status: status(item.currentQuantityKg, item.minimumStockKg), createdById: admin.id }
    });
    const existingTx = await prisma.inventoryTransaction.findFirst({ where: { filamentId: filament.id, type: 'STOCK_IN' } });
    if (!existingTx) {
      await prisma.inventoryTransaction.create({
        data: {
          type: 'STOCK_IN',
          filamentId: filament.id,
          actorId: admin.id,
          quantityKg: item.currentQuantityKg,
          warehousePreviousQtyKg: 0,
          warehouseNewQtyKg: item.currentQuantityKg,
          reason: 'Seed opening stock'
        }
      });
    }
  }

  const blackPla = await prisma.filament.findUniqueOrThrow({ where: { filamentId: 'FIL-PLA-BLK-001' } });
  const request = await prisma.filamentRequest.upsert({
    where: { requestCode: 'REQ-DEMO-001' },
    update: {},
    create: {
      requestCode: 'REQ-DEMO-001',
      managerId: manager.id,
      employeeId: employeeA.id,
      filamentId: blackPla.id,
      requestedQuantityKg: 0.75,
      purpose: 'Order LS-1024 anime lamp batch',
      notes: 'Use matte black finish for base parts.'
    }
  });

  await prisma.notification.createMany({
    data: [
      { userId: employeeA.id, type: 'REQUEST_CREATED', title: 'New filament request assigned', message: 'Production Manager requested 0.75kg PLA+ Matte Black for Order LS-1024.', metadata: { requestId: request.id } },
      { userId: manager.id, type: 'LOW_STOCK', title: 'PETG Clear is low stock', message: 'WOL3D PETG Transparent Clear has 1.2kg remaining.', metadata: { filamentId: 'FIL-PETG-CLR-002' } },
      { userId: admin.id, type: 'LOW_STOCK', title: 'TPU Red is out of stock', message: 'Sunlu TPU Red has 0kg remaining.', metadata: { filamentId: 'FIL-TPU-RED-003' } }
    ],
    skipDuplicates: true
  });

  await prisma.systemSetting.upsert({ where: { key: 'company_name' }, update: {}, create: { key: 'company_name', value: '3D Printing Studio' } });
  await prisma.systemSetting.upsert({ where: { key: 'default_unit' }, update: {}, create: { key: 'default_unit', value: 'kg' } });

  console.log('Seed complete');
  console.log('Demo users:');
  console.table([
    { role: 'Admin', email: 'admin@filament.local', password: 'Admin@12345' },
    { role: 'Manager', email: 'manager@filament.local', password: 'Admin@12345' },
    { role: 'Employee', email: 'employee@filament.local', password: 'Admin@12345' }
  ]);
}

main().finally(async () => prisma.$disconnect());
