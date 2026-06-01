import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { QRCodeSVG } from 'qrcode.react';
import { getCredits, getCard, deductCredits, topUp, saveCard } from '@/utils/creditStore';
import { validateLuhn, generateCardNumber, generateCardholderName, generateExpiry, generateCVV, formatCardDisplay } from '@/utils/luhn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Wand2, CreditCard, Zap, CheckCircle2, RotateCcw, ArrowLeft } from 'lucide-react';

const TYPES = [
  { type: 'adult',    label: 'Adult',    icon: '🧑' },
  { type: 'child',    label: 'Child',    icon: '👶' },
  { type: 'senior',   label: 'Senior',   icon: '👴' },
  { type: 'student',  label: 'Student',  icon: '🎓' },
  { type: 'military', label: 'Military', icon: '🪖' },
];

function genShortCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export default function KioskSite() {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(null);
  const [credits, setCreditsState] = useState(getCredits());
  const [card, setCard] = useState(getCard());
  const [cardForm, setCardForm] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [showCardForm, setShowCardForm] = useState(!getCard());
  const [ticket, setTicket] = useState(null);
  const qc = useQueryClient();

  const refresh = () => { setCreditsState(getCredits()); setCard(getCard()); };

  const { data: pricingData = [] } = useQuery({ queryKey: ['pricing'], queryFn: () => base44.entities.Pricing.list() });
  const priceMap = {};
  pricingData.forEach(p => { priceMap[p.ticket_type] = p.credit_cost; });

  const genCard = () => {
    setCardForm({ number: formatCardDisplay(generateCardNumber()), name: generateCardholderName(), expiry: generateExpiry(), cvv: generateCVV() });
  };

  const saveCardDetails = () => {
    const clean = cardForm.number.replace(/\s/g, '');
    if (!validateLuhn(clean)) { toast.error('Invalid card number (Luhn check failed)'); return; }
    if (!cardForm.name.trim()) { toast.error('Name required'); return; }
    saveCard({ number: clean, name: cardForm.name.trim(), expiry: cardForm.expiry, cvv: cardForm.cvv });
    setCard(getCard()); setShowCardForm(false);
    toast.success('Card saved!');
  };

  const handleTopUp = () => {
    if (!getCard()) { toast.error('Add a card first'); return; }
    topUp(); refresh(); toast.success('625 credits added!');
  };

  const createTicketMutation = useMutation({
    mutationFn: d => base44.entities.Ticket.create(d),
    onSuccess: t => { deductCredits(priceMap[selectedType]); refresh(); setTicket(t); setStep(3); qc.invalidateQueries({ queryKey: ['tickets'] }); }
  });

  const purchase = () => {
    const cost = priceMap[selectedType];
    if (!cost) { toast.error('Price not configured'); return; }
    let cur = getCredits();
    if (cur < cost) {
      if (getCard()) { topUp(); refresh(); cur = getCredits(); toast.success('Auto-topped up!'); }
      else { toast.error('Insufficient credits. Add a card and top up.'); return; }
    }
    createTicketMutation.mutate({
      type: selectedType, credits_paid: cost, purchase_method: 'kiosk',
      status: 'unused', qr_token: crypto.randomUUID(),
      short_code: genShortCode(), purchased_at: new Date().toISOString(),
    });
  };

  const reset = () => { setStep(1); setSelectedType(null); setTicket(null); };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="bg-slate-800 p-5 text-center border-b border-slate-700">
        <h1 className="text-3xl font-bold">🚌 TransitTicket Kiosk</h1>
        <div className="flex justify-center gap-6 mt-2 text-slate-400">
          <span>Credits: <span className="text-blue-400 font-bold">{credits}</span></span>
          {card && <span>Card: <span className="text-green-400">•••• {card.number.slice(-4)}</span></span>}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-8">

        {/* Step 1: Select Type */}
        {step === 1 && (
          <div className="w-full max-w-3xl">
            <h2 className="text-2xl font-bold text-center mb-8 text-slate-200">Select Ticket Type</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TYPES.map(t => (
                <button key={t.type} onClick={() => { setSelectedType(t.type); setStep(2); }}
                  className="bg-slate-800 hover:bg-blue-600 border-2 border-slate-700 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center gap-3 transition-all group">
                  <span className="text-6xl">{t.icon}</span>
                  <span className="text-xl font-bold">{t.label}</span>
                  {priceMap[t.type] && <span className="bg-blue-900 group-hover:bg-blue-700 text-blue-300 px-4 py-1 rounded-full font-bold">{priceMap[t.type]} credits</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Payment */}
        {step === 2 && (
          <div className="w-full max-w-lg space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(1)} className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-bold">
                {TYPES.find(t => t.type === selectedType)?.icon} {TYPES.find(t => t.type === selectedType)?.label} Ticket
                {priceMap[selectedType] && <span className="text-blue-400 ml-2">— {priceMap[selectedType]} credits</span>}
              </h2>
            </div>

            <div className={`rounded-xl p-5 border-2 text-center ${credits >= (priceMap[selectedType]||0) ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'}`}>
              <p className="text-4xl font-bold">{credits}</p>
              <p className="text-slate-400">credits available</p>
              {credits < (priceMap[selectedType]||0) && <p className="text-red-400 text-sm mt-1">Need {priceMap[selectedType]-credits} more credits</p>}
            </div>

            {showCardForm ? (
              <div className="bg-slate-800 rounded-xl p-5 space-y-3 border border-slate-600">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">Add Card</h3>
                  <button onClick={genCard} className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm"><Wand2 className="w-4 h-4" /> Generate</button>
                </div>
                <Input className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 h-12" placeholder="Card Number" value={cardForm.number} onChange={e => setCardForm(f=>({...f,number:e.target.value}))} />
                <Input className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 h-12" placeholder="Cardholder Name" value={cardForm.name} onChange={e => setCardForm(f=>({...f,name:e.target.value}))} />
                <div className="grid grid-cols-2 gap-2">
                  <Input className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 h-12" placeholder="MM/YY" value={cardForm.expiry} onChange={e => setCardForm(f=>({...f,expiry:e.target.value}))} />
                  <Input className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 h-12" placeholder="CVV" value={cardForm.cvv} onChange={e => setCardForm(f=>({...f,cvv:e.target.value}))} />
                </div>
                <Button onClick={saveCardDetails} className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base">Save Card</Button>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-xl p-4 flex items-center justify-between border border-slate-600">
                <div className="flex items-center gap-3"><CreditCard className="text-green-400" /><span>•••• {card?.number.slice(-4)}</span></div>
                <button onClick={() => setShowCardForm(true)} className="text-blue-400 hover:text-blue-300 text-sm">Change</button>
              </div>
            )}

            {card && (
              <button onClick={handleTopUp} className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl py-3 flex items-center justify-center gap-2 text-blue-400 font-medium transition-colors h-14 text-lg">
                <Zap className="w-5 h-5" /> Top Up 500 + 25% Bonus = 625 Credits
              </button>
            )}

            <Button onClick={purchase} disabled={createTicketMutation.isPending || !priceMap[selectedType]}
              className="w-full h-16 text-xl bg-blue-600 hover:bg-blue-700">
              🎫 Purchase Ticket
            </Button>
          </div>
        )}

        {/* Step 3: QR Code */}
        {step === 3 && ticket && (
          <div className="flex flex-col items-center gap-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <h2 className="text-3xl font-bold">Ticket Ready!</h2>
            <p className="text-slate-400 text-lg">Show this QR code to the inspector</p>
            <div className="bg-white p-6 rounded-2xl shadow-2xl">
              <QRCodeSVG value={ticket.qr_token} size={240} level="H" />
            </div>
            <div>
              <p className="text-xl font-bold text-blue-400 capitalize">{ticket.type} Ticket</p>
              <div className="bg-slate-700 px-6 py-2 rounded-full mt-2">
                <p className="font-mono font-bold tracking-widest text-lg text-white">{ticket.short_code}</p>
                <p className="text-slate-400 text-xs">Inspector code</p>
              </div>
              <p className="text-slate-400 mt-2">{ticket.credits_paid} credits</p>
            </div>
            <button onClick={reset} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-8 py-4 rounded-xl text-lg font-medium transition-colors mt-2">
              <RotateCcw className="w-5 h-5" /> Buy Another
            </button>
          </div>
        )}
      </main>
    </div>
  );
}