import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Globe, Calendar, Flame, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import MatchCard from '../components/matches/MatchCard';
import { SkeletonMatchCard } from '../components/ui/SkeletonLoader';
import { usePageMeta } from '../hooks/usePageMeta';

// Mots-clés qui identifient la Coupe du Monde dans le nom de compétition
const WC_KEYWORDS = ['world cup', 'coupe du monde', 'fifa world', 'mondiale'];

function isWorldCup(name) {
  if (!name) return false;
  return WC_KEYWORDS.some((kw) => name.toLowerCase().includes(kw));
}

// Grouper les matchs par date
function groupByDate(matches) {
  const groups = {};
  matches.forEach((m) => {
    const day = format(new Date(m.scheduledAt), 'yyyy-MM-dd');
    if (!groups[day]) groups[day] = [];
    groups[day].push(m);
  });
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

function DateLabel({ dateStr }) {
  const d = new Date(dateStr + 'T00:00:00');
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <Calendar size={12} className="text-ink-4 shrink-0" />
      <span className="text-xs font-semibold text-ink-3 uppercase tracking-wider">
        {format(d, 'EEEE dd MMMM yyyy', { locale: fr })}
      </span>
    </div>
  );
}

// Groupes de la Coupe du Monde 2026 (USA/Canada/Mexique)
const WC_GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const HOST_CITIES = [
  'New York', 'Los Angeles', 'Dallas', 'San Francisco', 'Miami',
  'Seattle', 'Boston', 'Kansas City', 'Houston', 'Atlanta', 'Philadelphia',
  'Toronto', 'Vancouver', 'Guadalajara', 'Mexico City', 'Monterrey',
];

export default function CoupeDuMonde2026() {
  usePageMeta(
    'Coupe du Monde 2026',
    'Suivez tous les matchs de la Coupe du Monde 2026 — USA, Canada, Mexique. Pronostics, statistiques et analyses en direct.',
    { type: 'website', image: 'https://fpronix.com/og-world-cup-2026.png' }
  );

  const [dateRange] = useState(() => {
    // Coupe du Monde 2026 : 11 juin – 19 juillet 2026
    return { start: '2026-06-11', end: '2026-07-19' };
  });

  // Le message affiché (hero + état vide) dépend de la date du jour par
  // rapport au tournoi — avant, ce fut affiché "pas encore disponible avant
  // le coup d'envoi" même APRÈS la fin du Mondial (bug détecté le 29/07/2026,
  // 10 jours après la finale). On calcule la vraie phase pour ne plus jamais
  // montrer un message d'avant-tournoi une fois l'événement terminé.
  const now = new Date();
  const wcPhase = now < new Date(`${dateRange.start}T00:00:00`)
    ? 'upcoming'
    : now > new Date(`${dateRange.end}T23:59:59`)
      ? 'finished'
      : 'live';

  // Récupérer les compétitions pour trouver l'ID du Mondial
  const { data: competitionsData } = useQuery({
    queryKey: ['competitions'],
    queryFn: () => api.get('/matches/competitions').then((r) => r.data),
    staleTime: Infinity,
  });

  const wcCompetitions = (competitionsData?.data || []).filter((c) => isWorldCup(c.name));
  const wcId = wcCompetitions[0]?.id || null;

  // Fetch sur toute la période, plusieurs dates
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: matchesData, isLoading } = useQuery({
    queryKey: ['wc-2026-matches', wcId, today],
    queryFn: async () => {
      if (!wcId) {
        // Pas encore d'ID connu → charger quelques dates proches
        const dates = [0,1,2,3,4,5,6].map((i) =>
          format(addDays(new Date(), i), 'yyyy-MM-dd')
        );
        const results = await Promise.all(
          dates.map((d) => api.get(`/matches?date=${d}&limit=30`).then((r) => r.data).catch(() => null))
        );
        const all = results.flatMap((r) => r?.data || []);
        return all.filter((m) => isWorldCup(m.competition?.name));
      }
      const res = await api.get(`/matches?competitionId=${wcId}&limit=100`);
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const matches = Array.isArray(matchesData) ? matchesData : [];
  const liveMatches = matches.filter((m) => m.status === 'LIVE');
  const groups = groupByDate(matches);

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">

      {/* ── Hero Banner ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden mx-4 mt-6 mb-6 rounded-3xl border border-overlay/[0.08]"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d2040 40%, #0a0b0d 100%)' }}>

        {/* Arrière-plan décoratif */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #1aa656 0%, transparent 70%)' }} />
          <div className="absolute -bottom-16 -left-8 w-48 h-48 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
          {/* Grid pattern subtil */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, white 0, white 1px, transparent 1px, transparent 32px), repeating-linear-gradient(90deg, white 0, white 1px, transparent 1px, transparent 32px)' }} />
        </div>

        <div className="relative px-6 py-10 md:py-14 text-center">
          {/* Badge FIFA */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 text-primary-400 text-xs font-semibold mb-5">
            <Globe size={12} className="shrink-0" />
            FIFA World Cup™
            {wcPhase === 'finished' && <span className="text-ink-4">· Terminée</span>}
          </div>

          <h1 className="font-display font-bold text-3xl md:text-5xl text-white mb-3 leading-tight tracking-tight">
            Coupe du Monde
            <span className="block text-primary-400">2026</span>
          </h1>

          <p className="text-ink-4 text-sm md:text-base mb-6 max-w-md mx-auto">
            48 équipes · 3 pays hôtes · 104 matchs<br />
            <span className="text-ink-3 text-xs">USA · Canada · Mexique · 11 juin – 19 juillet 2026</span>
          </p>

          {/* Live badge */}
          {liveMatches.length > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-live-500/15 border border-live-500/30 text-live-400 font-semibold text-sm">
              <span className="w-2 h-2 rounded-full bg-live-500 animate-pulse" />
              {liveMatches.length} match{liveMatches.length > 1 ? 's' : ''} en direct
            </div>
          )}

          {/* Pays hôtes */}
          <div className="flex items-center justify-center gap-4 mt-6 text-xs text-ink-4">
            <span>🇺🇸 États-Unis</span>
            <span>·</span>
            <span>🇨🇦 Canada</span>
            <span>·</span>
            <span>🇲🇽 Mexique</span>
          </div>
        </div>
      </section>

      {/* ── Infos clés ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 px-4 mb-6">
        {[
          { label: 'Équipes', value: '48', icon: '🏟️' },
          { label: 'Matchs', value: '104', icon: '⚽' },
          { label: 'Villes', value: '16', icon: '📍' },
        ].map((item) => (
          <div key={item.label} className="bento-card p-3 text-center">
            <span className="text-xl block mb-1">{item.icon}</span>
            <p className="font-display font-bold text-xl text-white">{item.value}</p>
            <p className="text-xs text-ink-3 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* ── Matchs ───────────────────────────────────────────────────────────── */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink-2 flex items-center gap-2">
            <Flame size={14} className="text-primary-400" />
            Matchs
          </h2>
          <Link to="/matchs" className="text-xs text-ink-4 hover:text-ink-3 flex items-center gap-1 transition-colors">
            Tous les matchs <ChevronRight size={12} />
          </Link>
        </div>

        {isLoading ? (
          <div className="card divide-y divide-overlay/[0.04]">
            {[...Array(6)].map((_, i) => <SkeletonMatchCard key={i} />)}
          </div>
        ) : matches.length === 0 ? (
          <div className="card p-10 text-center">
            <Globe size={36} className="mx-auto text-ink-5 mb-4" />
            {wcPhase === 'finished' ? (
              <>
                <p className="text-ink-4 font-medium">La Coupe du Monde 2026 est terminée</p>
                <p className="text-ink-4 text-sm mt-2">
                  Retrouve les résultats et statistiques dans l'historique des matchs.
                </p>
              </>
            ) : (
              <>
                <p className="text-ink-4 font-medium">Les matchs ne sont pas encore disponibles</p>
                <p className="text-ink-4 text-sm mt-2">
                  Le calendrier complet sera publié avant le coup d'envoi du 11 juin 2026.
                </p>
              </>
            )}
            <Link to="/matchs"
              className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-xl bg-primary-500/10 border border-primary-500/25 text-primary-400 text-sm hover:bg-primary-500/20 transition-colors">
              Voir tous les matchs disponibles
              <ChevronRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="card divide-y divide-overlay/[0.04] overflow-hidden">
            {groups.map(([dateStr, dayMatches]) => (
              <div key={dateStr}>
                <DateLabel dateStr={dateStr} />
                <div className="divide-y divide-overlay/[0.04]">
                  {dayMatches.map((m, i) => <MatchCard key={m.id} match={m} index={i} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Groupes ──────────────────────────────────────────────────────────── */}
      <section className="px-4 mt-8 mb-8">
        <h2 className="text-sm font-semibold text-ink-2 flex items-center gap-2 mb-4">
          <span className="w-1 h-4 rounded-full bg-primary-400 shrink-0" />
          Groupes · Phase de poules
        </h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {WC_GROUPS.map((g) => (
            <div key={g} className="bento-card p-3 text-center cursor-default hover:-translate-y-0.5 transition-transform">
              <p className="font-display font-bold text-lg text-primary-400">
                Gr. {g}
              </p>
              <p className="text-xs text-ink-4 mt-0.5">4 équipes</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Villes hôtes ─────────────────────────────────────────────────────── */}
      <section className="px-4 mb-10">
        <h2 className="text-sm font-semibold text-ink-2 flex items-center gap-2 mb-4">
          <span className="w-1 h-4 rounded-full bg-blue-400 shrink-0" />
          Villes hôtes
        </h2>
        <div className="flex flex-wrap gap-2">
          {HOST_CITIES.map((city) => (
            <span key={city} className="px-3 py-1.5 rounded-full text-xs font-medium bg-overlay/[0.04] border border-overlay/[0.06] text-ink-4">
              📍 {city}
            </span>
          ))}
        </div>
      </section>

    </div>
  );
}
