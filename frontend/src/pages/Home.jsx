import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight, Sparkles, Calendar, Crown, Wand2, Search, Zap, Brain } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import MatchCard, { TeamLogo } from '../components/matches/MatchCard';
import ToolsCarousel from '../components/home/ToolsCarousel';
import HeroBackground from '../components/home/HeroBackground';
import TipsterCard from '../components/tipsters/TipsterCard';
import SearchBar from '../components/ui/SearchBar';
import { SkeletonMatchCard, SkeletonTipsterRow } from '../components/ui/SkeletonLoader';
import { usePageMeta } from '../hooks/usePageMeta';
import { getRecentlyViewed } from '../utils/recentlyViewed';

// ── Vus récemment — historique client (localStorage) ────────────────────────
function RecentlyViewedRow({ m }) {
  const { t } = useTranslation();
  const hasScore = ['LIVE', 'FINISHED'].includes(m.status);
  return (
    <Link
      to={`/matchs/${m.id}`}
      className="shrink-0 w-44 rounded-2xl border border-overlay/[0.08] p-3 space-y-2 hover:border-overlay/[0.14] transition-colors"
      style={{ background: 'rgb(var(--overlay-rgb) / 0.03)' }}
    >
      <p className="text-[11px] text-ink-4 truncate">{m.competitionName}</p>
      <div className="flex items-center gap-1.5 min-w-0">
        <TeamLogo logo={m.homeTeamLogo} teamId={m.homeTeamId} name={m.homeTeam} size={16} />
        <p className="text-xs text-ink-2 truncate flex-1">{m.homeTeam}</p>
        {hasScore && <span className="text-xs font-bold text-ink-1 tabular-nums">{m.homeScore}</span>}
      </div>
      <div className="flex items-center gap-1.5 min-w-0">
        <TeamLogo logo={m.awayTeamLogo} teamId={m.awayTeamId} name={m.awayTeam} size={16} />
        <p className="text-xs text-ink-2 truncate flex-1">{m.awayTeam}</p>
        {hasScore && <span className="text-xs font-bold text-ink-1 tabular-nums">{m.awayScore}</span>}
      </div>
      {!hasScore && (
        <p className="text-[11px] text-ink-4">
          {m.scheduledAt ? format(new Date(m.scheduledAt), 'dd MMM HH:mm') : t('home.recentlyViewed.noDate')}
        </p>
      )}
    </Link>
  );
}

export default function Home() {
  const { t } = useTranslation();
  usePageMeta(null, 'Statistiques football en direct, pronostics et analyse des matchs. Suivez vos tipsters favoris sur fpronix.');
  const { user, isPremium } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentMatches] = useState(() => getRecentlyViewed());
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
  const liveCount = matches.filter((m) => m.status === 'LIVE').length;

  const PREMIUM_FEATURES = [
    t('home.premiumFeature1'),
    t('home.premiumFeature2'),
    t('home.premiumFeature3'),
    t('home.premiumFeature4'),
    t('home.premiumFeature5'),
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-10 animate-fade-in">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      {!user && (
        <section className="relative overflow-hidden rounded-3xl border border-overlay/[0.08] px-6 py-8 md:py-20 text-center">

          <HeroBackground />

          {/* Glow orange complémentaire */}
          <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)' }} />

          <div className="relative">
            <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-semibold">
                <Sparkles size={13} className="shrink-0" />
                {t('home.hero.platformBadge')}
              </div>
              {liveCount > 0 && (
                <Link to="/matchs" className="live-pill animate-pop">
                  <span className="w-1.5 h-1.5 rounded-full bg-live-500 animate-pulse" aria-hidden="true" />
                  {liveCount} {t('home.liveMatches')}
                </Link>
              )}
            </div>

            <h1 className="font-display font-bold text-4xl md:text-6xl text-white mb-4 leading-[1.08] tracking-tight"
              style={{ textShadow: '0 2px 24px rgb(var(--surface-900-rgb) / 0.6)' }}>
              {t('home.hero.title')}<br />
              <span className="bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent">
                {t('home.hero.titleHighlight')}
              </span>
            </h1>

            <p className="text-ink-2 text-sm md:text-base mb-8 max-w-lg mx-auto leading-relaxed"
              style={{ textShadow: '0 1px 12px rgb(var(--surface-900-rgb) / 0.7)' }}>
              {t('home.hero.description')}
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link to="/inscription" className="btn-primary px-7 text-[15px] shadow-lg shadow-primary-500/20">
                {t('home.hero.ctaRegister')}
              </Link>
              <Link to="/matchs" className="btn-secondary px-7 text-[15px]">
                {t('home.hero.ctaMatches')}
              </Link>
            </div>

            <p className="disclaimer mt-6">
              {t('home.hero.disclaimer')}
            </p>
          </div>
        </section>
      )}

      {/* ── Carousel outils (visiteurs) ou recherche (connectés) ──── */}
      {user ? (
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-overlay/[0.08] text-left transition-colors hover:border-overlay/[0.14]"
          style={{ background: 'rgb(var(--overlay-rgb) / 0.03)' }}
        >
          <div className="w-9 h-9 rounded-xl bg-primary-500/15 border border-primary-500/20 flex items-center justify-center shrink-0">
            <Search size={16} className="text-primary-400" />
          </div>
          <span className="flex-1 text-sm text-ink-4">
            {t('search.placeholder')}
          </span>
        </button>
      ) : (
        <ToolsCarousel />
      )}

      {/* ── Tes outils IA (utilisateurs connectés) ─────────────────── */}
      {user && (
        <section>
          <h2 className="section-title flex items-center gap-2 mb-3">
            <span className="w-1 h-4 rounded-full bg-orange-400 shrink-0" />
            <span className="truncate">{t('home.aiHub.title')}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to="/outils/machine"
              className="group relative overflow-hidden rounded-2xl border border-overlay/[0.08] p-5 transition-colors hover:border-orange-500/30"
              style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.10) 0%, rgb(var(--surface-900-rgb) / 0.5) 65%)' }}
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center mb-3">
                <Zap size={18} className="text-orange-400" />
              </div>
              <h3 className="font-display font-bold text-base text-ink-1 mb-1">
                {t('home.aiHub.generatorTitle')}
              </h3>
              <p className="text-sm text-ink-4 leading-relaxed mb-3">
                {t('home.aiHub.generatorDesc')}
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-orange-400 group-hover:gap-1.5 transition-all">
                {t('home.aiHub.generatorCta')} <ChevronRight size={14} />
              </span>
            </Link>

            <Link
              to="/mes-paris"
              className="group relative overflow-hidden rounded-2xl border border-overlay/[0.08] p-5 transition-colors hover:border-pink-500/30"
              style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.10) 0%, rgb(var(--surface-900-rgb) / 0.5) 65%)' }}
            >
              <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/25 flex items-center justify-center mb-3">
                <Brain size={18} className="text-pink-400" />
              </div>
              <h3 className="font-display font-bold text-base text-ink-1 mb-1 flex items-center gap-2">
                {t('home.aiHub.coachTitle')}
                {!isPremium && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/25 shrink-0">
                    {t('home.aiHub.premiumBadge')}
                  </span>
                )}
              </h3>
              <p className="text-sm text-ink-4 leading-relaxed mb-3">
                {t('home.aiHub.coachDesc')}
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-pink-400 group-hover:gap-1.5 transition-all">
                {t('home.aiHub.coachCta')} <ChevronRight size={14} />
              </span>
            </Link>
          </div>
        </section>
      )}

      {/* ── Vus récemment ────────────────────────────────────────── */}
      {recentMatches.length > 0 && (
        <section>
          <h2 className="section-title flex items-center gap-2 mb-3">
            <span className="w-1 h-4 rounded-full bg-select-400 shrink-0" />
            <span className="truncate">{t('home.recentlyViewed.title')}</span>
          </h2>
          <div className="flex gap-3 overflow-x-auto overscroll-contain pb-1 -mx-4 px-4 scrollbar-hide">
            {recentMatches.map((m) => <RecentlyViewedRow key={m.id} m={m} />)}
          </div>
        </section>
      )}

      {/* ── Matchs du jour ───────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="section-title flex items-center gap-2 min-w-0">
            <span className="w-1 h-4 rounded-full bg-primary-400 shrink-0" />
            <span className="truncate">{t('home.todayMatches')}</span>
            {liveCount > 0 && (
              <span className="live-pill shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-live-500 animate-pulse" aria-hidden="true" />
                {liveCount} {t('matches.live')}
              </span>
            )}
          </h2>
          <Link to="/matchs" className="flex items-center gap-0.5 text-xs text-primary-400 hover:text-primary-300 transition-colors font-medium shrink-0">
            {t('common.seeAll')} <ChevronRight size={14} />
          </Link>
        </div>

        {matchesLoading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonMatchCard key={i} />)}
          </div>
        ) : matches.length === 0 ? (
          <div className="card-p text-center py-12">
            <div className="w-12 h-12 rounded-full bg-overlay/[0.04] flex items-center justify-center mx-auto mb-3">
              <Calendar size={20} className="text-ink-3" />
            </div>
            <p className="text-ink-3 text-sm">{t('home.noMatchesToday')}</p>
            <Link to="/matchs" className="btn-secondary mt-4 text-sm">
              {t('home.seeOtherDays')}
            </Link>
          </div>
        ) : (
          <div className="card overflow-hidden divide-y divide-overlay/[0.04]">
            {matches.map((match) => <MatchCard key={match.id} match={match} />)}
          </div>
        )}
      </section>

      {/* ── Grille : tipsters + premium ─────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6 items-start">

        {/* Top tipsters */}
        <section className="min-w-0">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="section-title flex items-center gap-2 min-w-0">
              <span className="w-1 h-4 rounded-full bg-primary-400 shrink-0" />
              <span className="truncate">{t('home.topTipsters')}</span>
            </h2>
            <Link to="/tipsters" className="flex items-center gap-0.5 text-xs text-primary-400 hover:text-primary-300 transition-colors font-medium shrink-0">
              {t('tipsters.title')} <ChevronRight size={14} />
            </Link>
          </div>

          <div className="space-y-1.5">
            {leaderboardLoading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonTipsterRow key={i} />)
              : tipsters.length === 0
                ? (
                  <div className="card-p text-center py-6">
                    <p className="text-ink-3 text-sm">{t('home.noTipsters')}</p>
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
          <section className="min-w-0">
            <h2 className="section-title mb-3 flex items-center gap-2.5">
              <span className="w-1 h-4 rounded-full bg-orange-400" />
              {t('home.premiumCta')}
            </h2>
            <div className="relative overflow-hidden card p-5 border-orange-500/10"
              style={{ background: 'linear-gradient(135deg, rgba(26,166,86,0.08) 0%, rgba(249,115,22,0.07) 100%)' }}>
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%)' }} />

              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center mb-4">
                  <Crown size={18} className="text-orange-400" />
                </div>

                <p className="text-sm text-ink-3 mb-4 leading-relaxed">
                  {t('home.premiumDesc')}
                </p>
                <ul className="space-y-2.5 mb-5">
                  {PREMIUM_FEATURES.map((f) => (
                    <li key={f} className="text-sm text-ink-4 flex items-center gap-2.5">
                      <span className="w-4 h-4 rounded-full bg-primary-500/15 border border-primary-500/30 flex items-center justify-center shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/abonnement" className="btn-cta w-full text-sm shadow-lg shadow-orange-500/15">
                  {t('home.premiumBtn')}
                </Link>
                <p className="disclaimer text-center mt-3">{t('pronostics.noPicksDesc')}</p>
              </div>
            </div>
          </section>
        ) : (
          <section className="min-w-0">
            <h2 className="section-title mb-3 flex items-center gap-2.5">
              <span className="w-1 h-4 rounded-full bg-primary-400" />
              {t('home.yourSpace')}
            </h2>
            <div className="relative overflow-hidden card-p space-y-4 h-full"
              style={{ background: 'linear-gradient(135deg, rgba(26,166,86,0.05) 0%, transparent 60%)' }}>
              <div className="w-10 h-10 rounded-xl bg-primary-500/15 border border-primary-500/25 flex items-center justify-center">
                <Wand2 size={18} className="text-primary-400" />
              </div>
              <p className="text-sm text-ink-4 leading-relaxed">
                {t('home.yourSpaceDesc')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/profil"  className="btn-secondary text-sm">{t('home.myProfile')}</Link>
                <Link to="/matchs"  className="btn-primary text-sm">{t('home.predict')}</Link>
              </div>
            </div>
          </section>
        )}
      </div>

      {searchOpen && <SearchBar onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
