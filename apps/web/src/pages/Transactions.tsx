import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { PageResult } from '../lib/types';
import { Kg } from '../components/ui';

export function Transactions() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api<PageResult<any>>('/transactions?limit=100').then((r) => setRows(r.items)); }, []);
  return <div className="stack"><section className="panel"><h2>Immutable Transaction History</h2><p>Every stock issue, usage consumption and adjustment is recorded here.</p></section><section className="panel table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Filament</th><th>Qty</th><th>Warehouse</th><th>Employee Balance</th><th>Actor</th><th>Reason</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{new Date(r.createdAt).toLocaleString()}</td><td>{r.type}</td><td>{r.filament.filamentId}</td><td><Kg value={r.quantityKg} /></td><td>{r.warehousePreviousQtyKg !== null && r.warehousePreviousQtyKg !== undefined ? `${Number(r.warehousePreviousQtyKg).toFixed(3)} → ${Number(r.warehouseNewQtyKg).toFixed(3)}kg` : '-'}</td><td>{r.employeePreviousBalanceKg !== null && r.employeePreviousBalanceKg !== undefined ? `${Number(r.employeePreviousBalanceKg).toFixed(3)} → ${Number(r.employeeNewBalanceKg).toFixed(3)}kg` : '-'}</td><td>{r.actor?.name || '-'}</td><td>{r.reason}</td></tr>)}</tbody></table></section></div>;
}
