// Unified, intelligent auth: detect role from username prefix and route accordingly.
//   DRVR-<username>  -> driver      (password = access_code)
//   INSP-<badge_id>  -> inspector   (password = pin)
//   TVM-<machine_id>  -> ticket machine (password = access_pin, 12 digits)
//   ADM[-<user>]      -> admin       (password = admin password)
//   <phone|email>     -> passenger   (password = customer password)

const UNIFIED_KEY = 'transit_unified_session';

export function getUnifiedSession() {
  try { return JSON.parse(localStorage.getItem(UNIFIED_KEY)); } catch { return null; }
}

export function setUnifiedSession(data) {
  localStorage.setItem(UNIFIED_KEY, JSON.stringify(data));
}

export function clearUnifiedSession() {
  localStorage.removeItem(UNIFIED_KEY);
}

export function detectRole(raw) {
  const id = (raw || '').trim();
  if (!id) return { role: null, id: '' };
  const upper = id.toUpperCase();
  if (upper.startsWith('DRVR-')) return { role: 'driver', id: id.slice(5).trim() };
  if (upper.startsWith('INSP-')) return { role: 'inspector', id: id.slice(5).trim() };
  if (upper.startsWith('TVM-')) return { role: 'tvm', id: id.slice(4).trim() };
  if (upper.startsWith('ADM')) {
    const rest = id.slice(3).replace(/^[-\s]/, '').trim();
    return { role: 'admin', id: rest || 'admin' };
  }
  return { role: 'passenger', id };
}

export const ROLE_META = {
  driver:     { label: 'Sjåfør',            icon: '🚌',  color: '#3b82f6', idHint: 'DRVR-brukernavn',    passLabel: 'Tilgangskode',      passPlaceholder: 'Tilgangskode' },
  inspector:  { label: 'Inspektør',         icon: '🛡️', color: '#f59e0b', idHint: 'INSP-skilt-ID',      passLabel: 'PIN',               passPlaceholder: 'PIN-kode' },
  tvm:        { label: 'Billettautomat',    icon: '🎫', color: '#10b981', idHint: 'TVM-maskin-ID',      passLabel: 'Tilgangs-PIN',      passPlaceholder: '12-sifret PIN' },
  admin:      { label: 'Administrator',     icon: '⚙️', color: '#c0392b', idHint: 'ADM',                 passLabel: 'Passord',           passPlaceholder: 'Passord' },
  passenger:  { label: 'Passasjer',         icon: '📱', color: '#8b5cf6', idHint: 'Telefon eller e-post', passLabel: 'Passord',          passPlaceholder: 'Passord' },
};

export const ROLE_ROUTES = {
  passenger: '/app',
  driver: '/driver',
  inspector: '/inspect',
  tvm: '/tvm',
  admin: '/admin',
};