import { useEffect, useState } from 'react';
import { Printer, Usb, Loader2, Unplug } from 'lucide-react';
import {
  connectPrinter,
  disconnectPrinter,
  subscribePrinter,
  isWebUSBSupported,
} from '@/utils/directPrint';

export default function PrinterBar() {
  const [p, setP] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => subscribePrinter(setP), []);
  const supported = isWebUSBSupported();

  if (!supported) {
    return (
      <div className="text-xs text-slate-500 text-center bg-slate-800/50 rounded-lg p-2.5">
        Direkte-print (WebUSB) krever Chrome/Edge. Bruker vanlig utskriftsdialog.
      </div>
    );
  }
  if (p) {
    return (
      <div className="flex items-center justify-between bg-green-950/40 border border-green-500/50 rounded-lg p-2.5">
        <span className="text-xs text-green-300 font-bold flex items-center gap-1.5">
          <Printer className="w-4 h-4" /> USB-printer tilkoblet · printer umiddelbart
        </span>
        <button onClick={() => disconnectPrinter()} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
          <Unplug className="w-3 h-3" /> Koble fra
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <button
        onClick={async () => {
          setBusy(true);
          setErr('');
          try {
            await connectPrinter();
          } catch (e) {
            setErr(e.message || 'Kunne ikke koble til');
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Usb className="w-4 h-4" />}
        Koble til USB-printer for direkte-utskrift
      </button>
      {err && <p className="text-xs text-red-400 text-center">{err}</p>}
    </div>
  );
}