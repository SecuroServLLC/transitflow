export function validateLuhn(cardNumber) {
  const digits = cardNumber.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function generateCardNumber() {
  let partial = '4';
  for (let i = 0; i < 14; i++) partial += Math.floor(Math.random() * 10);
  let sum = 0;
  let alt = true;
  for (let i = partial.length - 1; i >= 0; i--) {
    let n = parseInt(partial[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return partial + ((10 - (sum % 10)) % 10);
}

const FIRST = ['James', 'Emma', 'Oliver', 'Sophia', 'William', 'Ava', 'Lucas', 'Isabella', 'Henry', 'Mia'];
const LAST = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Taylor'];

export function generateCardholderName() {
  return `${FIRST[Math.floor(Math.random() * FIRST.length)]} ${LAST[Math.floor(Math.random() * LAST.length)]}`;
}

export function generateExpiry() {
  const year = new Date().getFullYear() + Math.floor(Math.random() * 5) + 1;
  const month = Math.floor(Math.random() * 12) + 1;
  return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;
}

export function generateCVV() {
  return String(Math.floor(Math.random() * 900) + 100);
}

export function formatCardDisplay(num) {
  return num.replace(/(.{4})/g, '$1 ').trim();
}