import { useState, useRef, useCallback, useEffect } from 'react';

export function isNfcSupported() {
  return typeof window !== 'undefined' && 'NDEFReader' in window;
}

// Web NFC (Android Chrome). Reads an NFC tag's text payload, falling back to
// the tag's UID (serialNumber) — so any physical NFC tag works as a travel card.
export function useNfc() {
  const [supported] = useState(isNfcSupported());
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);
  const readerRef = useRef(null);
  const onReadRef = useRef(null);
  const lastRef = useRef({ id: null, t: 0 });

  const startScan = useCallback((onRead) => {
    if (!isNfcSupported()) {
      setError('NFC støttes ikke på denne enheten — bruk manuell innføring');
      return;
    }
    setError(null);
    onReadRef.current = onRead;
    // Already listening — just swap the callback.
    if (readerRef.current) { setActive(true); return; }
    try {
      const reader = new window.NDEFReader();
      readerRef.current = reader;
      reader.addEventListener('readingerror', () =>
        setError('Kunne ikke lese kort — hold det stille mot leseren'));
      reader.addEventListener('reading', ({ serialNumber, message }) => {
        let text = '';
        if (message && message.records) {
          for (const record of message.records) {
            if (record.recordType === 'text') {
              try {
                const buf = record.data.buffer
                  ? new Uint8Array(record.data.buffer)
                  : new Uint8Array(record.data);
                const status = buf[0] || 0;
                const langLen = status & 0x3f;
                text = new TextDecoder('utf-8').decode(buf.slice(1 + langLen)).trim();
              } catch { /* ignore malformed record */ }
            }
          }
        }
        const id = text || serialNumber || '';
        if (!id) return;
        const now = Date.now();
        if (lastRef.current.id === id && now - lastRef.current.t < 3000) return;
        lastRef.current = { id, t: now };
        onReadRef.current?.(id);
      });
      reader.scan().then(() => setActive(true)).catch(e => {
        setError(e.message || 'NFC-skan feilet');
        setActive(false);
      });
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const stopScan = useCallback(() => {
    setActive(false);
    readerRef.current = null;
    onReadRef.current = null;
  }, []);

  useEffect(() => () => stopScan(), [stopScan]);

  return { supported, active, error, startScan, stopScan };
}