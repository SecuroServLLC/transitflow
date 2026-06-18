import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, Ticket } from 'lucide-react';

export default function RedeemCard({ customer, onRedeemed }) {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null); // null | 'ok' | 'error'
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const redeem = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 8) { setMessage('Koden må være 8 tegn'); setResult('error'); return; }
    setLoading(true);
    setResult(null);

    const cards = await base44.entities.OneTimeCard.filter({ code: trimmed });
    const card = cards[0];

    if (!card) { setMessage('Kode ikke funnet'); setResult('error'); setLoading(false); return; }
    if (card.status !== 'unused') { setMessage('Koden er allerede brukt eller kansellert'); setResult('error'); setLoading(false); return; }

    // Create ticket
    const ticketId = `TC-${Date.now().toString(36).toUpperCase()}`;
    const qrToken = crypto.randomUUID();
    const shortCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date().toISOString();

    await base44.entities.Ticket.create({
      ticket_id: ticketId,
      type: card.ticket_type,
      ticket_category: card.ticket_category,
      credits_paid: card.face_value_kr,
      kr_paid: card.face_value_kr,
      purchase_method: 'retailer',
      status: card.ticket_category === 'period' ? 'active' : 'unused',
      qr_token: qrToken,
      short_code: shortCode,
      purchased_at: now,
      valid_until: card.ticket_category === 'period'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      customer_id: customer?.id || '',
      customer_name: customer?.name || 'Gjest',
      issued_by: `RetailerCard·${card.retailer_name || ''}`,
      notes: `Innløst via engangskode ${trimmed}`
    });

    // Mark card as redeemed
    await base44.entities.OneTimeCard.update(card.id, {
      status: 'redeemed',
      redeemed_at: now,
      redeemed_by_ticket_id: ticketId
    });

    setResult('ok');
    setMessage(`Billett aktivert! Kortnr: ${shortCode}`);
    setCode('');
    setLoading(false);
    if (onRedeemed) onRedeemed();
  };

  return (
    <div className="bg-white rounded-2xl border p-5 space-y-4">
      <h3 className="font-bold flex items-center gap-2"><Ticket className="w-5 h-5 text-[#c0392b]" /> Løs inn engangskode</h3>
      <p className="text-sm text-gray-500">Har du en 8-tegns kode fra en forhandler? Tast den inn her.</p>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && redeem()}
          placeholder="f.eks. A3BX9KQ2"
          maxLength={8}
          className="font-mono text-center text-lg tracking-widest h-12"
        />
        <Button onClick={redeem} disabled={loading || code.length !== 8} className="h-12 bg-[#c0392b] hover:bg-[#a93226]">
          {loading ? '...' : 'Løs inn'}
        </Button>
      </div>
      {result === 'ok' && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{message}</span>
        </div>
      )}
      {result === 'error' && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <XCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{message}</span>
        </div>
      )}
    </div>
  );
}