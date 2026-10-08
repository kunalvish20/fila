import { useEffect, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Kg, MetricCard, Money, StatusBadge } from '../components/ui';

const DEV_AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true';

const localDashboardData = {
  cards: {
    totalStockKg: 128.75,
    inventoryValue: 412500,
    pendingRequests: 6,
    lowStock: 4,
    outStock: 1,
    issuedKg: 42.25,
    consumedKg: 31.8,
    assignedFilamentKg: 12.5,
    assignedTypes: 5
  },
  monthlyUsage: [
    { month: 'Apr', consumedKg: 18.2 },
    { month: 'May', consumedKg: 24.7 },
    { month: 'Jun', consumedKg: 21.4 },
    { month: 'Jul', consumedKg: 29.9 },
    { month: 'Aug', consumedKg: 35.1 },
    { month: 'Sep', consumedKg: 31.8 }
  ],
  materialStock: [
    { material: 'PLA', stockKg: 52.4 },
    { material: 'PETG', stockKg: 33.6 },
    { material: 'ABS', stockKg: 18.2 },
    { material: 'TPU', stockKg: 9.8 },
    { material: 'Nylon', stockKg: 14.75 }
  ],
  lowStockItems: [
    { id: 'local-1', filamentId: 'FIL-PLA-RED', material: 'PLA', color: 'Red', currentQuantityKg: 1.2, status: 'LOW_STOCK' },
    { id: 'local-2', filamentId: 'FIL-PETG-BLK', material: 'PETG', color: 'Black', currentQuantityKg: 0, status: 'OUT_OF_STOCK' },
    { id: 'local-3', filamentId: 'FIL-TPU-WHT', material: 'TPU', color: 'White', currentQuantityKg: 0.8, status: 'LOW_STOCK' }
  ],
  employeeUsage: [
    { employeeId: 'emp-1', name: 'Aarav Patel', consumedKg: 11.35 },
    { employeeId: 'emp-2', name: 'Neha Sharma', consumedKg: 8.6 },
    { employeeId: 'emp-3', name: 'Rohan Mehta', consumedKg: 6.9 }
  ],
  balances: []
};

function normalizeDashboardData(value: any) {
  const data = value && typeof value === 'object' ? value : {};
  return {
    cards: data.cards && typeof data.cards === 'object' ? data.cards : {},
    monthlyUsage: Array.isArray(data.monthlyUsage) ? data.monthlyUsage : [],
    materialStock: Array.isArray(data.materialStock) ? data.materialStock : [],
    lowStockItems: Array.isArray(data.lowStockItems) ? data.lowStockItems : [],
    employeeUsage: Array.isArray(data.employeeUsage) ? data.employeeUsage : [],
    balances: Array.isArray(data.balances) ? data.balances : []
  };
}

export function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (DEV_AUTH_BYPASS) {
      setData(normalizeDashboardData(localDashboardData));
      setLoading(false);
      return;
    }

    api('/dashboard/stats')
      .then((payload) => setData(normalizeDashboardData(payload)))
      .catch(() => setData(normalizeDashboardData(null)))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="panel">Loading dashboard...</div>;
  if (!data) return <div className="panel">Dashboard data is unavailable.</div>;

  const role = user?.role || 'EMPLOYEE';
  const cards = data.cards || {};
  return <div className="stack">
    <section className="metric-grid">
      {role === 'EMPLOYEE' ? <>
        <MetricCard label="Assigned filament" value={<Kg value={cards.assignedFilamentKg} />} />
        <MetricCard label="Pending requests" value={cards.pendingRequests} />
        <MetricCard label="Consumed" value={<Kg value={cards.consumedKg} />} />
        <MetricCard label="Assigned types" value={cards.assignedTypes} />
      </> : <>
        <MetricCard label="Total warehouse stock" value={<Kg value={cards.totalStockKg} />} />
        <MetricCard label="Inventory value" value={<Money value={cards.inventoryValue} />} />
        <MetricCard label="Pending requests" value={cards.pendingRequests} />
        <MetricCard label="Low / out stock" value={`${cards.lowStock} / ${cards.outStock}`} />
        <MetricCard label="Issued" value={<Kg value={cards.issuedKg} />} />
        <MetricCard label="Consumed" value={<Kg value={cards.consumedKg} />} />
      </>}
    </section>

    <div className="grid-two">
      <section className="panel chart-panel">
        <div className="panel-head"><h2>Monthly consumption</h2><p>Kg consumed by month</p></div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data.monthlyUsage}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Area type="monotone" dataKey="consumedKg" stroke="currentColor" fill="currentColor" fillOpacity={0.14} /></AreaChart>
        </ResponsiveContainer>
      </section>
      {role === 'EMPLOYEE' ? <section className="panel">
        <div className="panel-head"><h2>My assigned balances</h2><p>Filament currently issued to you</p></div>
        <div className="table-wrap"><table><thead><tr><th>Filament</th><th>Material</th><th>Balance</th></tr></thead><tbody>{data.balances.map((b: any) => <tr key={b.id}><td>{b.filament?.filamentId || '-'}</td><td>{b.filament?.material || '-'} / {b.filament?.color || '-'}</td><td><Kg value={b.quantityKg} /></td></tr>)}</tbody></table></div>
      </section> : <section className="panel chart-panel">
        <div className="panel-head"><h2>Material stock value</h2><p>Warehouse balance by material</p></div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.materialStock}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="material" /><YAxis /><Tooltip /><Bar dataKey="stockKg" fill="currentColor" /></BarChart>
        </ResponsiveContainer>
      </section>}
    </div>

    {role !== 'EMPLOYEE' && <div className="grid-two">
      <section className="panel">
        <div className="panel-head"><h2>Low stock watchlist</h2><p>Items needing purchase planning</p></div>
        <div className="table-wrap"><table><thead><tr><th>ID</th><th>Material</th><th>Stock</th><th>Status</th></tr></thead><tbody>{data.lowStockItems.map((f: any) => <tr key={f.id}><td>{f.filamentId}</td><td>{f.material} / {f.color}</td><td><Kg value={f.currentQuantityKg} /></td><td><StatusBadge status={f.status} /></td></tr>)}</tbody></table></div>
      </section>
      <section className="panel">
        <div className="panel-head"><h2>Employee-wise usage</h2><p>Top consumers by kg</p></div>
        <div className="table-wrap"><table><thead><tr><th>Employee</th><th>Consumed</th></tr></thead><tbody>{data.employeeUsage.map((row: any) => <tr key={row.employeeId}><td>{row.name}</td><td><Kg value={row.consumedKg} /></td></tr>)}</tbody></table></div>
      </section>
    </div>}
  </div>;
}
