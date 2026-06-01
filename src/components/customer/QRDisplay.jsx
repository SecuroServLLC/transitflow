import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

const TYPE_LABELS = { adult: 'Adult', child: 'Child', senior: 'Senior', student: 'Student', military: 'Military' };

export default function QRDisplay({ ticket, onDone }) {
  return (
    <div className="flex flex-col items-center py-8 px-4">
      <CheckCircle2 className="w-14 h-14 text-green-500 mb-3" />
      <h2 className="text-3xl font-bold text-gray-900 mb-1">Ticket Ready!</h2>
      <p className="text-gray-500 mb-6">Show this QR code to the inspector</p>

      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-xl">
        <QRCodeSVG value={ticket.qr_token} size={220} level="H" />
      </div>

      <div className="mt-6 text-center space-y-3">
        <div className="bg-blue-50 px-8 py-3 rounded-xl">
          <p className="font-bold text-blue-700 text-xl">{TYPE_LABELS[ticket.type]} Ticket</p>
        </div>
        <div className="bg-gray-100 px-6 py-2 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Inspector Code</p>
          <p className="font-mono font-bold text-gray-800 text-lg tracking-widest">{ticket.short_code}</p>
        </div>
        <p className="text-gray-400 text-xs">{ticket.credits_paid} credits • {ticket.purchase_method}</p>
      </div>

      <Button onClick={onDone} variant="outline" className="mt-8">
        Buy Another Ticket
      </Button>
    </div>
  );
}