import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, subDays, addDays, isToday, isYesterday, isTomorrow, isPast, startOfDay } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import {
  TrendingUp, Search, Bot, Lock, Zap, ChevronLeft, ChevronRight, Info, CheckCircle2, XCircle, Trophy, SlidersHorizontal,
} from 'lucide-react';
import api from '../services/api';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import CompetitionLogo from '../components/ui/CompetitionLogo';
import { OddsChip, ValueBetBadge } from '../components/ui/OddsChip';
import { getOdd, getValueEdge, isValueBet, ODDS_DISCLAIMER } from '../utils/mockOdds';
import InfoTooltip from '../components/ui/InfoTooltip';
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

// Vérifie si un pick s'est réalisé au vu du score final
function pickIsCorrect(pt, h, a) {
  return (
    (pt === '1'      && h > a)  || (pt === 'X'  && h === a) || (pt === '2'  && a > h)  ||
    (pt === '1X'     && h >= a) || (pt === 'X2' && a >= h)  ||
    (pt === 'over25' && h + a > 2.5) || (pt === 'over15' && h + a > 1.5) ||
    (pt === 'btts'   && h > 0 && a > 0)
  );
}

// Calcule {correct, total, pct} sur une liste de matchs terminés
function buildBilan(list) {
  let correct = 0;
  for (const m of list) {
    const pt = m.predictions?.bestPick?.type;
    if (!pt) continue;
    if (pickIsCorrect(pt, m.homeScore, m.awayScore)) correct++;
  }
  const total = list.length;
  return { correct, total, pct: total ? Math.round((correct / total) * 100) : 0 };
}

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
    <div className="rounded-full bg-surface-600 flex items-center justify-center text-ink-3 font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}

// ─── PronoRow — ligne compact style BetMines ───────────────────────────────────

const CONF_COLOR = {
  high:   { color: 'text-primary-400', dot: 'bg-primary-400', bar: 'bg-primary-400' },
  medium: { color: 'text-amber-400',   dot: 'bg-amber-400',   bar: 'bg-amber-400' },
  low:    { color: 'text-ink-3',    dot: 'bg-gray-500',    bar: 'bg-gray-600' },
};

function PronoRow({ match, index, oddsEnabled = true }) {
  const { t } = useTranslation();
  const pred = match.predictions;
  if (!pred?.bestPick) return null;

  const conf = CONF_COLOR[pred.confidence] || CONF_COLOR.low;
  // oddsEnabled=false pour les lignes floutées par le paywall — inutile
  // d'interroger GET /matches/:id/odds pour une donnée que l'utilisateur
  // ne peut de toute façon pas voir (jusqu'à ~60-100 requêtes évitées par
  // page pour un utilisateur gratuit).
  const { data: realOdds } = useOdds(match.id, { enabled: oddsEnabled && match.status === 'SCHEDULED' });

  // Cascade au chargement — même logique que MatchCard.jsx
  const cascadeDelay = typeof index === 'number' ? Math.min(index * 40, 400) : 0;

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
    resultCorrect = pickIsCorrect(pickType, match.homeScore, match.awayScore);
  }

  const timeStr = match.status === 'FINISHED' && match.homeScore !== null
    ? `${match.homeScore}-${match.awayScore}`
    : isLive
    ? (match.minute || 'LIVE')
    : isPastNoScore
    ? 'FT'
    : format(kickoff, 'HH:mm');

  // Flash vert bref quand le score change pendant un match en direct —
  // même logique que MatchCard.jsx, isolée sur le bloc heure/score pour
  // éviter la collision avec animate-cascade-in sur le <Link> parent.
  const prevScoreRef = useRef(`${match.homeScore}-${match.awayScore}`);
  const [scoreFlash, setScoreFlash] = useState(false);
  useEffect(() => {
    const current = `${match.homeScore}-${match.awayScore}`;
    if (isLive && prevScoreRef.current !== current && prevScoreRef.current !== 'null-null') {
      setScoreFlash(true);
      const timer = setTimeout(() => setScoreFlash(false), 700);
      prevScoreRef.current = current;
      return () => clearTimeout(timer);
    }
    prevScoreRef.current = current;
  }, [match.homeScore, match.awayScore, isLive]);

  return (
    <Link
      to={`/matchs/${match.id}`}
      className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 hover:bg-overlay/[0.03] border-b border-overlay/[0.09] last:border-0 transition-colors animate-cascade-in"
      style={{ animationDelay: cascadeDelay ? `${cascadeDelay}ms` : undefined }}
    >
      {/* Heure / Score */}
      <div className={`w-10 shrink-0 text-center rounded-md ${scoreFlash ? 'animate-flash' : ''}`}>
        {isLive ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-live-500">
            <span className="w-1.5 h-1.5 rounded-full bg-live-500 animate-pulse" />
            {timeStr}
          </span>
        ) : isPastNoScore ? (
          <span className="text-xs font-semibold text-ink-4">FT</span>
        ) : (
          <span className={`text-[11px] font-semibold ${isFinished ? 'text-ink-4' : 'text-ink-4'}`}>
            {timeStr}
          </span>
        )}
      </div>

      {/* Équipes */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <TeamLogo logo={match.homeTeamLogo} teamId={match.homeTeamId} name={match.homeTeam} size={15} />
          <span className="text-[13px] font-semibold text-ink-2 truncate">{match.homeTeam}</span>
          {pred.aiGenerated && (
            <span className="shrink-0 inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/20">
              <Bot size={7} />IA
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <TeamLogo logo={match.awayTeamLogo} teamId={match.awayTeamId} name={match.awayTeam} size={15} />
          <span className="text-[13px] text-ink-3 truncate">{match.awayTeam}</span>
        </div>
        {/* Market visible sur mobile seulement */}
        <p className="text-xs text-ink-4 mt-0.5 sm:hidden leading-tight">
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
        <p className="text-xs text-ink-4 leading-tight">{pred.bestPick.market}</p>
        <p className="text-[12px] font-semibold text-ink-3 leading-tight">{pickLabel}</p>
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
      <div className="flex items-center gap-2 px-3 py-2 bg-surface-700/30 border-b border-overlay/[0.05]">
        <CompetitionLogo logo={logo} size={20} />
        <span className="text-[11px] font-bold text-ink-4 uppercase tracking-widest truncate flex-1">
          {name}
        </span>
        <span className="text-xs text-ink-4 shrink-0">{items.length}</span>
      </div>

      {/* Lignes */}
      <div>
        {items.map(({ match }, localIdx) => {
          const absIdx = globalIndex + localIdx;
          const isBlurred = !isPremium && absIdx >= FREE_DAILY_LIMIT;
          return (
            <div key={match.id} className={`relative ${isBlurred ? 'select-none' : ''}`}>
              <div className={isBlurred ? 'blur-sm pointer-events-none' : ''}>
                <PronoRow match={match} index={localIdx} oddsEnabled={!isBlurred} />
              </div>
              {isBlurred && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 z-10
                                bg-surface-800/75 backdrop-blur-[2px]">
                  <Lock size={14} className="text-primary-400 shrink-0" />
                  <p className="text-xs font-semibold text-ink-2 hidden sm:block">
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
  const [leagueIds,    setLeagueIds]    = useState([]);
  const [search,       setSearch]       = useState('');
  const [tabOffset,    setTabOffset]    = useState(0); // décalage fenêtre onglets
  const [filtersOpen,  setFiltersOpen]  = useState(false);
  const chipsRef = useRef(null);

  const activeFilterCount = (activeMarket !== 'all' ? 1 : 0) + (leagueIds.length > 0 ? 1 : 0) + (search ? 1 : 0);

  function toggleLeague(id) {
    setLeagueIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

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

  // Ligues disponibles pour le jour sélectionné (dérivées des matchs déjà chargés)
  const availableCompetitions = useMemo(() => {
    const all = data?.data || [];
    const map = new Map();
    for (const m of all) {
      if (!m.predictions?.bestPick) continue;
      if (isFriendlyMatch(m)) continue;
      const c = m.competition;
      if (c && !map.has(c.id)) map.set(c.id, c);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const filteredMatches = useMemo(() => {
    const all = data?.data || [];
    return all.filter((m) => {
      if (!m.predictions?.bestPick) return false;
      if (isFriendlyMatch(m)) return false;

      // Filtre ligue
      if (leagueIds.length && !leagueIds.includes(m.competition?.id)) return false;

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
  }, [data, search, activeMarket, leagueIds]);

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
        <p className="text-[11px] text-ink-3">
          {t('pronostics.subtitle')}
        </p>
      </div>

      {/* Date tabs + navigation passé/futur */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setTabOffset((o) => o - 1)}
          className="p-1.5 rounded-lg text-ink-3 hover:text-ink-2 hover:bg-overlay/[0.05] shrink-0 transition-colors"
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
                    ? 'text-ink-4 border-overlay/[0.05] hover:text-ink-3 hover:border-overlay/10'
                    : 'text-ink-3 border-overlay/[0.06] hover:text-ink-2 hover:border-overlay/10'
                }`}>
                {formatTabDate(d)}
                {dayPast && <span className="block text-[9px] text-ink-5 leading-none">{t('pronostics.resultsLabel')}</span>}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setTabOffset((o) => o + 1)}
          className="p-1.5 rounded-lg text-ink-3 hover:text-ink-2 hover:bg-overlay/[0.05] shrink-0 transition-colors"
          title={t('pronostics.nextDays')}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Toggle filtres avancés — replié par défaut pour aller droit aux picks */}
      <div>
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[13px] font-semibold transition-colors ${
            filtersOpen
              ? 'bg-select-500/20 border-select-500/40 text-select-400'
              : 'bg-select-500/10 border-select-500/30 text-select-400 hover:bg-select-500/15 hover:border-select-500/40'
          }`}
        >
          <SlidersHorizontal size={14} />
          {t('pronostics.filtersToggle')}
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-select-500 text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
          <ChevronRight size={13} className={`transition-transform ${filtersOpen ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Filtres marché + recherche — repliables */}
      {filtersOpen && (
      <div className="space-y-2">

        {/* Chips marchés */}
        <div className="flex items-center gap-1">
          <InfoTooltip text={t('pronostics.marketGlossary')} size={13} align="left" wide className="shrink-0" />
          <button onClick={() => scrollChips(-1)}
            className="p-1 rounded-lg text-ink-4 hover:text-ink-3 hover:bg-overlay/[0.05] shrink-0 transition-colors">
            <ChevronLeft size={15} />
          </button>

          <div ref={chipsRef} className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1">
            {MARKET_KEYS.map((key) => (
              <button key={key} onClick={() => setActiveMarket(key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                  activeMarket === key
                    ? 'bg-select-500/20 text-select-400 border-select-500/40'
                    : 'text-ink-3 border-overlay/[0.08] hover:text-ink-2 hover:border-overlay/20'
                }`}>
                {key === '1X2' ? t('pronostics.marketFilters.oneXTwo') : key === 'dc' ? t('pronostics.marketFilters.doubleChance') : t(`pronostics.marketFilters.${key}`)}
              </button>
            ))}
          </div>

          <button onClick={() => scrollChips(1)}
            className="p-1 rounded-lg text-ink-4 hover:text-ink-3 hover:bg-overlay/[0.05] shrink-0 transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Chips ligues */}
        {availableCompetitions.length > 0 && (
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-1.5 min-w-max">
              <button onClick={() => setLeagueIds([])}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                  leagueIds.length === 0
                    ? 'bg-select-500/20 text-select-400 border-select-500/40'
                    : 'text-ink-3 border-overlay/[0.08] hover:text-ink-2 hover:border-overlay/20'
                }`}>
                {t('pronostics.allLeagues')}
              </button>
              {availableCompetitions.map((c) => (
                <button key={c.id} onClick={() => toggleLeague(c.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                    leagueIds.includes(c.id)
                      ? 'bg-select-500/20 text-select-400 border-select-500/40'
                      : 'text-ink-3 border-overlay/[0.08] hover:text-ink-2 hover:border-overlay/20'
                  }`}>
                  <CompetitionLogo logo={c.logo} size={14} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Barre de recherche */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('pronostics.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-700/60 border border-overlay/[0.07] text-sm text-ink-2 placeholder:text-ink-4 focus:outline-none focus:border-overlay/20 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-3">
              ✕
            </button>
          )}
        </div>
      </div>
      )}

      {/* Bilans — visible uniquement pour les jours passés */}
      {isPastDay && (() => {
        const finished = filteredMatches.filter((m) => m.status === 'FINISHED' && m.homeScore !== null);
        if (!finished.length) return null;

        const general = buildBilan(finished);
        const finishedValueBets = valueBets.filter((m) => m.status === 'FINISHED' && m.homeScore !== null);
        const valueBilan = finishedValueBets.length ? buildBilan(finishedValueBets) : null;

        const BilanCard = ({ Icon, label, bilan }) => {
          const color = bilan.pct >= 60 ? 'text-primary-400' : bilan.pct >= 40 ? 'text-amber-400' : 'text-red-400';
          const bg    = bilan.pct >= 60 ? 'border-primary-500/20 bg-primary-500/[0.04]' : bilan.pct >= 40 ? 'border-amber-500/20 bg-amber-500/[0.04]' : 'border-red-500/20 bg-red-500/[0.04]';
          return (
            <div className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border ${bg}`}>
              <Icon size={16} className={color} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-ink-2 truncate">{label}</p>
                <p className="text-[11px] text-ink-3">
                  {t('pronostics.correctOutOf', { correct: bilan.correct, total: bilan.total })}
                </p>
              </div>
              <div className={`text-[22px] font-display font-bold shrink-0 ${color}`}>{bilan.pct}%</div>
            </div>
          );
        };

        return (
          <div className="flex flex-col sm:flex-row gap-2">
            <BilanCard Icon={Trophy} label={t('pronostics.dailyRecap')} bilan={general} />
            {valueBilan && (
              <BilanCard Icon={Zap} label={t('pronostics.valueBetsRecap')} bilan={valueBilan} />
            )}
          </div>
        );
      })()}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-surface-700/40 border border-overlay/[0.09]">
        <Info size={12} className="text-ink-4 shrink-0 mt-0.5" />
        <p className="text-xs text-ink-4 leading-relaxed">
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
          <p className="text-ink-4 text-sm font-semibold">{t('pronostics.noPicks')}</p>
          <p className="text-ink-4 text-xs mt-1">
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
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                  {t('pronostics.valueBetsToday')}
                  <InfoTooltip text={t('oddsChip.valueBetTooltip')} size={11} align="left" wide />
                </span>
                <span className="flex-1" />
                <span className="text-[10px] text-amber-500 shrink-0">{valueBets.length}</span>
              </div>
              {valueBets.map((m, i) => (
                <PronoRow key={`vb-${m.id}`} match={m} index={i} />
              ))}
              <p className="text-[9px] text-ink-5 px-3 py-2 border-t border-overlay/[0.09]">
                {ODDS_DISCLAIMER}
              </p>
            </div>
          )}

          {/* En-têtes colonnes (desktop) */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3 px-3 py-1">
            <div className="w-10 shrink-0" />
            <div className="flex-1 text-xs font-bold uppercase tracking-widest text-ink-4">{t('pronostics.columns.teams')}</div>
            <div className="w-10 text-right text-xs font-bold uppercase tracking-widest text-ink-4">{t('pronostics.columns.prob')}</div>
            <div className="w-28 text-right text-xs font-bold uppercase tracking-widest text-ink-4">{t('pronostics.columns.pick')}</div>
            <div className="w-16 text-right text-xs font-bold uppercase tracking-widest text-ink-4">{t('pronostics.columns.odd')}</div>
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
              <p className="text-sm font-semibold text-ink-2 mb-1">
                {t('pronostics.hiddenPicks', { count: filteredMatches.length - FREE_DAILY_LIMIT })}
              </p>
              <p className="text-xs text-ink-3 mb-4">
                {t('pronostics.freeLimitDescShort', { limit: FREE_DAILY_LIMIT })}
              </p>
              <Link to="/abonnement" className="btn-primary px-6 py-2 text-sm inline-flex items-center gap-2">
                <Zap size={14} />
                {t('pronostics.unlockPremium')}
              </Link>
            </div>
          )}

          <p className="text-[10px] text-ink-5 text-center pt-1">
            {t('pronostics.picksAvailable', { count: filteredMatches.length })}
            {!isPremium && filteredMatches.length > FREE_DAILY_LIMIT && ` · ${t('pronostics.freeDisplayed', { limit: FREE_DAILY_LIMIT })}`}
          </p>
        </div>
      )}
    </div>
  );
}
