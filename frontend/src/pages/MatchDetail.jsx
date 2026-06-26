import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Lock, ChevronDown, Sparkles, Flag, X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MatchStatusBadge, ResultBadge } from '../components/ui/Badge';
import SuccessRateBar from '../components/ui/SuccessRateBar';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import Alert from '../components/ui/Alert';
import { OddsChip, ValueBetBadge } from '../components/ui/OddsChip';
import { getOddsPanel, isValueBet, getValueEdge, ODDS_DISCLAIMER } from '../utils/mockOdds';

const PICK_MARKET_LABELS = {
  '1': 'Victoire domicile', 'X': 'Match nul', '2': 'Victoire extérieur',
  '1X': 'Double chance 1X', 'X2': 'Double chance X2',
  over25: 'Plus de 2.5 buts', over15: 'Plus de 1.5 buts', btts: 'Les 2 équipes marquent',
};

// ── Cotes simulées & value bet — comparateur style BetMines ───────────────────
function OddsAndValueSection({ match }) {
  const pred = match.predictions;
  if (!pred?.bestPick) return null;

  const oddKey = `${match.id}-${pred.bestPick.type}`;
  const panel  = getOddsPanel(pred.bestPick.prob, oddKey);
  const best   = panel[0];
  const edge   = getValueEdge(pred.bestPick.prob, best.odd);
  const value  = isValueBet(pred.bestPick.prob, best.odd);

  return (
    <section className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-gray-100 text-sm flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-amber-400 shrink-0" />
          Pronostic algorithmique & cotes
        </h2>
        {value && <ValueBetBadge edge={edge} showEdge size="md" />}
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border bg-primary-500/5 border-primary-500/15">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Pick recommandé</p>
          <p className="text-sm font-semibold text-gray-100 mt-0.5 truncate">
            {PICK_MARKET_LABELS[pred.bestPick.type] || pred.bestPick.market || pred.bestPick.label}
          </p>
        </div>
        <span className="text-xl font-display font-bold text-primary-400 shrink-0 ml-3">{pred.bestPick.prob}%</span>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Comparateur de cotes (simulé)
        </p>
        <div className="space-y-1.5">
          {panel.map((b, i) => (
            <div key={b.bookmaker} className="flex items-center justify-between text-sm">
              <span className={i === 0 ? 'font-semibold text-gray-200' : 'text-gray-500'}>{b.bookmaker}</span>
              <OddsChip odd={b.odd} size="md" muted={i !== 0} />
            </div>
          ))}
        </div>
      </div>

      <p className="disclaimer">{ODDS_DISCLAIMER}</p>
    </section>
  );
}

const PREDICTIONS = [
  { value: 'HOME_WIN',   label: '1 — Victoire domicile' },
  { value: 'DRAW',       label: 'X — Nul' },
  { value: 'AWAY_WIN',   label: '2 — Victoire extérieur' },
  { value: 'OVER_2_5',   label: '+2.5 buts' },
  { value: 'UNDER_2_5',  label: '-2.5 buts' },
  { value: 'BTTS_YES',   label: 'Les deux équipes marquent' },
  { value: 'BTTS_NO',    label: 'Les deux équipes ne marquent pas toutes' },
];

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

  if (src && !error) {
    return (
      <div className="flex-1 text-center">
        <img src={src} alt="" className="h-16 w-16 mx-auto mb-2 object-contain" onError={() => setError(true)} aria-hidden="true" />
        <p className="font-semibold text-gray-100 text-sm leading-tight">{name}</p>
      </div>
    );
  }
  return (
    <div className="flex-1 text-center">
      <div className="h-16 w-16 mx-auto mb-2 rounded-full bg-surface-700 flex items-center justify-center text-xl font-bold text-gray-500">
        {name?.charAt(0).toUpperCase()}
      </div>
      <p className="font-semibold text-gray-100 text-sm leading-tight">{name}</p>
    </div>
  );
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
  if (!matches || matches.length === 0) {
    return <p className="text-gray-600 text-xs">Aucun match récent disponible</p>;
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-xs font-medium text-gray-400 truncate">{label}</span>
        <div className="flex gap-1">
          {matches.map((m) => <FormBadge key={m.id} result={m.result} />)}
        </div>
      </div>
      <div className="space-y-1">
        {matches.map((m) => (
          <div key={m.id} className="flex items-center justify-between text-xs text-gray-500">
            <span className="truncate max-w-[160px]">{m.homeTeam} — {m.awayTeam}</span>
            <span className="shrink-0 ml-2 font-mono">{m.homeScore}–{m.awayScore}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function H2HSection({ h2h, homeTeam, awayTeam }) {
  if (!h2h || h2h.length === 0) {
    return <p className="text-gray-600 text-xs">Aucune confrontation directe disponible</p>;
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
          <p className="text-gray-500 truncate max-w-[80px]">{homeTeam}</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-2xl text-gray-400">{draws}</p>
          <p className="text-gray-500">Nuls</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-2xl text-primary-400">{awayWins}</p>
          <p className="text-gray-500 truncate max-w-[80px]">{awayTeam}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {h2h.map((m) => (
          <div key={m.id} className="flex items-center justify-between text-xs text-gray-400">
            <span className="truncate max-w-[100px]">{m.homeTeam}</span>
            <span className="mx-2 font-mono font-semibold text-gray-200 shrink-0">{m.homeScore}–{m.awayScore}</span>
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
        <span className="flex-1 text-xs text-gray-500 text-center px-3">{stat.label}</span>
        <span className="min-w-[42px] text-center text-sm font-bold text-gray-300">
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
          : 'border-transparent text-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  );
}

const REPORT_REASONS = [
  'Contenu trompeur ou fausse information',
  'Contenu inapproprié ou offensant',
  'Spam ou publicité',
  'Autre comportement abusif',
];

function ReportForm({ tipId, onSubmit, onCancel, isPending }) {
  const [selected, setSelected] = useState('');
  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-400">Motif du signalement</p>
        <button onClick={onCancel} className="text-gray-600 hover:text-gray-400">
          <X size={13} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {REPORT_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setSelected(r)}
            className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
              selected === r
                ? 'border-red-500/50 bg-red-500/10 text-red-400'
                : 'border-surface-600 text-gray-500 hover:border-surface-500'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <button
        onClick={() => selected && onSubmit(selected)}
        disabled={!selected || isPending}
        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40"
      >
        {isPending ? 'Envoi…' : 'Envoyer le signalement'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function MatchDetail() {
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

  const match = data?.data;
  const tips  = tipsData?.data || [];

  const isFinishedOrLive = match && ['FINISHED', 'LIVE'].includes(match.status);

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
      setAiError(err.response?.data?.message || 'Erreur lors de la génération IA');
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
    match.status === 'LIVE' ? '🔴 EN DIRECT' : match.status === 'FINISHED' ? 'Terminé' : format(new Date(match.scheduledAt), 'HH:mm dd MMM')
  }\n\nhttps://statistiquefoot.sn/matchs/${id}`;

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
            aria-label="Partager sur WhatsApp"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Partager</span>
          </button>
        </div>

        {/* Équipes + Score */}
        <div className="flex items-center justify-between gap-4">
          <TeamLogoLarge logo={match.homeTeamLogo} teamId={match.homeTeamId} name={match.homeTeam} />

          <div className="text-center shrink-0 px-2">
            {['FINISHED', 'LIVE'].includes(match.status) ? (
              <>
                <p className={`font-display font-bold text-4xl ${match.status === 'LIVE' ? 'text-live-400' : 'text-gray-100'}`}>
                  {match.homeScore} — {match.awayScore}
                </p>
                {match.status === 'LIVE' && (
                  <p className="flex items-center justify-center gap-1.5 mt-1.5">
                    <span className="w-2 h-2 rounded-full bg-live-500 animate-pulse" aria-hidden="true" />
                    <span className="text-sm font-bold text-live-400">
                      {match.minute ? (match.minute === 'HT' ? 'Mi-temps' : match.minute) : 'En direct'}
                    </span>
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-display font-bold text-2xl text-gray-100">
                  {format(new Date(match.scheduledAt), 'HH:mm')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {format(new Date(match.scheduledAt), 'dd MMM yyyy', { locale: fr })}
                </p>
              </>
            )}
          </div>

          <TeamLogoLarge logo={match.awayTeamLogo} teamId={match.awayTeamId} name={match.awayTeam} />
        </div>
      </section>

      {/* ── Onglets — style BetMines ──────────────────────────────────── */}
      <div className="border-b border-white/[0.06] overflow-x-auto scrollbar-hide">
        <div className="flex px-4 min-w-max">
          {isFinishedOrLive && (
            <Tab label="Données du match" active={activeTab === 'data'} onClick={() => setActiveTab('data')} />
          )}
          <Tab label={`Pronostics${tips.length ? ` (${tips.length})` : ''}`} active={activeTab === 'tips'} onClick={() => setActiveTab('tips')} />
          <Tab label="Forme & H2H" active={activeTab === 'form'} onClick={() => setActiveTab('form')} />
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
                <p className="text-gray-600 text-sm">Statistiques non disponibles pour ce match</p>
              </div>
            ) : (
              <div className="card p-4 space-y-4">
                {statsData.data.map((stat, i) => (
                  <StatBar key={stat.key || i} stat={stat} />
                ))}
                {statsData.mock && (
                  <p className="text-[10px] text-gray-700 text-center pt-1">
                    * Statistiques estimées — données réelles avec le plan payant
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── Onglet : Pronostics ─────────────────────────────────────── */}
        {activeTab === 'tips' && (
          <>
            {/* Cotes simulées & value bet */}
            <OddsAndValueSection match={match} />

            {/* Données premium */}
            {!isPremium && (
              <section className="card border-dashed border-surface-600 p-6 text-center">
                <Lock size={22} className="mx-auto text-gray-500 mb-2" aria-hidden="true" />
                <p className="text-gray-400 font-medium text-sm">Données Premium</p>
                <p className="text-gray-500 text-xs mt-1">
                  Compositions probables, blessures, statistiques avancées
                </p>
                <Link to="/abonnement" className="btn-primary mt-4 text-sm">
                  Passer Premium — $8.99/mois
                </Link>
              </section>
            )}

            {/* Formulaire de pronostic */}
            {user && isPremium && isScheduled && (
              <section className="card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-100 text-sm">Publier un pronostic</h2>
                  <button
                    onClick={() => generateAi.mutate()}
                    disabled={generateAi.isPending || (aiMeta && aiMeta.usedToday >= aiMeta.dailyLimit)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400 hover:bg-violet-500/20 transition-colors text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Générer un pronostic avec l'IA Claude"
                  >
                    <Sparkles size={13} className={generateAi.isPending ? 'animate-spin' : ''} />
                    {generateAi.isPending ? 'Analyse…' : 'Analyser avec IA'}
                  </button>
                </div>

                <p className="disclaimer">Ceci n'est pas un conseil financier. Aucune garantie de gain.</p>

                {aiError && (
                  <Alert variant="error" onClose={() => setAiError('')}>
                    {aiError}
                  </Alert>
                )}

                {generateAi.isSuccess && (
                  <Alert variant="ai">
                    <p className="font-semibold">Pronostic généré par IA — vérifiez avant de publier</p>
                    {aiMeta && (
                      <p className="text-violet-500/80 text-xs mt-0.5">{aiMeta.usedToday}/{aiMeta.dailyLimit} analyses utilisées aujourd'hui</p>
                    )}
                  </Alert>
                )}

                {tipSuccess && (
                  <Alert variant="success" onClose={() => setTipSuccess(false)}>
                    Pronostic publié avec succès
                  </Alert>
                )}

                <div>
                  <label htmlFor="prediction" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Votre pronostic
                  </label>
                  <div className="relative">
                    <select
                      id="prediction"
                      value={prediction}
                      onChange={(e) => setPrediction(e.target.value)}
                      className="input appearance-none pr-10"
                    >
                      <option value="">Choisir un résultat...</option>
                      {PREDICTIONS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confiance : {confidence}/5
                  </label>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setConfidence(n)}
                        aria-label={`Confiance ${n} sur 5`}
                        className={`w-10 h-10 rounded-lg font-semibold transition-colors ${
                          n <= confidence ? 'bg-primary-500 text-white' : 'bg-surface-700 text-gray-400'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="analysis" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Analyse (optionnel)
                  </label>
                  <textarea
                    id="analysis"
                    value={analysis}
                    onChange={(e) => setAnalysis(e.target.value)}
                    className="input resize-none h-24"
                    maxLength={500}
                    placeholder="Partagez votre analyse… (max 500 caractères)"
                  />
                  <p className="text-xs text-gray-600 mt-1 text-right">{analysis.length}/500</p>
                </div>

                <button
                  onClick={() => submitTip.mutate({ matchId: id, prediction, confidence, analysis: analysis || undefined, isAiGenerated })}
                  disabled={!prediction || submitTip.isPending}
                  className="btn-primary w-full"
                >
                  {submitTip.isPending ? 'Publication…' : 'Publier mon pronostic'}
                </button>
              </section>
            )}

            {/* Liste des pronostics */}
            <section>
              <h2 className="font-semibold text-gray-100 text-sm mb-3">
                Pronostics des tipsters{tips.length > 0 ? ` (${tips.length})` : ''}
              </h2>
              <div className="space-y-3">
                {tips.map((tip) => {
                  const displayName = tip.user?.profile?.displayName || tip.user?.username;
                  const stats       = tip.user?.tipsterStats;
                  const predLabel   = PREDICTIONS.find((p) => p.value === tip.prediction)?.label || tip.prediction;

                  return (
                    <div key={tip.id} className="card p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Link to={`/tipsters/${tip.userId}`} className="flex items-center gap-2 hover:text-primary-300 transition-colors">
                          <div className="h-8 w-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-sm font-bold">
                            {displayName?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-200">{displayName}</span>
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
                        <span className="text-sm font-semibold text-gray-100">{predLabel}</span>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: tip.confidence || 0 }).map((_, i) => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary-400" aria-hidden="true" />
                          ))}
                        </div>
                      </div>

                      {tip.analysis && (
                        <p className="text-sm text-gray-400 italic">"{tip.analysis}"</p>
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
                            <p className="text-xs text-gray-600">Signalement envoyé</p>
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
                              className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-400 transition-colors"
                            >
                              <Flag size={11} />
                              Signaler
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {tips.length === 0 && (
                  <div className="card-p text-center py-8">
                    <p className="text-gray-500 text-sm">Aucun pronostic pour ce match. Soyez le premier !</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* ── Onglet : Forme & H2H ────────────────────────────────────── */}
        {activeTab === 'form' && (
          <section>
            {contextLoading ? (
              <div className="space-y-3">
                <SkeletonCard className="h-24" />
                <SkeletonCard className="h-24" />
              </div>
            ) : !contextData?.data ? (
              <div className="card-p text-center py-8">
                <p className="text-gray-600 text-sm">Données de forme non disponibles</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormRow label={match.homeTeam} matches={contextData.data.homeForm} />
                  <FormRow label={match.awayTeam} matches={contextData.data.awayForm} />
                </div>
                <div className="card p-4">
                  <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Confrontations directes</p>
                  <H2HSection h2h={contextData.data.h2h} homeTeam={match.homeTeam} awayTeam={match.awayTeam} />
                </div>
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  );
}
