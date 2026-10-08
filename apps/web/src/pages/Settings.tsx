import { FormEvent, useEffect, useState } from 'react';
import { api, asArray } from '../lib/api';
import { useToast } from '../components/Toast';

export function Settings() {
  const [settings, setSettings] = useState<any[]>([]);
  const [keyName, setKeyName] = useState('company_name');
  const [value, setValue] = useState('3D Printing Studio');
  const toast = useToast();
  async function load() { try { setSettings(asArray<any>(await api<any[]>('/settings'))); } catch (err: any) { setSettings([]); toast.push(err.message || 'Failed to load settings', 'error'); } }
  useEffect(() => { load(); }, []);
  async function submit(e: FormEvent) { e.preventDefault(); try { await api(`/settings/${keyName}`, { method: 'PUT', body: JSON.stringify({ value }) }); toast.push('Setting saved', 'success'); await load(); } catch (err: any) { toast.push(err.message || 'Save failed', 'error'); } }
  return <div className="stack"><section className="panel"><h2>System Settings</h2><p>Store lightweight operational settings. Email and database secrets stay in .env.</p><form className="settings-form" onSubmit={submit}><input placeholder="setting_key" value={keyName} onChange={(e) => setKeyName(e.target.value)} /><input placeholder="value" value={value} onChange={(e) => setValue(e.target.value)} /><button className="primary-btn">Save</button></form></section><section className="panel table-wrap"><table><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>{settings.map((s) => <tr key={s.key}><td>{s.key}</td><td><code>{JSON.stringify(s.value)}</code></td></tr>)}</tbody></table></section></div>;
}
