import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Users, Calendar, MapPin, ChevronLeft } from 'lucide-react';
import api from '../services/api';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import { usePageMeta } from '../hooks/usePageMeta';

function FixtureRow({ fixture }) {
  const f = fixture.fixture;
  const t = fixture.teams;
  const g = fixture.goals;
  const finished = ['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(f?.status?.short);
  const date = f?.date ? format(new Date(f.date), 'dd MMM', { locale: fr }) : '–';
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-800 border border-surface-700">
      <span className="text-xs text-gray-500 w-12 shrink-0">{date}</span>
      <span className="text-xs text-gray-300 flex-1 truncate">{t?.home?.name} - {t?.away?.name}</span>
      {finished ? (
        <span className="text-xs font-bold text-gray-100 tabular-nums">{g?.home} – {g?.away}</span>
      ) : (
        <span className="text-xs text-primary-400">{f?.status?.short}</span>
      )}
    </div>
  );
}

export default function TeamPage() {
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
    team ? `${team.name} — Statistiques & Effectif` : 'Équipe',
    team ? `Fiche équipe, effectif, résultats et prochains matchs de ${team.name} sur fpronix.` : '',
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
        <div className="bento-card text-center py-12 text-gray-500">
          Équipe introuvable ou API Football non configurée.
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
    const pos = p.position || 'Autre';
    if (!acc[pos]) acc[pos] = [];
    acc[pos].push(p);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => history.back()} className="text-gray-400 hover:text-gray-200 transition-colors">
          <ChevronLeft size={20} />
        </button>
        {team.logo && (
          <img src={team.logo} alt={team.name} className="w-12 h-12 object-contain" />
        )}
        <div>
          <h1 className="font-display font-bold text-xl text-gray-100">{team.name}</h1>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
            <MapPin size={11} />
            <span>{team.country}</span>
            {team.founded && <span>· Fondé en {team.founded}</span>}
          </div>
        </div>
      </div>

      {/* Stats saison */}
      {stats && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Statistiques saison en cours
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bento-card text-center">
              <p className="text-2xl font-display font-bold text-gray-100">{stats.fixtures?.played?.total ?? '–'}</p>
              <p className="text-xs text-gray-500 mt-1">Matchs joués</p>
            </div>
            <div className="bento-card text-center">
              <p className="text-2xl font-display font-bold text-primary-400">{winPct != null ? `${winPct}%` : '–'}</p>
              <p className="text-xs text-gray-500 mt-1">Victoires</p>
            </div>
            <div className="bento-card text-center">
              <p className="text-2xl font-display font-bold text-gray-100">
                {goalStats?.for?.total?.total ?? '–'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Buts marqués</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bento-card text-center">
              <p className="text-xl font-display font-bold text-gray-100">
                {goalStats?.for?.average?.total ?? '–'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Moy. buts / match</p>
            </div>
            <div className="bento-card text-center">
              <p className="text-xl font-display font-bold text-gray-100">
                {goalStats?.against?.total?.total ?? '–'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Buts encaissés</p>
            </div>
          </div>
        </section>
      )}

      {/* Prochains matchs */}
      {next.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar size={13} />
            Prochains matchs
          </h2>
          <div className="space-y-2">
            {next.map((f) => <FixtureRow key={f.fixture?.id} fixture={f} />)}
          </div>
        </section>
      )}

      {/* Derniers résultats */}
      {last.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Derniers résultats
          </h2>
          <div className="space-y-2">
            {[...last].reverse().map((f) => <FixtureRow key={f.fixture?.id} fixture={f} />)}
          </div>
        </section>
      )}

      {/* Effectif */}
      {squad.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users size={13} />
            Effectif ({squad.length} joueurs)
          </h2>
          {Object.entries(byPosition).map(([pos, players]) => (
            <div key={pos} className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">{pos}</p>
              <div className="space-y-1.5">
                {players.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-800 border border-surface-700">
                    {p.photo && (
                      <img src={p.photo} alt={p.name} className="w-8 h-8 rounded-full object-cover bg-surface-700" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-100 truncate">{p.name}</p>
                      {p.number && <p className="text-xs text-gray-500">#{p.number}</p>}
                    </div>
                    <span className="text-xs text-gray-600">{p.nationality}</span>
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
