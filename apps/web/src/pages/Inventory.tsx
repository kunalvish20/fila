import { FormEvent, useEffect, useState } from 'react';
import { api, pageItems, qs } from '../lib/api';
import type { Filament, PageResult } from '../lib/types';
import { EmptyState, Kg, Money, StatusBadge } from '../components/ui';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

const emptyForm = { filamentId: '', brand: '', material: 'PLA+', color: '', spoolSizeKg: 1, initialQuantityKg: 1, minimumStockKg: 0.2, costPerKg: 1000, supplier: '', batchNumber: '', storageLocation: '', notes: '' };

export function Inventory() {
  const [rows, setRows] = useState<Filament[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function load() {
    try {
      const data = await api<PageResult<Filament>>(`/filaments${qs({ search, status, limit: 50 })}`);
      setRows(pageItems<Filament>(data));
    } catch (err: any) {
      setRows([]);
      toast.push(err.message || 'Failed to load filament inventory', 'error');
    }
  }
  useEffect(() => { load(); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      await api('/filaments', { method: 'POST', body: JSON.stringify(form) });
      toast.push('Filament added successfully', 'success');
      setOpen(false); setForm(emptyForm); await load();
    } catch (err: any) { toast.push(err.message || 'Failed to add filament', 'error'); }
    finally { setLoading(false); }
  }

  return <div className="stack">
    <section className="panel toolbar">
      <div><h2>Filament Inventory</h2><p>Warehouse stock, status and purchase metadata.</p></div>
      <div className="toolbar-actions"><input placeholder="Search filament, brand, batch..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} /><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All status</option><option>AVAILABLE</option><option>LOW_STOCK</option><option>OUT_OF_STOCK</option></select><button onClick={load}>Filter</button><button className="primary-btn" onClick={() => setOpen(true)}>Add Filament</button></div>
    </section>
    <section className="panel table-wrap">
      {rows.length === 0 ? <EmptyState title="No filament found" description="Add opening stock or adjust your filters." /> : <table><thead><tr><th>ID</th><th>Brand</th><th>Material</th><th>Stock</th><th>Min</th><th>Value/kg</th><th>Location</th><th>Status</th></tr></thead><tbody>{rows.map((f) => <tr key={f.id}><td><strong>{f.filamentId}</strong><small>{f.batchNumber}</small></td><td>{f.brand}</td><td>{f.material}<small>{f.color}</small></td><td><Kg value={f.currentQuantityKg} /></td><td><Kg value={f.minimumStockKg} /></td><td><Money value={f.costPerKg} /></td><td>{f.storageLocation || '-'}</td><td><StatusBadge status={f.status} /></td></tr>)}</tbody></table>}
    </section>
    {open && <Modal title="Add Filament" onClose={() => setOpen(false)}><form className="form-grid" onSubmit={submit}>{Object.entries(emptyForm).map(([key]) => <label key={key}>{key}<input value={form[key] ?? ''} type={['spoolSizeKg','initialQuantityKg','minimumStockKg','costPerKg'].includes(key) ? 'number' : 'text'} step="0.001" onChange={(e) => setForm((s: any) => ({ ...s, [key]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }))} required={!['supplier','batchNumber','storageLocation','notes'].includes(key)} /></label>)}<div className="modal-actions"><button type="button" onClick={() => setOpen(false)}>Cancel</button><button className="primary-btn" disabled={loading}>{loading ? 'Saving...' : 'Save filament'}</button></div></form></Modal>}
  </div>;
}
