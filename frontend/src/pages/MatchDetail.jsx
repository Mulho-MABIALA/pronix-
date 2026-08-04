import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Lock, ChevronDown, Sparkles, Flag, X, CircleDot, ArrowLeftRight, Square, Loader2 } from 'lucide-react';
import ChatIA from '../components/match/ChatIA';
import LiveAnalysis from '../components/match/LiveAnalysis';
import LiveMarkets from '../components/match/LiveMarkets';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MatchStatusBadge, ResultBadge } from '../components/ui/Badge';
import SuccessRateBar from '../components/ui/SuccessRateBar';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import Alert from '../components/ui/Alert';
import { OddsChip, ValueBetBadge } from '../components/ui/OddsChip';
import { getOddsPanel, isValueBet, getValueEdge, ODDS_DISCLAIMER, getMock1X2 } from '../utils/mockOdds';
import { getPickColor } from '../utils/marketColors';
import { usePageMeta } from '../hooks/usePageMeta';
import { useOdds } from '../hooks/useOdds';
import { addRecentlyViewed, getRecentlyViewed } from '../utils/recentlyViewed';
import { hasSeenHint } from '../utils/featureDiscovery';
import FeatureHint from '../components/ui/FeatureHint';
import { StandingsTable } from './Standings';

// ── Scénarios de score probable ──────────────────────────────────────────────
function ScorelineSection({ match }) {
  const { t } = useTranslation();
  const scorelines = match.predictions?.scorelines;
  if (!scorelines?.length || match.status !== 'SCHEDULED') return null;

  const max = scorelines[0]?.prob || 1;

  return (
    <section className="px-4 pb-1">
      <div className="bento-card p-4 space-y-3">
        <h2 className="text-xs font-semibold text-ink-4 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1 h-3.5 rounded-full bg-violet-400 shrink-0" />
          {t('matchDetail.scorelinesTitle')}
        </h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {scorelines.map(({ score, prob, homeGoals, awayGoals }) => {
            const outcome = homeGoals > awayGoals ? 'home' : homeGoals < awayGoals ? 'away' : 'draw';
            const barColor = outcome === 'home' ? 'bg-primary-500' : outcome === 'draw' ? 'bg-surface-400' : 'bg-primary-400/50';
            const textColor = outcome === 'home' ? 'text-primary-400' : outcome === 'draw' ? 'text-ink-4' : 'text-primary-300';
            return (
              <div key={score} className="flex items-center gap-2">
                <span className={`w-10 text-center text-xs font-bold font-display tabular-nums ${textColor} shrink-0`}>{score}</span>
                <div className="flex-1 h-1.5 bg-surface-600 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} rounded-full`} style={{ width: `${(prob / max) * 100}%` }} />
                </div>
                <span className="text-[11px] text-ink-3 w-7 text-right shrink-0">{prob}%</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-ink-4">{t('matchDetail.poissonDisclaimer')}</p>
      </div>
    </section>
  );
}

// ── Probabilités 1X2 style Visifoot ─────────────────────────────────────────
function ProbabilitySection({ match }) {
  const { t } = useTranslation();
  if (match.status !== 'SCHEDULED') return null;
  const { home, draw, away, predictedHome, predictedAway } = getMock1X2(match.id);

  return (
    <section className="px-4 pb-1">
      <div className="bento-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-ink-4 uppercase tracking-wider">{t('matchDetail.probabilities1x2')}</h2>
          <span className="text-xs text-ink-4 bg-surface-700 px-2 py-0.5 rounded-full">{t('matchDetail.simulatedIndicative')}</span>
        </div>

        {/* Gros chiffres */}
        <div className="grid grid-cols-3 text-center gap-2">
          <div>
            <p className="text-4xl font-display font-bold text-primary-400">{home}%</p>
            <p className="text-xs text-ink-3 mt-1.5">{t('matchDetail.home1Label')}</p>
          </div>
          <div>
            <p className="text-4xl font-display font-bold text-ink-4">{draw}%</p>
            <p className="text-xs text-ink-3 mt-1.5">{t('matchDetail.drawXLabel')}</p>
          </div>
          <div>
            <p className="text-4xl font-display font-bold text-primary-400/70">{away}%</p>
            <p className="text-xs text-ink-3 mt-1.5">{t('matchDetail.away2Label')}</p>
          </div>
        </div>

        {/* Barre tricolore */}
        <div className="flex h-2 rounded-full overflow-hidden">
          <div className="bg-primary-500 transition-all duration-500" style={{ width: `${home}%` }} />
          <div className="bg-surface-500 transition-all duration-500" style={{ width: `${draw}%` }} />
          <div className="bg-primary-400/50 transition-all duration-500" style={{ width: `${away}%` }} />
        </div>

        {/* Score prédit */}
        <div className="flex items-center justify-center gap-3 border-t border-surface-700 pt-3">
          <span className="text-xs text-ink-3">{t('matchDetail.predictedScore')}</span>
          <span className="font-display font-bold text-xl text-ink-2 tabular-nums">
            {predictedHome} — {predictedAway}
          </span>
        </div>
      </div>
    </section>
  );
}

// ── Value Bet AI Explain ─────────────────────────────────────────────────────
function ValueBetExplainButton({ matchId, market, bookOdds, trueProb, isPremium }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);

  const CONFIDENCE_COLOR = { ÉLEVÉE: 'text-green-400', MODÉRÉE: 'text-amber-400', FAIBLE: 'text-red-400' };

  async function fetchExplain() {
    if (data) { setOpen((v) => !v); return; }
    setLoading(true);
    try {
      const res = await api.post(`/matches/${matchId}/value-bet-explain`, { market, bookOdds, trueProb });
      setData(res.data.data);
      setOpen(true);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  if (!isPremium) {
    return (
      <Link to="/abonnement" className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-400 hover:text-amber-300 transition-colors">
        <Lock size={11} />
        {t('matchDetail.whyValueBet')}
      </Link>
    );
  }

  return (
    <div className="mt-1">
      <button
        onClick={fetchExplain}
        disabled={loading}
        className="flex items-center gap-1.5 text-[11px] text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
        {t('matchDetail.whyValueBet')}
      </button>

      {open && data && (
        <div className="mt-2 rounded-xl border border-amber-500/15 bg-amber-500/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-2">{data.edge}</p>
            {data.confidence && (
              <span className={`text-[10px] font-bold ${CONFIDENCE_COLOR[data.confidence] || 'text-ink-4'}`}>
                {t('matchDetail.confidenceLevel', { level: data.confidence })}
              </span>
            )}
          </div>
          <p className="text-xs text-ink-4 leading-relaxed">{data.explanation}</p>
          {data.reasoning?.length > 0 && (
            <ul className="space-y-1">
              {data.reasoning.map((r, i) => (
                <li key={i} className="text-[11px] text-ink-3 flex items-start gap-1.5">
                  <span className="text-amber-400 shrink-0">•</span> {r}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Cotes réelles ou simulées — comparateur style BetMines ───────────────────
function OddsAndValueSection({ match, realOdds, isPremium }) {
  const { t } = useTranslation();
  const pred = match.predictions;
  if (!pred?.bestPick) return null;

  // ── Construire le panel de cotes ──────────────────────────────────────────
  let panel, isReal;

  if (realOdds?.bookmakers?.length) {
    // Sélectionner la colonne selon le pick recommandé
    const pickType = pred.bestPick.type;
    const col = pickType === '2' ? 'away' : pickType === 'X' ? 'draw' : 'home';

    panel = realOdds.bookmakers
      .filter((b) => b[col])
      .map((b) => ({ bookmaker: b.bookmaker, odd: b[col] }))
      .sort((a, b) => b.odd - a.odd);

    isReal = true;
  } else {
    const oddKey = `${match.id}-${pred.bestPick.type}`;
    panel = getOddsPanel(pred.bestPick.prob, oddKey);
    isReal = false;
  }

  const best  = panel[0];
  const edge  = getValueEdge(pred.bestPick.prob, best.odd);
  const value = isValueBet(pred.bestPick.prob, best.odd);

  return (
    <section className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-ink-1 text-sm flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-amber-400 shrink-0" />
          {t('matchDetail.algoPickOdds')}
        </h2>
        <div className="flex items-center gap-2">
          {isReal && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-400 border border-primary-500/20 font-semibold">
              {t('matchDetail.realBookmakers')}
            </span>
          )}
          {value && <ValueBetBadge edge={edge} showEdge size="md" />}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border bg-primary-500/5 border-primary-500/15">
        <div className="min-w-0">
          <p className="text-xs text-ink-3">{t('matchDetail.recommendedPick')}</p>
          <p className={`text-sm font-bold mt-0.5 truncate ${getPickColor(pred.bestPick.type).text}`}>
            {t(`matchDetail.pickMarketLabels.${pred.bestPick.type}`, { defaultValue: pred.bestPick.market || pred.bestPick.label })}
          </p>
        </div>
        <span className="text-xl font-display font-bold text-primary-400 shrink-0 ml-3">{pred.bestPick.prob}%</span>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider mb-2">
          {isReal ? t('matchDetail.oddsComparatorReal') : t('matchDetail.oddsComparatorSimulated')}
        </p>
        <div className="space-y-1.5">
          {panel.map((b, i) => (
            <div key={b.bookmaker} className="flex items-center justify-between text-sm">
              <span className={i === 0 ? 'font-semibold text-ink-2' : 'text-ink-3'}>{b.bookmaker}</span>
              <OddsChip odd={b.odd} size="md" muted={i !== 0} isReal={isReal} />
            </div>
          ))}
        </div>
      </div>

      {/* Value Bet AI Explanation */}
      {value && (
        <ValueBetExplainButton
          matchId={match.id}
          market={pred.bestPick.type}
          bookOdds={best.odd}
          trueProb={pred.bestPick.prob}
          isPremium={isPremium}
        />
      )}

      {isReal
        ? <p className="disclaimer">{t('matchDetail.oddsInfoDisclaimer')}</p>
        : <p className="disclaimer">{ODDS_DISCLAIMER}</p>
      }
    </section>
  );
}

const PREDICTION_KEYS = ['HOME_WIN', 'DRAW', 'AWAY_WIN', 'OVER_2_5', 'UNDER_2_5', 'BTTS_YES', 'BTTS_NO'];

function WhatsAppIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

const FOTMOB_CDN = (id) =>
  id ? `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png` : null;

function TeamLogoLarge({ logo, teamId, name }) {
  const [error, setError] = useState(false);
  const src = logo || FOTMOB_CDN(teamId);

  const inner = (src && !error) ? (
    <>
      <img src={src} alt="" className="h-16 w-16 mx-auto mb-2 object-contain" onError={() => setError(true)} aria-hidden="true" />
      <p className="font-semibold text-ink-1 text-sm leading-tight">{name}</p>
    </>
  ) : (
    <>
      <div className="h-16 w-16 mx-auto mb-2 rounded-full bg-surface-700 flex items-center justify-center text-xl font-bold text-ink-3">
        {name?.charAt(0).toUpperCase()}
      </div>
      <p className="font-semibold text-ink-1 text-sm leading-tight">{name}</p>
    </>
  );

  if (teamId) {
    return (
      <Link to={`/equipes/${teamId}`} className="flex-1 text-center hover:opacity-80 transition-opacity">
        {inner}
      </Link>
    );
  }
  return <div className="flex-1 text-center">{inner}</div>;
}

const RESULT_STYLE = {
  W: 'bg-primary-500 text-white',
  D: 'bg-amber-500 text-black',
  L: 'bg-red-500 text-white',
};

function FormBadge({ result }) {
  if (!result) return null;
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${RESULT_STYLE[result]}`}>
      {result}
    </span>
  );
}

function FormRow({ label, matches }) {
  const { t } = useTranslation();
  if (!matches || matches.length === 0) {
    return <p className="text-ink-4 text-xs">{t('matchDetail.noRecentMatches')}</p>;
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-xs font-medium text-ink-4 truncate">{label}</span>
        <div className="flex gap-1">
          {matches.map((m) => <FormBadge key={m.id} result={m.result} />)}
        </div>
      </div>
      <div className="space-y-1">
        {matches.map((m) => (
          <div key={m.id} className="flex items-center justify-between text-xs text-ink-3">
            <span className="truncate max-w-[160px]">{m.homeTeam} — {m.awayTeam}</span>
            <span className="shrink-0 ml-2 font-mono">{m.homeScore}–{m.awayScore}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function H2HSection({ h2h, homeTeam, awayTeam }) {
  const { t } = useTranslation();
  if (!h2h || h2h.length === 0) {
    return <p className="text-ink-4 text-xs">{t('matchDetail.noH2H')}</p>;
  }

  let homeWins = 0, awayWins = 0, draws = 0;
  h2h.forEach((m) => {
    if (m.homeScore > m.awayScore)      { if (m.homeTeam === homeTeam) homeWins++; else awayWins++; }
    else if (m.homeScore < m.awayScore) { if (m.awayTeam === homeTeam) homeWins++; else awayWins++; }
    else draws++;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <div className="text-center">
          <p className="font-bold text-2xl text-primary-400">{homeWins}</p>
          <p className="text-ink-3 truncate max-w-[80px]">{homeTeam}</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-2xl text-ink-4">{draws}</p>
          <p className="text-ink-3">{t('matchDetail.draws')}</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-2xl text-primary-400">{awayWins}</p>
          <p className="text-ink-3 truncate max-w-[80px]">{awayTeam}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {h2h.map((m) => (
          <div key={m.id} className="flex items-center justify-between text-xs text-ink-4">
            <span className="truncate max-w-[100px]">{m.homeTeam}</span>
            <span className="mx-2 font-mono font-semibold text-ink-2 shrink-0">{m.homeScore}–{m.awayScore}</span>
            <span className="truncate max-w-[100px] text-right">{m.awayTeam}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Barre stat — style BetMines ───────────────────────────────────────────────
function StatBar({ stat }) {
  const home = Number(stat.home) || 0;
  const away = Number(stat.away) || 0;
  const isPct = stat.isPct || stat.key === 'possession';

  const total      = isPct ? 100 : (home + away) || 1;
  const homeBarPct = isPct ? home : Math.round((home / total) * 100);

  const homeDisplay = isPct ? `${home}%` : home;
  const awayDisplay = isPct ? `${away}%` : away;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="min-w-[42px] text-center text-sm font-bold px-2 py-0.5 rounded-md bg-primary-500/20 text-primary-400">
          {homeDisplay}
        </span>
        <span className="flex-1 text-xs text-ink-3 text-center px-3">{stat.label}</span>
        <span className="min-w-[42px] text-center text-sm font-bold text-ink-3">
          {awayDisplay}
        </span>
      </div>
      <div className="h-1 rounded-full bg-surface-600 overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-500"
          style={{ width: `${homeBarPct}%` }}
        />
      </div>
    </div>
  );
}

// ── Onglet ────────────────────────────────────────────────────────────────────
function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
        active
          ? 'border-primary-400 text-primary-400'
          : 'border-transparent text-ink-3 hover:text-ink-2'
      }`}
    >
      {label}
    </button>
  );
}

const REPORT_REASON_KEYS = ['misleading', 'inappropriate', 'spam', 'other'];

function ReportForm({ tipId, onSubmit, onCancel, isPending }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState('');
  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-ink-4">{t('matchDetail.reportReasonLabel')}</p>
        <button onClick={onCancel} className="text-ink-4 hover:text-ink-3">
          <X size={13} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {REPORT_REASON_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setSelected(k)}
            className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
              selected === k
                ? 'border-red-500/50 bg-red-500/10 text-red-400'
                : 'border-surface-600 text-ink-3 hover:border-surface-500'
            }`}
          >
            {t(`matchDetail.reportReasons.${k}`)}
          </button>
        ))}
      </div>
      <button
        onClick={() => selected && onSubmit(t(`matchDetail.reportReasons.${selected}`))}
        disabled={!selected || isPending}
        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40"
      >
        {isPending ? t('matchDetail.sending') : t('matchDetail.sendReport')}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function MatchDetail() {
  const { t, i18n }    = useTranslation();
  const dateLocale     = i18n.language?.startsWith('en') ? enUS : fr;
  const { id }         = useParams();
  const { user, isPremium } = useAuth();
  const queryClient    = useQueryClient();

  const [activeTab,     setActiveTab]     = useState('tips');
  const [prediction,    setPrediction]    = useState('');
  const [analysis,      setAnalysis]      = useState('');
  const [confidence,    setConfidence]    = useState(3);
  const [tipSuccess,    setTipSuccess]    = useState(false);
  const [aiError,       setAiError]       = useState('');
  const [aiMeta,        setAiMeta]        = useState(null);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [reportingTipId, setReportingTipId] = useState(null);
  const [reportedTips,   setReportedTips]   = useState(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['match', id],
    queryFn: () => api.get(`/matches/${id}`).then((r) => r.data),
  });

  const { data: tipsData } = useQuery({
    queryKey: ['tips-match', id],
    queryFn: () => api.get(`/tips/match/${id}`).then((r) => r.data),
  });

  const { data: contextData, isLoading: contextLoading } = useQuery({
    queryKey: ['match-context', id],
    queryFn: () => api.get(`/matches/${id}/context`).then((r) => r.data),
    enabled: activeTab === 'form',
    staleTime: 10 * 60 * 1000,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['match-stats', id],
    queryFn: () => api.get(`/matches/${id}/stats`).then((r) => r.data),
    enabled: activeTab === 'data',
    staleTime: 5 * 60 * 1000,
  });

  const { data: realOdds } = useOdds(id);

  // Évènements live — polling 30s si LIVE
  const { data: eventsData } = useQuery({
    queryKey: ['match-events', id],
    queryFn: () => api.get(`/matches/${id}/events`).then((r) => r.data),
    enabled: !!data?.data && ['LIVE', 'FINISHED'].includes(data?.data?.status) && activeTab === 'events',
    staleTime: 25_000,
    refetchInterval: (query) => query.state.data?.matchStatus === 'LIVE' ? 30_000 : false,
  });

  const { data: standingsData, isLoading: standingsLoading } = useQuery({
    queryKey: ['match-standings', data?.data?.competition?.id],
    queryFn: () => api.get('/matches/standings', {
      params: { competitionId: data.data.competition.id },
    }).then((r) => r.data),
    enabled: activeTab === 'standings' && !!data?.data?.competition?.id,
    staleTime: 5 * 60 * 1000,
  });

  const match = data?.data;
  const tips  = tipsData?.data || [];

  // Historique de consultation — enregistré côté client dès que le match est chargé.
  // Sert aussi à l'onboarding progressif : le hint Comparateur n'apparaît
  // qu'après plusieurs matchs consultés, pas dès l'inscription.
  const [viewedMatchCount, setViewedMatchCount] = useState(0);
  useEffect(() => {
    if (match) {
      addRecentlyViewed(match);
      setViewedMatchCount(getRecentlyViewed().length);
    }
  }, [match?.id]);

  const isFinishedOrLive = match && ['FINISHED', 'LIVE'].includes(match.status);

  const ogTitle = match
    ? `${match.homeTeam} vs ${match.awayTeam}${match.competition?.name ? ` — ${match.competition.name}` : ''} | fpronix`
    : 'Match | fpronix';
  const ogDesc = match
    ? `Pronostics IA, statistiques et cotes pour ${match.homeTeam} vs ${match.awayTeam}${
        match.scheduledAt ? ` · ${format(new Date(match.scheduledAt), 'dd MMM yyyy HH:mm', { locale: dateLocale })}` : ''
      }. Analyse complète sur fpronix.`
    : 'Analyse et pronostics football sur fpronix.';
  const ogImage = match?.homeTeamLogo || match?.awayTeamLogo || undefined;

  usePageMeta(
    match ? `${match.homeTeam} vs ${match.awayTeam}` : 'Match',
    ogDesc,
    { title: ogTitle, description: ogDesc, image: ogImage, type: 'article' },
  );

  // Onglet par défaut : "data" pour les matchs terminés/en direct
  useEffect(() => {
    if (isFinishedOrLive) setActiveTab('data');
  }, [isFinishedOrLive]);

  const submitTip = useMutation({
    mutationFn: (payload) => api.post('/tips', payload),
    onSuccess: () => {
      setTipSuccess(true);
      setPrediction('');
      setAnalysis('');
      setIsAiGenerated(false);
      queryClient.invalidateQueries({ queryKey: ['tips-match', id] });
    },
  });

  const reportTip = useMutation({
    mutationFn: ({ tipId, reason }) => api.post(`/tips/${tipId}/report`, { reason }),
    onSuccess: (_, { tipId }) => {
      setReportedTips((prev) => new Set([...prev, tipId]));
      setReportingTipId(null);
    },
  });

  const generateAi = useMutation({
    mutationFn: () => api.post('/tips/generate-ai', { matchId: id }),
    onSuccess: (res) => {
      const { prediction: pred, confidence: conf, analysis: anal } = res.data.data;
      setPrediction(pred);
      setConfidence(conf);
      setAnalysis(anal || '');
      setAiMeta(res.data.meta);
      setAiError('');
      setTipSuccess(false);
      setIsAiGenerated(true);
      setActiveTab('tips');
    },
    onError: (err) => {
      setAiError(err.response?.data?.message || t('matchDetail.aiGenerationError'));
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <SkeletonCard className="h-36" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!match) return null;

  const isScheduled = match.status === 'SCHEDULED';

  const shareText = `⚽ ${match.homeTeam} ${
    ['FINISHED', 'LIVE'].includes(match.status) ? `${match.homeScore}–${match.awayScore}` : 'vs'
  } ${match.awayTeam}\n${match.competition?.name || ''} — ${
    match.status === 'LIVE' ? `🔴 ${t('matchDetail.liveNow').toUpperCase()}` : match.status === 'FINISHED' ? t('matchDetail.finished') : format(new Date(match.scheduledAt), 'HH:mm dd MMM')
  }\n\nhttps://fpronix.com/matchs/${id}`;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">

      {/* ── Header match ──────────────────────────────────────────────── */}
      <section className="px-4 pt-6 pb-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="comp-label">{match.competition?.name}</span>
            <MatchStatusBadge status={match.status} />
          </div>
          <button
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener')}
            className="flex items-center gap-1.5 text-xs text-green-500 hover:text-green-400 transition-colors"
            aria-label={t('matchDetail.shareWhatsapp')}
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{t('matchDetail.share')}</span>
          </button>
        </div>

        {/* Équipes + Score */}
        <div className="flex items-center justify-between gap-4">
          <TeamLogoLarge logo={match.homeTeamLogo} teamId={match.homeTeamId} name={match.homeTeam} />

          <div className="text-center shrink-0 px-2">
            {['FINISHED', 'LIVE'].includes(match.status) ? (
              <>
                {(() => {
                  const isLiveNow = match.status === 'LIVE';
                  const isDraw    = match.homeScore === match.awayScore;
                  const homeWins  = match.homeScore > match.awayScore;
                  const awayWins  = match.awayScore > match.homeScore;
                  // Vert = vainqueur, ambre = match nul, rouge = en direct (résultat pas encore acquis)
                  const scoreColor = (isWinner) => {
                    if (isLiveNow) return 'text-live-400';
                    if (isDraw) return 'text-amber-400';
                    return isWinner ? 'text-primary-400' : 'text-ink-4';
                  };
                  return (
                    <p className="font-display font-bold text-4xl">
                      <span className={scoreColor(homeWins)}>{match.homeScore}</span>
                      <span className="text-ink-4"> — </span>
                      <span className={scoreColor(awayWins)}>{match.awayScore}</span>
                    </p>
                  );
                })()}
                {match.status === 'LIVE' && (
                  <p className="flex items-center justify-center gap-1.5 mt-1.5">
                    <span className="w-2 h-2 rounded-full bg-live-500 animate-pulse" aria-hidden="true" />
                    <span className="text-sm font-bold text-live-400">
                      {match.minute ? (match.minute === 'HT' ? t('matchDetail.halftime') : match.minute) : t('matchDetail.liveNow')}
                    </span>
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-display font-bold text-2xl text-ink-1">
                  {format(new Date(match.scheduledAt), 'HH:mm')}
                </p>
                <p className="text-xs text-ink-3 mt-1">
                  {format(new Date(match.scheduledAt), 'dd MMM yyyy', { locale: dateLocale })}
                </p>
              </>
            )}
          </div>

          <TeamLogoLarge logo={match.awayTeamLogo} teamId={match.awayTeamId} name={match.awayTeam} />
        </div>
      </section>

      {/* ── Probabilités 1X2 ──────────────────────────────────────────── */}
      <ProbabilitySection match={match} />

      {/* ── Scénarios de score ────────────────────────────────────────── */}
      <ScorelineSection match={match} />

      {/* Onboarding progressif — révélé après plusieurs matchs consultés,
          pas balancé dès l'inscription. */}
      {viewedMatchCount >= 3 && !hasSeenHint('comparateur-after-views') && (
        <div className="px-4">
          <FeatureHint
            hintKey="comparateur-after-views"
            icon={ArrowLeftRight}
            color="fuchsia"
            title={t('matchDetail.comparateurHintTitle')}
            description={t('matchDetail.comparateurHintDesc')}
            to="/comparateur"
            ctaLabel={t('matchDetail.comparateurHintCta')}
          />
        </div>
      )}

      {/* ── Chat IA ───────────────────────────────────────────────────── */}
      {match.status === 'SCHEDULED' && (
        <div className="px-4">
          <ChatIA matchId={match.id} matchLabel={`${match.homeTeam} vs ${match.awayTeam}`} />
        </div>
      )}

      {/* ── Marchés live + Analyse IA Live (Premium) ──────────────────── */}
      {match.status === 'LIVE' && (
        <div className="px-4 space-y-3">
          {isPremium ? (
            <>
              <LiveMarkets matchId={match.id} homeTeam={match.homeTeam} awayTeam={match.awayTeam} />
              <LiveAnalysis matchId={match.id} />
            </>
          ) : (
            <Link to="/abonnement" className="card border-dashed border-surface-600 p-4 flex items-center gap-3 hover:border-primary-500/40 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-live-500/15 flex items-center justify-center shrink-0">
                <Lock size={16} className="text-live-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-1">{t('liveMarkets.title')}</p>
                <p className="text-xs text-ink-4">{t('matchDetail.premiumDataDesc')}</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* ── Onglets — style BetMines ──────────────────────────────────── */}
      <div className="border-b border-overlay/[0.06] overflow-x-auto scrollbar-hide">
        <div className="flex px-4 min-w-max">
          {isFinishedOrLive && (
            <Tab label={t('matchDetail.tabData')} active={activeTab === 'data'} onClick={() => setActiveTab('data')} />
          )}
          {isFinishedOrLive && (
            <Tab label={t('matchDetail.tabEvents')} active={activeTab === 'events'} onClick={() => setActiveTab('events')} />
          )}
          <Tab label={`${t('matchDetail.tabTips')}${tips.length ? ` (${tips.length})` : ''}`} active={activeTab === 'tips'} onClick={() => setActiveTab('tips')} />
          <Tab label={t('matchDetail.tabForm')} active={activeTab === 'form'} onClick={() => setActiveTab('form')} />
          {match.competition?.id && (
            <Tab label={t('matchDetail.tabStandings')} active={activeTab === 'standings'} onClick={() => setActiveTab('standings')} />
          )}
        </div>
      </div>

      {/* ── Contenu des onglets ───────────────────────────────────────── */}
      <div className="px-4 py-5 space-y-5">

        {/* ── Onglet : Données du match (stats) ──────────────────────── */}
        {activeTab === 'data' && (
          <section>
            {statsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="skeleton h-4 w-full rounded" />
                    <div className="skeleton h-1 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : !statsData?.data ? (
              <div className="card-p text-center py-10">
                <p className="text-ink-4 text-sm">{t('matchDetail.statsNotAvailable')}</p>
              </div>
            ) : (
              <div className="card p-4 space-y-4">
                {statsData.data.map((stat, i) => (
                  <StatBar key={stat.key || i} stat={stat} />
                ))}
                {statsData.mock && (
                  <p className="text-[10px] text-ink-5 text-center pt-1">
                    {t('matchDetail.statsEstimatedNote')}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── Onglet : Pronostics ─────────────────────────────────────── */}
        {activeTab === 'tips' && (
          <>
            {/* Cotes réelles ou simulées */}
            <OddsAndValueSection match={match} realOdds={realOdds} isPremium={isPremium} />

            {/* Données premium */}
            {!isPremium && (
              <section className="card border-dashed border-surface-600 p-6 text-center">
                <Lock size={22} className="mx-auto text-ink-3 mb-2" aria-hidden="true" />
                <p className="text-ink-4 font-medium text-sm">{t('matchDetail.premiumDataTitle')}</p>
                <p className="text-ink-3 text-xs mt-1">
                  {t('matchDetail.premiumDataDesc')}
                </p>
                <Link to="/abonnement" className="btn-primary mt-4 text-sm">
                  {t('matchDetail.upgradePremium', { price: '5 150' })}
                </Link>
              </section>
            )}

            {/* ── Carte Analyse IA ── */}
            {user && isPremium && isScheduled && (
              <section className="card overflow-hidden">
                {/* Header dégradé violet */}
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-violet-500/10 to-transparent border-b border-violet-500/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                      <Sparkles size={15} className="text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink-1">{t('matchDetail.aiAnalysis')}</p>
                      <p className="text-xs text-ink-3">{t('matchDetail.aiAnalysisDesc')}</p>
                    </div>
                  </div>
                  {aiMeta && (
                    <span className="text-xs text-ink-4 shrink-0">{t('matchDetail.usedTodayCount', { used: aiMeta.usedToday, limit: aiMeta.dailyLimit })}</span>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {aiError && (
                    <Alert variant="error" onClose={() => setAiError('')}>{aiError}</Alert>
                  )}

                  {!generateAi.isSuccess ? (
                    <button
                      onClick={() => generateAi.mutate()}
                      disabled={generateAi.isPending || (aiMeta && aiMeta.usedToday >= aiMeta.dailyLimit)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-400 hover:bg-violet-500/25 active:scale-[0.98] transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Sparkles size={15} className={generateAi.isPending ? 'animate-spin' : ''} />
                      {generateAi.isPending ? t('matchDetail.analyzing') : t('matchDetail.analyzeMatch')}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
                        <p className="text-xs font-semibold text-violet-400">{t('matchDetail.analysisReady')}</p>
                        {aiMeta && (
                          <span className="text-xs text-ink-4 ml-auto">{t('matchDetail.analysesUsedCount', { used: aiMeta.usedToday, limit: aiMeta.dailyLimit })}</span>
                        )}
                      </div>
                      {analysis && (
                        <div className="bg-violet-500/5 border border-violet-500/10 rounded-xl px-4 py-3">
                          <p className="text-sm text-ink-3 leading-relaxed italic">"{analysis}"</p>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="disclaimer">{t('matchDetail.notFinancialAdvice')}</p>
                </div>
              </section>
            )}

            {/* Invitation à se connecter pour publier */}
            {!user && isScheduled && (
              <section className="card p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-1">{t('matchDetail.publishPromptTitle')}</p>
                  <p className="text-xs text-ink-3 mt-0.5">{t('matchDetail.publishPromptDesc')}</p>
                </div>
                <Link to="/connexion" className="btn-primary text-sm px-4 py-2 shrink-0">
                  {t('matchDetail.loginBtn')}
                </Link>
              </section>
            )}

            {/* Formulaire de pronostic — ouvert à tous les inscrits */}
            {user && isScheduled && (
              <section className="card p-4 space-y-4">
                <h2 className="font-semibold text-ink-1 text-sm">{t('matchDetail.publishTipTitle')}</h2>

                {tipSuccess && (
                  <Alert variant="success" onClose={() => setTipSuccess(false)}>
                    {t('matchDetail.tipPublishedSuccess')}
                  </Alert>
                )}

                <div>
                  <label htmlFor="prediction" className="block text-sm font-medium text-ink-3 mb-1.5">
                    {t('matchDetail.yourPrediction')}
                  </label>
                  <div className="relative">
                    <select
                      id="prediction"
                      value={prediction}
                      onChange={(e) => setPrediction(e.target.value)}
                      className="input appearance-none pr-10"
                    >
                      <option value="">{t('matchDetail.chooseResult')}</option>
                      {PREDICTION_KEYS.map((k) => (
                        <option key={k} value={k}>{t(`matchDetail.predictions.${k}`)}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-3 mb-2">
                    {t('matchDetail.confidenceOutOf5', { n: confidence })}
                  </label>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setConfidence(n)}
                        aria-label={t('matchDetail.confidenceAriaLabel', { n })}
                        className={`w-10 h-10 rounded-lg font-semibold transition-colors ${
                          n <= confidence ? 'bg-primary-500 text-white' : 'bg-surface-700 text-ink-4'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="analysis" className="block text-sm font-medium text-ink-3 mb-1.5">
                    {t('matchDetail.analysisOptional')}
                  </label>
                  <textarea
                    id="analysis"
                    value={analysis}
                    onChange={(e) => setAnalysis(e.target.value)}
                    className="input resize-none h-24"
                    maxLength={500}
                    placeholder={t('matchDetail.analysisPlaceholder')}
                  />
                  <p className="text-xs text-ink-4 mt-1 text-right">{analysis.length}/500</p>
                </div>

                <button
                  onClick={() => submitTip.mutate({ matchId: id, prediction, confidence, analysis: analysis || undefined, isAiGenerated })}
                  disabled={!prediction || submitTip.isPending}
                  className="btn-primary w-full"
                >
                  {submitTip.isPending ? t('matchDetail.publishing') : t('matchDetail.publishTipBtn')}
                </button>
              </section>
            )}

            {/* Liste des pronostics */}
            <section>
              <h2 className="font-semibold text-ink-1 text-sm mb-3">
                {t('matchDetail.tipstersPicksTitle')}{tips.length > 0 ? ` (${tips.length})` : ''}
              </h2>
              <div className="space-y-3">
                {tips.map((tip) => {
                  const displayName = tip.user?.profile?.displayName || tip.user?.username;
                  const stats       = tip.user?.tipsterStats;
                  const predLabel   = t(`matchDetail.predictions.${tip.prediction}`, { defaultValue: tip.prediction });

                  return (
                    <div key={tip.id} className="card p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Link to={`/tipsters/${tip.userId}`} className="flex items-center gap-2 hover:text-primary-300 transition-colors">
                          <div className="h-8 w-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-sm font-bold">
                            {displayName?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-ink-2">{displayName}</span>
                            {tip.isAiGenerated && (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-500/15 text-violet-400 border border-violet-500/20">
                                <Sparkles size={9} />IA
                              </span>
                            )}
                          </div>
                        </Link>
                        <ResultBadge result={tip.result} />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-ink-1">{predLabel}</span>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: tip.confidence || 0 }).map((_, i) => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary-400" aria-hidden="true" />
                          ))}
                        </div>
                      </div>

                      {tip.analysis && (
                        <p className="text-sm text-ink-4 italic">"{tip.analysis}"</p>
                      )}

                      {stats && (
                        <div className="pt-2 border-t border-surface-700">
                          <SuccessRateBar rate={stats.successRate} total={stats.totalTips} size="sm" />
                        </div>
                      )}

                      {/* Signalement */}
                      {user && tip.userId !== user.id && (
                        <div className="pt-2">
                          {reportedTips.has(tip.id) ? (
                            <p className="text-xs text-ink-4">{t('matchDetail.reportSent')}</p>
                          ) : reportingTipId === tip.id ? (
                            <ReportForm
                              tipId={tip.id}
                              onSubmit={(reason) => reportTip.mutate({ tipId: tip.id, reason })}
                              onCancel={() => setReportingTipId(null)}
                              isPending={reportTip.isPending}
                            />
                          ) : (
                            <button
                              onClick={() => setReportingTipId(tip.id)}
                              className="flex items-center gap-1 text-xs text-ink-4 hover:text-red-400 transition-colors"
                            >
                              <Flag size={11} />
                              {t('matchDetail.reportBtn')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {tips.length === 0 && (
                  <div className="card-p text-center py-8">
                    <p className="text-ink-3 text-sm">{t('matchDetail.noTipsYet')}</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* ── Onglet : Évènements live ────────────────────────────────── */}
        {activeTab === 'events' && (
          <section>
            {!eventsData ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-10 w-full rounded-xl" />
                ))}
              </div>
            ) : eventsData.data?.length === 0 ? (
              <div className="card-p text-center py-10">
                <p className="text-ink-3 text-sm">{t('matchDetail.noEventsYet')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {match.status === 'LIVE' && (
                  <div className="flex items-center gap-2 text-live-400 text-xs mb-3">
                    <span className="w-2 h-2 rounded-full bg-live-500 animate-pulse" />
                    {t('matchDetail.autoUpdateNote')}
                  </div>
                )}
                {eventsData.data.map((evt, i) => {
                  const isHome = evt.team === match.homeTeam;
                  const isGoal = evt.type === 'Goal';
                  const isCard = evt.type === 'Card';
                  const isSub  = evt.type?.toLowerCase() === 'subst';
                  const icon = isGoal
                    ? <CircleDot size={14} className="text-primary-400" />
                    : isCard
                    ? <Square size={12} className={evt.detail?.includes('Yellow') ? 'text-yellow-400' : 'text-red-500'} fill="currentColor" />
                    : isSub
                    ? <ArrowLeftRight size={13} className="text-ink-4" />
                    : <CircleDot size={13} className="text-ink-3" />;

                  return (
                    <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-800 border border-surface-700 ${isHome ? '' : 'flex-row-reverse text-right'}`}>
                      <span className="text-xs font-bold text-ink-4 w-8 shrink-0 tabular-nums">
                        {evt.time}{evt.extra ? `+${evt.extra}` : ''}'
                      </span>
                      <span className="shrink-0">{icon}</span>
                      <div className={`flex-1 min-w-0 ${isHome ? '' : 'text-right'}`}>
                        <p className="text-sm font-medium text-ink-1 truncate">{evt.player}</p>
                        {isSub && evt.assist && (
                          <p className="text-xs text-ink-3 truncate">↙ {evt.assist}</p>
                        )}
                        {isGoal && evt.assist && (
                          <p className="text-xs text-ink-3 truncate">{t('matchDetail.assistLabel', { assist: evt.assist })}</p>
                        )}
                        {evt.detail && !isSub && (
                          <p className="text-xs text-ink-4">{evt.detail}</p>
                        )}
                      </div>
                      <span className={`text-xs shrink-0 ${isHome ? 'text-primary-400' : 'text-ink-4'}`}>
                        {isHome ? match.homeTeam?.split(' ')[0] : match.awayTeam?.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── Onglet : Forme & H2H ────────────────────────────────────── */}
        {activeTab === 'form' && (
          <section>
            {contextLoading ? (
              <div className="space-y-3">
                <SkeletonCard className="h-24" />
                <SkeletonCard className="h-24" />
              </div>
            ) : contextData?.data?.locked ? (
              <section className="card border-dashed border-surface-600 p-6 text-center">
                <Lock size={22} className="mx-auto text-ink-3 mb-2" aria-hidden="true" />
                <p className="text-ink-4 font-medium text-sm">{t('matchDetail.premiumDataTitle')}</p>
                <p className="text-ink-3 text-xs mt-1">{t('matchDetail.premiumDataDesc')}</p>
                <Link to="/abonnement" className="btn-primary mt-4 text-sm">
                  {t('matchDetail.upgradePremium', { price: '5 150' })}
                </Link>
              </section>
            ) : !contextData?.data ? (
              <div className="card-p text-center py-8">
                <p className="text-ink-4 text-sm">{t('matchDetail.formDataNotAvailable')}</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormRow label={match.homeTeam} matches={contextData.data.homeForm} />
                  <FormRow label={match.awayTeam} matches={contextData.data.awayForm} />
                </div>
                <div className="card p-4">
                  <p className="text-xs font-semibold text-ink-4 mb-3 uppercase tracking-wider">{t('matchDetail.headToHead')}</p>
                  <H2HSection h2h={contextData.data.h2h} homeTeam={match.homeTeam} awayTeam={match.awayTeam} />
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Onglet : Classement ──────────────────────────────────────── */}
        {activeTab === 'standings' && (
          <section>
            {standingsLoading ? (
              <SkeletonCard className="h-64" />
            ) : (
              <>
                <StandingsTable
                  standings={standingsData?.data?.standings || []}
                  competitionName={match.competition?.name || ''}
                />
                <div className="text-center mt-3">
                  <Link to="/classements" className="text-xs text-primary-400 hover:text-primary-300 font-medium">
                    {t('matchDetail.viewFullStandings')}
                  </Link>
                </div>
              </>
            )}
          </section>
        )}

      </div>
    </div>
  );
}
