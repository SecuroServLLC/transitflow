import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function PenaltyAlerts({ customer, onRefresh }) {
  const qc = useQueryClient();

  const { data: fines = [], refetch } = useQuery({
    queryKey: ['my-fines', customer.phone],
    queryFn: () => base44.entities.Fine.filter({ phone: customer.phone, status: 'unpaid' }),
    enabled: !!customer.phone
  });

  const payFine = useMutation({
    mutationFn: async (fine) => {
      if ((customer.credits || 0) < fine.amount_kr) throw new Error('Insufficient credits');
      await base44.entities.Fine.update(fine.id, { status: 'paid', paid_at: new Date().toISOString() });
      return await base44.entities.Customer.update(customer.id, { credits: customer.credits - fine.amount_kr });
    },
    onSuccess: (updated) => { onRefresh(updated); refetch(); toast.success('Fine cleared!'); },
    onError: e => toast.error(e.message)
  });

  if (fines.length === 0) return null;

  return (
    <div className="space-y-2">
      {fines.map(f => (
        <div key={f.id} className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-900 text-sm">Outstanding Penalty Fare</p>
              <p className="text-xs text-red-600 mt-0.5">Route: {f.busline || 'City Bus'} · Trip: {f.tripID}</p>
              <p className="text-xs text-red-500 mt-1">{f.reason}</p>
              <p className="text-xs text-red-400 mt-1">Issued: {f.issued_at ? new Date(f.issued_at).toLocaleDateString() : '—'} by {f.issued_by}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-black text-red-700">{f.amount_kr} kr</p>
              <Button size="sm" onClick={() => payFine.mutate(f)} disabled={payFine.isPending} className="mt-2 bg-red-600 hover:bg-red-700 text-xs h-7 px-2">
                Clear
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}