import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

// Live camera QR scanner. Calls onScan(decodedText) once per unique code
// (with a short cooldown to avoid duplicate triggers). Mount/unmount controls
// the camera lifecycle.
export default function QrScanner({ onScan }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('starting'); // starting | ready | error
  const [errorMsg, setErrorMsg] = useState('');
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const lastRef = useRef({ text: '', time: 0 });

  useEffect(() => {
    let mounted = true;
    let scanner = null;
    const id = `qr-reader-${Math.random().toString(36).slice(2, 9)}`;
    containerRef.current.id = id;

    scanner = new Html5Qrcode(id, { verbose: false });
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
      (decodedText) => {
        if (!mounted) return;
        const now = Date.now();
        if (decodedText === lastRef.current.text && now - lastRef.current.time < 3000) return;
        lastRef.current = { text: decodedText, time: now };
        onScanRef.current(decodedText);
      },
      () => {}
    )
      .then(() => { if (mounted) setStatus('ready'); })
      .catch((e) => { if (mounted) { setErrorMsg(e?.message || 'Kamera ikke tilgjengelig'); setStatus('error'); } });

    return () => {
      mounted = false;
      if (scanner) {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      }
    };
  }, []);

  return (
    <div>
      <div ref={containerRef} className="w-full rounded-2xl overflow-hidden bg-black min-h-[240px]" />
      {status === 'starting' && <p className="text-center text-slate-500 text-sm mt-2">Starter kamera…</p>}
      {status === 'error' && <p className="text-center text-red-400 text-sm mt-2">⚠️ {errorMsg}</p>}
    </div>
  );
}