import { useState } from 'react';
import QrScanner from './QrScanner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Camera, Keyboard } from 'lucide-react';

// Scan view: camera-first QR scanning with a manual code fallback.
export default function ScanView({ onScan, placeholder = 'Skriv inn kode', fallback = true }) {
  const [mode, setMode] = useState('camera');
  const [manual, setManual] = useState('');

  const submitManual = () => {
    const v = manual.trim();
    if (!v) return;
    onScan(v);
    setManual('');
  };

  return (
    <div className="space-y-3">
      {fallback && (
        <div className="flex gap-2">
          <button onClick={() => setMode('camera')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${mode === 'camera' ? 'bg-[#c0392b] text-white' : 'bg-slate-800 text-slate-400'}`}>
            <Camera className="w-4 h-4 inline mr-1" /> Kamera
          </button>
          <button onClick={() => setMode('manual')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${mode === 'manual' ? 'bg-[#c0392b] text-white' : 'bg-slate-800 text-slate-400'}`}>
            <Keyboard className="w-4 h-4 inline mr-1" /> Manuelt
          </button>
        </div>
      )}

      {mode === 'camera' ? (
        <QrScanner onScan={onScan} />
      ) : (
        <div className="flex gap-2">
          <Input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitManual()}
            placeholder={placeholder}
            className="bg-[#0a0a0a] border-slate-700 text-white h-12 font-mono"
            autoFocus
          />
          <Button onClick={submitManual} className="bg-[#c0392b] hover:bg-[#a93226] h-12">Sjekk</Button>
        </div>
      )}
    </div>
  );
}