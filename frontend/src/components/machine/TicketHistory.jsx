import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { Trash2, CheckCircle2, XCircle, Clock, Ticket, Share2, Download, RefreshCw, TrendingUp } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { TeamLogo } from '../matches/MatchCard';
import { OddsChip } from '../ui/OddsChip';
import { SkeletonCard } from '../ui/SkeletonLoader';
import { drawTicketCanvas } from '../../utils/ticketCanvas';

const RESULT_STYLES = {
  WON:     { label: 'won',     bg: 'bg-primary-500/15 text-primary-400 border-primary-500/25', Icon: CheckCircle2 },
  LOST:    { label: 'lost',    bg: 'bg-red-500/15 text-red-400 border-red-500/25',              Icon: XCircle },
  PENDING: { label: 'pending', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/25',        Icon: Clock },
};

const LEG_STYLES = {
  WIN:  { Icon: CheckCircle2, labelKey: 'legWin',  color: 'text-primary-400', bg: 'bg-primary-500/10 border-primary-500/20' },
  LOSS: { Icon: XCircle,      labelKey: 'legLoss', color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
  VOID: { Icon: Clock,        labelKey: 'legVoid', color: 'text-gray-400',    bg: 'bg-white/[0.03] border-white/[0.08]' },
};
const LEG_PENDING_STYLE = { color: 'text-gray-500', bg: 'bg-white/[0.03] border-white/[0.06]' };

export default function TicketHistory() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const locale = i18n.language?.startsWith('en') ? enUS : fr;
  const [sharingId, setSharingId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['ticket-history'],
    queryFn: () => api.get('/tickets/history').then((r) => r.data),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/tickets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-history'] });
    },
    onError: () => toast(t('machine.ticketDeleteError'), 'error'),
  });

  async function shareTicket(ticket) {
    setSharingId(ticket.id);
    try {
      const rows = ticket.entries.map((e) => ({
        match: e.match,
        pick: { type: e.prediction },
        odd: e.odds,
        legResult: e.legResult,
      }));
      const canvas = await drawTicketCanvas(rows, ticket.totalOdds, t);
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'ticket-fpronix.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: t('machine.shareTitle') });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'ticket-fpronix.png';
          a.click();
          URL.revokeObjectURL(url);
        }
        setSharingId(null);
      }, 'image/png');
    } catch {
      setSharingId(null);
    }
  }

  if (!user) {
    return (
      <div className="px-4">
        <div className="card-p text-center py-8">
          <Ticket size={28} className="mx-auto text-gray-600 mb-2" />
          <p className="text-gray-500 text-sm">{t('machine.historyLoginRequired')}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-4 space-y-3">
        <SkeletonCard className="h-32" />
        <SkeletonCard className="h-32" />
      </div>
    );
  }

  const tickets = data?.data || [];
  const stats = data?.stats;

  if (tickets.length === 0) {
    return (
      <div className="px-4">
        <div className="card-p text-center py-8">
          <Ticket size={28} className="mx-auto text-gray-600 mb-2" />
          <p className="text-gray-500 text-sm">{t('machine.noSavedTickets')}</p>
          <p className="text-gray-600 text-xs mt-1">{t('machine.noSavedTicketsDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-3">
      {stats && (
        <div className="card p-4 flex items-center gap-3">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-primary-500/15 flex items-center justify-center">
            <TrendingUp size={20} className="text-primary-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t('machine.successRate')}</p>
            {stats.resolved > 0 ? (
              <>
                <p className="text-lg font-black text-gray-100">{stats.winRate}%</p>
                <p className="text-[11px] text-gray-500">
                  {t('machine.successRateDetail', { won: stats.won, resolved: stats.resolved })}
                  {stats.pending > 0 && ` · ${t('machine.successRatePending', { count: stats.pending })}`}
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">
                {t('machine.noResolvedTickets')}
                {stats.pending > 0 && ` · ${t('machine.successRatePending', { count: stats.pending })}`}
              </p>
            )}
          </div>
        </div>
      )}
      {tickets.map((ticket) => {
        const rs = RESULT_STYLES[ticket.result] || RESULT_STYLES.PENDING;
        return (
          <div key={ticket.id} className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-gray-500">
                  {format(new Date(ticket.createdAt), 'd MMM yyyy, HH:mm', { locale })}
                  {' · '}{t('machine.selectionsGenerated', { count: ticket.entries.length })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold ${rs.bg}`}>
                  <rs.Icon size={12} />
                  {t(`machine.ticketResult.${rs.label}`)}
                </span>
                <button
                  onClick={() => shareTicket(ticket)}
                  disabled={sharingId === ticket.id}
                  className="p-1.5 rounded-lg text-gray-600 hover:text-primary-400 hover:bg-primary-500/10 transition-colors disabled:opacity-50"
                  aria-label={navigator.share ? t('machine.share') : t('machine.image')}
                >
                  {sharingId === ticket.id
                    ? <RefreshCw size={13} className="animate-spin" />
                    : navigator.share ? <Share2 size={13} /> : <Download size={13} />}
                </button>
                <button
                  onClick={() => deleteMutation.mutate(ticket.id)}
                  disabled={deleteMutation.isPending}
                  className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  aria-label={t('machine.deleteTicket')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {ticket.entries.map((e, idx) => {
                const ls = LEG_STYLES[e.legResult] || LEG_PENDING_STYLE;
                const LegIcon = ls.Icon || Clock;
                return (
                  <div key={e.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="w-4 shrink-0 text-center text-[11px] font-bold text-gray-600">{idx + 1}</span>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <TeamLogo logo={e.match.homeTeamLogo} name={e.match.homeTeam} size={15} />
                        <p className="text-xs font-medium text-gray-200 truncate">{e.match.homeTeam}</p>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <TeamLogo logo={e.match.awayTeamLogo} name={e.match.awayTeam} size={15} />
                        <p className="text-xs font-medium text-gray-200 truncate">{e.match.awayTeam}</p>
                      </div>
                    </div>
                    <div className={`shrink-0 text-center px-2 py-1 rounded-lg border ${ls.bg}`}>
                      <span className={`block text-[11px] font-bold ${ls.color}`}>
                        {t(`machine.pickLabels.${e.prediction}`, { defaultValue: e.prediction })}
                      </span>
                      <span className={`flex items-center justify-center gap-0.5 text-[9px] font-semibold ${ls.color}`}>
                        <LegIcon size={9} />
                        {t(`machine.${e.legResult ? LEG_STYLES[e.legResult].labelKey : 'legPending'}`)}
                      </span>
                    </div>
                    <div className="shrink-0">
                      <OddsChip odd={e.odds} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
              <span className="text-[11px] text-gray-500">{t('machine.totalOdd')}</span>
              <span className="text-sm font-bold text-orange-400">×{ticket.totalOdds}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
