import { Button } from '@/components/ui/button';

const colorClasses = {
  adult:    { border: 'border-blue-100 hover:border-blue-300',   badge: 'bg-blue-50 text-blue-700' },
  child:    { border: 'border-green-100 hover:border-green-300', badge: 'bg-green-50 text-green-700' },
  senior:   { border: 'border-purple-100 hover:border-purple-300', badge: 'bg-purple-50 text-purple-700' },
  student:  { border: 'border-orange-100 hover:border-orange-300', badge: 'bg-orange-50 text-orange-700' },
  military: { border: 'border-red-100 hover:border-red-300',     badge: 'bg-red-50 text-red-700' },
};

export default function TicketTypeCard({ type, label, icon, cost, onBuy, loading, hasCredits }) {
  const cls = colorClasses[type] || colorClasses.adult;
  return (
    <div className={`bg-white rounded-2xl border-2 ${cls.border} p-6 flex flex-col items-center gap-4 hover:shadow-lg transition-all`}>
      <span className="text-5xl">{icon}</span>
      <h3 className="text-xl font-bold text-gray-900">{label}</h3>
      <div className={`${cls.badge} px-4 py-2 rounded-full font-bold text-lg`}>
        {cost ? `${cost} credits` : 'Price not set'}
      </div>
      <Button
        onClick={onBuy}
        disabled={loading || !cost}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {!hasCredits && cost ? '⚡ Top up & Buy' : '🎫 Buy Ticket'}
      </Button>
    </div>
  );
}