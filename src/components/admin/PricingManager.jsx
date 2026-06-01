import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

const TYPES = [
  { type: 'adult',    label: 'Adult',    icon: '🧑', def: 100 },
  { type: 'child',    label: 'Child',    icon: '👶', def: 50  },
  { type: 'senior',   label: 'Senior',   icon: '👴', def: 60  },
  { type: 'student',  label: 'Student',  icon: '🎓', def: 70  },
  { type: 'military', label: 'Military', icon: '🪖', def: 80  },
];

export default function PricingManager() {
  const [prices, setPrices] = useState({});
  const qc = useQueryClient();

  const { data: pricingData = [] } = useQuery({ queryKey: ['pricing'], queryFn: () => base44.entities.Pricing.list() });

  useEffect(() => {
    const map = {};
    pricingData.forEach(p => { map[p.ticket_type] = { id: p.id, value: p.credit_cost }; });
    setPrices(map);
  }, [pricingData]);

  const save = useMutation({
    mutationFn: async () => {
      await Promise.all(TYPES.map(t => {
        const entry = prices[t.type];
        const cost = Number(entry?.value ?? t.def);
        return entry?.id
          ? base44.entities.Pricing.update(entry.id, { credit_cost: cost })
          : base44.entities.Pricing.create({ ticket_type: t.type, credit_cost: cost });
      }));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pricing'] }); toast.success('Prices saved!'); }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Ticket Pricing</h2>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" /> Save All Prices
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TYPES.map(t => (
          <div key={t.type} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{t.icon}</span>
              <div><h3 className="font-bold text-gray-900">{t.label}</h3><p className="text-xs text-gray-500">ticket type</p></div>
            </div>
            <div className="flex items-center gap-2">
              <Input type="number" min="0"
                value={prices[t.type]?.value ?? t.def}
                onChange={e => setPrices(p => ({ ...p, [t.type]: { ...p[t.type], value: e.target.value } }))}
                className="flex-1" />
              <span className="text-gray-500 text-sm whitespace-nowrap">credits</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}