import type { PageResult } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export class ApiClientError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function getToken() {
  return localStorage.getItem('filament_token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('filament_token', token);
  else localStorage.removeItem('filament_token');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    throw new ApiClientError(res.status, payload?.message || 'Request failed', payload?.details || payload?.errors);
  }
  return payload as T;
}

export const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
};

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

export function pageItems<T>(value: PageResult<T> | T[] | unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items)) {
    return (value as PageResult<T>).items;
  }
  return [];
}
