import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  MessageSquare, Send, CheckCircle, Clock, AlertCircle,
  XCircle, ChevronDown, ChevronUp, User, Shield, RefreshCw,
} from 'lucide-react';
import api from '../../services/api';

// ── Statut helpers ────────────────────────────────────────────────────────────
const STATUS_MAP = {
  OPEN:        { label: 'Ouvert',      color: 'bg-blue-500/15 text-blue-400',    icon: MessageSquare },
  IN_PROGRESS: { label: 'En cours',    color: 'bg-amber-500/15 text-amber-400',  icon: Clock },
  RESOLVED:    { label: 'Résolu',      color: 'bg-emerald-500/15 text-emerald-400', icon: CheckCircle },
  CLOSED:      { label: 'Fermé',       color: 'bg-gray-500/15 text-gray-400',    icon: XCircle },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.OPEN;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${s.color}`}>
      <Icon size={11} />
      {s.label}
    </span>
  );
}

// ── Ticket card ───────────────────────────────────────────────────────────────
function TicketCard({ ticket, onReply, onStatus }) {
  const [open, setOpen]   = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const displayName = ticket.user?.profile?.displayName || ticket.email;

  async function send() {
    if (!reply.trim()) return;
    setSending(true);
    await onReply(ticket.id, reply.trim());
    setReply('');
    setSending(false);
  }

  return (
    <div
      className="rounded-2xl border border-white/[0.11] overflow-hidden"
      style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between gap-3 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-start gap-3 min-w-0">
          {ticket.user?.profile?.avatar ? (
            <img src={ticket.user.profile.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-sm font-bold shrink-0">
              {displayName?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{ticket.subject}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {displayName} · {format(new Date(ticket.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={ticket.status} />
          <span className="text-[11px] text-gray-500 bg-white/[0.05] px-2 py-1 rounded-lg">
            {ticket.messages.length} msg
          </span>
          {open ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </div>

      {/* Body */}
      {open && (
        <div className="border-t border-white/[0.07] px-4 pb-4">
          {/* Changer statut */}
          <div className="flex items-center gap-2 py-3 border-b border-white/[0.05] mb-3">
            <span className="text-[11px] text-gray-500 font-medium">Statut :</span>
            {Object.keys(STATUS_MAP).map(s => (
              <button
                key={s}
                onClick={() => onStatus(ticket.id, s)}
                className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${
                  ticket.status === s
                    ? 'border-primary-400/40 bg-primary-500/15 text-primary-400'
                    : 'border-white/[0.08] text-gray-500 hover:text-gray-300 hover:border-white/[0.15]'
                }`}
              >
                {STATUS_MAP[s].label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {ticket.messages.map(msg => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.isAdmin ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${
                  msg.isAdmin ? 'bg-primary-500/20 text-primary-400' : 'bg-white/[0.08] text-gray-400'
                }`}>
                  {msg.isAdmin ? <Shield size={13} /> : <User size={13} />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.isAdmin
                    ? 'bg-primary-500/15 text-gray-100 rounded-tr-sm'
                    : 'bg-white/[0.06] text-gray-200 rounded-tl-sm'
                }`}>
                  <p>{msg.content}</p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {format(new Date(msg.createdAt), 'dd MMM HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Zone réponse */}
          {ticket.status !== 'CLOSED' && (
            <div className="mt-4 flex gap-2">
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Répondre au ticket…"
                rows={2}
                className="input flex-1 resize-none text-sm py-2"
                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) send(); }}
              />
              <button
                onClick={send}
                disabled={!reply.trim() || sending}
                className="btn-primary px-3 self-end disabled:opacity-40"
              >
                {sending ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function AdminSupport() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-support', statusFilter],
    queryFn: () => api.get(`/admin/support/tickets${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.data),
  });

  const tickets = data?.data || [];

  const reply = useMutation({
    mutationFn: ({ id, content }) => api.post(`/admin/support/tickets/${id}/reply`, { content }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-support'] }),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/admin/support/tickets/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-support'] }),
  });

  const openCount = tickets.filter(t => t.status === 'OPEN').length;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Support</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {openCount > 0
              ? <span className="text-amber-400 font-semibold">{openCount} ticket{openCount > 1 ? 's' : ''} en attente</span>
              : 'Tous les tickets sont traités ✓'
            }
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-secondary gap-2 text-sm py-2 px-3"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* Filtres statut */}
      <div className="flex flex-wrap gap-2">
        {[['', 'Tous'], ...Object.entries(STATUS_MAP).map(([k, v]) => [k, v.label])].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            className={`filter-chip`}
            data-active={statusFilter === val ? 'true' : 'false'}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Liste tickets */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.11] p-12 text-center"
          style={{ background: 'var(--color-card)' }}>
          <MessageSquare size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Aucun ticket</p>
          <p className="text-sm text-gray-600 mt-1">Les demandes d'assistance apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onReply={(id, content) => reply.mutateAsync({ id, content })}
              onStatus={(id, status) => setStatus.mutate({ id, status })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
