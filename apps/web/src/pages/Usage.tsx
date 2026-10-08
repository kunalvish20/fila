import { FormEvent, useEffect, useState } from 'react';
import { api, asArray, pageItems, qs } from '../lib/api';
import { Kg } from '../components/ui';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import type { PageResult, User } from '../lib/types';

export function Usage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(user!.id);
  const [form, setForm] = useState({ filamentId: '', projectOrderId: '', quantityUsedKg: 0.05, notes: '' });
  const toast = useToast();
  async function load() { try { const data = await api<PageResult<any>>('/usage?limit=100'); setRows(pageItems<any>(data)); } catch (err: any) { setRows([]); toast.push(err.message || 'Failed to load usage records', 'error'); } }
  async function loadBalances(id = employeeId) { try { const data = await api<any[]>(`/usage/balances${qs({ employeeId: user!.role === 'EMPLOYEE' ? undefined : id })}`); const items = asArray<any>(data); setBalances(items); setForm((f) => ({ ...f, filamentId: items[0]?.filamentId || '' })); } catch (err: any) { setBalances([]); toast.push(err.message || 'Failed to load filament balances', 'error'); } }
  useEffect(() => { load(); loadBalances(); if (user!.role !== 'EMPLOYEE') api<PageResult<User>>('/users?role=EMPLOYEE&limit=100').then((r) => { const items = pageItems<User>(r); setEmployees(items); setEmployeeId(items[0]?.id || user!.id); }).catch((err: any) => { setEmployees([]); toast.push(err.message || 'Failed to load employees', 'error'); }); }, []);
  useEffect(() => { if (user!.role !== 'EMPLOYEE' && employeeId) loadBalances(employeeId); }, [employeeId]);
  async function submit(e: FormEvent) { e.preventDefault(); try { await api('/usage', { method: 'POST', body: JSON.stringify({ ...form, employeeId: user!.role === 'EMPLOYEE' ? undefined : employeeId }) }); toast.push('Usage recorded', 'success'); setOpen(false); await load(); await loadBalances(employeeId); } catch (err: any) { toast.push(err.message || 'Failed to record usage', 'error'); } }
  return <div className="stack"><section className="panel toolbar"><div><h2>Usage Tracking</h2><p>Record project/order consumption from issued employee balances.</p></div><button className="primary-btn" onClick={() => setOpen(true)}>Record Usage</button></section><section className="panel table-wrap"><table><thead><tr><th>Date</th><th>Employee</th><th>Project / Order</th><th>Filament</th><th>Used</th><th>Remaining</th><th>Notes</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{new Date(r.usedAt).toLocaleString()}</td><td>{r.employee.name}</td><td>{r.projectOrderId}</td><td>{r.filament.filamentId}<small>{r.filament.material} / {r.filament.color}</small></td><td><Kg value={r.quantityUsedKg} /></td><td><Kg value={r.remainingQuantityKg} /></td><td>{r.notes || '-'}</td></tr>)}</tbody></table></section>{open && <Modal title="Record Filament Usage" onClose={() => setOpen(false)}><form className="form-grid" onSubmit={submit}>{user!.role !== 'EMPLOYEE' && <label>Employee<select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>{employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>}<label>Filament balance<select value={form.filamentId} onChange={(e) => setForm({ ...form, filamentId: e.target.value })}>{balances.map((b) => <option key={b.id} value={b.filamentId}>{b.filament.filamentId} — {Number(b.quantityKg).toFixed(3)}kg left</option>)}</select></label><label>Project / Order ID<input value={form.projectOrderId} onChange={(e) => setForm({ ...form, projectOrderId: e.target.value })} required /></label><label>Quantity used kg<input type="number" step="0.001" min="0.001" value={form.quantityUsedKg} onChange={(e) => setForm({ ...form, quantityUsedKg: Number(e.target.value) })} /></label><label className="span-2">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label><div className="modal-actions"><button type="button" onClick={() => setOpen(false)}>Cancel</button><button className="primary-btn">Save Usage</button></div></form></Modal>}</div>;
}
