import { useEffect, useState } from 'react';
import { api, asArray } from '../lib/api';
import { useToast } from '../components/Toast';

export function Notifications() {
  const [rows, setRows] = useState<any[]>([]);
  const toast = useToast();
  async function load() { try { setRows(asArray<any>(await api<any[]>('/notifications'))); } catch (err: any) { setRows([]); toast.push(err.message || 'Failed to load notifications', 'error'); } }
  useEffect(() => { load(); }, []);
  async function readAll() { await api('/notifications/read-all', { method: 'POST' }); toast.push('Notifications marked as read', 'success'); await load(); }
  return <div className="stack"><section className="panel toolbar"><div><h2>Notifications</h2><p>Request updates, low stock and important inventory changes.</p></div><button onClick={readAll}>Mark all read</button></section><section className="notification-list">{rows.map((n) => <article key={n.id} className={`notification-card ${n.readAt ? 'read' : ''}`}><div><strong>{n.title}</strong><p>{n.message}</p><small>{new Date(n.createdAt).toLocaleString()}</small></div>{!n.readAt && <button onClick={async () => { await api(`/notifications/${n.id}/read`, { method: 'PATCH' }); await load(); }}>Mark read</button>}</article>)}</section></div>;
}
