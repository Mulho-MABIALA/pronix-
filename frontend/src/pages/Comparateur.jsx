import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Search, X, ArrowLeftRight } from 'lucide-react';
import api from '../services/api';
import { TeamLogo } from '../components/matches/MatchCard';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import { usePageMeta } from '../hooks/usePageMeta';

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function FormBadge({ r }) {
  const color = r === 'W' ? 'bg-primary-500 text-white' : r === 'D' ? 'bg-surface-500 text-ink-2' : 'bg-red-500/80 text-white';
  return <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${color}`}>{r}</span>;
}

function TeamPicker({ label, team, onPick, onClear }) {
  const { t } = useTranslation();
  const noResultsLabel = t('comparator.noTeamsFound');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(
    debounce(async (q) => {
      if (!q || q.length < 2) { setResults([]); setLoading(false); return; }
      setLoading(true);
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(q)}&type=teams`);
        setResults(data.data?.teams || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    if (v.length >= 2) setLoading(true);
    doSearch(v);
  };

  if (team) {
    return (
      <div className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-overlay/[0.08]" style={{ background: 'rgb(var(--overlay-rgb) / 0.03)' }}>
        <TeamLogo logo={team.logo} teamId={team.id} name={team.name} size={28} />
        <p className="flex-1 text-sm font-semibold text-ink-1 truncate">{team.name}</p>
        <button onClick={onClear} className="text-ink-4 hover:text-ink-2 transition-colors shrink-0" aria-label="Retirer">
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-overlay/[0.08]" style={{ background: 'rgb(var(--overlay-rgb) / 0.03)' }}>
        <Search size={15} className="text-ink-4 shrink-0" />
        <input
          value={query}
          onChange={handleChange}
          placeholder={label}
          className="flex-1 min-w-0 bg-transparent text-sm text-ink-1 placeholder-ph-a outline-none"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {query.length >= 2 && (
        <div className="absolute z-10 mt-1 w-full rounded-xl border border-overlay/[0.1] overflow-hidden max-h-64 overflow-y-auto"
          style={{ background: 'rgb(var(--surface-900-rgb) / 0.99)' }}>
          {loading && <div className="px-3 py-3 text-xs text-ink-4">…</div>}
          {!loading && results.map((r) => (
            <button
              key={r.id}
              onClick={() => { onPick(r); setQuery(''); setResults([]); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-overlay/[0.05] transition-colors text-left"
            >
              <TeamLogo logo={r.logo} teamId={r.id} name={r.name} size={18} />
              <span className="text-sm text-ink-2 truncate">{r.name}</span>
            </button>
          ))}
          {!loading && results.length === 0 && (
            <div className="px-3 py-3 text-xs text-ink-4">{noResultsLabel}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Comparateur() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [team1, setTeam1] = useState(null);
  const [team2, setTeam2] = useState(null);

  // Pré-remplissage depuis un lien "Comparer" (ex: TeamPage) via ?team1Id=&team1Name=&team1Logo=
  useEffect(() => {
    const id = searchParams.get('team1Id');
    const name = searchParams.get('team1Name');
    if (id && name) {
      setTeam1({ id, name, logo: searchParams.get('team1Logo') || null });
    }
  }, [searchParams]);

  usePageMeta(t('comparator.metaTitle'), t('comparator.metaDesc'));

  // Suggestion auto de l'adversaire du prochain match — dès qu'une seule équipe est choisie
  const singlePicked = team1 && !team2 ? team1 : (!team1 && team2 ? team2 : null);
  const emptySlot = team1 && !team2 ? 'team2' : (!team1 && team2 ? 'team1' : null);

  const { data: nextOppData } = useQuery({
    queryKey: ['next-opponent', singlePicked?.name],
    queryFn: () => api.get('/matches/next-opponent', { params: { teamName: singlePicked.name } }).then((r) => r.data),
    enabled: !!singlePicked,
    staleTime: 5 * 60 * 1000,
  });
  const suggestion = nextOppData?.data;

  const applySuggestion = () => {
    if (!suggestion || !emptySlot) return;
    if (emptySlot === 'team2') setTeam2(suggestion.opponent);
    else setTeam1(suggestion.opponent);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['team-compare', team1?.id, team2?.id],
    queryFn: () => api.get('/matches/compare-teams', {
      params: { team1Id: team1.id, team1Name: team1.name, team2Id: team2.id, team2Name: team2.name },
    }).then((r) => r.data),
    enabled: !!team1 && !!team2,
  });

  const stats1 = data?.data?.team1?.stats;
  const stats2 = data?.data?.team2?.stats;
  const h2h    = data?.data?.h2h;

  const ROWS = stats1 && stats2 ? [
    [t('comparator.played'),         stats1.played,         stats2.played],
    [t('comparator.wins'),           stats1.wins,           stats2.wins],
    [t('comparator.draws'),          stats1.draws,          stats2.draws],
    [t('comparator.losses'),         stats1.losses,         stats2.losses],
    [t('comparator.avgGoalsFor'),    stats1.avgGoalsFor,    stats2.avgGoalsFor],
    [t('comparator.avgGoalsAgainst'), stats1.avgGoalsAgainst, stats2.avgGoalsAgainst],
  ] : [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">

      <div>
        <h1 className="font-display font-bold text-xl text-ink-1 mb-1">{t('comparator.title')}</h1>
        <p className="text-sm text-ink-3">{t('comparator.subtitle')}</p>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        <TeamPicker label={t('comparator.pickTeam1')} team={team1} onPick={setTeam1} onClear={() => setTeam1(null)} />
        <div className="pt-2.5"><ArrowLeftRight size={16} className="text-ink-4 shrink-0" /></div>
        <TeamPicker label={t('comparator.pickTeam2')} team={team2} onPick={setTeam2} onClear={() => setTeam2(null)} />
      </div>

      {suggestion && emptySlot && (
        <button
          onClick={applySuggestion}
          className="w-full flex items-center gap-2.5 p-3 rounded-2xl border border-primary-500/25 hover:bg-primary-500/[0.08] transition-colors text-left"
          style={{ background: 'rgba(34,197,94,0.06)' }}
        >
          <TeamLogo logo={suggestion.opponent.logo} teamId={suggestion.opponent.id} name={suggestion.opponent.name} size={22} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-ink-4">{t('comparator.nextOpponentLabel')}</p>
            <p className="text-sm font-semibold text-ink-1 truncate">{suggestion.opponent.name}</p>
          </div>
          <span className="text-[11px] text-primary-400 font-semibold shrink-0">{t('comparator.useSuggestion')}</span>
        </button>
      )}

      {team1 && team2 && isLoading && (
        <SkeletonCard className="h-56" />
      )}

      {stats1 && stats2 && (
        <>
          <section className="bento-card p-4 space-y-3">
            <h2 className="text-xs font-semibold text-ink-4 uppercase tracking-wider">{t('comparator.formTitle')}</h2>

            <div className="flex items-center justify-between gap-2 pb-1 border-b border-overlay/[0.06]">
              <div className="flex items-center gap-2 min-w-0">
                <TeamLogo logo={team1.logo} teamId={team1.id} name={team1.name} size={18} />
                <span className="text-xs font-semibold text-ink-2 truncate">{team1.name}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0 flex-row-reverse">
                <TeamLogo logo={team2.logo} teamId={team2.id} name={team2.name} size={18} />
                <span className="text-xs font-semibold text-ink-2 truncate">{team2.name}</span>
              </div>
            </div>

            {ROWS.map(([label, v1, v2]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className={`font-bold tabular-nums w-12 text-left ${v1 > v2 ? 'text-primary-400' : 'text-ink-2'}`}>{v1}</span>
                <span className="text-xs text-ink-3 flex-1 text-center truncate px-2">{label}</span>
                <span className={`font-bold tabular-nums w-12 text-right ${v2 > v1 ? 'text-primary-400' : 'text-ink-2'}`}>{v2}</span>
              </div>
            ))}

            <div className="flex items-center justify-between pt-2 border-t border-overlay/[0.06]">
              <div className="flex gap-1">
                {stats1.form.map((r, i) => <FormBadge key={i} r={r} />)}
              </div>
              <span className="text-[11px] text-ink-4 shrink-0 px-2">{t('comparator.recentForm')}</span>
              <div className="flex gap-1 flex-row-reverse">
                {stats2.form.map((r, i) => <FormBadge key={i} r={r} />)}
              </div>
            </div>
          </section>

          <section className="bento-card p-4 space-y-3">
            <h2 className="text-xs font-semibold text-ink-4 uppercase tracking-wider">{t('comparator.h2hTitle')}</h2>
            {!h2h?.matches?.length ? (
              <p className="text-sm text-ink-3">{t('comparator.noH2h')}</p>
            ) : (
              <>
                <div className="flex items-center justify-center gap-6 text-sm py-1">
                  <span className="text-primary-400 font-bold text-lg tabular-nums">{h2h.team1Wins}</span>
                  <span className="text-xs text-ink-4">{h2h.draws} {t('comparator.draws').toLowerCase()}</span>
                  <span className="text-primary-400 font-bold text-lg tabular-nums">{h2h.team2Wins}</span>
                </div>
                <div className="space-y-1.5">
                  {h2h.matches.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-800 border border-surface-700 text-xs">
                      <span className="text-ink-4 w-14 shrink-0">
                        {m.scheduledAt ? format(new Date(m.scheduledAt), 'dd MMM yy') : ''}
                      </span>
                      <span className="flex-1 text-ink-2 truncate">
                        {m.homeTeam} <strong className="text-ink-1">{m.homeScore}-{m.awayScore}</strong> {m.awayTeam}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </>
      )}

      {(!team1 || !team2) && (
        <div className="bento-card text-center py-10 px-4 text-sm text-ink-3">
          {t('comparator.hint')}
        </div>
      )}
    </div>
  );
}
