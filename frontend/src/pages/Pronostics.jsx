import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, subDays, addDays, isToday, isYesterday, isTomorrow, isPast, startOfDay } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import {
  TrendingUp, Search, Bot, Lock, Zap, ChevronLeft, ChevronRight, Info, CheckCircle2, XCircle, Trophy,
} from 'lucide-react';
import api from '../services/api';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import CompetitionLogo from '../components/ui/CompetitionLogo';
import { OddsChip, ValueBetBadge } from '../components/ui/OddsChip';
import { getOdd, getValueEdge, isValueBet, ODDS_DISCLAIMER } from '../utils/mockOdds';
import { usePageMeta } from '../hooks/usePageMeta';
import { useOdds } from '../hooks/useOdds';
import { useAuth } from '../context/AuthContext';

// ─── Constantes ────────────────────────────────────────────────────────────────

const MARKET_KEYS = ['all', '1X2', 'btts', 'goals', 'dc'];
const MARKET_TYPES = {
  all: null, '1X2': ['1', 'X', '2'], btts: ['btts'], goals: ['over25', 'over15'], dc: ['1X', 'X2'],
};

const FRIENDLY_KEYWORDS = ['friendly', 'friendlies', 'amical', 'amicaux', 'club friendly', 'test match'];
const isFriendlyMatch = (m) =>
  FRIENDLY_KEYWORDS.some((kw) => (m.competition?.name || '').toLowerCase().includes(kw));

const FREE_DAILY_LIMIT = 3;

// ─── TeamLogo ──────────────────────────────────────────────────────────────────

function TeamLogo({ logo, teamId, name, size = 16 }) {
  const [err, setErr] = useState(false);
  const src = logo || (teamId ? `https://images.fotmob.com/image_resources/logo/teamlogo/${teamId}.png` : null);
  if (src && !err) {
    return (
      <img src={src} alt="" aria-hidden="true"
        style={{ width: size, height: size }}
        className="object-contain shrink-0 rounded-sm"
        onError={() => setErr(true)} />
    );
  }
  return (
    <div className="rounded-full bg-surface-600 flex items-center justify-center text-gray-500 font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}

// ─── PronoRow — ligne compact style BetMines ───────────────────────────────────

const CONF_COLOR = {
  high:   { color: 'text-primary-400', dot: 'bg-primary-400', bar: 'bg-primary-400' },
  medium: { color: 'text-amber-400',   dot: 'bg-amber-400',   bar: 'bg-amber-400' },
  low:    { color: 'text-gray-500',    dot: 'bg-gray-500',    bar: 'bg-gray-600' },
};

function PronoRow({ match }) {
  const { t } = useTranslation();
  const pred = match.predictions;
  if (!pred?.bestPick) return null;

  const conf = CONF_COLOR[pred.confidence] || CONF_COLOR.low;
  const { data: realOdds } = useOdds(match.id, { enabled: match.status === 'SCHEDULED' });

  const pickType  = pred.bestPick.type;
  const pickLabel = t(`pronostics.pickShort.${pickType}`, { defaultValue: pred.bestPick.label });
  const col       = pickType === '2' ? 'away' : pickType === 'X' ? 'draw' : 'home';
  const realOdd   = realOdds?.best?.[col] ?? null;
  const isReal    = !!realOdd;
  const odd       = realOdd ?? getOdd(pred.bestPick.prob, `${match.id}-${pickType}`);
  const edge      = getValueEdge(pred.bestPick.prob, odd);
  const value     = isValueBet(pred.bestPick.prob, odd);

  // Infère le vrai statut : si l'heure est passée depuis +2h, le match est terminé même si la DB dit SCHEDULED/LIVE
  const kickoff       = new Date(match.scheduledAt);
  const reallyPast    = kickoff < new Date(Date.now() - 2 * 60 * 60 * 1000);
  const isFinished    = match.status === 'FINISHED' || (reallyPast && match.status !== 'LIVE');
  const isLive        = match.status === 'LIVE' && !reallyPast;
  const isPastNoScore = reallyPast && match.homeScore === null; // terminé mais pas de score dispo

  // Résultat pour matchs terminés
  let resultCorrect = null;
  if (isFinished && match.homeScore !== null) {
    const hWon = match.homeScore > match.awayScore;
    const aWon = match.awayScore > match.homeScore;
    const draw = match.homeScore === match.awayScore;
    const t    = pickType;
    resultCorrect =
      (t === '1'      && hWon) || (t === 'X'  && draw) || (t === '2'  && aWon) ||
      (t === '1X'     && (hWon || draw)) || (t === 'X2' && (aWon || draw)) ||
      (t === 'over25' && (match.homeScore + match.awayScore) > 2.5) ||
      (t === 'over15' && (match.homeScore + match.awayScore) > 1.5) ||
      (t === 'btts'   && match.homeScore > 0 && match.awayScore > 0);
  }

  const timeStr = match.status === 'FINISHED' && match.homeScore !== null
    ? `${match.homeScore}-${match.awayScore}`
    : isLive
    ? (match.minute || 'LIVE')
    : isPastNoScore
    ? 'FT'
    : format(kickoff, 'HH:mm');

  return (
    <Link
      to={`/matchs/${match.id}`}
      className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 hover:bg-white/[0.03] border-b border-white/[0.04] last:border-0 transition-colors"
    >
      {/* Heure / Score */}
      <div className="w-10 shrink-0 text-center">
        {isLive ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-live-500">
            <span className="w-1.5 h-1.5 rounded-full bg-live-500 animate-pulse" />
            {timeStr}
          </span>
        ) : isPastNoScore ? (
          <span className="text-[10px] font-semibold text-gray-600">FT</span>
        ) : (
          <span className={`text-[11px] font-semibold ${isFinished ? 'text-gray-600' : 'text-gray-400'}`}>
            {timeStr}
          </span>
        )}
      </div>

      {/* Équipes */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <TeamLogo logo={match.homeTeamLogo} teamId={match.homeTeamId} name={match.homeTeam} size={15} />
          <span className="text-[13px] font-semibold text-gray-200 truncate">{match.homeTeam}</span>
          {pred.aiGenerated && (
            <span className="shrink-0 inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/20">
              <Bot size={7} />IA
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <TeamLogo logo={match.awayTeamLogo} teamId={match.awayTeamId} name={match.awayTeam} size={15} />
          <span className="text-[13px] text-gray-500 truncate">{match.awayTeam}</span>
        </div>
        {/* Market visible sur mobile seulement */}
        <p className="text-[10px] text-gray-600 mt-0.5 sm:hidden leading-tight">
          {pred.bestPick.market ? `${pred.bestPick.market} · ` : ''}{pickLabel}
        </p>
      </div>

      {/* Prob % + indicateur résultat */}
      <div className="shrink-0 w-10 text-right">
        <span className={`text-[13px] font-bold ${conf.color}`}>{pred.bestPick.prob}%</span>
        {resultCorrect !== null && (
          <span className={`block text-[11px] font-bold ${resultCorrect ? 'text-primary-400' : 'text-red-400'}`}>
            {resultCorrect ? '✓' : '✗'}
          </span>
        )}
      </div>

      {/* Pick (desktop) */}
      <div className="shrink-0 w-28 hidden sm:block text-right">
        <p className="text-[10px] text-gray-600 leading-tight">{pred.bestPick.market}</p>
        <p className="text-[12px] font-semibold text-gray-300 leading-tight">{pickLabel}</p>
      </div>

      {/* Cote + value badge */}
      <div className="shrink-0 w-16 text-right flex flex-col items-end gap-0.5">
        <OddsChip odd={odd} isReal={isReal} />
        {value && <ValueBetBadge edge={edge} />}
      </div>
    </Link>
  );
}

// ─── CompetitionGroup ──────────────────────────────────────────────────────────

function CompetitionGroup({ name, logo, items, isPremium, globalIndex }) {
  const { t } = useTranslation();
  return (
    <div className="bento-card overflow-hidden p-0">
      {/* En-tête compétition */}
      <div className="flex items-center gap-2 px-3 py-2 bg-surface-700/30 border-b border-white/[0.05]">
        <CompetitionLogo logo={logo} size={20} />
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest truncate flex-1">
          {name}
        </span>
        <span className="text-[10px] text-gray-600 shrink-0">{items.length}</span>
      </div>

      {/* Lignes */}
      <div>
        {items.map(({ match }, localIdx) => {
          const absIdx = globalIndex + localIdx;
          const isBlurred = !isPremium && absIdx >= FREE_DAILY_LIMIT;
          return (
            <div key={match.id} className={`relative ${isBlurred ? 'select-none' : ''}`}>
              <div className={isBlurred ? 'blur-sm pointer-events-none' : ''}>
                <PronoRow match={match} />
              </div>
              {isBlurred && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 z-10
                                bg-surface-800/75 backdrop-blur-[2px]">
                  <Lock size={14} className="text-primary-400 shrink-0" />
                  <p className="text-xs font-semibold text-gray-200 hidden sm:block">
                    {t('pronostics.freeLimitReached')}
                  </p>
                  <Link to="/abonnement" className="btn-primary text-xs py-1 px-3">
                    {t('common.premium')}
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────────

export default function Pronostics() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;

  usePageMeta(
    t('pronostics.title'),
    'Pronostics football du jour avec probabilités 1X2, value bets et picks algorithmiques. Analyse IA des matchs.',
  );

  const formatTabDate = (d) => {
    if (isToday(d))     return t('common.today');
    if (isYesterday(d)) return t('common.yesterday');
    if (isTomorrow(d))  return t('common.tomorrow');
    return format(d, 'EEE dd', { locale: dateLocale });
  };

  const { isPremium } = useAuth();
  const [date,         setDate]         = useState(new Date());
  const [activeMarket, setActiveMarket] = useState('all');
  const [search,       setSearch]       = useState('');
  const [tabOffset,    setTabOffset]    = useState(0); // décalage fenêtre onglets
  const chipsRef = useRef(null);

  const dateStr = format(date, 'yyyy-MM-dd');
  const isPastDay = isPast(startOfDay(addDays(date, 1))) && !isToday(date);

  // Fenêtre de 5 onglets centrée sur today + offset
  // offset négatif = passé, offset positif = futur
  const tabs = Array.from({ length: 5 }, (_, i) => addDays(new Date(), tabOffset - 2 + i));

  const { data, isLoading } = useQuery({
    queryKey: ['pronostics', dateStr],
    queryFn: () => api.get(`/matches?date=${dateStr}&limit=100`).then((r) => r.data),
  });

  // ── Filtres ────────────────────────────────────────────────────────────────

  const filteredMatches = useMemo(() => {
    const all = data?.data || [];
    return all.filter((m) => {
      if (!m.predictions?.bestPick) return false;
      if (isFriendlyMatch(m)) return false;

      // Recherche texte
      if (search) {
        const q = search.toLowerCase();
        if (
          !m.homeTeam.toLowerCase().includes(q) &&
          !m.awayTeam.toLowerCase().includes(q) &&
          !(m.competition?.name || '').toLowerCase().includes(q)
        ) return false;
      }

      // Filtre marché
      if (activeMarket !== 'all') {
        const types = MARKET_TYPES[activeMarket];
        if (types && !types.includes(m.predictions.bestPick.type)) return false;
      }

      return true;
    });
  }, [data, search, activeMarket]);

  // ── Value bets ─────────────────────────────────────────────────────────────

  const valueBets = useMemo(
    () =>
      filteredMatches.filter((m) => {
        const p = m.predictions?.bestPick;
        if (!p) return false;
        return isValueBet(p.prob, getOdd(p.prob, `${m.id}-${p.type}`));
      }),
    [filteredMatches],
  );

  // ── Groupement par compétition avec index global (pour paywall) ────────────

  const grouped = useMemo(() => {
    const map = new Map();
    for (const m of filteredMatches) {
      const key = m.competition?.name || t('common.other');
      if (!map.has(key)) map.set(key, { logo: m.competition?.logo || null, items: [] });
      map.get(key).items.push({ match: m });
    }
    return [...map.entries()]; // [ [compName, {logo, items}], ... ]
  }, [filteredMatches]);

  // Index absolu cumulé pour le paywall
  const groupsWithIndex = useMemo(() => {
    let idx = 0;
    return grouped.map(([name, { logo, items }]) => {
      const startIdx = idx;
      idx += items.length;
      return { name, logo, items, startIdx };
    });
  }, [grouped]);

  // ── Scroll chips ───────────────────────────────────────────────────────────

  const scrollChips = (dir) => {
    if (chipsRef.current) chipsRef.current.scrollBy({ left: dir * 120, behavior: 'smooth' });
  };

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto py-5 space-y-4 px-3 sm:px-4">

      {/* En-tête */}
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <TrendingUp size={17} className="text-primary-400" />
          <h1 className="section-title">{t('pronostics.title')}</h1>
        </div>
        <p className="text-[11px] text-gray-500">
          {t('pronostics.subtitle')}
        </p>
      </div>

      {/* Date tabs + navigation passé/futur */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setTabOffset((o) => o - 1)}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.05] shrink-0 transition-colors"
          title={t('pronostics.prevDays')}
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1">
          {tabs.map((d, i) => {
            const dStr    = format(d, 'yyyy-MM-dd');
            const sel     = dStr === dateStr;
            const dayPast = isPast(startOfDay(addDays(d, 1))) && !isToday(d);
            return (
              <button key={i} onClick={() => setDate(d)}
                className={`shrink-0 px-3 py-2 rounded-lg text-[12px] font-semibold border transition-all ${
                  sel
                    ? 'bg-select-500/15 text-select-400 border-select-500/30'
                    : dayPast
                    ? 'text-gray-600 border-white/[0.05] hover:text-gray-400 hover:border-white/10'
                    : 'text-gray-500 border-white/[0.06] hover:text-gray-300 hover:border-white/10'
                }`}>
                {formatTabDate(d)}
                {dayPast && <span className="block text-[9px] text-gray-700 leading-none">{t('pronostics.resultsLabel')}</span>}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setTabOffset((o) => o + 1)}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.05] shrink-0 transition-colors"
          title={t('pronostics.nextDays')}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Filtres marché + recherche */}
      <div className="space-y-2">

        {/* Chips marchés */}
        <div className="flex items-center gap-1">
          <button onClick={() => scrollChips(-1)}
            className="p-1 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/[0.05] shrink-0 transition-colors">
            <ChevronLeft size={15} />
          </button>

          <div ref={chipsRef} className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1">
            {MARKET_KEYS.map((key) => (
              <button key={key} onClick={() => setActiveMarket(key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                  activeMarket === key
                    ? 'bg-select-500/20 text-select-400 border-select-500/40'
                    : 'text-gray-500 border-white/[0.08] hover:text-gray-300 hover:border-white/20'
                }`}>
                {key === '1X2' ? t('pronostics.marketFilters.oneXTwo') : key === 'dc' ? t('pronostics.marketFilters.doubleChance') : t(`pronostics.marketFilters.${key}`)}
              </button>
            ))}
          </div>

          <button onClick={() => scrollChips(1)}
            className="p-1 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/[0.05] shrink-0 transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('pronostics.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-700/60 border border-white/[0.07] text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-white/20 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Bilan du jour — visible uniquement pour les jours passés */}
      {isPastDay && (() => {
        const finished = filteredMatches.filter((m) => m.status === 'FINISHED' && m.homeScore !== null);
        if (!finished.length) return null;
        let correct = 0;
        for (const m of finished) {
          const pt = m.predictions?.bestPick?.type;
          const h = m.homeScore, a = m.awayScore;
          if (!pt) continue;
          const ok =
            (pt === '1'      && h > a)  || (pt === 'X'  && h === a) || (pt === '2'  && a > h)  ||
            (pt === '1X'     && h >= a) || (pt === 'X2' && a >= h)  ||
            (pt === 'over25' && h + a > 2.5) || (pt === 'over15' && h + a > 1.5) ||
            (pt === 'btts'   && h > 0 && a > 0);
          if (ok) correct++;
        }
        const pct = Math.round((correct / finished.length) * 100);
        const color = pct >= 60 ? 'text-primary-400' : pct >= 40 ? 'text-amber-400' : 'text-red-400';
        const bg    = pct >= 60 ? 'border-primary-500/20 bg-primary-500/[0.04]' : pct >= 40 ? 'border-amber-500/20 bg-amber-500/[0.04]' : 'border-red-500/20 bg-red-500/[0.04]';
        return (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${bg}`}>
            <Trophy size={16} className={color} />
            <div className="flex-1">
              <p className="text-[12px] font-bold text-gray-200">{t('pronostics.dailyRecap')}</p>
              <p className="text-[11px] text-gray-500">
                {t('pronostics.correctOutOf', { correct, total: finished.length })}
              </p>
            </div>
            <div className={`text-[22px] font-display font-bold ${color}`}>{pct}%</div>
            <div className="flex gap-1">
              {finished.map((m, i) => {
                const pt = m.predictions?.bestPick?.type;
                const h = m.homeScore, a = m.awayScore;
                const ok =
                  (pt === '1' && h > a) || (pt === 'X' && h === a) || (pt === '2' && a > h) ||
                  (pt === '1X' && h >= a) || (pt === 'X2' && a >= h) ||
                  (pt === 'over25' && h + a > 2.5) || (pt === 'over15' && h + a > 1.5) ||
                  (pt === 'btts' && h > 0 && a > 0);
                return (
                  <div key={i} className={`w-2 h-2 rounded-full ${ok ? 'bg-primary-400' : 'bg-red-400'}`} />
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-surface-700/40 border border-white/[0.04]">
        <Info size={12} className="text-gray-600 shrink-0 mt-0.5" />
        <p className="text-[10px] text-gray-600 leading-relaxed">
          {t('pronostics.disclaimerAuto')}
        </p>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} className="h-32" />)}
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="bento-card text-center py-12">
          <p className="text-3xl mb-3">📊</p>
          <p className="text-gray-400 text-sm font-semibold">{t('pronostics.noPicks')}</p>
          <p className="text-gray-600 text-xs mt-1">
            {search
              ? t('pronostics.noResultsSearch')
              : t('pronostics.autoCalc')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">

          {/* Value bets en tête */}
          {valueBets.length > 0 && (
            <div className="bento-card overflow-hidden p-0">
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border-b border-amber-500/20">
                <Zap size={11} className="text-amber-400 shrink-0" />
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest flex-1">
                  {t('pronostics.valueBetsToday')}
                </span>
                <span className="text-[10px] text-amber-500 shrink-0">{valueBets.length}</span>
              </div>
              {valueBets.map((m) => (
                <PronoRow key={`vb-${m.id}`} match={m} />
              ))}
              <p className="text-[9px] text-gray-700 px-3 py-2 border-t border-white/[0.04]">
                {ODDS_DISCLAIMER}
              </p>
            </div>
          )}

          {/* En-têtes colonnes (desktop) */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3 px-3 py-1">
            <div className="w-10 shrink-0" />
            <div className="flex-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">{t('pronostics.columns.teams')}</div>
            <div className="w-10 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t('pronostics.columns.prob')}</div>
            <div className="w-28 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t('pronostics.columns.pick')}</div>
            <div className="w-16 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">{t('pronostics.columns.odd')}</div>
          </div>

          {/* Groupes par compétition */}
          {groupsWithIndex.map(({ name, logo, items, startIdx }) => (
            <CompetitionGroup
              key={name}
              name={name}
              logo={logo}
              items={items}
              isPremium={isPremium}
              globalIndex={startIdx}
            />
          ))}

          {/* Message paywall global */}
          {!isPremium && filteredMatches.length > FREE_DAILY_LIMIT && (
            <div className="bento-card text-center py-6">
              <Lock size={22} className="text-primary-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-200 mb-1">
                {t('pronostics.hiddenPicks', { count: filteredMatches.length - FREE_DAILY_LIMIT })}
              </p>
              <p className="text-xs text-gray-500 mb-4">
                {t('pronostics.freeLimitDescShort', { limit: FREE_DAILY_LIMIT })}
              </p>
              <Link to="/abonnement" className="btn-primary px-6 py-2 text-sm inline-flex items-center gap-2">
                <Zap size={14} />
                {t('pronostics.unlockPremium')}
              </Link>
            </div>
          )}

          <p className="text-[10px] text-gray-700 text-center pt-1">
            {t('pronostics.picksAvailable', { count: filteredMatches.length })}
            {!isPremium && filteredMatches.length > FREE_DAILY_LIMIT && ` · ${t('pronostics.freeDisplayed', { limit: FREE_DAILY_LIMIT })}`}
          </p>
        </div>
      )}
    </div>
  );
}
