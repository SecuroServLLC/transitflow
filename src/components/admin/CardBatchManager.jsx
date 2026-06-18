import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Package, Eye, Download, XCircle } from 'lucide-react';

const TICKET_TYPE_LABELS = { adult: 'Voksen', child: 'Barn', senior: 'Honnør', student: 'Student', military: 'Militær' };
const CATEGORY_LABELS = { single: 'Enkeltbillett', period: 'Periodebillett 30d' };
const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-800', issued: 'bg-green-100 text-green-800', cancelled: 'bg-gray-100 text-gray-600' };

export default function CardBatchManager() {
  const [viewBatch, setViewBatch] = useState(null);
  const qc = useQueryClient();

  const { data: batches = [] } = useQuery({
    queryKey: ['cardbatches'],
    queryFn: () => base44.entities.CardBatch.list('-created_date')
  });

  const { data: batchCards = [], isLoading: loadingCards } = useQuery({
    queryKey: ['onetimecards-batch', viewBatch?.batch_id],
    queryFn: () => base44.entities.OneTimeCard.filter({ batch_id: viewBatch.batch_id }),
    enabled: !!viewBatch
  });

  const cancelBatch = useMutation({
    mutationFn: async (batch) => {
      await base44.entities.CardBatch.update(batch.id, { status: 'cancelled' });
      // cancel all unused cards
      const cards = await base44.entities.OneTimeCard.filter({ batch_id: batch.batch_id, status: 'unused' });
      for (const c of cards) {
        await base44.entities.OneTimeCard.update(c.id, { status: 'cancelled' });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cardbatches'] })
  });

  const exportCodes = (batch) => {
    const cards = batchCards.filter(c => c.status === 'unused');
    const csv = ['Kode,Type,Kategori,Pålydende,Status']
      .concat(cards.map(c => `${c.code},${TICKET_TYPE_LABELS[c.ticket_type]},${CATEGORY_LABELS[c.ticket_category]},${c.face_value_kr} kr,${c.status}`))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `batch-${batch.batch_id}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const redeemedCount = (batchId) => {
    // approximation from batch data
    return 0;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Package className="w-5 h-5" /> Kortpakker (Retailer)</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-4">Batch ID</th>
              <th className="pb-2 pr-4">Forhandler</th>
              <th className="pb-2 pr-4">Type</th>
              <th className="pb-2 pr-4">Ant.</th>
              <th className="pb-2 pr-4">Pålydende</th>
              <th className="pb-2 pr-4">Betalt (90%)</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2">Handlinger</th>
            </tr>
          </thead>
          <tbody>
            {batches.map(b => (
              <tr key={b.id} className="border-b hover:bg-gray-50">
                <td className="py-2 pr-4 font-mono text-xs">{b.batch_id}</td>
                <td className="py-2 pr-4 font-medium">{b.retailer_name}</td>
                <td className="py-2 pr-4 text-xs text-gray-500">
                  {TICKET_TYPE_LABELS[b.ticket_type]} {CATEGORY_LABELS[b.ticket_category]}
                </td>
                <td className="py-2 pr-4">{b.quantity}</td>
                <td className="py-2 pr-4">{b.face_value_kr} kr</td>
                <td className="py-2 pr-4 text-green-700 font-medium">{b.paid_kr} kr</td>
                <td className="py-2 pr-4">
                  <Badge className={STATUS_COLORS[b.status] || 'bg-gray-100'}>{b.status}</Badge>
                </td>
                <td className="py-2 flex gap-1">
                  <Button size="icon" variant="ghost" title="Se koder" onClick={() => setViewBatch(b)}><Eye className="w-4 h-4" /></Button>
                  {b.status !== 'cancelled' && (
                    <Button size="icon" variant="ghost" title="Kanseller pakke" onClick={() => cancelBatch.mutate(b)}>
                      <XCircle className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {batches.length === 0 && <p className="text-center text-gray-400 py-8">Ingen kortpakker ennå</p>}
      </div>

      {/* View batch codes modal */}
      <Dialog open={!!viewBatch} onOpenChange={() => setViewBatch(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Koder — {viewBatch?.batch_id} ({viewBatch?.retailer_name})</DialogTitle>
          </DialogHeader>
          {loadingCards ? (
            <p className="text-center py-8 text-gray-400">Laster koder...</p>
          ) : (
            <>
              <div className="flex gap-2 mb-3">
                <span className="text-sm text-gray-500">{batchCards.filter(c => c.status === 'unused').length} ubrukte · {batchCards.filter(c => c.status === 'redeemed').length} brukt · {batchCards.filter(c => c.status === 'cancelled').length} kansellert</span>
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => exportCodes(viewBatch)}>
                  <Download className="w-4 h-4 mr-1" /> Eksporter CSV
                </Button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <div className="grid grid-cols-4 gap-2">
                  {batchCards.map(c => (
                    <div key={c.id} className={`font-mono text-sm px-2 py-1.5 rounded text-center border ${c.status === 'unused' ? 'border-green-200 bg-green-50 text-green-800' : c.status === 'redeemed' ? 'border-gray-200 bg-gray-100 text-gray-400 line-through' : 'border-red-100 bg-red-50 text-red-400 line-through'}`}>
                      {c.code}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}