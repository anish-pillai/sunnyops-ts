/** Format number as Indian Rupees: 1234567 → "₹12,34,567" */
export function fmtINR(val: number | null | undefined): string {
  if (val == null) return '—';
  return '₹' + Math.round(val).toLocaleString('en-IN');
}

/** Format number: 1234567 → "12,34,567" */
export function fmtNum(val: number | null | undefined): string {
  if (val == null) return '—';
  return Math.round(val).toLocaleString('en-IN');
}

/** Compact INR: 1500000 → "₹15L", 75000 → "₹75K" */
export function fmtINRCompact(val: number): string {
  if (val >= 10_00_000) return '₹' + (val / 10_00_000).toFixed(1) + 'L';
  if (val >= 1_000)     return '₹' + (val / 1_000).toFixed(1) + 'K';
  return '₹' + Math.round(val).toLocaleString('en-IN');
}

/** Format date: "2026-03-15" → "15-Mar-2026" */
export function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/** Format datetime: "2026-03-15T10:30:00Z" → "15-Mar-2026, 10:30 AM" */
export function fmtDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Get current financial year: "2025-26" */
export function getFinYear(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const y = d.getFullYear();
  const m = d.getMonth(); // 0=Jan
  return m >= 3
    ? `${y}-${String(y + 1).slice(2)}`
    : `${y - 1}-${String(y).slice(2)}`;
}

/** Mask Aadhar — show only last 4 digits */
export function maskAadhar(aadhar: string | null | undefined): string {
  if (!aadhar || aadhar.length < 4) return '••••';
  return '••••' + aadhar.slice(-4);
}

/** Today's date as YYYY-MM-DD */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** Parse assigned_sites from Supabase (handles different formats) */
export function parseAssignedSites(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === 'string') {
    if (raw.startsWith('[')) {
      try { return JSON.parse(raw) as string[]; } catch { /* fall through */ }
    }
    return raw.replace(/[{}"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}
