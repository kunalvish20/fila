import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const reportsRouter = Router();
reportsRouter.use(authenticate, requireRoles('ADMIN', 'MANAGER'));

const rangeSchema = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() });

reportsRouter.get('/summary', asyncHandler(async (req, res) => {
  const range = rangeSchema.parse(req.query);
  const dateFilter: Prisma.DateTimeFilter = {
    ...(range.from ? { gte: range.from } : {}),
    ...(range.to ? { lte: range.to } : {})
  };
  const hasDate = Boolean(range.from || range.to);
  const [usageByEmployee, usageByMaterial, transactions, requests] = await Promise.all([
    prisma.usageRecord.groupBy({ by: ['employeeId'], where: hasDate ? { usedAt: dateFilter } : {}, _sum: { quantityUsedKg: true }, _count: true }),
    prisma.usageRecord.findMany({ where: hasDate ? { usedAt: dateFilter } : {}, include: { filament: true } }),
    prisma.inventoryTransaction.findMany({ where: hasDate ? { createdAt: dateFilter } : {}, include: { filament: true, actor: { select: { id: true, name: true } }, employee: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.filamentRequest.groupBy({ by: ['status'], where: hasDate ? { createdAt: dateFilter } : {}, _count: true })
  ]);
  const employees = await prisma.user.findMany({ where: { id: { in: usageByEmployee.map((u) => u.employeeId) } }, select: { id: true, name: true, employeeCode: true } });
  const employeeMap = new Map(employees.map((e) => [e.id, e]));
  const materialMap = new Map<string, number>();
  for (const usage of usageByMaterial) {
    materialMap.set(usage.filament.material, (materialMap.get(usage.filament.material) || 0) + Number(usage.quantityUsedKg));
  }
  res.json({
    usageByEmployee: usageByEmployee.map((u) => ({ employee: employeeMap.get(u.employeeId), consumedKg: Number(u._sum.quantityUsedKg ?? 0), entries: u._count })),
    usageByMaterial: Array.from(materialMap.entries()).map(([material, consumedKg]) => ({ material, consumedKg })),
    requestStatus: requests.map((r) => ({ status: r.status, count: r._count })),
    transactions
  });
}));

reportsRouter.get('/inventory-value', asyncHandler(async (_req, res) => {
  const filaments = await prisma.filament.findMany({ where: { active: true } });
  const byMaterial = Object.values(filaments.reduce<Record<string, { material: string; stockKg: number; value: number }>>((acc, f) => {
    acc[f.material] ??= { material: f.material, stockKg: 0, value: 0 };
    acc[f.material].stockKg += Number(f.currentQuantityKg);
    acc[f.material].value += Number(f.currentQuantityKg) * Number(f.costPerKg);
    return acc;
  }, {}));
  res.json({
    totalValue: byMaterial.reduce((sum, row) => sum + row.value, 0),
    totalStockKg: byMaterial.reduce((sum, row) => sum + row.stockKg, 0),
    byMaterial
  });
}));
