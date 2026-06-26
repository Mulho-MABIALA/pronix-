import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, isToday, isYesterday, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';
import MatchCard from '../components/matches/MatchCard';
import { SkeletonMatchCard } from '../components/ui/SkeletonLoader';

const GROUP_LIMIT = 5;

function formatTabLabel(d) {
  if (isToday(d))     return { top: "Auj.",  bottom: format(d, 'dd') };
  if (isYesterday(d)) return { top: 'Hier',  bottom: format(d, 'dd') };
  if (isTomorrow(d))  return { top: 'Dem.',  bottom: format(d, 'dd') };
  return { top: format(d, 'EEE', { locale: fr }), bottom: format(d, 'dd') };
}

export default function Matches() {
  const [date, setDate]                       = useState(new Date());
  const [liveOnly, setLiveOnly]               = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState('');
  const [expandedGroups, setExpandedGroups]   = useState({});

  function toggleGroup(name) {
    setExpandedGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  const dateStr    = format(date, 'yyyy-MM-dd');
  const dateWindow = [-2, -1, 0, 1, 2, 3, 4].map((offset) => addDays(new Date(), offset));

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
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto py-5 space-y-4">

      {/* ── Date tabs — façon BeSoccer, affinée ─────────────────────── */}
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
            Live
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
                    ? 'bg-primary-500/15 text-primary-400 border-primary-500/30'
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
              Toutes
              {matches.length > 0 && <span className="chip-count">{matches.length}</span>}
            </button>
            {competitions.map((c) => {
              const count = matches.filter((m) => m.competition?.id === c.id).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCompetition(c.id === selectedCompetition ? '' : c.id)}
                  data-active={selectedCompetition === c.id}
                  className="filter-chip rounded-full"
                >
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
          <div className="card-p text-center py-14">
            <p className="text-3xl mb-3">📅</p>
            <p className="text-gray-500 text-sm">
              {liveOnly ? 'Aucun match en direct' : 'Aucun match pour cette date'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(byCompetition).map(([compName, compMatches]) => {
              const isExpanded = !!expandedGroups[compName];
              const hasMore    = compMatches.length > GROUP_LIMIT;
              const visible    = isExpanded ? compMatches : compMatches.slice(0, GROUP_LIMIT);
              return (
                <section key={compName}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <p className="comp-label">{compName}</p>
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
                        <>Voir moins <ChevronUp size={14} /></>
                      ) : (
                        <>Voir {compMatches.length - GROUP_LIMIT} de plus <ChevronDown size={14} /></>
                      )}
                    </button>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
