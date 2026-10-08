import { FormEvent, useEffect, useState } from 'react';
import { api, pageItems } from '../lib/api';
import type { PageResult, User } from '../lib/types';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/ui';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

export function Employees() {
  const { user } = useAuth();
  const [rows, setRows] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: 'Admin@12345', role: 'EMPLOYEE', employeeCode: '', department: '', phone: '' });
  const toast = useToast();
  async function load() { try { const data = await api<PageResult<User>>('/users?limit=100'); setRows(pageItems<User>(data)); } catch (err: any) { setRows([]); toast.push(err.message || 'Failed to load users', 'error'); } }
  useEffect(() => { load(); }, []);
  async function submit(e: FormEvent) { e.preventDefault(); try { await api('/users', { method: 'POST', body: JSON.stringify(form) }); toast.push('User created', 'success'); setOpen(false); await load(); } catch (err: any) { toast.push(err.message || 'Failed to create user', 'error'); } }
  async function toggle(u: User) { try { await api(`/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ active: !u.active }) }); await load(); } catch (err: any) { toast.push(err.message || 'Failed to update user', 'error'); } }
  return <div className="stack"><section className="panel toolbar"><div><h2>Employees & Roles</h2><p>Admin manages users. Managers can view employee records.</p></div>{user!.role === 'ADMIN' && <button className="primary-btn" onClick={() => setOpen(true)}>Add User</button>}</section><section className="panel table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Action</th></tr></thead><tbody>{rows.map((u) => <tr key={u.id}><td><strong>{u.name}</strong><small>{u.employeeCode}</small></td><td>{u.email}</td><td>{u.role}</td><td>{u.department || '-'}</td><td><StatusBadge status={u.active ? 'ACTIVE' : 'INACTIVE'} /></td><td>{user!.role === 'ADMIN' ? <button onClick={() => toggle(u)}>{u.active ? 'Deactivate' : 'Activate'}</button> : '-'}</td></tr>)}</tbody></table></section>{open && <Modal title="Create User" onClose={() => setOpen(false)}><form className="form-grid" onSubmit={submit}><label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label><label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label><label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option>EMPLOYEE</option><option>MANAGER</option><option>ADMIN</option></select></label><label>Employee Code<input value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} /></label><label>Department<input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label><label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><div className="modal-actions"><button type="button" onClick={() => setOpen(false)}>Cancel</button><button className="primary-btn">Create</button></div></form></Modal>}</div>;
}
