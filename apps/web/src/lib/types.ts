export type Role = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
export type Status = 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  employeeCode?: string | null;
  department?: string | null;
  phone?: string | null;
}

export interface Filament {
  id: string;
  filamentId: string;
  brand: string;
  material: string;
  color: string;
  spoolSizeKg: string | number;
  initialQuantityKg: string | number;
  currentQuantityKg: string | number;
  minimumStockKg: string | number;
  costPerKg: string | number;
  supplier?: string;
  purchaseDate?: string;
  batchNumber?: string;
  storageLocation?: string;
  status: Status;
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FilamentRequest {
  id: string;
  requestCode: string;
  requestedQuantityKg: string | number;
  actualReceivedQuantityKg?: string | number | null;
  purpose: string;
  notes?: string;
  status: RequestStatus;
  employeeRemarks?: string;
  managerRemarks?: string;
  createdAt: string;
  manager: Pick<User, 'id' | 'name' | 'email'>;
  employee: Pick<User, 'id' | 'name' | 'email' | 'employeeCode' | 'department'>;
  filament: Filament;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
