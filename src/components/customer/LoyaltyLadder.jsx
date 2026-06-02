import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy } from 'lucide-react';

export default function LoyaltyLadder({ customer }) {
  const { data: myTickets = [] } = useQuery({
    queryKey: ['loyalty', customer.id],
    queryFn: () => base44.entities.Ticket.filter({ customer_id: customer.id })
  });

  const ownSingles = myTickets.filter(t => t.ticket_category === 'single' && t.purchase_method === 'online');
  const count = ownSingles.length;
  const totalSpent = ownSingles.reduce((s, t) => s + (t.credits_paid || 0), 0);
  const monthlyCap = 3000 * 1.2;
  const capReached = totalSpent >= monthlyCap;

  const discount = capReached ? 100 : count <= 5 ? 5 : Math.min(50, 5 + (count - 5) * 2);
  const progress = Math.min(100, (totalSpent / monthlyCap) * 100);

  if (count === 0) return null;

  return (
    <div className="bg-gradient-to-r from-amber-950/40 to-amber-900/20 border border-amber-800/40 rounded-2xl p-4 space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-sm text-amber-200">Loyalty Ladder</span>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${capReached ? 'bg-green-700 text-green-100' : 'bg-amber-800/60 text-amber-300'}`}>
          {capReached ? '🎉 FREE RIDES' : `${discount}% off`}
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-amber-300/60">
          <span>{count} trips · {totalSpent} / {monthlyCap} cr monthly</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-amber-950/60 h-1.5 rounded-full overflow-hidden">
          <div className="bg-amber-500 h-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[10px] text-amber-400/50">
          {capReached ? 'All remaining single rides this cycle are free!' : `${discount}% discount applied to your next purchase`}
        </p>
      </div>
    </div>
  );
}