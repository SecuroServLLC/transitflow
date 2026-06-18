import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const TICKET_TYPE_LABELS = {
  adult: 'Voksen',
  child: 'Barn',
  senior: 'Honnør',
  student: 'Student',
  military: 'Militær'
};

const CATEGORY_LABELS = {
  single: 'Enkeltbillett',
  period: 'Periodebillett (30d)'
};

export default function TVMExpress() {
  const [cardInput, setCardInput] = useState('');
  const [log, setLog] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  // Always focus input
  useEffect(() => {
    const focusInput = () => inputRef.current?.focus();
    focusInput();
    const interval = setInterval(focusInput, 2000);
    return () => clearInterval(interval);
  }, []);

  const { data: pricing = [] } = useQuery({
    queryKey: ['pricing'],
    queryFn: () => base44.entities.Pricing.list()
  });

  const handleScan = async (cardNumber) => {
    if (processing) return;
    const trimmed = cardNumber.trim();
    if (!trimmed) return;

    setProcessing(true);
    setCardInput('');

    const timestamp = new Date().toLocaleTimeString('nb-NO');

    try {
      // Look up card
      const cards = await base44.entities.TransitCard.filter({ card_number: trimmed });
      const card = cards[0];

      if (!card) {
        const entry = { time: timestamp, card: trimmed, status: 'error', message: 'Kort ikke funnet' };
        setLog(prev => [entry, ...prev.slice(0, 9)]);
        setLastResult(entry);
        setProcessing(false);
        return;
      }

      if (card.status === 'blocked') {
        const entry = { time: timestamp, card: trimmed, status: 'error', message: 'Kort er sperret' };
        setLog(prev => [entry, ...prev.slice(0, 9)]);
        setLastResult(entry);
        setProcessing(false);
        return;
      }

      const ticketType = card.favorite_ticket_type || 'adult';
      const ticketCategory = card.favorite_ticket_category || 'single';

      // Find price
      const priceEntry = pricing.find(p => p.ticket_type === ticketType);
      const creditCost = ticketCategory === 'period'
        ? (priceEntry?.period_credit_cost || 200)
        : (priceEntry?.credit_cost || 90);

      if (card.balance_credits < creditCost) {
        const entry = {
          time: timestamp, card: trimmed, status: 'error',
          message: `Utilstrekkelig saldo. Har ${card.balance_credits} kr, trenger ${creditCost} kr`
        };
        setLog(prev => [entry, ...prev.slice(0, 9)]);
        setLastResult(entry);
        setProcessing(false);
        return;
      }

      // Generate ticket
      const ticketId = `TC-${Date.now().toString(36).toUpperCase()}`;
      const qrToken = `QR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const shortCode = Math.floor(100000 + Math.random() * 900000).toString();
      const now = new Date().toISOString();

      await base44.entities.Ticket.create({
        ticket_id: ticketId,
        type: ticketType,
        ticket_category: ticketCategory,
        credits_paid: creditCost,
        purchase_method: 'machine',
        status: ticketCategory === 'period' ? 'active' : 'unused',
        qr_token: qrToken,
        short_code: shortCode,
        purchased_at: now,
        valid_until: ticketCategory === 'period'
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        customer_id: card.customer_id || card.id,
        customer_name: card.customer_name || 'TransitCard',
        issued_by: 'TVMExpress'
      });

      // Deduct credits
      await base44.entities.TransitCard.update(card.id, {
        balance_credits: card.balance_credits - creditCost,
        last_used_at: now
      });

      const entry = {
        time: timestamp,
        card: trimmed,
        status: 'ok',
        message: `${TICKET_TYPE_LABELS[ticketType]} ${CATEGORY_LABELS[ticketCategory]} — kode: ${shortCode}`,
        shortCode,
        ticketType,
        ticketCategory
      };
      setLog(prev => [entry, ...prev.slice(0, 9)]);
      setLastResult(entry);

    } catch (err) {
      const entry = { time: timestamp, card: trimmed, status: 'error', message: 'Systemfeil' };
      setLog(prev => [entry, ...prev.slice(0, 9)]);
      setLastResult(entry);
    }

    setProcessing(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleScan(cardInput);
    }
  };

  const resultBg = !lastResult ? 'bg-gray-900' :
    lastResult.status === 'ok' ? 'bg-green-900' : 'bg-red-900';

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col" onClick={() => inputRef.current?.focus()}>
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-mono text-gray-400">LST TVMExpress — Skanner klar</span>
        </div>
        <span className="text-xs text-gray-600 font-mono">
          {new Date().toLocaleDateString('nb-NO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Hidden input always ready */}
      <input
        ref={inputRef}
        value={cardInput}
        onChange={e => setCardInput(e.target.value)}
        onKeyDown={handleKeyDown}
        className="opacity-0 absolute w-0 h-0"
        autoFocus
      />

      {/* Main result area */}
      <div className={`flex-1 flex flex-col items-center justify-center transition-colors duration-500 ${resultBg} px-8`}>
        {processing && (
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xl text-gray-300">Behandler...</p>
          </div>
        )}

        {!processing && !lastResult && (
          <div className="text-center">
            <div className="text-8xl mb-6">📳</div>
            <p className="text-3xl font-light text-gray-300">Skann eller tast kortnummer</p>
            <p className="text-gray-500 mt-3 font-mono">Trykk Enter for å bekrefte</p>
            {cardInput && (
              <p className="mt-6 text-2xl font-mono tracking-widest text-yellow-400">{cardInput}</p>
            )}
          </div>
        )}

        {!processing && lastResult && (
          <div className="text-center max-w-md w-full">
            {lastResult.status === 'ok' ? (
              <>
                <div className="text-7xl mb-4">✅</div>
                <p className="text-4xl font-bold text-green-300 mb-2">Godkjent</p>
                <p className="text-xl text-white mt-2">{lastResult.message}</p>
                <div className="mt-6 bg-black/30 rounded-xl p-4 font-mono">
                  <p className="text-gray-400 text-sm">Billettkode</p>
                  <p className="text-3xl tracking-widest text-white font-bold">{lastResult.shortCode}</p>
                </div>
              </>
            ) : (
              <>
                <div className="text-7xl mb-4">❌</div>
                <p className="text-4xl font-bold text-red-300 mb-2">Avvist</p>
                <p className="text-xl text-white mt-2">{lastResult.message}</p>
              </>
            )}
            <p className="text-gray-500 text-sm mt-6 font-mono">Skann neste kort for å fortsette</p>
            {cardInput && (
              <p className="mt-2 text-xl font-mono tracking-widest text-yellow-400">{cardInput}</p>
            )}
          </div>
        )}
      </div>

      {/* Log */}
      <div className="bg-gray-900 border-t border-gray-800 px-6 py-3 max-h-48 overflow-y-auto">
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-2 font-mono">Logg</p>
        {log.length === 0 && (
          <p className="text-xs text-gray-700 font-mono">Ingen skanninger ennå</p>
        )}
        {log.map((entry, i) => (
          <div key={i} className={`flex items-center gap-3 text-xs font-mono py-1 border-b border-gray-800/50 ${entry.status === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
            <span className="text-gray-600 w-16 shrink-0">{entry.time}</span>
            <span className="text-gray-500 w-28 shrink-0 tracking-widest">{entry.card}</span>
            <span className={entry.status === 'ok' ? 'text-green-400' : 'text-red-400'}>
              {entry.status === 'ok' ? '✓' : '✗'}
            </span>
            <span className="truncate">{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}