import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Users, Calendar, MapPin, ChevronLeft, ArrowLeftRight } from 'lucide-react';
import api from '../services/api';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import { usePageMeta } from '../hooks/usePageMeta';

function FixtureRow({ fixture }) {
  const { i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  const f = fixture.fixture;
  const teams = fixture.teams;
  const g = fixture.goals;
  const finished = ['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(f?.status?.short);
  const date = f?.date ? format(new Date(f.date), 'dd MMM', { locale: dateLocale }) : '–';
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-800 border border-surface-700">
      <span className="text-xs text-ink-3 w-12 shrink-0">{date}</span>
      <span className="text-xs text-ink-3 flex-1 truncate">{teams?.home?.name} - {teams?.away?.name}</span>
      {finished ? (
        <span className="text-xs font-bold text-ink-1 tabular-nums">{g?.home} – {g?.away}</span>
      ) : (
        <span className="text-xs text-primary-400">{f?.status?.short}</span>
      )}
    </div>
  );
}

export default function TeamPage() {
  const { t } = useTranslation();
  const { id } = useParams();

  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ['team', id],
    queryFn: () => api.get(`/teams/${id}`).then((r) => r.data),
    staleTime: 60 * 60 * 1000,
  });

  const { data: squadData } = useQuery({
    queryKey: ['team-squad', id],
    queryFn: () => api.get(`/teams/${id}/squad`).then((r) => r.data),
    staleTime: 60 * 60 * 1000,
  });

  const { data: fixturesData } = useQuery({
    queryKey: ['team-fixtures', id],
    queryFn: () => api.get(`/teams/${id}/fixtures`).then((r) => r.data),
    staleTime: 30 * 60 * 1000,
  });

  const team = teamData?.data?.team;
  const stats = teamData?.data?.stats;
  const squad = squadData?.data || [];
  const { last = [], next = [] } = fixturesData?.data || {};

  usePageMeta(
    team ? t('teamPage.metaTitle', { name: team.name }) : t('teamPage.metaTitleFallback'),
    team ? t('teamPage.metaDesc', { name: team.name }) : '',
  );

  if (teamLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <SkeletonCard className="h-28" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bento-card text-center py-12 text-ink-3">
          {t('teamPage.teamNotFound')}
        </div>
      </div>
    );
  }

  const goalStats = stats?.goals;
  const winPct = stats?.fixtures?.wins?.total && stats?.fixtures?.played?.total
    ? Math.round((stats.fixtures.wins.total / stats.fixtures.played.total) * 100)
    : null;

  // Group squad by position
  const byPosition = squad.reduce((acc, p) => {
    const pos = p.position || t('teamPage.otherPosition');
    if (!acc[pos]) acc[pos] = [];
    acc[pos].push(p);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => history.back()} className="text-ink-4 hover:text-ink-2 transition-colors">
          <ChevronLeft size={20} />
        </button>
        {team.logo && (
          <img src={team.logo} alt={team.name} className="w-12 h-12 object-contain" />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-xl text-ink-1 truncate">{team.name}</h1>
          <div className="flex items-center gap-2 text-xs text-ink-3 mt-0.5">
            <MapPin size={11} />
            <span>{team.country}</span>
            {team.founded && <span>· {t('teamPage.foundedIn', { year: team.founded })}</span>}
          </div>
        </div>
        <Link
          to={`/comparateur?team1Id=${id}&team1Name=${encodeURIComponent(team.name)}&team1Logo=${encodeURIComponent(team.logo || '')}`}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-overlay/[0.08] text-xs font-semibold text-ink-2 hover:border-overlay/[0.14] transition-colors"
        >
          <ArrowLeftRight size={13} />
          {t('teamPage.compareCta')}
        </Link>
      </div>

      {/* Stats saison */}
      {stats && (
        <section>
          <h2 className="text-xs font-semibold text-ink-4 uppercase tracking-wider mb-3">
            {t('teamPage.currentSeasonStats')}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bento-card text-center">
              <p className="text-2xl font-display font-bold text-ink-1">{stats.fixtures?.played?.total ?? '–'}</p>
              <p className="text-xs text-ink-3 mt-1">{t('teamPage.matchesPlayed')}</p>
            </div>
            <div className="bento-card text-center">
              <p className="text-2xl font-display font-bold text-primary-400">{winPct != null ? `${winPct}%` : '–'}</p>
              <p className="text-xs text-ink-3 mt-1">{t('teamPage.wins')}</p>
            </div>
            <div className="bento-card text-center">
              <p className="text-2xl font-display font-bold text-ink-1">
                {goalStats?.for?.total?.total ?? '–'}
              </p>
              <p className="text-xs text-ink-3 mt-1">{t('teamPage.goalsScored')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bento-card text-center">
              <p className="text-xl font-display font-bold text-ink-1">
                {goalStats?.for?.average?.total ?? '–'}
              </p>
              <p className="text-xs text-ink-3 mt-1">{t('teamPage.avgGoalsPerMatch')}</p>
            </div>
            <div className="bento-card text-center">
              <p className="text-xl font-display font-bold text-ink-1">
                {goalStats?.against?.total?.total ?? '–'}
              </p>
              <p className="text-xs text-ink-3 mt-1">{t('teamPage.goalsConceded')}</p>
            </div>
          </div>
        </section>
      )}

      {/* Prochains matchs */}
      {next.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-ink-4 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar size={13} />
            {t('teamPage.upcomingMatches')}
          </h2>
          <div className="space-y-2">
            {next.map((f) => <FixtureRow key={f.fixture?.id} fixture={f} />)}
          </div>
        </section>
      )}

      {/* Derniers résultats */}
      {last.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-ink-4 uppercase tracking-wider mb-3">
            {t('teamPage.lastResults')}
          </h2>
          <div className="space-y-2">
            {[...last].reverse().map((f) => <FixtureRow key={f.fixture?.id} fixture={f} />)}
          </div>
        </section>
      )}

      {/* Effectif */}
      {squad.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-ink-4 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users size={13} />
            {t('teamPage.squadCount', { count: squad.length })}
          </h2>
          {Object.entries(byPosition).map(([pos, players]) => (
            <div key={pos} className="mb-4">
              <p className="text-xs font-medium text-ink-3 mb-2">{pos}</p>
              <div className="space-y-1.5">
                {players.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-800 border border-surface-700">
                    {p.photo && (
                      <img src={p.photo} alt={p.name} className="w-8 h-8 rounded-full object-cover bg-surface-700" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-1 truncate">{p.name}</p>
                      {p.number && <p className="text-xs text-ink-3">#{p.number}</p>}
                    </div>
                    <span className="text-xs text-ink-4">{p.nationality}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

    </div>
  );
}
