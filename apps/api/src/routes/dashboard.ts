import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get('/stats', asyncHandler(async (req, res) => {
  const isEmployee = req.user!.role === 'EMPLOYEE';
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  if (isEmployee) {
    const [balances, pendingRequests, usages, monthlyUsage] = await Promise.all([
      prisma.employeeFilamentBalance.findMany({ where: { userId: req.user!.id, quantityKg: { gt: 0 } }, include: { filament: true } }),
      prisma.filamentRequest.count({ where: { employeeId: req.user!.id, status: 'PENDING' } }),
      prisma.usageRecord.aggregate({ where: { employeeId: req.user!.id }, _sum: { quantityUsedKg: true } }),
      prisma.usageRecord.groupBy({
        by: ['usedAt'],
        where: { employeeId: req.user!.id, usedAt: { gte: twelveMonthsAgo } },
        _sum: { quantityUsedKg: true }
      })
    ]);
    res.json({
      cards: {
        assignedFilamentKg: balances.reduce((sum, b) => sum + Number(b.quantityKg), 0),
        pendingRequests,
        consumedKg: Number(usages._sum.quantityUsedKg ?? 0),
        assignedTypes: balances.length
      },
      balances,
      monthlyUsage: bucketMonthly(monthlyUsage.map((m) => ({ date: m.usedAt, value: Number(m._sum.quantityUsedKg ?? 0) })), twelveMonthsAgo)
    });
    return;
  }

  const [filaments, lowStock, outStock, pendingRequests, issued, consumed, usageByEmployee, monthlyUsage] = await Promise.all([
    prisma.filament.findMany({ where: { active: true } }),
    prisma.filament.count({ where: { active: true, status: 'LOW_STOCK' } }),
    prisma.filament.count({ where: { active: true, status: 'OUT_OF_STOCK' } }),
    prisma.filamentRequest.count({ where: req.user!.role === 'MANAGER' ? { managerId: req.user!.id, status: 'PENDING' } : { status: 'PENDING' } }),
    prisma.inventoryTransaction.aggregate({ where: { type: 'REQUEST_ISSUED' }, _sum: { quantityKg: true } }),
    prisma.inventoryTransaction.aggregate({ where: { type: 'USAGE_CONSUMED' }, _sum: { quantityKg: true } }),
    prisma.usageRecord.groupBy({ by: ['employeeId'], _sum: { quantityUsedKg: true }, orderBy: { _sum: { quantityUsedKg: 'desc' } }, take: 10 }),
    prisma.usageRecord.groupBy({ by: ['usedAt'], where: { usedAt: { gte: twelveMonthsAgo } }, _sum: { quantityUsedKg: true } })
  ]);

  const employees = await prisma.user.findMany({ where: { id: { in: usageByEmployee.map((u) => u.employeeId) } }, select: { id: true, name: true } });
  const employeeMap = new Map(employees.map((e) => [e.id, e.name]));

  const totalStockKg = filaments.reduce((sum, f) => sum + Number(f.currentQuantityKg), 0);
  const inventoryValue = filaments.reduce((sum, f) => sum + Number(f.currentQuantityKg) * Number(f.costPerKg), 0);

  res.json({
    cards: {
      totalStockKg,
      lowStock,
      outStock,
      pendingRequests,
      issuedKg: Number(issued._sum.quantityKg ?? 0),
      consumedKg: Number(consumed._sum.quantityKg ?? 0),
      inventoryValue
    },
    lowStockItems: filaments.filter((f) => f.status !== 'AVAILABLE').slice(0, 10),
    employeeUsage: usageByEmployee.map((u) => ({ employeeId: u.employeeId, name: employeeMap.get(u.employeeId) || 'Unknown', consumedKg: Number(u._sum.quantityUsedKg ?? 0) })),
    monthlyUsage: bucketMonthly(monthlyUsage.map((m) => ({ date: m.usedAt, value: Number(m._sum.quantityUsedKg ?? 0) })), twelveMonthsAgo),
    materialStock: Object.values(filaments.reduce<Record<string, { material: string; stockKg: number; value: number }>>((acc, f) => {
      acc[f.material] ??= { material: f.material, stockKg: 0, value: 0 };
      acc[f.material].stockKg += Number(f.currentQuantityKg);
      acc[f.material].value += Number(f.currentQuantityKg) * Number(f.costPerKg);
      return acc;
    }, {}))
  });
}));

function bucketMonthly(rows: { date: Date; value: number }[], start: Date) {
  const buckets = new Map<string, number>();
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 0);
  }
  for (const row of rows) {
    const key = `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, '0')}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + row.value);
  }
  return Array.from(buckets.entries()).map(([month, consumedKg]) => ({ month, consumedKg }));
}
