import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import TicketCard from './TicketCard';
import { RefreshCw } from 'lucide-react';

export default function MyTickets({ customer }) {
  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ['my-tickets', customer.id],
    queryFn: () => base44.entities.Ticket.filter({ customer_id: customer.id }, '-purchased_at', 100),
    refetchOnMount: true
  });

  const lastActivatedRef = useRef({});

  // Seed known activated_at so we only notify on NEW activations (by driver).
  useEffect(() => {
    tickets.forEach(t => { if (t.activated_at) lastActivatedRef.current[t.id] = t.activated_at; });
  }, [tickets]);

  // Realtime: confirm to customer when a ticket is activated by the driver.
  useEffect(() => {
    if (!customer?.id) return;
    const unsub = base44.entities.Ticket.subscribe((event) => {
      const t = event.data;
      if (!t || t.customer_id !== customer.id) return;
      if (event.type === 'update' && t.status === 'active' && t.activated_at && lastActivatedRef.current[t.id] !== t.activated_at) {
        lastActivatedRef.current[t.id] = t.activated_at;
        toast.success('✅ Din billett ble aktivert av sjåfør');
        refetch();
      }
    });
    return unsub;
  }, [customer?.id]);

  const now = new Date();
  const active = tickets.filter(t => {
    if (t.ticket_category === 'period') return !t.valid_until || new Date(t.valid_until) > now;
    // single e-ticket: active if unused (not yet activated) or active within window
    if (t.status === 'unused') return true;
    if (t.status === 'active') return t.valid_until ? new Date(t.valid_until) > now : true;
    return false;
  });
  const history = tickets.filter(t => !active.includes(t));

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">My Tickets</h2>
        <button onClick={() => refetch()} className="text-blue-500 hover:text-blue-700 p-1">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {customer?.id && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col items-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Min QR — vis til sjåfør</p>
          <div className="bg-white p-3 rounded-xl border border-gray-100">
            <QRCodeSVG value={`CUST:${customer.id}`} size={140} level="M" />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Sjåføren skanner denne for å aktivere dine billetter</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Active</p>
              <div className="space-y-3">{active.map(t => <TicketCard key={t.id} ticket={t} />)}</div>
            </div>
          )}

          {history.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">History</p>
              <div className="space-y-3">{history.map(t => <TicketCard key={t.id} ticket={t} />)}</div>
            </div>
          )}

          {tickets.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-6xl mb-4">🎫</div>
              <p className="font-semibold text-gray-500">No tickets yet</p>
              <p className="text-sm mt-1">Buy your first ticket to get started</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}