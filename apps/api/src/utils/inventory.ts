import type { Prisma } from '@prisma/client';

export function calculateFilamentStatus(currentQuantityKg: Prisma.Decimal | number, minimumStockKg: Prisma.Decimal | number) {
  const current = Number(currentQuantityKg);
  const minimum = Number(minimumStockKg);
  if (current <= 0) return 'OUT_OF_STOCK' as const;
  if (current <= minimum) return 'LOW_STOCK' as const;
  return 'AVAILABLE' as const;
}

export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function roundKg(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}
