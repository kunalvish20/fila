import { FormEvent, useEffect, useState } from 'react';
import { api, pageItems, qs } from '../lib/api';
import type { Filament, FilamentRequest, PageResult, User } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { Kg, StatusBadge } from '../components/ui';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

export function Requests() {
  const { user } = useAuth();
  const [rows, setRows] = useState<FilamentRequest[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [status, setStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [actionRequest, setActionRequest] = useState<FilamentRequest | null>(null);
  const [mode, setMode] = useState<'accept'|'reject'>('accept');
  const [form, setForm] = useState({ employeeId: '', filamentId: '', requestedQuantityKg: 0.1, purpose: '', notes: '' });
  const [action, setAction] = useState({ actualReceivedQuantityKg: 0.1, employeeRemarks: '' });
  const toast = useToast();

  async function load() {
    try {
      const data = await api<PageResult<FilamentRequest>>(`/requests${qs({ status, limit: 100 })}`);
      setRows(pageItems<FilamentRequest>(data));
    } catch (err: any) {
      setRows([]);
      toast.push(err.message || 'Failed to load requests', 'error');
    }
  }
  async function loadSupport() {
    if (user!.role !== 'EMPLOYEE') {
      try {
        const [users, fils] = await Promise.all([api<PageResult<User>>('/users?role=EMPLOYEE&limit=100'), api<PageResult<Filament>>('/filaments?limit=100')]);
        const userItems = pageItems<User>(users);
        const filamentItems = pageItems<Filament>(fils);
        setEmployees(userItems); setFilaments(filamentItems); setForm((f) => ({ ...f, employeeId: userItems[0]?.id || '', filamentId: filamentItems[0]?.id || '' }));
      } catch (err: any) {
        setEmployees([]); setFilaments([]);
        toast.push(err.message || 'Failed to load request form data', 'error');
      }
    }
  }
  useEffect(() => { load(); loadSupport(); }, []);

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    try { await api('/requests', { method: 'POST', body: JSON.stringify(form) }); toast.push('Request sent to employee', 'success'); setCreateOpen(false); await load(); }
    catch (err: any) { toast.push(err.message || 'Failed to create request', 'error'); }
  }
  async function submitAction(e: FormEvent) {
    e.preventDefault(); if (!actionRequest) return;
    try {
      await api(`/requests/${actionRequest.id}/${mode}`, { method: 'POST', body: JSON.stringify(action) });
      toast.push(mode === 'accept' ? 'Request accepted and stock issued' : 'Request rejected', 'success');
      setActionRequest(null); await load();
    } catch (err: any) { toast.push(err.message || 'Action failed', 'error'); }
  }

  return <div className="stack">
    <section className="panel toolbar"><div><h2>Manual Requests</h2><p>Manager creates request, employee accepts/rejects and enters actual received quantity.</p></div><div className="toolbar-actions"><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option>PENDING</option><option>ACCEPTED</option><option>REJECTED</option><option>CANCELLED</option></select><button onClick={load}>Filter</button>{user!.role !== 'EMPLOYEE' && <button className="primary-btn" onClick={() => setCreateOpen(true)}>New Request</button>}</div></section>
    <section className="panel table-wrap"><table><thead><tr><th>Code</th><th>Employee</th><th>Filament</th><th>Requested</th><th>Purpose</th><th>Status</th><th>Action</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td><strong>{r.requestCode}</strong><small>{new Date(r.createdAt).toLocaleString()}</small></td><td>{r.employee.name}<small>{r.employee.employeeCode}</small></td><td>{r.filament.filamentId}<small>{r.filament.material} / {r.filament.color}</small></td><td><Kg value={r.requestedQuantityKg} /></td><td>{r.purpose}</td><td><StatusBadge status={r.status} /></td><td>{user!.role === 'EMPLOYEE' && r.status === 'PENDING' ? <div className="inline-actions"><button onClick={() => { setMode('accept'); setActionRequest(r); setAction({ actualReceivedQuantityKg: Number(r.requestedQuantityKg), employeeRemarks: '' }); }}>Accept</button><button className="danger" onClick={() => { setMode('reject'); setActionRequest(r); }}>Reject</button></div> : '-'}</td></tr>)}</tbody></table></section>
    {createOpen && <Modal title="Create Filament Request" onClose={() => setCreateOpen(false)}><form className="form-grid" onSubmit={submitCreate}><label>Employee<select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>{employees.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.employeeCode}</option>)}</select></label><label>Filament<select value={form.filamentId} onChange={(e) => setForm({ ...form, filamentId: e.target.value })}>{filaments.map((f) => <option key={f.id} value={f.id}>{f.filamentId} — {f.material} {f.color} ({Number(f.currentQuantityKg).toFixed(3)}kg)</option>)}</select></label><label>Quantity kg<input type="number" step="0.001" min="0.001" value={form.requestedQuantityKg} onChange={(e) => setForm({ ...form, requestedQuantityKg: Number(e.target.value) })} /></label><label>Purpose / Project<input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} required /></label><label className="span-2">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label><div className="modal-actions"><button type="button" onClick={() => setCreateOpen(false)}>Cancel</button><button className="primary-btn">Submit Request</button></div></form></Modal>}
    {actionRequest && <Modal title={mode === 'accept' ? 'Accept Request' : 'Reject Request'} onClose={() => setActionRequest(null)}><form className="form-grid" onSubmit={submitAction}>{mode === 'accept' && <label>Actual quantity received kg<input type="number" step="0.001" min="0.001" max={Number(actionRequest.requestedQuantityKg)} value={action.actualReceivedQuantityKg} onChange={(e) => setAction({ ...action, actualReceivedQuantityKg: Number(e.target.value) })} /></label>}<label className="span-2">Remarks<textarea value={action.employeeRemarks} onChange={(e) => setAction({ ...action, employeeRemarks: e.target.value })} required={mode === 'reject'} /></label><div className="modal-actions"><button type="button" onClick={() => setActionRequest(null)}>Cancel</button><button className={mode === 'accept' ? 'primary-btn' : 'danger'}>{mode === 'accept' ? 'Accept & Issue Stock' : 'Reject Request'}</button></div></form></Modal>}
  </div>;
}
