import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Zap, Copy, Check, RefreshCw, Share2, Download, ChevronDown, ChevronUp, Trophy, ListFilter, Bot } from 'lucide-react';
import api from '../services/api';
import { OddsChip, ValueBetBadge } from '../components/ui/OddsChip';
import { getOdd, isValueBet, getValueEdge, formatOdd, ODDS_DISCLAIMER } from '../utils/mockOdds';

function drawTicketCanvas(ticket, totalOdds, t) {
  const W = 640;
  const ROW_H = 70;
  const HEADER_H = 90;
  const FOOTER_H = 56;
  const H = HEADER_H + ticket.length * ROW_H + FOOTER_H;

  const canvas = document.createElement('canvas');
  canvas.width  = W * 2; // retina
  canvas.height = H * 2;
  canvas.style.width  = `${W}px`;
  canvas.style.height = `${H}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  // Fond
  ctx.fillStyle = '#171819';
  ctx.fillRect(0, 0, W, H);

  // Bande verte en haut
  ctx.fillStyle = '#1aa656';
  ctx.fillRect(0, 0, W, 4);

  // Logo + titre
  ctx.fillStyle = '#1aa656';
  roundRect(ctx, 16, 16, 32, 32, 8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('SF', 32, 37);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('fpronix — Mon Ticket', 58, 30);

  ctx.fillStyle = '#555555';
  ctx.font = '11px system-ui';
  ctx.fillText(`${t('machine.canvasGeneratedAt', { date: format(new Date(), 'dd/MM/yyyy à HH:mm') })} · ${t('machine.selectionsGenerated', { count: ticket.length })}`, 58, 46);

  // Cote totale
  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 13px system-ui';
  ctx.textAlign = 'right';
  ctx.fillText(`${t('machine.totalOdd')} × ${totalOdds}`, W - 16, 30);

  // Ligne séparatrice
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(16, HEADER_H - 10);
  ctx.lineTo(W - 16, HEADER_H - 10);
  ctx.stroke();

  // Picks
  const CONF_BG   = { high: '#1aa65622', medium: '#f59e0b22', low: '#3a3a3a' };
  const CONF_TEXT = { high: '#2ec16a',   medium: '#fbbf24',   low: '#888888' };

  ticket.forEach((row, i) => {
    const y = HEADER_H + i * ROW_H;

    // Séparateur
    if (i > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(16, y);
      ctx.lineTo(W - 16, y);
      ctx.stroke();
    }

    // Numéro
    ctx.fillStyle = '#444444';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}`, 16, y + 22);

    // Match
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 13px system-ui';
    ctx.fillText(`${row.match.homeTeam} vs ${row.match.awayTeam}`, 34, y + 22);

    // Compétition + heure
    ctx.fillStyle = '#555555';
    ctx.font = '10px system-ui';
    ctx.fillText(
      `${row.match.competition?.name || ''} · ${format(new Date(row.match.scheduledAt), 'dd/MM HH:mm')}`,
      34, y + 38
    );

    // Badge pick
    const badgeW = 80;
    const badgeX = W - 16 - badgeW;
    const badgeY = y + 9;
    ctx.fillStyle = CONF_BG[row.conf];
    roundRect(ctx, badgeX, badgeY, badgeW, 46, 8);
    ctx.fill();

    ctx.fillStyle = CONF_TEXT[row.conf];
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(t(`machine.pickLabels.${row.pick.type}`, { defaultValue: row.pick.type }), badgeX + badgeW / 2, badgeY + 14);
    ctx.font = 'bold 11px system-ui';
    ctx.fillText(`${row.pick.prob}%`, badgeX + badgeW / 2, badgeY + 28);
    ctx.fillStyle = row.value ? '#fbbf24' : '#888888';
    ctx.font = 'bold 10px system-ui';
    ctx.fillText(`${formatOdd(row.odd)}${row.value ? ' ⚡' : ''}`, badgeX + badgeW / 2, badgeY + 41);
  });

  // Footer
  const fy = HEADER_H + ticket.length * ROW_H + 10;
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(16, fy);
  ctx.lineTo(W - 16, fy);
  ctx.stroke();

  ctx.fillStyle = '#333333';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(t('machine.canvasFooter'), W / 2, fy + 24);

  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

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

const LEAGUES_OPTIONS = [
  { value: 'all',    label: null },
  { value: '47',     label: 'Premier League' },
  { value: '53',     label: 'Ligue 1' },
  { value: '54',     label: 'Bundesliga' },
  { value: '55',     label: 'Serie A' },
  { value: '87',     label: 'La Liga' },
  { value: '42',     label: 'Champions League' },
  { value: '73',     label: 'Europa League' },
  { value: '289',    label: 'CAN' },
  { value: '526',    label: 'CAF Champions League' },
];

// ─── Marchés inspirés 1xbet — labels/descriptions dans machine.marketGroups.* (i18n) ──
const MARKET_GROUPS = [
  { id: 'resultats',    emoji: '🏆', markets: ['auto', '1', 'X', '2'] },
  { id: 'doublechance', emoji: '🔀', markets: ['1X', 'X2', '12'] },
  { id: 'dnb',          emoji: '🛡️', markets: ['dnb1', 'dnb2'] },
  { id: 'overunder',    emoji: '⚽', markets: ['over05', 'over15', 'over25', 'over35', 'over45', 'under15', 'under25', 'under35', 'under45'] },
  { id: 'btts',         emoji: '🥅', markets: ['btts', 'nobtts'] },
];

const CONF_THRESHOLDS = { high: 72, medium: 58, low: 0 };
const CONF_COLORS = {
  high:   { text: 'text-primary-400', bg: 'bg-primary-500/10 border-primary-500/20', dot: 'bg-primary-400' },
  medium: { text: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     dot: 'bg-amber-400' },
  low:    { text: 'text-gray-500',    bg: 'bg-surface-700/50 border-white/[0.05]',   dot: 'bg-gray-500' },
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
  const [nbPicks, setNbPicks]         = useState(5);
  const [marketGroup, setMarketGroup] = useState('resultats');
  const [market, setMarket]           = useState('auto');
  const [minConf, setMinConf]         = useState('medium');
  const [dateOpt, setDateOpt]         = useState('today');
  const [leagues, setLeagues]         = useState([]);
  const [pinnedMatchIds, setPinnedMatchIds] = useState(new Set());
  const [showMatchPicker, setShowMatchPicker] = useState(false);
  const [ticket, setTicket]           = useState(null);
  const [copied, setCopied]           = useState(false);
  const [sharing, setSharing]         = useState(false);
  const [mise, setMise]               = useState('');
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [excludeFriendly, setExcludeFriendly] = useState(true);

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

  const isLoading = rangeQ.isLoading;

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

  function generateTicket() {
    let candidates = availableCandidates;
    // Si des matchs ont été épinglés manuellement, limiter à ceux-là
    if (pinnedMatchIds.size > 0) {
      candidates = candidates.filter((c) => pinnedMatchIds.has(c.match.id));
    }
    setTicket(candidates.slice(0, nbPicks));
  }

  async function shareTicket() {
    if (!ticket || ticket.length === 0) return;
    setSharing(true);
    try {
      const canvas = drawTicketCanvas(ticket, totalOdds, t);
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

  return (
    <div className="max-w-2xl mx-auto py-5 space-y-5">

      {/* En-tête */}
      <div className="px-4">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={18} className="text-primary-400" />
          <h1 className="section-title">{t('machine.titleShort')}</h1>
        </div>
        <p className="text-xs text-gray-500">{t('machine.subtitleShort')}</p>
      </div>

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
                    : 'border-white/[0.07] text-gray-500 hover:border-white/[0.15] hover:text-gray-300'
                }`}>
                <span className="text-lg leading-none">{tpl.emoji}</span>
                <span className="text-xs font-bold">{t(`machine.templates.${tpl.labelKey}`)}</span>
                <span className="text-[9px] text-center leading-tight opacity-70">{t(`machine.templates.${tpl.subKey}`)}</span>
              </button>
            ))}
          </div>
          {activeTemplate && (
            <button onClick={() => setActiveTemplate(null)}
              className="mt-1.5 text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
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
          <div className="flex justify-between text-[10px] text-gray-600 mt-1">
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
                      : 'text-gray-500 border-white/[0.06] hover:text-gray-300'
                  }`}>
                  {g.emoji} {t(`machine.marketGroups.${g.id}.label`)}
                </button>
              ))}
            </div>
          </div>

          {/* Niveau 2 : marchés de la catégorie avec description */}
          {MARKET_GROUPS.filter((g) => g.id === marketGroup).map((g) => (
            <div key={g.id} className="space-y-1.5">
              <p className="text-[10px] text-gray-600 leading-snug">{t(`machine.marketGroups.${g.id}.subtitle`)}</p>
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
                    <span className="block text-[10px] text-gray-500 leading-snug">{t(`machine.marketGroups.${g.id}.markets.${mVal}.desc`)}</span>
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
                    : 'text-gray-500 border-white/[0.06] hover:text-gray-300'
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
                      : 'text-gray-500 border-white/[0.06] hover:text-gray-300'
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
              <Trophy size={11} className="text-gray-500" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('machine.championship')}</p>
            </div>
            {leagues.length > 0 && (
              <button onClick={() => { setLeagues([]); setTicket(null); }}
                className="text-[10px] text-gray-600 hover:text-primary-400 transition-colors">
                {t('machine.showAll')}
              </button>
            )}
          </div>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              {LEAGUES_OPTIONS.map((l) => {
                const isActive = l.value === 'all'
                  ? leagues.length === 0
                  : leagues.includes(l.value);
                return (
                  <button key={l.value}
                    onClick={() => {
                      if (l.value === 'all') {
                        setLeagues([]);
                      } else {
                        setLeagues((prev) =>
                          prev.includes(l.value)
                            ? prev.filter((x) => x !== l.value)
                            : [...prev, l.value]
                        );
                      }
                      setPinnedMatchIds(new Set());
                      setTicket(null);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-select-500/15 text-select-400 border-select-500/30'
                        : 'text-gray-500 border-white/[0.06] hover:text-gray-300'
                    }`}>
                    {l.label === null ? t('machine.allLeagues') : l.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Filtre amicaux ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Bot size={12} className="text-gray-500" />
            <span className="text-xs text-gray-400">{t('machine.excludeFriendly')}</span>
            <span className="text-[10px] text-gray-600">{t('machine.excludeFriendlyHint')}</span>
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
              <ListFilter size={11} className="text-gray-500" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-300 transition-colors">
                {t('machine.pickSpecificMatches')}
              </p>
              {pinnedMatchIds.size > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-select-500/20 text-select-400">
                  {t('machine.fixedCount', { count: pinnedMatchIds.size })}
                </span>
              )}
            </div>
            <div className="text-gray-600 group-hover:text-gray-400 transition-colors">
              {showMatchPicker ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </div>
          </button>

          {showMatchPicker && (
            <div className="mt-1 space-y-2">
              {isLoading ? (
                <p className="text-[10px] text-gray-600 py-2 text-center">{t('machine.loadingMatches')}</p>
              ) : availableCandidates.length === 0 ? (
                <p className="text-[10px] text-gray-600 py-2 text-center">
                  {t('machine.noMatchesFilters')}
                </p>
              ) : (
                <>
                  {/* Barre actions rapides */}
                  <div className="flex items-center gap-2">
                    <button onClick={selectAllCandidates}
                      className="text-[10px] text-gray-500 hover:text-gray-300 border border-white/[0.06] px-2 py-1 rounded-md transition-colors">
                      {t('machine.checkAll', { count: availableCandidates.length })}
                    </button>
                    {pinnedMatchIds.size > 0 && (
                      <button onClick={clearPinnedMatches}
                        className="text-[10px] text-gray-500 hover:text-gray-300 border border-white/[0.06] px-2 py-1 rounded-md transition-colors">
                        {t('machine.uncheckAll')}
                      </button>
                    )}
                    <span className="ml-auto text-[10px] text-gray-600">
                      {pinnedMatchIds.size > 0
                        ? t('machine.selectedCount', { count: pinnedMatchIds.size })
                        : t('machine.algoChooses')}
                    </span>
                  </div>

                  {/* Liste des matchs scrollable */}
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
                    {availableCandidates.map((c) => {
                      const pinned = pinnedMatchIds.has(c.match.id);
                      const cc = CONF_COLORS[c.conf];
                      return (
                        <button key={c.match.id} onClick={() => togglePin(c.match.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${
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

                          {/* Infos match */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <p className={`text-xs font-medium truncate ${pinned ? 'text-gray-200' : 'text-gray-400'}`}>
                                {c.match.homeTeam} vs {c.match.awayTeam}
                              </p>
                              {c.match.predictions?.aiGenerated && (
                                <span className="shrink-0 text-[8px] font-bold text-violet-400 bg-violet-500/10 px-1 rounded">IA</span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-600 mt-0.5">
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

                  <p className="text-[10px] text-gray-600">
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
            <span className="text-[10px] text-gray-600">{t('machine.searchingMatches')}</span>
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
              <span className="text-[10px] text-gray-600">
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

        {/* Bouton générer */}
        <button onClick={generateTicket} disabled={isLoading || availableCandidates.length === 0}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-40 disabled:cursor-not-allowed">
          <Zap size={16} />
          {isLoading ? t('machine.loading') : availableCandidates.length === 0 ? t('machine.noMatchAvailable') : t('machine.generateBtn')}
        </button>
      </div>

      {/* Résultat */}
      {ticket && (
        <div className="px-4 space-y-3">

          {/* ── Barre résultat ────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-200">
              {t('machine.selectionsGenerated', { count: ticket.length })}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={generateTicket}
                className="p-1.5 rounded-lg border border-white/[0.06] text-gray-500 hover:text-gray-300 transition-colors">
                <RefreshCw size={13} />
              </button>
              <button onClick={copyTicket}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors">
                {copied ? <Check size={12} className="text-primary-400" /> : <Copy size={12} />}
                {copied ? t('machine.copied') : t('machine.copy')}
              </button>
              <button onClick={shareTicket} disabled={sharing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50">
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
                <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">{t('machine.totalOdd')}</p>
                <p className="text-lg font-black text-amber-400">×{totalOdds}</p>
              </div>

              <div className="w-px h-10 bg-white/[0.06] shrink-0" />

              {/* Input mise */}
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">{t('machine.yourStake')}</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      placeholder="1 000"
                      value={mise}
                      onChange={(e) => setMise(e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold text-gray-200 outline-none placeholder:text-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-[10px] text-gray-600 shrink-0">FCFA</span>
                  </div>
                </div>
              </div>

              <div className="w-px h-10 bg-white/[0.06] shrink-0" />

              {/* Gain potentiel */}
              <div className="shrink-0 text-center">
                <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">{t('machine.stake.potentialGain')}</p>
                {mise && Number(mise) > 0 ? (
                  <p className="text-base font-black text-primary-400">
                    {Math.round(Number(mise) * Number(totalOdds)).toLocaleString('fr-FR')}
                    <span className="text-[9px] font-normal text-gray-600 ml-0.5">FCFA</span>
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
              <p className="text-gray-500 text-sm">{t('machine.noSelectionMatch')}</p>
              <p className="text-gray-600 text-xs mt-1">{t('machine.tryLowerConfidence')}</p>
            </div>
          ) : (
            <div className="card overflow-hidden divide-y divide-white/[0.04]">
              {ticket.map((row, idx) => {
                const c = CONF_COLORS[row.conf];
                return (
                  <div key={row.match.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-gray-600">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-200 truncate">{row.match.homeTeam} vs {row.match.awayTeam}</p>
                        {row.match.predictions?.aiGenerated && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/20">
                            <Bot size={8} />IA
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-600 mt-0.5">
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

          <p className="text-[10px] text-gray-600 text-center">{ODDS_DISCLAIMER}</p>
        </div>
      )}
    </div>
  );
}
