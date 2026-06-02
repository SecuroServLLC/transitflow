import { useState } from 'react';
import { Button } from '@/components/ui/button';

const COINS = [1, 5, 10, 20];
const BILLS = [50, 100, 200, 500, 1000];

export default function CashPad({ targetAmount, onComplete, onCancel }) {
  const [inserted, setInserted] = useState(0);
  const change = Math.max(0, inserted - targetAmount);
  const sufficient = inserted >= targetAmount;
  const remaining = Math.max(0, targetAmount - inserted);

  return (
    <div className="space-y-5">
      <div className={`rounded-2xl p-6 text-center border-2 transition-colors ${sufficient ? 'border-green-500 bg-green-900/20' : 'border-slate-600 bg-slate-800/60'}`}>
        <p className="text-slate-400 text-sm uppercase tracking-wide mb-1">Inserted</p>
        <p className={`text-6xl font-black transition-colors ${sufficient ? 'text-green-400' : 'text-white'}`}>{inserted} kr</p>
        <div className="mt-3">
          {sufficient
            ? <p className="text-green-400 font-semibold text-lg">Change: <span className="font-bold">{change} kr</span></p>
            : <p className="text-slate-400">Still need: <span className="font-bold text-white text-xl">{remaining} kr</span></p>
          }
        </div>
        <div className="mt-3 bg-slate-700/50 rounded-full h-2 overflow-hidden">
          <div className="bg-green-500 h-full transition-all duration-300" style={{ width: `${Math.min(100, (inserted/targetAmount)*100)}%` }} />
        </div>
      </div>

      <div>
        <p className="text-slate-400 text-xs uppercase tracking-widest mb-3 text-center">Coins</p>
        <div className="flex gap-4 justify-center">
          {COINS.map(c => (
            <button key={c} onClick={() => setInserted(p => p + c)}
              className="w-16 h-16 rounded-full bg-amber-700 hover:bg-amber-500 border-4 border-amber-600 hover:border-amber-400 text-white font-bold text-lg transition-all active:scale-90 shadow-lg">
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-slate-400 text-xs uppercase tracking-widest mb-3 text-center">Notes</p>
        <div className="grid grid-cols-5 gap-2">
          {BILLS.map(b => (
            <button key={b} onClick={() => setInserted(p => p + b)}
              className="h-14 rounded-xl bg-green-800 hover:bg-green-600 border border-green-700 hover:border-green-500 text-white font-bold text-sm transition-all active:scale-95 shadow">
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={() => setInserted(0)} className="border-slate-600 text-slate-300 hover:bg-slate-700">Clear</Button>
        {onCancel && <Button variant="ghost" onClick={onCancel} className="text-slate-400">← Back</Button>}
        <Button onClick={() => onComplete(inserted, change)} disabled={!sufficient}
          className="flex-1 h-14 text-lg bg-green-600 hover:bg-green-700">
          ✅ Confirm {inserted} kr {change > 0 ? `(${change} kr change)` : ''}
        </Button>
      </div>
    </div>
  );
}