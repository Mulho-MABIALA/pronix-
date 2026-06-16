import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import MatchCard from '../components/matches/MatchCard';
import ToolsCarousel from '../components/home/ToolsCarousel';
import TipsterCard from '../components/tipsters/TipsterCard';
import { SkeletonMatchCard, SkeletonTipsterRow } from '../components/ui/SkeletonLoader';

export default function Home() {
  const { user, isPremium } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ['matches', today],
    queryFn: () => api.get(`/matches?date=${today}&limit=6`).then((r) => r.data),
  });

  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['leaderboard-home'],
    queryFn: () => api.get('/tips/leaderboard?limit=5').then((r) => r.data),
  });

  const matches   = matchesData?.data    || [];
  const tipsters  = leaderboardData?.data || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8 animate-fade-in">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      {!user && (
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.06] px-6 py-10 text-center"
          style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #202020 50%, #1a1a1a 100%)' }}>
          {/* Accent glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,184,118,0.12) 0%, transparent 70%)' }} />

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-semibold mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
              Plateforme football mondiale
            </div>

            <h1 className="font-display font-bold text-3xl md:text-4xl text-white mb-3 leading-tight">
              Données football.<br />
              <span className="text-primary-400">Pronostics fiables.</span>
            </h1>

            <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto leading-relaxed">
              Statistiques en temps réel, classements et pronostics sur les meilleures ligues du monde.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link to="/inscription" className="btn-primary px-6">
                Commencer gratuitement
              </Link>
              <Link to="/matchs" className="btn-secondary px-6">
                Voir les matchs
              </Link>
            </div>

            <p className="disclaimer mt-5">
              Ceci n'est pas un conseil financier. Aucune garantie de gain. Jouez de façon responsable.
            </p>
          </div>
        </section>
      )}

      {/* ── Carousel outils ──────────────────────────────────────── */}
      <ToolsCarousel />

      {/* ── Matchs du jour ───────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Matchs du jour</h2>
          <Link to="/matchs" className="flex items-center gap-0.5 text-xs text-primary-400 hover:text-primary-300 transition-colors font-medium">
            Tout voir <ChevronRight size={14} />
          </Link>
        </div>

        {matchesLoading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonMatchCard key={i} />)}
          </div>
        ) : matches.length === 0 ? (
          <div className="card-p text-center py-10">
            <p className="text-3xl mb-3">📅</p>
            <p className="text-gray-500 text-sm">Aucun match programmé aujourd'hui</p>
            <Link to="/matchs" className="btn-secondary mt-4 text-sm">
              Voir les autres jours
            </Link>
          </div>
        ) : (
          <div className="card overflow-hidden divide-y divide-white/[0.04]">
            {matches.map((match) => <MatchCard key={match.id} match={match} />)}
          </div>
        )}
      </section>

      {/* ── Grille : tipsters + premium ─────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Top tipsters */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Top Tipsters</h2>
            <Link to="/tipsters" className="flex items-center gap-0.5 text-xs text-primary-400 hover:text-primary-300 transition-colors font-medium">
              Classement <ChevronRight size={14} />
            </Link>
          </div>

          <div className="space-y-1.5">
            {leaderboardLoading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonTipsterRow key={i} />)
              : tipsters.length === 0
                ? (
                  <div className="card-p text-center py-6">
                    <p className="text-gray-500 text-sm">Aucun tipster classé pour le moment</p>
                  </div>
                )
                : tipsters.map((stat, i) => (
                    <TipsterCard key={stat.id} stats={stat} rank={i + 1} />
                  ))
            }
          </div>
        </section>

        {/* Premium CTA ou activité */}
        {!isPremium ? (
          <section>
            <h2 className="section-title mb-3">Passez Premium</h2>
            <div className="card p-5 h-full"
              style={{ background: 'linear-gradient(135deg, rgba(9,187,87,0.07) 0%, rgba(249,115,22,0.06) 100%)' }}>
              <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                Accédez aux stats avancées, publiez vos pronostics et utilisez l'analyse IA.
              </p>
              <ul className="space-y-2 mb-5">
                {[
                  'Historique H2H complet',
                  'Forme des 10 derniers matchs',
                  'Publication de pronostics',
                  'Analyse IA par match',
                  'Classements en temps réel',
                ].map((f) => (
                  <li key={f} className="text-sm text-gray-400 flex items-center gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-primary-500/15 border border-primary-500/30 flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/abonnement" className="btn-primary w-full text-sm">
                Voir les offres — dès 1 500 FCFA/mois
              </Link>
              <p className="disclaimer text-center mt-3">Aucune promesse de gain.</p>
            </div>
          </section>
        ) : (
          <section>
            <h2 className="section-title mb-3">Votre espace</h2>
            <div className="card-p space-y-3">
              <p className="text-sm text-gray-400">
                Analysez un match avec l'IA, publiez votre pronostic et suivez votre taux de réussite.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/profil"  className="btn-secondary text-sm">Mon profil</Link>
                <Link to="/matchs"  className="btn-primary text-sm">Pronostiquer</Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
