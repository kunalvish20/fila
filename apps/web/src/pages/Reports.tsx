import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { Kg, Money } from '../components/ui';

export function Reports() {
  const [summary, setSummary] = useState<any>(null);
  const [value, setValue] = useState<any>(null);
  useEffect(() => { Promise.all([api('/reports/summary'), api('/reports/inventory-value')]).then(([s, v]) => { setSummary(s); setValue(v); }); }, []);
  return <div className="stack"><section className="metric-grid"><div className="metric-card"><span>Total Inventory Value</span><strong><Money value={value?.totalValue || 0} /></strong></div><div className="metric-card"><span>Total Stock</span><strong><Kg value={value?.totalStockKg || 0} /></strong></div></section><div className="grid-two"><section className="panel chart-panel"><div className="panel-head"><h2>Usage by Employee</h2></div><ResponsiveContainer width="100%" height={280}><BarChart data={summary?.usageByEmployee || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="employee.name" /><YAxis /><Tooltip /><Bar dataKey="consumedKg" fill="currentColor" /></BarChart></ResponsiveContainer></section><section className="panel chart-panel"><div className="panel-head"><h2>Usage by Material</h2></div><ResponsiveContainer width="100%" height={280}><BarChart data={summary?.usageByMaterial || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="material" /><YAxis /><Tooltip /><Bar dataKey="consumedKg" fill="currentColor" /></BarChart></ResponsiveContainer></section></div><section className="panel table-wrap"><h2>Inventory Value by Material</h2><table><thead><tr><th>Material</th><th>Stock</th><th>Value</th></tr></thead><tbody>{value?.byMaterial?.map((m: any) => <tr key={m.material}><td>{m.material}</td><td><Kg value={m.stockKg} /></td><td><Money value={m.value} /></td></tr>)}</tbody></table></section></div>;
}
