/**
 * Normalise site name variants to canonical names.
 * Maps common aliases (BHEL-BTPS, BHEL/BTPS, BTPS BELLARY, etc.) to the standard site name.
 */
const SITE_ALIASES: Record<string, string> = {
  'bhel-btps': 'BHEL',
  'bhel/btps': 'BHEL',
  'btps bellary': 'BTPS-Bellary',
  'btps-bellary': 'BTPS-Bellary',
  'btps': 'BTPS-Bellary',
  'bellary': 'BTPS-Bellary',
  'mrpl': 'MRPL',
  'meil': 'MEIL',
  'meil/anpara': 'MEIL',
  'anpara': 'MEIL',
  'upcl': 'UPCL',
  'moxi': 'Moxi',
  'gail': 'GAIL',
  'head office': 'Head Office',
  'ho': 'Head Office',
};

export function normSite(raw: string): string {
  if (!raw) return raw;
  const key = raw.trim().toLowerCase();
  return SITE_ALIASES[key] || raw.trim();
}
