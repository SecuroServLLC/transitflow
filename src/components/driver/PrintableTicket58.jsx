import bwipjs from 'bwip-js';
import { toast } from 'sonner';
import { drawTicketCanvas, drawCombinedCanvas } from '@/utils/thermalCanvas';
import { printCanvas, getPrinter } from '@/utils/directPrint';

const LOGO_URL = 'https://media.base44.com/images/public/6a1cc945ce9fabc4f8162a85/e3254d40a_latest-1224696648.webp';
const TYPE_LABEL = { adult: 'Voksen', child: 'Barn', senior: 'Honnør', student: 'Student', military: 'Forsvar' };
const CAT_LABEL = { single: 'Enkelt', period: '30-dager' };

const COMPANY_FOOTER = `
<div class="hr"></div>
<div class="co">
  <div class="co-n">LST · TestTransit AS</div>
  <div class="co-l">123 456 789 MVA</div>
  <div class="co-l">Foretaksregisteret</div>
  <div class="co-l">Kundeservice +47 987 65 000</div>
  <div class="co-l">post@bussen.local</div>
</div>`;

const fmt = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(-2)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const mvaOf = (kr) => Math.round(kr * 0.2 * 100) / 100;
const money = (n) => `${String(n).replace('.', ',')} kr`;

function pdf417DataURL(text) {
  const c = document.createElement('canvas');
  // Kompakt, balansert PDF417 som passer 58mm: færre kolonner + høyere rader,
  // god feilkorreksjon. Skalert til ~40mm bred på termalpaper.
  bwipjs.toCanvas(c, {
    bcid: 'pdf417', text,
    scale: 3, height: 10, columns: 3, eclevel: 5,
    paddingwidth: 8, paddingheight: 8,
  });
  return c.toDataURL('image/png');
}

function baseStyles() {
  return `
@page { size: 58mm auto; margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { width: 58mm; margin: 0; padding: 1.5mm 1mm; font-family: Arial, Helvetica, sans-serif; color:#000; background:#fff; font-weight:700; }
.t { text-align:center; }
.lockup { border:3px solid #000; border-radius:2mm; padding:1.5mm 2mm; display:inline-block; }
.logo-img { height:11mm; display:block; margin:0 auto 0.5mm; }
.logo-txt { font-weight:900; font-size:24px; letter-spacing:3px; line-height:1; }
.logo-sub { font-size:9px; font-weight:900; letter-spacing:1.5px; }
.title { font-size:15px; font-weight:900; letter-spacing:1px; }
.hr { border-top:2px solid #000; margin:1.5mm 0; }
.type { font-size:18px; font-weight:900; text-transform:uppercase; }
.price { font-size:34px; font-weight:900; margin:1mm 0; line-height:1; }
.qr { text-align:center; margin:1.5mm 0; }
.qr img { width:40mm; max-width:100%; height:auto; image-rendering:pixelated; }
.code { font-size:30px; font-weight:900; letter-spacing:5px; }
.row { display:flex; justify-content:space-between; font-size:13px; font-weight:800; margin:0.6mm 0; }
.fromto { border:2px solid #000; border-radius:2mm; padding:1mm 1.5mm; margin:1.5mm 0; }
.fromto .row { font-size:14px; }
.mva { font-size:12px; font-weight:800; text-align:right; margin:0.5mm 0; }
.notice { border:3px solid #000; border-radius:2mm; padding:1.5mm; margin:1.5mm 0; text-align:center; }
.notice-h { font-size:14px; font-weight:900; letter-spacing:1px; margin-bottom:0.8mm; }
.notice-b { font-size:12px; font-weight:800; line-height:1.4; }
.notice-f { font-size:13px; font-weight:900; margin-top:0.8mm; line-height:1.3; }
.co { text-align:center; }
.co-n { font-size:12px; font-weight:900; }
.co-l { font-size:11px; font-weight:700; line-height:1.4; }
.foot { font-size:12px; font-weight:800; text-align:center; margin-top:1.5mm; line-height:1.4; }
.tid { font-size:10px; font-weight:700; text-align:center; margin-top:1mm; }
.tk { border:2px solid #000; border-radius:2mm; padding:1.5mm; margin:1.5mm 0; }
.tk .tk-type { font-size:14px; font-weight:900; text-transform:uppercase; }
.tk .tk-row { display:flex; justify-content:space-between; font-size:12px; font-weight:800; }
.tk .tk-code { font-size:18px; font-weight:900; letter-spacing:3px; text-align:center; margin-top:0.5mm; }
.tk .tk-qr { text-align:center; margin:0.5mm 0; }
.tk .tk-qr img { width:34mm; max-width:100%; height:auto; image-rendering:pixelated; }
.total { border:3px solid #000; border-radius:2mm; padding:1mm 1.5mm; margin:1.5mm 0; }
.total .row { font-size:15px; font-weight:900; }`;
}
function logoBlock() {
  return `<div class="t">
  <div class="lockup">
    <img class="logo-img" src="${LOGO_URL}" alt="LST" />
    <div class="logo-txt">LST</div>
    <div class="logo-sub">KOLLEKTIVTRAFIKK</div>
  </div>
</div>`;
}
function discountNotice(ticket) {
  const isDiscount = ticket.type && ticket.type !== 'adult';
  return isDiscount
    ? `<div class="notice">
  <div class="notice-h">RABATT — KREVER BEVIS</div>
  <div class="notice-b">Gyldig ID / bevis på rabatt<br>må vises ved kontroll.</div>
  <div class="notice-f">Mangler bevis:<br>gebyr 1150 kr.</div>
</div>`
    : '';
}

function openPrintWindow(html) {
  const w = window.open('', '_blank', 'width=420,height=720');
  if (!w) {
    toast.error('Tillat pop-up-vindu for utskrift');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

// Én billett per lapp — direkte til USB-printer hvis tilkoblet, ellers utskriftsdialog.
export async function printTicket58(ticket) {
  if (!ticket) return;
  if (getPrinter()) {
    try {
      const canvas = await drawTicketCanvas(ticket);
      await printCanvas(canvas);
      return;
    } catch (e) {
      toast.error('Direkte-utskrift feilet – bruker utskriftsdialog');
    }
  }
  const pdf = pdf417DataURL(ticket.qr_token);
  const fromStr = fmt(ticket.purchased_at);
  const toStr = fmt(ticket.valid_until);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Billett ${ticket.short_code}</title>
<style>${baseStyles()}</style></head><body>
${logoBlock()}
<div class="t title" style="margin-top:1.5mm;">REISEBILLETT</div>
<div class="hr"></div>
<div class="t type">${TYPE_LABEL[ticket.type] || ticket.type} · ${CAT_LABEL[ticket.ticket_category] || ticket.ticket_category}</div>
<div class="t price">${money(ticket.kr_paid)}</div>
<div class="qr"><img src="${pdf}" alt="PDF417" /></div>
<div class="t code">${ticket.short_code}</div>
<div class="hr"></div>
<div class="fromto">
  <div class="row"><span>Gyldig fra</span><span>${fromStr}</span></div>
  <div class="row"><span>Gyldig til</span><span>${toStr}</span></div>
</div>
<div class="row"><span>Selger</span><span>${ticket.issued_by || 'Sjåfør'}</span></div>
<div class="mva">Inkl. 25% MVA: ${money(mvaOf(ticket.kr_paid))}</div>
${discountNotice(ticket)}
${COMPANY_FOOTER}
<div class="foot">Vis koden ved kontroll.<br>Billetten er personlig.</div>
<div class="tid">${ticket.ticket_id}</div>
<script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
</body></html>`;
  openPrintWindow(html);
}

// Flere billetter samlet på én lapp.
export async function printCombined58(tickets) {
  if (!tickets?.length) return;
  if (getPrinter()) {
    try {
      const canvas = await drawCombinedCanvas(tickets);
      await printCanvas(canvas);
      return;
    } catch (e) {
      toast.error('Direkte-utskrift feilet – bruker utskriftsdialog');
    }
  }
  const total = tickets.reduce((s, t) => s + (t.kr_paid || 0), 0);
  const mva = mvaOf(total);
  const hasDiscount = tickets.some((t) => t.type && t.type !== 'adult');
  const fromStr = fmt(tickets[0].purchased_at);
  const toStr = fmt(tickets[tickets.length - 1].valid_until);
  const items = tickets
    .map((t) => {
      const pdf = pdf417DataURL(t.qr_token);
      return `<div class="tk">
  <div class="tk-type">${TYPE_LABEL[t.type] || t.type} · ${CAT_LABEL[t.ticket_category] || t.ticket_category}</div>
  <div class="tk-row"><span>Pris</span><span>${money(t.kr_paid)}</span></div>
  <div class="tk-qr"><img src="${pdf}" alt="PDF417" /></div>
  <div class="tk-code">${t.short_code}</div>
  <div class="tk-row"><span>Gyldig</span><span>${fmt(t.purchased_at)} – ${fmt(t.valid_until)}</span></div>
</div>`;
    })
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Billetter ${tickets.length}</title>
<style>${baseStyles()}</style></head><body>
${logoBlock()}
<div class="t title" style="margin-top:1.5mm;">REISEBILLETT × ${tickets.length}</div>
<div class="hr"></div>
${items}
<div class="hr"></div>
<div class="total">
  <div class="row"><span>Total</span><span>${money(total)}</span></div>
  <div class="row" style="font-size:12px;font-weight:800;"><span>Inkl. 25% MVA</span><span>${money(mva)}</span></div>
  <div class="row" style="font-size:12px;font-weight:800;"><span>Periode</span><span>${fromStr}–${toStr}</span></div>
  <div class="row" style="font-size:12px;font-weight:800;"><span>Selger</span><span>${tickets[0].issued_by || 'Sjåfør'}</span></div>
</div>
${hasDiscount ? `<div class="notice">
  <div class="notice-h">RABATT — KREVER BEVIS</div>
  <div class="notice-b">Gyldig ID / bevis på rabatt<br>må vises ved kontroll.</div>
  <div class="notice-f">Mangler bevis:<br>gebyr 1150 kr.</div>
</div>` : ''}
${COMPANY_FOOTER}
<div class="foot">Vis koden ved kontroll.<br>Billetten er personlig.</div>
<script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
</body></html>`;
  openPrintWindow(html);
}