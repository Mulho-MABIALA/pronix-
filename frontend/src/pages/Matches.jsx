import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, addDays, isToday, isYesterday, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronDown, ChevronUp, RefreshCw, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import MatchCard from '../components/matches/MatchCard';
import { SkeletonMatchCard } from '../components/ui/SkeletonLoader';
import CompetitionLogo from '../components/ui/CompetitionLogo';
import SearchBar from '../components/ui/SearchBar';
import { usePageMeta } from '../hooks/usePageMeta';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

const GROUP_LIMIT = 5;

export default function Matches() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isEN = i18n.language?.startsWith('en');

  usePageMeta('Matchs du jour', 'Scores en direct, résultats et calendrier de tous les matchs de football. Consultez les statistiques et pronostics.');
  const [date, setDate]                       = useState(new Date());
  const [liveOnly, setLiveOnly]               = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState('');
  const [expandedGroups, setExpandedGroups]   = useState({});
  const [searchOpen, setSearchOpen]           = useState(false);

  function toggleGroup(name) {
    setExpandedGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  function formatTabLabel(d) {
    if (isToday(d))     return { top: t('matches.todayShort'),    bottom: format(d, 'dd') };
    if (isYesterday(d)) return { top: t('matches.yesterdayShort'), bottom: format(d, 'dd') };
    if (isTomorrow(d))  return { top: t('matches.tomorrowShort'), bottom: format(d, 'dd') };
    return { top: format(d, 'EEE', { locale: isEN ? undefined : fr }), bottom: format(d, 'dd') };
  }

  const dateStr    = format(date, 'yyyy-MM-dd');
  const dateWindow = [-2, -1, 0, 1, 2, 3, 4].map((offset) => addDays(new Date(), offset));

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['matches'] });
  }, [queryClient]);

  const { pulling, pullDistance, refreshing, threshold } = usePullToRefresh(handleRefresh);

  const { data: competitionsData } = useQuery({
    queryKey: ['competitions'],
    queryFn: () => api.get('/matches/competitions').then((r) => r.data),
    staleTime: Infinity,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['matches', dateStr, selectedCompetition, liveOnly],
    queryFn: () => {
      let url = `/matches?date=${dateStr}&limit=50`;
      if (selectedCompetition) url += `&competitionId=${selectedCompetition}`;
      if (liveOnly) url += `&status=LIVE`;
      return api.get(url).then((r) => r.data);
    },
  });

  const matches      = data?.data       || [];
  const competitions = competitionsData?.data || [];
  const liveCount    = matches.filter((m) => m.status === 'LIVE').length;

  const byCompetition = matches.reduce((acc, match) => {
    const key = match.competition?.name || 'Autre';
    if (!acc[key]) acc[key] = { logo: match.competition?.logo || null, list: [] };
    acc[key].list.push(match);
    return acc;
  }, {});

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const showPTR = pulling || refreshing;

  return (
    <div className="max-w-2xl mx-auto py-5 space-y-4">

      {/* ── Pull-to-refresh indicator ────────────────────────────── */}
      <div
        className="md:hidden overflow-hidden transition-all duration-200"
        style={{ height: showPTR ? Math.max(pullDistance * 0.5, refreshing ? 48 : 0) : 0 }}
      >
        <div className="flex items-center justify-center gap-2 py-3 text-gray-500 text-xs">
          <RefreshCw
            size={16}
            className={`transition-transform ${refreshing ? 'animate-spin text-primary-400' : ''}`}
            style={{ transform: `rotate(${pullProgress * 360}deg)` }}
          />
          <span className={refreshing ? 'text-primary-400' : ''}>
            {refreshing
              ? t('notifications.refreshing')
              : pullProgress >= 1
              ? t('notifications.pullToRefresh')
              : t('notifications.pulling')}
          </span>
        </div>
      </div>

      {/* ── Barre de recherche ──────────────────────────────────────── */}
      <div className="px-4">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/[0.08] text-left transition-colors hover:border-white/[0.14]"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <Search size={16} className="text-gray-500 shrink-0" />
          <span className="flex-1 text-sm text-gray-500">
            {t('search.placeholder')}
          </span>
        </button>
      </div>

      {/* ── Date tabs ─────────────────────────────────────────────── */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1.5 px-4 min-w-max">

          {/* Live */}
          <button
            onClick={() => setLiveOnly(true)}
            data-active={liveOnly}
            data-variant="live"
            className="filter-chip"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-live-500 animate-pulse" aria-hidden="true" />
            {t('matches.live')}
            {liveCount > 0 && <span className="chip-count">{liveCount}</span>}
          </button>

          <div className="w-px h-6 bg-white/[0.06] shrink-0" />

          {/* Dates */}
          {dateWindow.map((d, i) => {
            const { top, bottom } = formatTabLabel(d);
            const dStr       = format(d, 'yyyy-MM-dd');
            const isSelected = dStr === dateStr && !liveOnly;
            return (
              <button
                key={i}
                onClick={() => { setDate(d); setLiveOnly(false); }}
                className={`flex flex-col items-center px-3 py-1.5 rounded-lg min-w-[44px] border transition-colors ${
                  isSelected
                    ? 'bg-select-500/15 text-select-400 border-select-500/30'
                    : 'text-gray-500 border-white/[0.06] hover:text-gray-300'
                }`}
              >
                <span className="text-[10px] font-medium">{top}</span>
                <span className="text-sm font-bold leading-none mt-0.5">{bottom}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chips compétition ───────────────────────────────────────── */}
      {competitions.length > 0 && (
        <div className="overflow-x-auto scrollbar-hide px-4">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setSelectedCompetition('')}
              data-active={!selectedCompetition}
              className="filter-chip rounded-full"
            >
              {t('matches.all')}
              {matches.length > 0 && <span className="chip-count">{matches.length}</span>}
            </button>
            {competitions.map((c) => {
              const count = matches.filter((m) => m.competition?.id === c.id).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCompetition(c.id === selectedCompetition ? '' : c.id)}
                  data-active={selectedCompetition === c.id}
                  className="filter-chip rounded-full flex items-center gap-1.5"
                >
                  <CompetitionLogo logo={c.logo} size={16} />
                  {c.name}
                  {count > 0 && <span className="chip-count">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Liste des matchs ────────────────────────────────────────── */}
      <div className="px-4">
        {isLoading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonMatchCard key={i} />)}
          </div>
        ) : matches.length === 0 ? (
          <div className="bento-card text-center py-14 space-y-4">
            <div className="text-5xl" aria-hidden="true">{liveOnly ? '📡' : '📅'}</div>
            <div>
              <p className="text-gray-300 font-semibold text-base">
                {liveOnly ? t('matches.noLive') : t('matches.noMatchesDate')}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                {liveOnly
                  ? t('matches.noLiveHint')
                  : t('matches.noMatchesDateHint')}
              </p>
            </div>
            {liveOnly && (
              <button
                onClick={() => setLiveOnly(false)}
                className="btn-secondary text-sm mx-auto"
              >
                {t('matches.showAllMatches')}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(byCompetition).map(([compName, { logo, list: compMatches }]) => {
              const isExpanded = !!expandedGroups[compName];
              const hasMore    = compMatches.length > GROUP_LIMIT;
              const visible    = isExpanded ? compMatches : compMatches.slice(0, GROUP_LIMIT);
              return (
                <section key={compName}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CompetitionLogo logo={logo} size={20} />
                      <p className="comp-label truncate">{compName}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-600 tabular-nums">{compMatches.length}</span>
                  </div>
                  <div className="card overflow-hidden divide-y divide-white/[0.04]">
                    {visible.map((match) => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                  {hasMore && (
                    <button onClick={() => toggleGroup(compName)} className="see-more-btn">
                      {isExpanded ? (
                        <>{t('matches.seeLess')} <ChevronUp size={14} /></>
                      ) : (
                        <>{t('matches.seeMoreCount', { count: compMatches.length - GROUP_LIMIT })} <ChevronDown size={14} /></>
                      )}
                    </button>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {searchOpen && <SearchBar onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
