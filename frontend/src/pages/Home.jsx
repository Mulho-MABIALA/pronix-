import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight, Sparkles, Calendar, Crown, Wand2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import MatchCard from '../components/matches/MatchCard';
import ToolsCarousel from '../components/home/ToolsCarousel';
import HeroBackground from '../components/home/HeroBackground';
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
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-10 animate-fade-in">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      {!user && (
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] px-6 py-14 md:py-20 text-center">

          <HeroBackground />

          {/* Glow orange complémentaire */}
          <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)' }} />

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-semibold mb-6">
              <Sparkles size={13} className="shrink-0" />
              Plateforme football mondiale
            </div>

            <h1 className="font-display font-bold text-4xl md:text-6xl text-white mb-4 leading-[1.08] tracking-tight"
              style={{ textShadow: '0 2px 24px rgba(0,0,0,0.6)' }}>
              Données football.<br />
              <span className="bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent">
                Pronostics fiables.
              </span>
            </h1>

            <p className="text-gray-200 text-sm md:text-base mb-8 max-w-lg mx-auto leading-relaxed"
              style={{ textShadow: '0 1px 12px rgba(0,0,0,0.7)' }}>
              Statistiques en temps réel, classements et pronostics transparents sur les meilleures ligues du monde.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link to="/inscription" className="btn-primary px-7 text-[15px] shadow-lg shadow-primary-500/20">
                Commencer gratuitement
              </Link>
              <Link to="/matchs" className="btn-secondary px-7 text-[15px]">
                Voir les matchs
              </Link>
            </div>

            <p className="disclaimer mt-6">
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
          <h2 className="section-title flex items-center gap-2.5">
            <span className="w-1 h-4 rounded-full bg-primary-400" />
            Matchs du jour
          </h2>
          <Link to="/matchs" className="flex items-center gap-0.5 text-xs text-primary-400 hover:text-primary-300 transition-colors font-medium">
            Tout voir <ChevronRight size={14} />
          </Link>
        </div>

        {matchesLoading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonMatchCard key={i} />)}
          </div>
        ) : matches.length === 0 ? (
          <div className="card-p text-center py-12">
            <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
              <Calendar size={20} className="text-gray-500" />
            </div>
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
            <h2 className="section-title flex items-center gap-2.5">
              <span className="w-1 h-4 rounded-full bg-primary-400" />
              Top Tipsters
            </h2>
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
            <h2 className="section-title mb-3 flex items-center gap-2.5">
              <span className="w-1 h-4 rounded-full bg-orange-400" />
              Passez Premium
            </h2>
            <div className="relative overflow-hidden card p-5 h-full border-orange-500/10"
              style={{ background: 'linear-gradient(135deg, rgba(9,187,87,0.08) 0%, rgba(249,115,22,0.07) 100%)' }}>
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%)' }} />

              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center mb-4">
                  <Crown size={18} className="text-orange-400" />
                </div>

                <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                  Accédez aux stats avancées, publiez vos pronostics et utilisez l'analyse IA.
                </p>
                <ul className="space-y-2.5 mb-5">
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
                <Link to="/abonnement" className="btn-cta w-full text-sm shadow-lg shadow-orange-500/15">
                  Voir les offres — $8.99/mois
                </Link>
                <p className="disclaimer text-center mt-3">Aucune promesse de gain.</p>
              </div>
            </div>
          </section>
        ) : (
          <section>
            <h2 className="section-title mb-3 flex items-center gap-2.5">
              <span className="w-1 h-4 rounded-full bg-primary-400" />
              Votre espace
            </h2>
            <div className="relative overflow-hidden card-p space-y-4 h-full"
              style={{ background: 'linear-gradient(135deg, rgba(9,187,87,0.05) 0%, transparent 60%)' }}>
              <div className="w-10 h-10 rounded-xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center">
                <Wand2 size={18} className="text-primary-400" />
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
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
