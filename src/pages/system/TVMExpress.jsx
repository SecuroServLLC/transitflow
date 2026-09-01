import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const TYPE_LABELS = {
  adult: 'Voksen',
  child: 'Barn',
  senior: 'Honnør',
  student: 'Student',
  military: 'Militær'
};

const CAT_LABELS = {
  single: 'Enkeltbillett',
  period: 'Periodebillett (30d)'
};

// Simple express reader — a small onboard device.
// Scans the passenger's PROFILE QR (CUST:<id>) and auto-activates their
// favorite ticket. Three screen states:
//   GREEN  -> ticket activated
//   RED    -> insufficient balance
//   YELLOW -> system error
export default function TVMExpress() {
  const [input, setInput] = useState('');
  const [state, setState] = useState('idle'); // idle | processing | green | red | yellow
  const [info, setInfo] = useState(null);
  const [lastLog, setLastLog] = useState(null);
  const inputRef = useRef(null);

  const { data: pricing = [] } = useQuery({
    queryKey: ['pricing'],
    queryFn: () => base44.entities.Pricing.list()
  });

  // Always (re)focus the hidden input so HID scans land here.
  useEffect(() => {
    const focus = () => inputRef.current?.focus();
    focus();
    const t = setInterval(focus, 2000);
    return () => clearInterval(t);
  }, []);

  // Auto-return to idle a few seconds after a result.
  useEffect(() => {
    if (state === 'idle' || state === 'processing') return;
    const t = setTimeout(() => {
      setState('idle');
      setInfo(null);
      setInput('');
      inputRef.current?.focus();
    }, 4000);
    return () => clearTimeout(t);
  }, [state]);

  const handleScan = async (raw) => {
    const val = String(raw).trim();
    if (!val) return;
    setState('processing');
    setInfo(null);
    setInput('');
    const stamp = () => new Date().toLocaleTimeString('nb-NO');
    const note = (status, message) => setLastLog({ time: stamp(), status, message });
    try {
      let customerId = val;
      if (val.startsWith('CUST:')) customerId = val.slice(5);

      const list = await base44.entities.Customer.filter({ id: customerId });
      const customer = list[0];
      if (!customer) {
        setState('yellow');
        setInfo({ message: 'Kunde ikke funnet' });
        note('yellow', 'Kunde ikke funnet');
        return;
      }

      const ticketType = customer.favorite_ticket_type || 'adult';
      const ticketCategory = customer.favorite_ticket_category || 'single';
      const priceEntry = pricing.find(p => p.ticket_type === ticketType);
      const cost = ticketCategory === 'period'
        ? (priceEntry?.period_credit_cost || 200)
        : (priceEntry?.credit_cost || 90);

      if ((customer.credits || 0) < cost) {
        setState('red');
        setInfo({ balance: customer.credits || 0, cost });
        note('red', `Saldo ${customer.credits || 0} / trenger ${cost}`);
        return;
      }

      const now = new Date();
      const ticketId = `EXP-${now.getTime().toString(36).toUpperCase()}`;
      const qrToken = `QR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const shortCode = Math.floor(100000 + Math.random() * 900000).toString();
      const validUntil = ticketCategory === 'period'
        ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(now.getTime() + 5 * 60 * 1000).toISOString();

      await base44.entities.Ticket.create({
        ticket_id: ticketId,
        type: ticketType,
        ticket_category: ticketCategory,
        credits_paid: cost,
        purchase_method: 'machine',
        status: 'active',
        qr_token: qrToken,
        short_code: shortCode,
        purchased_at: now.toISOString(),
        activated_at: now.toISOString(),
        valid_until: validUntil,
        customer_id: customer.id,
        customer_name: customer.name,
        issued_by: 'TVMExpress'
      });
      await base44.entities.Customer.update(customer.id, {
        credits: (customer.credits || 0) - cost
      });

      setState('green');
      setInfo({ ticketType, ticketCategory, validUntil, shortCode, name: customer.name });
      note('green', `${TYPE_LABELS[ticketType]} ${CAT_LABELS[ticketCategory]}`);
    } catch (err) {
      setState('yellow');
      setInfo({ message: 'Systemfeil' });
      note('yellow', 'Systemfeil');
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter') handleScan(input);
  };

  const bg = state === 'green' ? 'bg-green-600'
    : state === 'red' ? 'bg-red-600'
    : state === 'yellow' ? 'bg-yellow-400'
    : state === 'processing' ? 'bg-gray-800'
    : 'bg-gray-950';

  return (
    <div className={`min-h-screen ${bg} text-white flex flex-col items-center justify-center transition-colors duration-300 select-none`}>
      {/* Hidden input capturing HID scans */}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKey}
        className="opacity-0 absolute w-0 h-0"
        autoFocus
      />

      {/* Idle */}
      {state === 'idle' && (
        <div className="text-center px-6">
          <div className="text-7xl mb-6">📡</div>
          <p className="text-2xl font-light text-gray-300">Skann profil-QR</p>
          <p className="text-gray-500 mt-2 text-sm">Ekspressleser klar</p>
          {input && (
            <p className="mt-6 text-xl font-mono tracking-widest text-yellow-300">{input}</p>
          )}
        </div>
      )}

      {/* Processing */}
      {state === 'processing' && (
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xl text-gray-300">Behandler…</p>
        </div>
      )}

      {/* GREEN */}
      {state === 'green' && (
        <div className="text-center px-6">
          <div className="text-8xl mb-4">✓</div>
          <h1 className="text-4xl font-black mb-2">AKTIVERT BILLETT</h1>
          <p className="text-2xl font-bold">{TYPE_LABELS[info?.ticketType]}</p>
          <p className="text-lg opacity-90">{CAT_LABELS[info?.ticketCategory]}</p>
          {info?.ticketCategory === 'single' && (
            <p className="mt-3 text-base opacity-80">Gyldig til {new Date(info.validUntil).toLocaleTimeString('nb-NO')}</p>
          )}
          {info?.ticketCategory === 'period' && (
            <p className="mt-3 text-base opacity-80">Gyldig til {new Date(info.validUntil).toLocaleDateString('nb-NO')}</p>
          )}
          {info?.name && <p className="mt-2 text-sm opacity-70">{info.name}</p>}
        </div>
      )}

      {/* RED */}
      {state === 'red' && (
        <div className="text-center px-6">
          <div className="text-8xl mb-4">✗</div>
          <h1 className="text-4xl font-black mb-2">FOR LITE SALDO</h1>
          <p className="text-xl opacity-90">Saldo: {info?.balance} kr</p>
          <p className="text-lg opacity-80">Pris: {info?.cost} kr</p>
          <p className="mt-4 text-sm opacity-70">Topp opp i appen eller automat</p>
        </div>
      )}

      {/* YELLOW */}
      {state === 'yellow' && (
        <div className="text-center px-6 text-black">
          <div className="text-8xl mb-4">⚠</div>
          <h1 className="text-4xl font-black mb-2">FEIL</h1>
          <p className="text-xl opacity-90">{info?.message || 'Systemfeil'}</p>
          <p className="mt-4 text-sm opacity-70">Kontakt personalet</p>
        </div>
      )}

      {/* Minimal status footer */}
      {lastLog && (state === 'idle') && (
        <div className="absolute bottom-3 left-0 right-0 text-center text-[11px] font-mono text-gray-600">
          Siste: {lastLog.time} — {lastLog.message}
        </div>
      )}
    </div>
  );
}