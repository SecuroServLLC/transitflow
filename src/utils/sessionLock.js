// "Remember me" + quick-unlock layer.
// localStorage holds who last logged in (persists like a cookie across tabs/closes).
// sessionStorage holds an "unlocked" flag for the current tab — cleared on tab close,
// so returning visitors re-confirm with just their PIN/code.

const REMEMBER_KEY = 'transit_remember';
const UNLOCKED_KEY = 'transit_unlocked';

export function getRemember() {
  try { return JSON.parse(localStorage.getItem(REMEMBER_KEY)); } catch { return null; }
}
export function setRemember(data) {
  localStorage.setItem(REMEMBER_KEY, JSON.stringify(data));
}
export function clearRemember() {
  localStorage.removeItem(REMEMBER_KEY);
}

export function isUnlocked() {
  return sessionStorage.getItem(UNLOCKED_KEY) === '1';
}
export function setUnlocked() {
  sessionStorage.setItem(UNLOCKED_KEY, '1');
}
export function clearUnlocked() {
  sessionStorage.removeItem(UNLOCKED_KEY);
}