import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Zap, Copy, Check, RefreshCw, Share2, Download, ChevronDown, ChevronUp, Trophy, ListFilter, Bot, Save, History, Sparkles, Search, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TeamLogo } from '../components/matches/MatchCard';
import CompetitionLogo from '../components/ui/CompetitionLogo';
import TicketHistory from '../components/machine/TicketHistory';
import { OddsChip, ValueBetBadge } from '../components/ui/OddsChip';
import { getOdd, isValueBet, getValueEdge, formatOdd, ODDS_DISCLAIMER } from '../utils/mockOdds';
import { drawTicketCanvas } from '../utils/ticketCanvas';

// ─── Templates prédéfinis ──────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'safe',
    emoji: '🛡️',
    labelKey: 'safe',
    subKey: 'safeSub',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    config: {
      nbPicks: 3,
      marketGroup: 'overunder',
      market: 'over15',
      minConf: 'high',
      dateOpt: 'today',
      leagues: [],
    },
  },
  {
    id: 'equilibre',
    emoji: '⚖️',
    labelKey: 'balanced',
    subKey: 'balancedSub',
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    config: {
      nbPicks: 6,
      marketGroup: 'resultats',
      market: 'auto',
      minConf: 'medium',
      dateOpt: '3days',
      leagues: [],
    },
  },
  {
    id: 'ambitieux',
    emoji: '🔥',
    labelKey: 'ambitious',
    subKey: 'ambitiousSub',
    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    config: {
      nbPicks: 12,
      marketGroup: 'resultats',
      market: 'auto',
      minConf: 'low',
      dateOpt: 'week',
      leagues: [],
    },
  },
];

const DATE_PRESETS = [
  { value: 'today',    labelKey: 'today',     days: 0  },
  { value: 'tomorrow', labelKey: 'tomorrow',  days: 1  },
  { value: '3days',    labelKey: 'threeDays', days: 3  },
  { value: 'week',     labelKey: 'week',      days: 7  },
  { value: '2weeks',   labelKey: 'twoWeeks',  days: 14 },
  { value: 'month',    labelKey: 'month',     days: 30 },
];

// ─── Marchés inspirés 1xbet — labels/descriptions dans machine.marketGroups.* (i18n) ──
const MARKET_GROUPS = [
  { id: 'resultats',    emoji: '🏆', markets: ['auto', '1', 'X', '2'] },
  { id: 'doublechance', emoji: '🔀', markets: ['1X', 'X2', '12'] },
  { id: 'dnb',          emoji: '🛡️', markets: ['dnb1', 'dnb2'] },
  { id: 'overunder',    emoji: '⚽', markets: ['over05', 'over15', 'over25', 'over35', 'over45', 'under15', 'under25', 'under35', 'under45'] },
  { id: 'btts',         emoji: '🥅', markets: ['btts', 'nobtts'] },
  { id: 'mitemps',      emoji: '⏱️', markets: ['ht1', 'htX', 'ht2', 'htover15', 'htunder15'] },
];

const CONF_THRESHOLDS = { high: 72, medium: 58, low: 0 };
const CONF_COLORS = {
  high:   { text: 'text-primary-400', bg: 'bg-primary-500/10 border-primary-500/20', dot: 'bg-primary-400' },
  medium: { text: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     dot: 'bg-amber-400' },
  low:    { text: 'text-gray-300',    bg: 'bg-surface-700/50 border-white/[0.05]',   dot: 'bg-gray-500' },
};
function getProb(pred, market) {
  if (market === 'auto' || !market) return pred.bestPick;

  // Valeurs de base
  const h  = pred.home  ?? 33;
  const d  = pred.draw  ?? 33;
  const a  = pred.away  ?? 33;
  const o15 = pred.over15 ?? 70;
  const o25 = pred.over25 ?? 50;
  const o35 = pred.over35 ?? 25;
  const bt  = pred.btts  ?? 50;
  const sum = (h + a) || 1;

  // Dérivations pour marchés absents de la DB (matchs anciens sans ces champs)
  const over05  = pred.over05  ?? Math.min(99, Math.round(82 + (o15 - 70) * 0.8));
  const over45  = pred.over45  ?? Math.max(2,  Math.round(o35 * 0.42));
  const under45 = 100 - over45;
  const under35 = pred.under35 ?? (100 - o35);
  const under25 = pred.under25 ?? (100 - o25);
  const under15 = pred.under15 ?? (100 - o15);
  const dc12    = pred.dc12    ?? Math.min(99, h + a);
  const nobtts  = pred.nobtts  ?? (100 - bt);
  const dnb1    = Math.round((h / sum) * 100); // Draw No Bet domicile
  const dnb2    = Math.round((a / sum) * 100); // Draw No Bet extérieur

  // Marchés mi-temps — utilisent les champs calculés côté backend (Poisson),
  // avec repli approximatif pour les matchs anciens sans ces champs.
  const htOver15 = pred.htOver15 ?? Math.max(5, Math.round(o25 * 0.7));

  const probMap = {
    '1':       h,
    'X':       d,
    '2':       a,
    '1X':      pred.dc1x ?? Math.min(99, h + d),
    'X2':      pred.dc2x ?? Math.min(99, a + d),
    '12':      dc12,
    'dnb1':    dnb1,
    'dnb2':    dnb2,
    'over05':  over05,
    'over15':  o15,
    'over25':  o25,
    'over35':  o35,
    'over45':  over45,
    'under15': under15,
    'under25': under25,
    'under35': under35,
    'under45': under45,
    'btts':    bt,
    'nobtts':  nobtts,
    'ht1':       pred.htHome  ?? Math.round(h * 0.62),
    'htX':       pred.htDraw  ?? Math.min(70, d + 15),
    'ht2':       pred.htAway  ?? Math.round(a * 0.55),
    'htover15':  htOver15,
    'htunder15': pred.htUnder15 ?? (100 - htOver15),
  };

  const prob = probMap[market];
  if (prob == null) return pred.bestPick;
  return { type: market, prob };
}

function getConfidence(prob) {
  if (prob >= 72) return 'high';
  if (prob >= 58) return 'medium';
  return 'low';
}

export default function Machine() {
  const { t } = useTranslation();
  const { user, isPremium } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [view, setView]               = useState('generator'); // 'generator' | 'history'
  const [nbPicks, setNbPicks]         = useState(5);
  const [marketGroup, setMarketGroup] = useState('resultats');
  const [market, setMarket]           = useState('auto');
  const [minConf, setMinConf]         = useState('medium');
  const [dateOpt, setDateOpt]         = useState('today');
  const [leagues, setLeagues]         = useState([]);
  const [pinnedMatchIds, setPinnedMatchIds] = useState(new Set());
  const [showMatchPicker, setShowMatchPicker] = useState(false);
  const [matchSearch, setMatchSearch] = useState('');
  const [ticket, setTicket]           = useState(null);
  const [copied, setCopied]           = useState(false);
  const [sharing, setSharing]         = useState(false);
  const [mise, setMise]               = useState('');
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [excludeFriendly, setExcludeFriendly] = useState(true);
  // Empêche qu'un même ticket soit enregistré plusieurs fois en historique :
  // repasse à false dès qu'un nouveau ticket est (re)généré.
  const [ticketSaved, setTicketSaved] = useState(false);
  // État visuel du petit bouton icône "régénérer" (générateTicket est async :
  // consomme le quota côté serveur avant de reconstruire le ticket).
  const [regenerating, setRegenerating] = useState(false);

  // Appliquer un template — configure tous les filtres d'un coup
  function applyTemplate(tpl) {
    const c = tpl.config;
    setNbPicks(c.nbPicks);
    setMarketGroup(c.marketGroup);
    setMarket(c.market);
    setMinConf(c.minConf);
    setDateOpt(c.dateOpt);
    setLeagues(c.leagues);
    setPinnedMatchIds(new Set());
    setActiveTemplate(tpl.id);
    setTicket(null);
  }

  // Calcul de la plage de dates selon le preset choisi
  function getDateRange(opt) {
    const base    = new Date();
    const preset  = DATE_PRESETS.find((p) => p.value === opt) || DATE_PRESETS[0];
    const dateFrom = format(base, 'yyyy-MM-dd');
    if (opt === 'today') {
      return { dateFrom, dateTo: dateFrom };
    }
    if (opt === 'tomorrow') {
      const tom = format(addDays(base, 1), 'yyyy-MM-dd');
      return { dateFrom: tom, dateTo: tom };
    }
    const dateTo = format(addDays(base, preset.days - 1), 'yyyy-MM-dd');
    return { dateFrom, dateTo };
  }

  const { dateFrom, dateTo } = getDateRange(dateOpt);

  const rangeQ = useQuery({
    queryKey: ['machine-range', dateFrom, dateTo],
    queryFn:  () => api.get(`/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&limit=500`).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  // Championnats affichés — liste complète (avec logos) au lieu d'une sélection figée
  const competitionsQ = useQuery({
    queryKey: ['machine-competitions'],
    queryFn: () => api.get('/matches/competitions').then((r) => r.data),
    staleTime: Infinity,
  });
  const competitions = competitionsQ.data?.data || [];

  const isLoading = rangeQ.isLoading;

  // Quota de génération gratuite (3/jour) — même principe que le Chat IA.
  // Non affiché/consommé pour les comptes Premium/Pro/Lifetime (illimité).
  const quotaQ = useQuery({
    queryKey: ['ticket-quota'],
    queryFn: () => api.get('/tickets/quota').then((r) => r.data.data),
    enabled: !!user,
    staleTime: 60 * 1000,
  });
  const [quotaError, setQuotaError] = useState('');
  const quotaExhausted = !!user && !isPremium && quotaQ.data && !quotaQ.data.unlimited && quotaQ.data.used >= quotaQ.data.limit;

  // Mots-clés identifiant les matchs amicaux
  const FRIENDLY_KEYWORDS = ['friendly', 'friendlies', 'amical', 'amicaux', 'club friendly', 'test match'];

  // ── Candidats filtrés (avant sélection manuelle et limite nbPicks) ─────────
  const availableCandidates = (() => {
    const allMatches = rangeQ.data?.data || [];
    return allMatches
      .filter((m) => {
        if (m.status !== 'SCHEDULED') return false;
        if (!m.predictions) return false;
        // Exclure les matchs amicaux si l'option est activée
        if (excludeFriendly) {
          const compName = (m.competition?.name || '').toLowerCase();
          if (FRIENDLY_KEYWORDS.some((kw) => compName.includes(kw))) return false;
        }
        const pick = getProb(m.predictions, market);
        if (!pick) return false;
        if (pick.prob < CONF_THRESHOLDS[minConf]) return false;
        if (leagues.length > 0 && !leagues.includes(String(m.competition?.externalId))) return false;
        return true;
      })
      .map((m) => {
        const pick = getProb(m.predictions, market);
        const odd  = getOdd(pick.prob, `${m.id}-${pick.type}`);
        return { match: m, pick, conf: getConfidence(pick.prob), odd, value: isValueBet(pick.prob, odd) };
      })
      .sort((a, b) => b.pick.prob - a.pick.prob);
  })();

  function togglePin(matchId) {
    setPinnedMatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
    setTicket(null);
  }

  function selectAllCandidates() {
    setPinnedMatchIds(new Set(availableCandidates.map((c) => c.match.id)));
    setTicket(null);
  }

  function clearPinnedMatches() {
    setPinnedMatchIds(new Set());
    setTicket(null);
  }

  async function generateTicket() {
    setQuotaError('');

    // Quota gratuit (3 générations/jour) — les comptes Premium/Pro/Lifetime
    // ne passent pas par cette vérification côté UI, mais le backend la
    // ferait de toute façon sauter (getUserPlanCode) si jamais elle était appelée.
    if (user && !isPremium) {
      try {
        const { data } = await api.post('/tickets/quota/consume');
        queryClient.invalidateQueries(['ticket-quota']);
        if (!data.data.allowed) {
          setQuotaError(t('machine.ticketQuotaExceededDesc', { limit: data.data.limit }));
          return;
        }
      } catch {
        // En cas d'erreur réseau sur la vérification, on ne bloque pas la génération
        // (mieux vaut un ticket généré sans compteur à jour qu'une page cassée).
      }
    }

    let candidates = availableCandidates;
    // Si des matchs ont été épinglés manuellement, limiter à ceux-là
    if (pinnedMatchIds.size > 0) {
      candidates = candidates.filter((c) => pinnedMatchIds.has(c.match.id));
    }
    setTicket(candidates.slice(0, nbPicks));
    setTicketSaved(false); // un ticket (re)généré n'a pas encore été enregistré
  }

  // Wrapper du petit bouton icône "régénérer" — generateTicket() est async
  // (appel réseau de consommation de quota) mais n'avait aucun retour visuel
  // propre : le bouton semblait "ne rien faire" pendant l'attente ou en cas
  // d'erreur/quota épuisé.
  async function handleRegenerate() {
    if (regenerating) return;
    setRegenerating(true);
    try {
      await generateTicket();
    } finally {
      setRegenerating(false);
    }
  }

  async function shareTicket() {
    if (!ticket || ticket.length === 0) return;
    setSharing(true);
    try {
      const canvas = await drawTicketCanvas(ticket, totalOdds, t);
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'ticket-statfoot.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: t('machine.shareTitle') });
        } else {
          // Fallback : téléchargement direct
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'ticket-statfoot.png';
          a.click();
          URL.revokeObjectURL(url);
        }
        setSharing(false);
      }, 'image/png');
    } catch {
      setSharing(false);
    }
  }

  function copyTicket() {
    if (!ticket) return;
    const lines = ticket.map((row, i) => {
      const time = format(new Date(row.match.scheduledAt), 'dd/MM HH:mm');
      const pickLabel = t(`machine.pickLabels.${row.pick.type}`, { defaultValue: row.pick.type });
      return `${i + 1}. ${row.match.homeTeam} vs ${row.match.awayTeam} — ${pickLabel} (${row.pick.prob}% · ${formatOdd(row.odd)}${row.value ? ' ⚡value' : ''}) — ${time}`;
    });
    if (totalOdds) lines.push(`\n${t('machine.totalOddSimulated', { odds: totalOdds })}`);
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const totalOdds = ticket && ticket.length
    ? ticket.reduce((acc, row) => acc * row.odd, 1).toFixed(2)
    : null;

  const saveTicketMutation = useMutation({
    mutationFn: () => {
      const entries = ticket.map((row) => ({
        matchId: row.match.id,
        prediction: row.pick.type,
        odds: row.odd,
      }));
      return api.post('/tickets', { entries, totalOdds }).then((r) => r.data);
    },
    onSuccess: () => {
      toast(t('machine.ticketSaved'), 'success');
      setTicketSaved(true);
      queryClient.invalidateQueries({ queryKey: ['ticket-history'] });
    },
    onError: (err) => {
      toast(err?.response?.data?.message || t('machine.ticketSaveError'), 'error');
    },
  });

  function handleSaveTicket() {
    if (!ticket || ticket.length === 0) return;
    if (!user) { navigate('/connexion'); return; }
    // Garde contre le double-clic / double-appel : une fois la sauvegarde en
    // cours ou déjà réussie pour CE ticket, on ignore les appels suivants
    // (sinon un second clic avant le re-render pouvait créer un doublon
    // dans l'historique).
    if (saveTicketMutation.isPending || ticketSaved) return;
    saveTicketMutation.mutate();
  }

  return (
    <div className="max-w-2xl mx-auto py-5 space-y-5">

      {/* En-tête */}
      <div className="px-4">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={18} className="text-primary-400" />
          <h1 className="section-title">{t('machine.titleShort')}</h1>
        </div>
        <p className="text-xs text-gray-300">{t('machine.subtitleShort')}</p>
      </div>

      {/* Onglets Générateur / Historique */}
      <div className="px-4 flex items-center gap-2">
        <button
          onClick={() => setView('generator')}
          className="filter-chip"
          data-active={view === 'generator'}
        >
          <Zap size={13} />
          {t('machine.tabGenerator')}
        </button>
        <button
          onClick={() => setView('history')}
          className="filter-chip"
          data-active={view === 'history'}
          data-variant="history"
        >
          <History size={13} />
          {t('machine.tabHistory')}
        </button>
      </div>

      {view === 'history' ? (
        <TicketHistory />
      ) : (
      <>
      {/* Paramètres */}
      <div className="px-4 card p-4 space-y-4">

        {/* ── Templates prédéfinis ──────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {t('machine.quickStart')}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TEMPLATES.map((tpl) => (
              <button key={tpl.id} onClick={() => applyTemplate(tpl)}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all ${
                  activeTemplate === tpl.id
                    ? tpl.color
                    : 'border-white/[0.07] text-gray-300 hover:border-white/[0.15] hover:text-gray-200'
                }`}>
                <span className="text-lg leading-none">{tpl.emoji}</span>
                <span className="text-xs font-bold">{t(`machine.templates.${tpl.labelKey}`)}</span>
                <span className="text-[9px] text-center leading-tight opacity-70">{t(`machine.templates.${tpl.subKey}`)}</span>
              </button>
            ))}
          </div>
          {activeTemplate && (
            <button onClick={() => setActiveTemplate(null)}
              className="mt-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors">
              {t('machine.customizeManually')}
            </button>
          )}
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Nombre de picks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('machine.selectionsCount')}</p>
            <span className="text-sm font-bold text-primary-400">{nbPicks}</span>
          </div>
          <input type="range" min="2" max="45" step="1" value={nbPicks}
            onChange={(e) => setNbPicks(Number(e.target.value))}
            className="w-full accent-primary-500 h-1.5 cursor-pointer" />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>2</span><span>45</span>
          </div>
        </div>

        {/* Marché — sélecteur 2 niveaux (catégorie → marché) */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('machine.market')}</p>

          {/* Niveau 1 : catégories */}
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              {MARKET_GROUPS.map((g) => (
                <button key={g.id}
                  onClick={() => {
                    setMarketGroup(g.id);
                    setMarket(g.markets[0]);
                    setTicket(null);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                    marketGroup === g.id
                      ? 'bg-select-500/15 text-select-400 border-select-500/30'
                      : 'text-gray-300 border-white/[0.06] hover:text-gray-200'
                  }`}>
                  {g.emoji} {t(`machine.marketGroups.${g.id}.label`)}
                </button>
              ))}
            </div>
          </div>

          {/* Niveau 2 : marchés de la catégorie avec description */}
          {MARKET_GROUPS.filter((g) => g.id === marketGroup).map((g) => (
            <div key={g.id} className="space-y-1.5">
              <p className="text-xs text-gray-400 leading-snug">{t(`machine.marketGroups.${g.id}.subtitle`)}</p>
              <div className="grid grid-cols-1 gap-1.5">
                {g.markets.map((mVal) => (
                  <button key={mVal}
                    onClick={() => { setMarket(mVal); setTicket(null); }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                      market === mVal
                        ? 'bg-select-500/10 border-select-500/30'
                        : 'border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02]'
                    }`}>
                    <span className={`block text-xs font-semibold mb-0.5 ${market === mVal ? 'text-select-400' : 'text-gray-300'}`}>
                      {t(`machine.marketGroups.${g.id}.markets.${mVal}.label`)}
                    </span>
                    <span className="block text-xs text-gray-300 leading-snug">{t(`machine.marketGroups.${g.id}.markets.${mVal}.desc`)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Confiance minimale */}
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">{t('machine.filters.confidence')}</p>
          <div className="flex gap-2">
            {[
              { value: 'high',   label: t('machine.confHigh'),   active: 'bg-primary-500/15 text-primary-400 border-primary-500/30' },
              { value: 'medium', label: t('machine.confMedium'), active: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
              { value: 'low',    label: t('machine.confAll'),    active: 'bg-white/[0.08] text-gray-300 border-white/[0.20]' },
            ].map((o) => (
              <button key={o.value} onClick={() => setMinConf(o.value)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  minConf === o.value
                    ? o.active
                    : 'text-gray-300 border-white/[0.06] hover:text-gray-200'
                }`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date / Période */}
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">{t('machine.filters.dateRange')}</p>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              {DATE_PRESETS.map((o) => (
                <button key={o.value} onClick={() => { setDateOpt(o.value); setTicket(null); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                    dateOpt === o.value
                      ? 'bg-select-500/15 text-select-400 border-select-500/30'
                      : 'text-gray-300 border-white/[0.06] hover:text-gray-200'
                  }`}>
                  {t(`machine.datePresets.${o.labelKey}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Championnat ─────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Trophy size={11} className="text-gray-300" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('machine.championship')}</p>
            </div>
            {leagues.length > 0 && (
              <button onClick={() => { setLeagues([]); setTicket(null); }}
                className="text-xs text-gray-400 hover:text-primary-400 transition-colors">
                {t('machine.showAll')}
              </button>
            )}
          </div>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => { setLeagues([]); setPinnedMatchIds(new Set()); setTicket(null); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                  leagues.length === 0
                    ? 'bg-select-500/15 text-select-400 border-select-500/30'
                    : 'text-gray-300 border-white/[0.06] hover:text-gray-200'
                }`}>
                {t('machine.allLeagues')}
              </button>
              {competitions.map((c) => {
                const value = String(c.externalId);
                const isActive = leagues.includes(value);
                return (
                  <button key={c.id}
                    onClick={() => {
                      setLeagues((prev) =>
                        prev.includes(value)
                          ? prev.filter((x) => x !== value)
                          : [...prev, value]
                      );
                      setPinnedMatchIds(new Set());
                      setTicket(null);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-select-500/15 text-select-400 border-select-500/30'
                        : 'text-gray-300 border-white/[0.06] hover:text-gray-200'
                    }`}>
                    <CompetitionLogo logo={c.logo} size={14} />
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Filtre amicaux ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Bot size={12} className="text-gray-300" />
            <span className="text-xs text-gray-400">{t('machine.excludeFriendly')}</span>
            <span className="text-xs text-gray-400">{t('machine.excludeFriendlyHint')}</span>
          </div>
          <button
            onClick={() => { setExcludeFriendly((v) => !v); setTicket(null); }}
            className={`relative w-9 h-5 rounded-full transition-colors ${excludeFriendly ? 'bg-primary-500' : 'bg-surface-600'}`}
            role="switch" aria-checked={excludeFriendly}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${excludeFriendly ? 'translate-x-4' : ''}`} />
          </button>
        </div>

        {/* ── Sélection manuelle de matchs ────────────────────────────── */}
        <div>
          <button
            onClick={() => setShowMatchPicker((p) => !p)}
            className="w-full flex items-center justify-between py-2 group">
            <div className="flex items-center gap-1.5">
              <ListFilter size={11} className="text-gray-300" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-300 transition-colors">
                {t('machine.pickSpecificMatches')}
              </p>
              {pinnedMatchIds.size > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-select-500/20 text-select-400">
                  {t('machine.fixedCount', { count: pinnedMatchIds.size })}
                </span>
              )}
            </div>
            <div className="text-gray-400 group-hover:text-gray-300 transition-colors">
              {showMatchPicker ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </div>
          </button>

          {showMatchPicker && (
            <div className="mt-1 space-y-2">
              {isLoading ? (
                <p className="text-xs text-gray-400 py-2 text-center">{t('machine.loadingMatches')}</p>
              ) : availableCandidates.length === 0 ? (
                <p className="text-xs text-gray-400 py-2 text-center">
                  {t('machine.noMatchesFilters')}
                </p>
              ) : (
                <>
                  {/* Recherche par équipe */}
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={matchSearch}
                      onChange={(e) => setMatchSearch(e.target.value)}
                      placeholder={t('machine.searchTeamPlaceholder')}
                      className="w-full bg-surface-800/60 border border-white/[0.06] rounded-lg pl-8 pr-8 py-1.5 text-xs text-gray-200 placeholder:text-gray-400 outline-none focus:border-select-500/40"
                    />
                    {matchSearch && (
                      <button onClick={() => setMatchSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300">
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Barre actions rapides */}
                  <div className="flex items-center gap-2">
                    <button onClick={selectAllCandidates}
                      className="text-xs text-gray-300 hover:text-gray-200 border border-white/[0.06] px-2 py-1 rounded-md transition-colors">
                      {t('machine.checkAll', { count: availableCandidates.length })}
                    </button>
                    {pinnedMatchIds.size > 0 && (
                      <button onClick={clearPinnedMatches}
                        className="text-xs text-gray-300 hover:text-gray-200 border border-white/[0.06] px-2 py-1 rounded-md transition-colors">
                        {t('machine.uncheckAll')}
                      </button>
                    )}
                    <span className="ml-auto text-xs text-gray-400">
                      {pinnedMatchIds.size > 0
                        ? t('machine.selectedCount', { count: pinnedMatchIds.size })
                        : t('machine.algoChooses')}
                    </span>
                  </div>

                  {/* Liste des matchs scrollable — filtrée par la recherche */}
                  {(() => {
                    const q = matchSearch.trim().toLowerCase();
                    const visible = q
                      ? availableCandidates.filter((c) =>
                          c.match.homeTeam.toLowerCase().includes(q) ||
                          c.match.awayTeam.toLowerCase().includes(q))
                      : availableCandidates;

                    if (visible.length === 0) {
                      return (
                        <p className="text-xs text-gray-400 py-3 text-center">
                          {t('machine.noMatchesSearch')}
                        </p>
                      );
                    }

                    return (
                      <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
                        {visible.map((c) => {
                          const pinned = pinnedMatchIds.has(c.match.id);
                          const cc = CONF_COLORS[c.conf];
                          return (
                            <button key={c.match.id} onClick={() => togglePin(c.match.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                                pinned
                                  ? 'bg-select-500/10 border-select-500/25'
                                  : 'border-white/[0.05] hover:border-white/[0.10]'
                              }`}>
                              {/* Checkbox */}
                              <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                                pinned ? 'bg-select-500 border-select-500' : 'border-white/[0.2]'
                              }`}>
                                {pinned && <Check size={9} className="text-white" strokeWidth={3} />}
                              </div>

                              {/* Infos match — chaque équipe sur sa propre ligne, logo à côté de son nom */}
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <TeamLogo logo={c.match.homeTeamLogo} teamId={c.match.homeTeamId} name={c.match.homeTeam} size={16} />
                                  <p className={`text-xs font-medium truncate ${pinned ? 'text-gray-200' : 'text-gray-400'}`}>
                                    {c.match.homeTeam}
                                  </p>
                                  {c.match.predictions?.aiGenerated && (
                                    <span className="shrink-0 text-[8px] font-bold text-violet-400 bg-violet-500/10 px-1 rounded">IA</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <TeamLogo logo={c.match.awayTeamLogo} teamId={c.match.awayTeamId} name={c.match.awayTeam} size={16} />
                                  <p className={`text-xs font-medium truncate ${pinned ? 'text-gray-200' : 'text-gray-400'}`}>
                                    {c.match.awayTeam}
                                  </p>
                                </div>
                                <p className="text-xs text-gray-400">
                                  {c.match.competition?.name} · {format(new Date(c.match.scheduledAt), 'dd/MM HH:mm')}
                                </p>
                              </div>

                              {/* Probabilité + confiance */}
                              <div className={`shrink-0 text-center px-2 py-0.5 rounded border text-[10px] font-bold ${cc.bg} ${cc.text}`}>
                                {c.pick.prob}%
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}

                  <p className="text-xs text-gray-400">
                    {pinnedMatchIds.size > 0
                      ? t('machine.manualSelectionNote')
                      : t('machine.noSelectionNote')}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Compteur de matchs disponibles */}
        <div className="flex items-center justify-center gap-2 py-1">
          {isLoading ? (
            <span className="text-xs text-gray-400">{t('machine.searchingMatches')}</span>
          ) : (
            <>
              <span className={`text-[11px] font-semibold ${
                availableCandidates.length === 0
                  ? 'text-rose-400'
                  : availableCandidates.length < nbPicks
                    ? 'text-amber-400'
                    : 'text-select-400'
              }`}>
                {t('machine.matchesAvailable', { count: availableCandidates.length })}
              </span>
              <span className="text-gray-700">·</span>
              <span className="text-xs text-gray-400">
                {pinnedMatchIds.size > 0
                  ? t('machine.selectedManually', { count: pinnedMatchIds.size })
                  : t('machine.bestRetained', { count: Math.min(nbPicks, availableCandidates.length) })}
              </span>
              {availableCandidates.length < nbPicks && availableCandidates.length > 0 && (
                <span className="text-[10px] text-amber-500">
                  {t('machine.ticketReduced', { count: availableCandidates.length })}
                </span>
              )}
            </>
          )}
        </div>

        {/* Bouton générer — ou upsell si quota gratuit épuisé */}
        {quotaExhausted ? (
          <div className="w-full rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles size={16} className="text-amber-400 shrink-0" />
              <p className="text-xs text-amber-200 leading-snug">
                {t('machine.ticketQuotaExceededDesc', { limit: quotaQ.data?.limit || 3 })}
              </p>
            </div>
            <Link to="/abonnement" className="btn-primary shrink-0 px-3 py-2 text-xs whitespace-nowrap">
              {t('machine.premiumUnlimitedTickets')}
            </Link>
          </div>
        ) : (
          <>
            <button onClick={generateTicket} disabled={isLoading || availableCandidates.length === 0}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-40 disabled:cursor-not-allowed">
              <Zap size={16} />
              {isLoading ? t('machine.loading') : availableCandidates.length === 0 ? t('machine.noMatchAvailable') : t('machine.generateBtn')}
            </button>
            {user && !isPremium && quotaQ.data && !quotaQ.data.unlimited && (
              <p className="text-center text-xs text-gray-300 mt-1.5">
                {t('machine.ticketsToday', { used: quotaQ.data.used, limit: quotaQ.data.limit })}
              </p>
            )}
            {quotaError && (
              <p className="text-center text-[10px] text-amber-400 mt-1.5">{quotaError}</p>
            )}
          </>
        )}
      </div>

      {/* Résultat */}
      {ticket && (
        <div className="px-4 space-y-3">

          {/* ── Barre résultat ────────────────────────────────────────── */}
          <div className="flex items-center justify-between flex-wrap gap-y-2">
            <p className="text-sm font-semibold text-gray-200">
              {t('machine.selectionsGenerated', { count: ticket.length })}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleRegenerate} disabled={regenerating}
                aria-label={t('machine.regenerate')} title={t('machine.regenerate')}
                className="p-1.5 rounded-lg border border-white/[0.06] text-gray-300 hover:text-gray-200 transition-colors disabled:opacity-50">
                <RefreshCw size={13} className={regenerating ? 'animate-spin' : ''} />
              </button>
              <button onClick={handleSaveTicket} disabled={saveTicketMutation.isPending || ticketSaved}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-500/25 bg-primary-500/15 text-xs font-bold text-primary-400 hover:bg-primary-500/25 transition-colors disabled:opacity-50">
                {saveTicketMutation.isPending
                  ? <RefreshCw size={12} className="animate-spin" />
                  : ticketSaved ? <Check size={12} /> : <Save size={12} />}
                {ticketSaved ? t('machine.saved') : t('machine.save')}
              </button>
              <button onClick={copyTicket}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors">
                {copied ? <Check size={12} className="text-primary-400" /> : <Copy size={12} />}
                {copied ? t('machine.copied') : t('machine.copy')}
              </button>
              <button onClick={shareTicket} disabled={sharing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-select-500/25 bg-select-500/15 text-xs font-bold text-select-400 hover:bg-select-500/25 transition-colors disabled:opacity-50">
                {sharing
                  ? <RefreshCw size={12} className="animate-spin" />
                  : navigator.share ? <Share2 size={12} /> : <Download size={12} />}
                {navigator.share ? t('machine.share') : t('machine.image')}
              </button>
            </div>
          </div>

          {/* ── Simulation de mise ────────────────────────────────────── */}
          {totalOdds && ticket.length > 0 && (
            <div className="card p-3 flex items-center gap-3">
              {/* Cote totale */}
              <div className="shrink-0 text-center">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-0.5">{t('machine.totalOdd')}</p>
                <p className="text-lg font-black text-amber-400">×{totalOdds}</p>
              </div>

              <div className="w-px h-10 bg-white/[0.06] shrink-0" />

              {/* Input mise */}
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-0.5">{t('machine.yourStake')}</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      placeholder="1 000"
                      value={mise}
                      onChange={(e) => setMise(e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold text-gray-200 outline-none placeholder:text-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-gray-400 shrink-0">FCFA</span>
                  </div>
                </div>
              </div>

              <div className="w-px h-10 bg-white/[0.06] shrink-0" />

              {/* Gain potentiel */}
              <div className="shrink-0 text-center">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-0.5">{t('machine.stake.potentialGain')}</p>
                {mise && Number(mise) > 0 ? (
                  <p className="text-base font-black text-primary-400">
                    {Math.round(Number(mise) * Number(totalOdds)).toLocaleString('fr-FR')}
                    <span className="text-[11px] font-normal text-gray-400 ml-0.5">FCFA</span>
                  </p>
                ) : (
                  <p className="text-sm font-bold text-gray-700">—</p>
                )}
              </div>
            </div>
          )}

          {ticket.length === 0 ? (
            <div className="card-p text-center py-8">
              <p className="text-2xl mb-2">🎯</p>
              <p className="text-gray-300 text-sm">{t('machine.noSelectionMatch')}</p>
              <p className="text-gray-400 text-xs mt-1">{t('machine.tryLowerConfidence')}</p>
            </div>
          ) : (
            <div className="card overflow-hidden divide-y divide-white/[0.04]">
              {ticket.map((row, idx) => {
                const c = CONF_COLORS[row.conf];
                return (
                  <div key={row.match.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-gray-400">{idx + 1}</span>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <TeamLogo logo={row.match.homeTeamLogo} teamId={row.match.homeTeamId} name={row.match.homeTeam} size={16} />
                        <p className="text-sm font-medium text-gray-200 truncate">{row.match.homeTeam}</p>
                        {row.match.predictions?.aiGenerated && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/20">
                            <Bot size={8} />IA
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <TeamLogo logo={row.match.awayTeamLogo} teamId={row.match.awayTeamId} name={row.match.awayTeam} size={16} />
                        <p className="text-sm font-medium text-gray-200 truncate">{row.match.awayTeam}</p>
                      </div>
                      <p className="text-xs text-gray-400">
                        {row.match.competition?.name} · {format(new Date(row.match.scheduledAt), 'dd/MM HH:mm')}
                      </p>
                    </div>
                    <div className={`shrink-0 text-center px-2.5 py-1 rounded-lg border ${c.bg}`}>
                      <span className={`block text-xs font-bold ${c.text}`}>{t(`machine.pickLabels.${row.pick.type}`, { defaultValue: row.pick.type })}</span>
                      <span className={`block text-[10px] font-semibold ${c.text}`}>{row.pick.prob}%</span>
                    </div>
                    <div className="shrink-0 flex flex-col items-center gap-1">
                      <OddsChip odd={row.odd} />
                      {row.value && <ValueBetBadge edge={getValueEdge(row.pick.prob, row.odd)} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">{ODDS_DISCLAIMER}</p>
        </div>
      )}
      </>
      )}
    </div>
  );
}
