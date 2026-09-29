// Tegner billetter til et 384px bredt canvas (58mm termalprinter = 384 dots).
// Brukes for direkte WebUSB-utskrift (ESC/POS raster).
import bwipjs from 'bwip-js';

const W = 384;
const TYPE_LABEL = { adult: 'Voksen', child: 'Barn', senior: 'Honnør', student: 'Student', military: 'Forsvar' };
const CAT_LABEL = { single: 'Enkelt', period: '30-dager' };
const COMPANY = [
  'LST · TestTransit AS',
  '123 456 789 MVA',
  'Foretaksregisteret',
  'Kundeservice +47 987 65 000',
  'post@bussen.local',
];

function pdf417DataURL(text) {
  const c = document.createElement('canvas');
  bwipjs.toCanvas(c, {
    bcid: 'pdf417', text,
    scale: 3, height: 10, columns: 3, eclevel: 5,
    paddingwidth: 8, paddingheight: 8,
  });
  return c.toDataURL('image/png');
}
function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}
function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(-2)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function money(n) {
  return `${String(n).replace('.', ',')} kr`;
}
function mvaOf(kr) {
  return Math.round(kr * 0.2 * 100) / 100;
}

function newCtx() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = 1100;
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.fillRect(0, 0, W, c.height);
  x.fillStyle = '#000';
  x.textAlign = 'center';
  x.textBaseline = 'top';
  return { c, x };
}
function trim(c, y) {
  const n = document.createElement('canvas');
  n.width = W;
  n.height = y + 8;
  n.getContext('2d').drawImage(c, 0, 0, W, y + 8);
  return n;
}
function hr(x, y) {
  x.fillRect(14, y, W - 28, 2);
  return y + 6;
}
function box(x, y, w, h) {
  x.strokeStyle = '#000';
  x.lineWidth = 2;
  x.strokeRect((W - w) / 2, y, w, h);
}

function footer(x, y) {
  y = hr(x, y);
  x.textAlign = 'center';
  x.font = '700 11px Arial';
  COMPANY.forEach((line) => {
    x.fillText(line, W / 2, y);
    y += 14;
  });
  y += 2;
  x.fillText('Vis koden ved kontroll. Billetten er personlig.', W / 2, y);
  y += 14;
  return y;
}

export async function drawTicketCanvas(ticket) {
  const { c, x } = newCtx();
  let y = 10;
  x.font = '900 40px Arial';
  x.fillText('LST', W / 2, y);
  y += 42;
  x.font = '700 11px Arial';
  x.fillText('KOLLEKTIVTRAFIKK', W / 2, y);
  y += 16;
  y = hr(x, y);
  x.font = '900 18px Arial';
  x.fillText('REISEBILLETT', W / 2, y);
  y += 22;
  y = hr(x, y);
  x.font = '900 18px Arial';
  x.fillText(`${TYPE_LABEL[ticket.type] || ticket.type} · ${CAT_LABEL[ticket.ticket_category] || ticket.ticket_category}`, W / 2, y);
  y += 22;
  x.font = '900 32px Arial';
  x.fillText(money(ticket.kr_paid), W / 2, y);
  y += 34;
  const img = await loadImg(pdf417DataURL(ticket.qr_token));
  const iw = 260; // ~34mm på 384-dot 58mm-printer — plass til marger
  const ih = Math.round((iw * img.height) / img.width);
  x.drawImage(img, Math.round((W - iw) / 2), y, iw, ih);
  y += ih + 6;
  x.font = '900 24px Arial';
  x.fillText(ticket.short_code, W / 2, y);
  y += 28;
  y = hr(x, y);
  x.textAlign = 'left';
  x.font = '700 13px Arial';
  x.fillText(`Gyldig fra: ${fmt(ticket.purchased_at)}`, 14, y);
  y += 16;
  x.fillText(`Gyldig til: ${fmt(ticket.valid_until)}`, 14, y);
  y += 16;
  x.fillText(`Selger: ${ticket.issued_by || 'Sjåfør'}`, 14, y);
  y += 16;
  x.textAlign = 'right';
  x.font = '700 12px Arial';
  x.fillText(`Inkl. 25% MVA: ${money(mvaOf(ticket.kr_paid))}`, W - 14, y);
  y += 18;
  x.textAlign = 'center';
  if (ticket.type && ticket.type !== 'adult') {
    y = hr(x, y);
    box(x, y, W - 28, 54);
    x.font = '900 13px Arial';
    x.fillText('RABATT — KREVER BEVIS', W / 2, y + 4);
    x.font = '700 11px Arial';
    x.fillText('Gyldig ID/bevis må vises ved kontroll', W / 2, y + 21);
    x.font = '900 12px Arial';
    x.fillText('Mangler bevis: gebyr 1150 kr', W / 2, y + 37);
    y += 60;
  }
  y = footer(x, y);
  return trim(c, y);
}

export async function drawCombinedCanvas(tickets) {
  const { c, x } = newCtx();
  let y = 10;
  x.font = '900 40px Arial';
  x.fillText('LST', W / 2, y);
  y += 42;
  x.font = '700 11px Arial';
  x.fillText('KOLLEKTIVTRAFIKK', W / 2, y);
  y += 16;
  y = hr(x, y);
  x.font = '900 18px Arial';
  x.fillText(`REISEBILLETT × ${tickets.length}`, W / 2, y);
  y += 22;
  y = hr(x, y);
  for (const t of tickets) {
    const img = await loadImg(pdf417DataURL(t.qr_token));
    const iw = 220;
    const ih = Math.round((iw * img.height) / img.width);
    const blockH = 24 + ih + 22;
    box(x, y, W - 28, blockH);
    x.font = '900 15px Arial';
    x.fillText(`${TYPE_LABEL[t.type] || t.type} · ${CAT_LABEL[t.ticket_category] || t.ticket_category}`, W / 2, y + 4);
    x.font = '700 12px Arial';
    x.fillText(money(t.kr_paid), W / 2, y + 22);
    x.drawImage(img, (W - iw) / 2, y + 40, iw, ih);
    x.font = '900 16px Arial';
    x.fillText(t.short_code, W / 2, y + 40 + ih + 2);
    y += blockH + 4;
  }
  y = hr(x, y);
  const total = tickets.reduce((s, t) => s + (t.kr_paid || 0), 0);
  x.font = '900 16px Arial';
  x.fillText(`Total: ${money(total)}`, W / 2, y);
  y += 20;
  x.font = '700 12px Arial';
  x.fillText(`Inkl. 25% MVA: ${money(mvaOf(total))}`, W / 2, y);
  y += 16;
  x.fillText(`Periode: ${fmt(tickets[0].purchased_at)} – ${fmt(tickets[tickets.length - 1].valid_until)}`, W / 2, y);
  y += 16;
  x.fillText(`Selger: ${tickets[0].issued_by || 'Sjåfør'}`, W / 2, y);
  y += 18;
  if (tickets.some((t) => t.type && t.type !== 'adult')) {
    y = hr(x, y);
    box(x, y, W - 28, 54);
    x.font = '900 13px Arial';
    x.fillText('RABATT — KREVER BEVIS', W / 2, y + 4);
    x.font = '700 11px Arial';
    x.fillText('Gyldig ID/bevis må vises ved kontroll', W / 2, y + 21);
    x.font = '900 12px Arial';
    x.fillText('Mangler bevis: gebyr 1150 kr', W / 2, y + 37);
    y += 60;
  }
  y = footer(x, y);
  return trim(c, y);
}