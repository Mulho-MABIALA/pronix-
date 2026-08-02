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
  VOID: { Icon: Clock,        labelKey: 'legVoid', color: 'text-ink-4',    bg: 'bg-overlay/[0.03] border-overlay/[0.08]' },
};
const LEG_PENDING_STYLE = { color: 'text-ink-3', bg: 'bg-overlay/[0.03] border-overlay/[0.06]' };

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
          <Ticket size={28} className="mx-auto text-ink-4 mb-2" />
          <p className="text-ink-3 text-sm">{t('machine.historyLoginRequired')}</p>
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
          <Ticket size={28} className="mx-auto text-ink-4 mb-2" />
          <p className="text-ink-3 text-sm">{t('machine.noSavedTickets')}</p>
          <p className="text-ink-4 text-xs mt-1">{t('machine.noSavedTicketsDesc')}</p>
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
            <p className="text-xs text-ink-3 uppercase tracking-wider">{t('machine.successRate')}</p>
            {stats.resolved > 0 ? (
              <>
                <p className="text-lg font-black text-ink-1">{stats.winRate}%</p>
                <p className="text-[11px] text-ink-3">
                  {t('machine.successRateDetail', { won: stats.won, resolved: stats.resolved })}
                  {stats.pending > 0 && ` · ${t('machine.successRatePending', { count: stats.pending })}`}
                </p>
              </>
            ) : (
              <p className="text-xs text-ink-3 mt-0.5">
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
                <p className="text-xs text-ink-3">
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
                  className="p-1.5 rounded-lg text-ink-4 hover:text-primary-400 hover:bg-primary-500/10 transition-colors disabled:opacity-50"
                  aria-label={navigator.share ? t('machine.share') : t('machine.image')}
                >
                  {sharingId === ticket.id
                    ? <RefreshCw size={13} className="animate-spin" />
                    : navigator.share ? <Share2 size={13} /> : <Download size={13} />}
                </button>
                <button
                  onClick={() => deleteMutation.mutate(ticket.id)}
                  disabled={deleteMutation.isPending}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  aria-label={t('machine.deleteTicket')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <div className="divide-y divide-overlay/[0.09]">
              {ticket.entries.map((e, idx) => {
                const ls = LEG_STYLES[e.legResult] || LEG_PENDING_STYLE;
                const LegIcon = ls.Icon || Clock;
                const m = e.match;
                const hasScore = m.status === 'FINISHED' && m.homeScore != null && m.awayScore != null;
                const homeWins = hasScore && m.homeScore > m.awayScore;
                const awayWins = hasScore && m.awayScore > m.homeScore;
                const isDraw   = hasScore && m.homeScore === m.awayScore;
                // Même code couleur que MatchCard : vert pour le vainqueur, ambre si nul.
                const scoreColor = (isWinner) => (isDraw ? 'text-amber-400' : isWinner ? 'text-primary-400' : 'text-ink-4');
                return (
                  <div key={e.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="w-4 shrink-0 text-center text-[11px] font-bold text-ink-4">{idx + 1}</span>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <TeamLogo logo={m.homeTeamLogo} name={m.homeTeam} size={15} />
                        <p className="text-xs font-medium text-ink-2 truncate">{m.homeTeam}</p>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <TeamLogo logo={m.awayTeamLogo} name={m.awayTeam} size={15} />
                        <p className="text-xs font-medium text-ink-2 truncate">{m.awayTeam}</p>
                      </div>
                    </div>
                    {hasScore && (
                      <div className="shrink-0 text-right w-4 space-y-0.5">
                        <span className={`block text-xs font-display font-bold tabular-nums leading-none ${scoreColor(homeWins)}`}>
                          {m.homeScore}
                        </span>
                        <span className={`block text-xs font-display font-bold tabular-nums leading-none ${scoreColor(awayWins)}`}>
                          {m.awayScore}
                        </span>
                      </div>
                    )}
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

            <div className="flex items-center justify-between pt-2 border-t border-overlay/[0.06]">
              <span className="text-[11px] text-ink-3">{t('machine.totalOdd')}</span>
              <span className="text-sm font-bold text-orange-400">×{ticket.totalOdds}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
