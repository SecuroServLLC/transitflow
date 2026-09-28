import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

// 58mm termobillett — svart/hvitt, tykk skrift, ingen fargeblokker (sparer termopapir).
const LOGO_URL = 'https://media.base44.com/images/public/6a1cc945ce9fabc4f8162a85/e3254d40a_latest-1224696648.webp';

const TYPE_LABEL = { adult: 'Voksen', child: 'Barn', senior: 'Honnør', student: 'Student', military: 'Forsvar' };
const CAT_LABEL = { single: 'Enkelt', period: '30-dager' };

const fmt = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(-2)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function printTicket58(ticket) {
  if (!ticket) return;
  const qr = renderToStaticMarkup(<QRCodeSVG value={ticket.qr_token} size={140} level="M" includeMargin={false} />);
  const fromStr = fmt(ticket.purchased_at);
  const toStr = fmt(ticket.valid_until);
  const isDiscount = ticket.type && ticket.type !== 'adult';
  const notice = isDiscount
    ? `<div class="hr"></div>
<div class="notice">
  <div class="notice-h">RABATT — KREVER BEVIS</div>
  <div class="notice-b">Gyldig ID / bevis på rabatt<br>må vises ved kontroll.</div>
  <div class="notice-f">Mangler bevis:<br>gebyr 1150 kr.</div>
</div>`
    : '';
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Billett ${ticket.short_code}</title>
<style>
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
.qr { text-align:center; margin:1mm 0; }
.code { font-size:30px; font-weight:900; letter-spacing:5px; }
.row { display:flex; justify-content:space-between; font-size:13px; font-weight:800; margin:0.6mm 0; }
.fromto { border:2px solid #000; border-radius:2mm; padding:1mm 1.5mm; margin:1.5mm 0; }
.fromto .row { font-size:14px; }
.notice { border:3px solid #000; border-radius:2mm; padding:1.5mm; margin:1.5mm 0; text-align:center; }
.notice-h { font-size:14px; font-weight:900; letter-spacing:1px; margin-bottom:0.8mm; }
.notice-b { font-size:12px; font-weight:800; line-height:1.4; }
.notice-f { font-size:13px; font-weight:900; margin-top:0.8mm; line-height:1.3; }
.foot { font-size:12px; font-weight:800; text-align:center; margin-top:1.5mm; line-height:1.4; }
.tid { font-size:10px; font-weight:700; text-align:center; margin-top:1mm; }
</style></head><body>
<div class="t">
  <div class="lockup">
    <img class="logo-img" src="${LOGO_URL}" alt="LST" />
    <div class="logo-txt">LST</div>
    <div class="logo-sub">KOLLEKTIVTRAFIKK</div>
  </div>
</div>
<div class="t title" style="margin-top:1.5mm;">REISEBILLETT</div>
<div class="hr"></div>
<div class="t type">${TYPE_LABEL[ticket.type] || ticket.type} · ${CAT_LABEL[ticket.ticket_category] || ticket.ticket_category}</div>
<div class="t price">${ticket.kr_paid} kr</div>
<div class="qr">${qr}</div>
<div class="t code">${ticket.short_code}</div>
<div class="hr"></div>
<div class="fromto">
  <div class="row"><span>Gyldig fra</span><span>${fromStr}</span></div>
  <div class="row"><span>Gyldig til</span><span>${toStr}</span></div>
</div>
<div class="row"><span>Selger</span><span>${ticket.issued_by || 'Sjåfør'}</span></div>
${notice}
<div class="hr"></div>
<div class="foot">Vis QR-koden ved kontroll.<br>Billetten er personlig.</div>
<div class="tid">${ticket.ticket_id}</div>
<script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
</body></html>`;
  const w = window.open('', '_blank', 'width=420,height=720');
  if (!w) { toast.error('Tillat pop-up-vindu for utskrift'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}