import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function GroupRide({ customer, onRefresh }) {
  const [groupCode, setGroupCode] = useState('');
  const [myGroup, setMyGroup] = useState(null);
  const qc = useQueryClient();

  const { data: groups = [], refetch } = useQuery({
    queryKey: ['group-rides-active'],
    queryFn: () => base44.entities.GroupRide.filter({ status: 'collecting' }),
    enabled: !myGroup
  });

  const createGroup = useMutation({
    mutationFn: async () => {
      const code = 'GRP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const members = JSON.stringify([{ name: customer.name, phone: customer.phone, id: customer.id, paid: false }]);
      return await base44.entities.GroupRide.create({ code, host_name: customer.name, host_id: customer.id, members, status: 'collecting', cost_per_person: 90, ticket_type: 'adult', expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() });
    },
    onSuccess: grp => { setMyGroup(grp); refetch(); }
  });

  const joinGroup = useMutation({
    mutationFn: async () => {
      const found = groups.find(g => g.code === groupCode.trim().toUpperCase());
      if (!found) throw new Error('Group not found');
      const members = JSON.parse(found.members || '[]');
      if (members.some(m => m.id === customer.id)) throw new Error('Already in this group');
      const cost = found.cost_per_person || 90;
      if ((customer.credits || 0) < cost) throw new Error(`Need ${cost} credits to join`);
      const updatedMembers = [...members, { name: customer.name, phone: customer.phone, id: customer.id, paid: true }];
      const newStatus = updatedMembers.length >= 10 ? 'released' : 'collecting';
      const updated = await base44.entities.GroupRide.update(found.id, { members: JSON.stringify(updatedMembers), status: newStatus });
      const updatedCust = await base44.entities.Customer.update(customer.id, { credits: customer.credits - cost });
      onRefresh(updatedCust);
      return updated;
    },
    onSuccess: grp => { setMyGroup(grp); toast.success(grp.status === 'released' ? '🎉 Group complete! Tickets released!' : 'Joined group! Waiting for more members...'); }
  });

  const members = myGroup ? JSON.parse(myGroup.members || '[]') : [];
  const progress = Math.min(100, (members.length / 10) * 100);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-600" />
        <h3 className="font-bold text-sm">Group Ride — 10% Discount</h3>
      </div>

      {!myGroup ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">Create or join a group. Once 10+ people pay in (90 credits each), tickets are released for everyone.</p>
          <div className="flex gap-2">
            <Button onClick={() => createGroup.mutate()} disabled={createGroup.isPending} size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs">Create Group</Button>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Group code e.g. GRP-AB123" value={groupCode} onChange={e => setGroupCode(e.target.value.toUpperCase())} className="text-xs font-mono flex-1 h-9" />
            <Button onClick={() => joinGroup.mutate()} disabled={joinGroup.isPending || !groupCode} size="sm" variant="outline" className="text-xs">Join & Pay</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-blue-50 rounded-xl p-3 flex justify-between items-center">
            <div><p className="text-[10px] text-blue-400 uppercase tracking-wider">Group Code</p><p className="font-black font-mono text-lg text-blue-800 tracking-widest">{myGroup.code}</p></div>
            <button onClick={() => { navigator.clipboard.writeText(myGroup.code); toast.success('Copied!'); }} className="text-blue-400 hover:text-blue-600"><Copy className="w-4 h-4" /></button>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Members: {members.length}/10</span><span>{Math.round(progress)}%</span></div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div className="bg-blue-500 h-full transition-all" style={{ width: `${progress}%` }} /></div>
          </div>
          {myGroup.status === 'released' ? (
            <p className="text-xs text-green-600 font-bold text-center">🎉 Pool unlocked! Tickets are in your account.</p>
          ) : (
            <p className="text-xs text-gray-400 text-center animate-pulse">Waiting for {10 - members.length} more members...</p>
          )}
          <div className="max-h-28 overflow-y-auto space-y-1">
            {members.map((m, i) => (
              <div key={i} className="flex justify-between text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                <span>👤 {m.name}</span>
                <span className="text-green-600 font-semibold">90 cr paid</span>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setMyGroup(null)} className="w-full text-xs border-gray-200">Leave / New Group</Button>
        </div>
      )}
    </div>
  );
}