const KEYS = {
  credits: 'transit_credits',
  card: 'transit_card',
  autocharge: 'transit_autocharge',
};

export const TOP_UP_BASE = 500;
export const TOP_UP_TOTAL = 625; // 500 + 25% bonus

export function getCredits() {
  return parseInt(localStorage.getItem(KEYS.credits) || '0', 10);
}

export function setCredits(amount) {
  localStorage.setItem(KEYS.credits, String(Math.max(0, amount)));
}

export function addCredits(amount) {
  setCredits(getCredits() + amount);
}

export function deductCredits(amount) {
  const current = getCredits();
  if (current < amount) return false;
  setCredits(current - amount);
  return true;
}

export function topUp() {
  addCredits(TOP_UP_TOTAL);
  return TOP_UP_TOTAL;
}

export function getCard() {
  const stored = localStorage.getItem(KEYS.card);
  return stored ? JSON.parse(stored) : null;
}

export function saveCard(card) {
  localStorage.setItem(KEYS.card, JSON.stringify(card));
}

export function getAutoCharge() {
  return localStorage.getItem(KEYS.autocharge) === 'true';
}

export function setAutoCharge(value) {
  localStorage.setItem(KEYS.autocharge, String(value));
}