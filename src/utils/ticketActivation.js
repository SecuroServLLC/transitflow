// Ticket activation & validity logic.
// A single e-ticket must be ACTIVATED (by driver scan or in-app) before it is
// valid for an inspector. Once activated it is valid for ACTIVATION_WINDOW_MS.
import { base44 } from '@/api/base44Client';

// Test window: 5 minutes. (Production would be 90 minutes.)
export const ACTIVATION_WINDOW_MS = 5 * 60 * 1000;

// Derive a normalized lifecycle state from a ticket record.
// Returns one of: 'inactive' | 'active' | 'used' | 'expired'
export function ticketState(ticket, now = new Date()) {
  if (!ticket) return 'inactive';
  const isPeriod = ticket.ticket_category === 'period';
  const validUntil = ticket.valid_until ? new Date(ticket.valid_until) : null;

  if (ticket.status === 'used') return 'used';

  if (isPeriod) {
    if (!validUntil || validUntil < now) return 'expired';
    return 'active';
  }

  // single e-ticket
  if (ticket.status === 'unused') return 'inactive'; // not yet activated
  if (ticket.status === 'active') {
    if (!validUntil || validUntil < now) return 'expired';
    return 'active';
  }
  if (ticket.status === 'expired') return 'expired';
  return 'inactive';
}

// Activate a single e-ticket: status -> active, valid 5 minutes from now.
export async function activateTicket(ticket) {
  const now = new Date();
  const validUntil = new Date(now.getTime() + ACTIVATION_WINDOW_MS).toISOString();
  return base44.entities.Ticket.update(ticket.id, {
    status: 'active',
    activated_at: now.toISOString(),
    valid_until: validUntil,
  });
}

// Format remaining validity as MM:SS for countdowns.
export function formatRemaining(ticket, now = new Date()) {
  if (!ticket?.valid_until) return '';
  const ms = new Date(ticket.valid_until) - now;
  if (ms <= 0) return '00:00';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}