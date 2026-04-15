// Centralised API helper — all calls go through here
// In production: VITE_API_URL = https://your-backend.onrender.com
// In dev: Vite proxy forwards /api → http://localhost:3000
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export async function api(method, endpoint, data = null, token = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (data && method !== 'GET') opts.body = JSON.stringify(data);

  const res  = await fetch(`${BASE}${endpoint}`, opts);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

// Formatting helpers
export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function fmtDT(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
export function daysLeft(due) {
  return Math.ceil((new Date(due) - new Date()) / 86_400_000);
}
