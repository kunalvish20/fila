import type { Status, RequestStatus } from '../lib/types';

export function MetricCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return <div className="metric-card"><span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</div>;
}

export function StatusBadge({ status }: { status: Status | RequestStatus | string }) {
  return <span className={`status status-${status.toLowerCase().replaceAll('_', '-')}`}>{status.replaceAll('_', ' ')}</span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty"><strong>{title}</strong><p>{description}</p></div>;
}

export function Money({ value }: { value: number | string }) {
  return <>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0))}</>;
}

export function Kg({ value }: { value: number | string }) {
  return <>{Number(value || 0).toFixed(3)} kg</>;
}
