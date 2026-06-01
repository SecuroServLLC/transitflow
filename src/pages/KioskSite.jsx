import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { QRCodeSVG } from 'qrcode.react';
import { getCredits, getCard, deductCredits, topUp, saveCard } from '@/utils/creditStore';
import { validateLuhn, generateCardNumber, generateCardholderName, generateExpiry, generateCVV, formatCardDisplay } from '@/utils/luhn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Wand2, CreditCard, Zap, CheckCircle2, RotateCcw, ArrowLeft } from 'lucide-react';

const TYPES = [
  { type: 'adult',    label: 'Adult',    icon: '🧑' },
  { type: 'child',    label: 'Child',    icon: '👶' },
  { type: 'senior',   label: 'Senior',   icon: '👴' },
  { type: 'student',  label: 'Student',  icon: '🎓' },
  { type: 'military', label: 'Military', icon: '🪖' },
];

function genShortCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }

export default function KioskSite() {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(null);
  const [credits, setCreditsState] = useState(getCredits());
  const [card, setCard] = useState(getCard());
  const [cardForm, setCardForm] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [showCardForm, setShowCardForm] = useState(!getCard());
  const [ticket, setTicket] = useState(null);
  const qc = useQueryClient();

  const { data: pricingData = [] } = useQuery({ queryKey: ['pricing'], queryFn: () => base44.entities.Pricing.list() });
  const priceMap = {};
  pricingData.forEach(p => { priceMap[p.ticket_type] = p.credit_cost; });

  const refresh = () => { setCreditsState(getCredits()); setCard(getCard()); };

  const generateCard = () => {
    setCardForm({ number: formatCardDisplay(generateCardNumber()), name: generateCardholderName(), expiry: generateExpiry(), cvv: generateCVV() });
  };

  const saveCardDetails = () => {
    const clean = cardForm.number.replace(/\s/g, '');
    if (!validateLuhn(clean)) { toast.error('Invalid card — Luhn check failed'); return; }
    if (!cardForm.name.trim()) { toast.error('Name required'); return; }
    saveCard({ number: clean, name: cardForm.name, expiry: cardForm.expiry, cvv: cardForm.cvv });
    refresh(); setShowCardForm(false); toast.success('Card saved!');
  };

  const handleTopUp = () => {
    if (!getCard()) { toast.error('Add a card first'); return; }
    topUp(); refresh(); toast.success('625 credits added!');
  };

  const createTicket = useMutation({
    mutationFn: d => base44.entities.Ticket.create(d),
    onSuccess: t => { deductCredits(priceMap[selectedType]); refresh(); setTicket(t); setStep(3); qc.invalidateQueries({ queryKey: ['tickets'] }); }
  });

  const handlePurchase = () => {
    const cost = priceMap[selectedType];
    if (!cost) { toast.error('Price not configured'); return; }
    let cur = getCredits();
    if (cur < cost) {
      if (getCard()) { topUp(); refresh(); cur = getCredits(); toast.success('Auto-topped up!'); }
      else { toast.error('Insufficient credits. Add a card and top up.'); return; }
    }
    if (cur < cost) { toast.error('Still insufficient credits.'); return; }
    createTicket.mutate({ type: selectedType, credits_paid: cost, purchase_method: 'kiosk', status: 'unused', qr_token: crypto.randomUUID(), short_code: genShortCode(), purchased_at: new Date().toISOString() });
  };

  const reset = () => { setStep(1); setSelectedType(null); setTicket(null); };
  const cf = (k, v) => setCardForm(p => ({ ...p, [k]: v }));
  const sel = TYPES.find(t => t.type === selectedType);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="bg-slate-800 px-6 py-5 text-center border-b border-slate-700">
        <h1 className="text-3xl font-bold">🚌 TransitTicket Kiosk</h1>
        <div className="flex justify-center gap-6 mt-2 text-sm">
          <span className="text-slate-400">Balance: <span className="text-blue-400 font-bold text-base">{credits} credits</span></span>
          {card && <span className="text-slate-400">Card: <span className="text-green-400">•••• {card.number.slice(-4)}</span></span>}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">

        {step === 1 && (
          <div className="w-full max-w-3xl">
            <h2 className="text-2xl font-bold text-center mb-8 text-slate-200">Select Ticket Type</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TYPES.map(t => (
                <button key={t.type} onClick={() => { setSelectedType(t.type); setStep(2); }}
                  className="bg-slate-800 hover:bg-blue-700 border-2 border-slate-700 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center gap-4 transition-all group">
                  <span className="text-6xl">{t.icon}</span>
                  <span className="text-xl font-bold">{t.label}</span>
                  {priceMap[t.type] && <span className="bg-slate-700 group-hover:bg-blue-600 text-blue-300 group-hover:text-white px-4 py-2 rounded-full font-bold transition-colors">{priceMap[t.type]} credits</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="w-full max-w-md space-y-5">
            <h2 className="text-2xl font-bold text-center">
              {sel?.icon} {sel?.label} Ticket
              {priceMap[selectedType] && <span className="ml-2 text-blue-400 text-xl">— {priceMap[selectedType]} credits</span>}
            </h2>

            <div className={`rounded-xl p-5 border-2 text-center ${credits >= (priceMap[selectedType] || 0) ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'}`}>
              <p className="text-4xl font-bold">{credits}</p>
              <p className="text-slate-400 text-sm">credits available</p>
              {credits < (priceMap[selectedType] || 0) && <p className="text-red-400 text-sm mt-1">Need {priceMap[selectedType] - credits} more credits</p>}
            </div>

            {showCardForm ? (
              <div className="bg-slate-800 rounded-xl p-5 space-y-3 border border-slate-600">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-200">Add Card</span>
                  <button onClick={generateCard} className="flex items-center gap-1 text-blue-400 text-sm hover:text-blue-300"><Wand2 className="w-4 h-4" />Generate</button>
                </div>
                <Input className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400" placeholder="Card Number" value={cardForm.number} onChange={e => cf('number', e.target.value.replace(/[^\d\s]/g, ''))} />
                <Input className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400" placeholder="Name" value={cardForm.name} onChange={e => cf('name', e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <Input className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400" placeholder="MM/YY" value={cardForm.expiry} onChange={e => cf('expiry', e.target.value)} />
                  <Input className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400" placeholder="CVV" value={cardForm.cvv} onChange={e => cf('cvv', e.target.value)} />
                </div>
                <Button onClick={saveCardDetails} className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700">Save Card</Button>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-xl p-4 flex items-center justify-between border border-slate-600">
                <div className="flex items-center gap-3"><CreditCard className="text-green-400" /><span>•••• {card?.number.slice(-4)}</span></div>
                <button onClick={() => setShowCardForm(true)} className="text-blue-400 hover:text-blue-300 text-sm">Change</button>
              </div>
            )}

            {card && (
              <button onClick={handleTopUp} className="w-full h-14 text-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl flex items-center justify-center gap-2 text-blue-400 font-medium transition-colors">
                <Zap className="w-5 h-5" />Top Up 500 + 25% Bonus = 625
              </button>
            )}

            <div className="flex gap-4">
              <Button onClick={() => setStep(1)} variant="outline" className="flex-1 h-14 text-lg bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700">
                <ArrowLeft className="w-5 h-5 mr-2" />Back
              </Button>
              <Button onClick={handlePurchase} disabled={createTicket.isPending} className="flex-1 h-14 text-xl bg-blue-600 hover:bg-blue-700">
                🎫 Purchase
              </Button>
            </div>
          </div>
        )}

        {step === 3 && ticket && (
          <div className="flex flex-col items-center gap-5 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <h2 className="text-3xl font-bold">Ticket Ready!</h2>
            <p className="text-slate-400 text-lg">Show this QR code to the inspector</p>
            <div className="bg-white p-6 rounded-2xl shadow-2xl">
              <QRCodeSVG value={ticket.qr_token} size={240} level="H" />
            </div>
            <div>
              <p className="text-xl font-bold text-blue-400 capitalize">{ticket.type} Ticket</p>
              <div className="mt-2 bg-slate-800 px-6 py-2 rounded-lg">
                <p className="text-xs text-slate-400">Inspector Code</p>
                <p className="font-mono font-bold text-white text-xl tracking-widest">{ticket.short_code}</p>
              </div>
            </div>
            <button onClick={reset} className="mt-4 flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-8 py-4 rounded-xl text-lg font-medium transition-colors">
              <RotateCcw className="w-5 h-5" />Buy Another
            </button>
          </div>
        )}
      </main>
    </div>
  );
}