const KEYS = { credits: 'transit_credits', card: 'transit_card', autocharge: 'transit_autocharge' };

export const TOP_UP_BASE = 500;
export const TOP_UP_BONUS_PERCENT = 25;
export const TOP_UP_TOTAL = 625;

export function getCredits() { return parseInt(localStorage.getItem(KEYS.credits) || '0', 10); }
export function setCredits(n) { localStorage.setItem(KEYS.credits, String(Math.max(0, n))); }
export function addCredits(n) { setCredits(getCredits() + n); }
export function deductCredits(n) {
  const c = getCredits();
  if (c < n) return false;
  setCredits(c - n);
  return true;
}
export function topUp() { addCredits(TOP_UP_TOTAL); return TOP_UP_TOTAL; }

export function getCard() {
  const s = localStorage.getItem(KEYS.card);
  return s ? JSON.parse(s) : null;
}
export function saveCard(card) { localStorage.setItem(KEYS.card, JSON.stringify(card)); }
export function removeCard() { localStorage.removeItem(KEYS.card); }

export function getAutoCharge() { return localStorage.getItem(KEYS.autocharge) === 'true'; }
export function setAutoCharge(v) { localStorage.setItem(KEYS.autocharge, String(v)); }