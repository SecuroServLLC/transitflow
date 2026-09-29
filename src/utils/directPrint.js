// Direkte ESC/POS-utskrift til USB-termalprinter via WebUSB.
// Nettleseren kan ikke hoppe over utskriftsdialogen for vanlige printere, men
// via WebUSB kan appen sende rå ESC/POS-kommandoer som printer umiddelbart.
// Støttes kun i Chrome/Edge over HTTPS. Krever én bruker-gesture for å koble til.

let device = null;
let outEp = null;
const subs = new Set();
const emit = () => subs.forEach((f) => f(device));

export function isWebUSBSupported() {
  return typeof navigator !== 'undefined' && 'usb' in navigator && !!navigator.usb?.requestDevice;
}
export function getPrinter() {
  return device;
}
export function subscribePrinter(fn) {
  subs.add(fn);
  fn(device);
  return () => subs.delete(fn);
}

export async function connectPrinter() {
  if (!isWebUSBSupported()) throw new Error('WebUSB støttes ikke. Bruk Chrome eller Edge.');
  const d = await navigator.usb.requestDevice({ filters: [] });
  await d.open();
  if (!d.configuration) await d.selectConfiguration(1);
  const iface = d.configuration.interfaces[0];
  await d.claimInterface(iface.interfaceNumber);
  const alt = iface.alternates[0];
  outEp = alt.endpoints.find((e) => e.direction === 'out');
  if (!outEp) throw new Error('Fant ingen ut-endepunkt på printeren');
  device = d;
  emit();
  return d;
}

export async function disconnectPrinter() {
  if (device) {
    try { await device.close(); } catch {}
    device = null;
    outEp = null;
    emit();
  }
}

async function send(bytes) {
  if (!device || !outEp) throw new Error('Ingen printer tilkoblet');
  let off = 0;
  while (off < bytes.length) {
    const chunk = bytes.subarray(off, off + 4096);
    await device.transferOut(outEp.endpointNumber, chunk);
    off += chunk.length;
  }
}

// Konverter canvas (hvit bakgrunn, svart tekst) til 1-bit ESC/POS raster.
// Format: GS v 0 — hver byte = 8 horisontale prikker (MSB = venstre), rader topp→bunn.
function canvasToRaster(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const id = ctx.getImageData(0, 0, w, h).data;
  const wb = Math.ceil(w / 8);
  const out = new Uint8Array(wb * h);
  for (let y = 0; y < h; y++) {
    for (let bx = 0; bx < wb; bx++) {
      let b = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = bx * 8 + bit;
        if (x < w) {
          const i = (y * w + x) * 4;
          const lum = (id[i] + id[i + 1] + id[i + 2]) / 3;
          if (lum < 160) b |= 0x80 >> bit;
        }
      }
      out[y * wb + bx] = b;
    }
  }
  return { data: out, wb, h };
}

export async function printCanvas(canvas) {
  const { data, wb, h } = canvasToRaster(canvas);
  const init = new Uint8Array([0x1b, 0x40]); // ESC @ — nullstill
  const hdr = new Uint8Array([0x1d, 0x76, 0x30, 0x00, wb & 0xff, (wb >> 8) & 0xff, h & 0xff, (h >> 8) & 0xff]); // GS v 0
  const feed = new Uint8Array([0x1b, 0x64, 0x03]); // ESC d 3 — mate 3 linjer
  const all = new Uint8Array(init.length + hdr.length + data.length + feed.length);
  all.set(init, 0);
  all.set(hdr, init.length);
  all.set(data, init.length + hdr.length);
  all.set(feed, init.length + hdr.length + data.length);
  await send(all);
}