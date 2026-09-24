const SESSION_KEY = 'transit_customer_v3';

export function getCustomerSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

export function setCustomerSession(customer) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    id: customer.id,
    name: customer.name,
    email: customer.email || '',
    phone: customer.phone || '',
    pin: customer.pin || '',
    credits: customer.credits || 0,
    credit_cards: customer.credit_cards || '',
    connected_users: customer.connected_users || '',
    vehicles: customer.vehicles || ''
  }));
}

export function clearCustomerSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Default login code: first 2 + last 2 digits of the phone number.
export function derivePin(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length < 4) return '';
  return d.slice(0, 2) + d.slice(-2);
}

// Effective login code: a stored PIN takes precedence over the phone-derived one.
export function effectivePin(customer) {
  const stored = String(customer?.pin || '').trim();
  if (stored.length >= 4) return stored;
  return derivePin(customer?.phone || '');
}

// Validates a login code. `source` may be a customer record (uses stored pin,
// then derived) or a plain phone string (derived only).
export function validatePin(source, pin) {
  const p = String(pin || '').trim();
  if (!p) return false;
  if (source && typeof source === 'object') {
    const stored = String(source.pin || '').trim();
    if (stored.length >= 4) return stored === p;
    return derivePin(source.phone) === p;
  }
  return derivePin(source) === p;
}

export function safeJSON(val, fallback = []) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

export function genShortCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function genTicketId() {
  const prefix = 'TT';
  const ts = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}