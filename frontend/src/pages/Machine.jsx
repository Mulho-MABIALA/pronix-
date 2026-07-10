import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { Zap, Copy, Check, RefreshCw, Share2, Download, ChevronDown, ChevronUp, Trophy, ListFilter } from 'lucide-react';
import api from '../services/api';
import { OddsChip, ValueBetBadge } from '../components/ui/OddsChip';
import { getOdd, isValueBet, getValueEdge, formatOdd, ODDS_DISCLAIMER } from '../utils/mockOdds';

function drawTicketCanvas(ticket, totalOdds) {
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
  ctx.fillText(`Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm')} · ${ticket.length} sélection${ticket.length > 1 ? 's' : ''}`, 58, 46);

  // Cote totale
  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 13px system-ui';
  ctx.textAlign = 'right';
  ctx.fillText(`Cote × ${totalOdds}`, W - 16, 30);

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

  ticket.forEach((t, i) => {
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
    ctx.fillText(`${t.match.homeTeam} vs ${t.match.awayTeam}`, 34, y + 22);

    // Compétition + heure
    ctx.fillStyle = '#555555';
    ctx.font = '10px system-ui';
    ctx.fillText(
      `${t.match.competition?.name || ''} · ${format(new Date(t.match.scheduledAt), 'dd/MM HH:mm')}`,
      34, y + 38
    );

    // Badge pick
    const badgeW = 80;
    const badgeX = W - 16 - badgeW;
    const badgeY = y + 9;
    ctx.fillStyle = CONF_BG[t.conf];
    roundRect(ctx, badgeX, badgeY, badgeW, 46, 8);
    ctx.fill();

    ctx.fillStyle = CONF_TEXT[t.conf];
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(PICK_LABELS[t.pick.type] || t.pick.type, badgeX + badgeW / 2, badgeY + 14);
    ctx.font = 'bold 11px system-ui';
    ctx.fillText(`${t.pick.prob}%`, badgeX + badgeW / 2, badgeY + 28);
    ctx.fillStyle = t.value ? '#fbbf24' : '#888888';
    ctx.font = 'bold 10px system-ui';
    ctx.fillText(`cote ${formatOdd(t.odd)}${t.value ? ' ⚡' : ''}`, badgeX + badgeW / 2, badgeY + 41);
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
  ctx.fillText('pronix.com · Pronostics générés par algorithme · Jouez de façon responsable', W / 2, fy + 24);

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
    label: 'Safe',
    sub: 'Picks très fiables · cote modeste',
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
    label: 'Équilibré',
    sub: 'Bon compromis cote / sécurité',
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
    label: 'Ambitieux',
    sub: 'Grosse cote · plus risqué',
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
  { value: 'today',    label: "Aujourd'hui", days: 0  },
  { value: 'tomorrow', label: 'Demain',      days: 1  },
  { value: '3days',    label: '3 jours',     days: 3  },
  { value: 'week',     label: '1 semaine',   days: 7  },
  { value: '2weeks',   label: '2 semaines',  days: 14 },
  { value: 'month',    label: '1 mois',      days: 30 },
];

const LEAGUES_OPTIONS = [
  { value: 'all',    label: 'Toutes les ligues' },
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

// ─── Marchés inspirés 1xbet ────────────────────────────────────────────────────
const MARKET_GROUPS = [
  {
    id: 'resultats',
    label: 'Résultat',
    emoji: '🏆',
    subtitle: 'Qui remporte le match à la fin du temps réglementaire ?',
    markets: [
      {
        value: 'auto',
        label: 'Meilleur pick auto',
        desc: "L'algorithme sélectionne automatiquement le marché avec la plus haute probabilité parmi tous ceux disponibles pour ce match.",
      },
      {
        value: '1',
        label: '1 — Victoire domicile',
        desc: "L'équipe qui joue à domicile gagne le match à la fin du temps réglementaire. Perdu si nul ou victoire extérieur.",
      },
      {
        value: 'X',
        label: 'X — Match nul',
        desc: "Les deux équipes terminent le match avec le même nombre de buts. Perdu si l'une des deux équipes l'emporte.",
      },
      {
        value: '2',
        label: '2 — Victoire extérieur',
        desc: "L'équipe visiteuse gagne le match. Perdu si nul ou victoire domicile.",
      },
    ],
  },
  {
    id: 'doublechance',
    label: 'Double chance',
    emoji: '🔀',
    subtitle: 'Tu couvres 2 résultats sur 3 — plus sécurisé, cote réduite.',
    markets: [
      {
        value: '1X',
        label: '1X — Domicile ou Nul',
        desc: "Gagné si victoire domicile OU match nul. Perdu uniquement si l'équipe extérieure gagne. Idéal pour miser sur une équipe forte à domicile sans risque du nul.",
      },
      {
        value: 'X2',
        label: 'X2 — Nul ou Extérieur',
        desc: "Gagné si match nul OU victoire extérieure. Perdu uniquement si l'équipe à domicile gagne. Bon choix quand l'extérieur est favori ou l'équipe est solide.",
      },
      {
        value: '12',
        label: '12 — Domicile ou Extérieur (sans nul)',
        desc: "Gagné si l'une des deux équipes gagne. Perdu uniquement en cas de match nul. Parfait quand un nul semble improbable entre deux équipes offensives.",
      },
    ],
  },
  {
    id: 'dnb',
    label: 'Résultat sans nul',
    emoji: '🛡️',
    subtitle: 'Draw No Bet — ton mise est remboursée si match nul.',
    markets: [
      {
        value: 'dnb1',
        label: 'DNB Domicile — Pari annulé si nul',
        desc: "Gagné si domicile gagne. Mise remboursée si nul. Perdu si extérieur gagne. Moins risqué qu'un simple 1 — couverture contre le nul.",
      },
      {
        value: 'dnb2',
        label: 'DNB Extérieur — Pari annulé si nul',
        desc: "Gagné si extérieur gagne. Mise remboursée si nul. Perdu si domicile gagne. Idéal pour miser sur une équipe visiteuse sans craindre le nul.",
      },
    ],
  },
  {
    id: 'overunder',
    label: 'Total buts',
    emoji: '⚽',
    subtitle: 'Parie sur le nombre total de buts marqués dans le match.',
    markets: [
      {
        value: 'over05',
        label: 'Plus de 0.5 but — Au moins 1 but',
        desc: "Il suffit qu'un seul but soit marqué dans le match pour gagner. Probabilité très haute (~97%). Cote faible mais sécurisée.",
      },
      {
        value: 'over15',
        label: 'Plus de 1.5 buts — Au moins 2 buts',
        desc: "Le match doit compter au moins 2 buts au total. Très fréquent dans les rencontres offensives. Pari solide sur des équipes qui marquent.",
      },
      {
        value: 'over25',
        label: 'Plus de 2.5 buts — Au moins 3 buts',
        desc: "Le match doit totaliser 3 buts ou plus (ex. 2-1, 3-0, 2-2). Le marché Over/Under le plus populaire sur 1xbet.",
      },
      {
        value: 'over35',
        label: 'Plus de 3.5 buts — Au moins 4 buts',
        desc: "Match prolifique avec 4 buts ou plus (ex. 2-2, 3-1, 4-0). Bonne cote, recommandé pour les derbies ou matchs à forte attaque.",
      },
      {
        value: 'over45',
        label: 'Plus de 4.5 buts — Au moins 5 buts',
        desc: "Match très ouvert avec 5 buts ou plus. Cote élevée, recommandé sur les matchs entre équipes très offensives ou en mauvaise défense.",
      },
      {
        value: 'under15',
        label: 'Moins de 1.5 but — Maximum 1 but',
        desc: "Le match se termine avec 0 ou 1 seul but. Pari sur un match fermé et défensif. Gagné si score 0-0, 1-0 ou 0-1.",
      },
      {
        value: 'under25',
        label: 'Moins de 2.5 buts — Maximum 2 buts',
        desc: "Au maximum 2 buts dans le match (0-0, 1-0, 0-1, 1-1, 2-0, 0-2). Adapté aux matchs tendus, coupe, ou entre grandes défenses.",
      },
      {
        value: 'under35',
        label: 'Moins de 3.5 buts — Maximum 3 buts',
        desc: "Le match a 3 buts ou moins. Bonne probabilité dans les matchs équilibrés. Gagné si le score final est 2-1, 1-1, 2-0, etc.",
      },
      {
        value: 'under45',
        label: 'Moins de 4.5 buts — Maximum 4 buts',
        desc: "Le match ne dépasse pas 4 buts. Probabilité élevée (~80%). Perdu uniquement pour les matchs très prolifiques (5 buts ou plus).",
      },
    ],
  },
  {
    id: 'btts',
    label: 'Les 2 marquent',
    emoji: '🥅',
    subtitle: 'Both Teams To Score — est-ce que chaque équipe marque au moins une fois ?',
    markets: [
      {
        value: 'btts',
        label: 'BTTS Oui — Les 2 équipes marquent',
        desc: "Les deux équipes marquent au moins 1 but chacune (ex. 1-1, 2-1, 1-2, 2-2). Le score exact n'importe pas, seulement que les 2 équipes trouvent le filet.",
      },
      {
        value: 'nobtts',
        label: 'BTTS Non — Au moins une équipe ne marque pas',
        desc: "Au moins une des deux équipes termine la rencontre sans marquer. Gagné si score 1-0, 0-2, 2-0, ou 0-0. Recommandé quand une équipe a une défense très solide.",
      },
    ],
  },
];

const CONF_THRESHOLDS = { high: 72, medium: 58, low: 0 };
const CONF_COLORS = {
  high:   { text: 'text-primary-400', bg: 'bg-primary-500/10 border-primary-500/20', dot: 'bg-primary-400' },
  medium: { text: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     dot: 'bg-amber-400' },
  low:    { text: 'text-gray-500',    bg: 'bg-surface-700/50 border-white/[0.05]',   dot: 'bg-gray-500' },
};
const PICK_LABELS = {
  '1': 'Dom.', 'X': 'Nul', '2': 'Ext.',
  '1X': '1X', 'X2': 'X2', '12': '12',
  'dnb1': 'DNB1', 'dnb2': 'DNB2',
  'over05': 'O0.5', 'over15': 'O1.5', 'over25': 'O2.5', 'over35': 'O3.5', 'over45': 'O4.5',
  'under15': 'U1.5', 'under25': 'U2.5', 'under35': 'U3.5', 'under45': 'U4.5',
  'btts': 'BTTS✓', 'nobtts': 'BTTSx',
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

  // ── Candidats filtrés (avant sélection manuelle et limite nbPicks) ─────────
  const availableCandidates = (() => {
    const allMatches = rangeQ.data?.data || [];
    return allMatches
      .filter((m) => {
        if (m.status !== 'SCHEDULED') return false;
        if (!m.predictions) return false;
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
      const canvas = drawTicketCanvas(ticket, totalOdds);
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'ticket-statfoot.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Mon ticket fpronix' });
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
    const lines = ticket.map((t, i) => {
      const time = format(new Date(t.match.scheduledAt), 'dd/MM HH:mm');
      return `${i + 1}. ${t.match.homeTeam} vs ${t.match.awayTeam} — ${PICK_LABELS[t.pick.type] || t.pick.type} (${t.pick.prob}% · cote ${formatOdd(t.odd)}${t.value ? ' ⚡value' : ''}) — ${time}`;
    });
    if (totalOdds) lines.push(`\nCote totale simulée : × ${totalOdds}`);
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const totalOdds = ticket && ticket.length
    ? ticket.reduce((acc, t) => acc * t.odd, 1).toFixed(2)
    : null;

  return (
    <div className="max-w-2xl mx-auto py-5 space-y-5">

      {/* En-tête */}
      <div className="px-4">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={18} className="text-primary-400" />
          <h1 className="section-title">Générateur de ticket</h1>
        </div>
        <p className="text-xs text-gray-500">Construisez un ticket optimisé par l'algorithme</p>
      </div>

      {/* Paramètres */}
      <div className="px-4 card p-4 space-y-4">

        {/* ── Templates prédéfinis ──────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Démarrage rapide
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
                <span className="text-xs font-bold">{tpl.label}</span>
                <span className="text-[9px] text-center leading-tight opacity-70">{tpl.sub}</span>
              </button>
            ))}
          </div>
          {activeTemplate && (
            <button onClick={() => setActiveTemplate(null)}
              className="mt-1.5 text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
              Personnaliser manuellement →
            </button>
          )}
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Nombre de picks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nombre de sélections</p>
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
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Marché</p>

          {/* Niveau 1 : catégories */}
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              {MARKET_GROUPS.map((g) => (
                <button key={g.id}
                  onClick={() => {
                    setMarketGroup(g.id);
                    setMarket(g.markets[0].value);
                    setTicket(null);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                    marketGroup === g.id
                      ? 'bg-primary-500/15 text-primary-400 border-primary-500/30'
                      : 'text-gray-500 border-white/[0.06] hover:text-gray-300'
                  }`}>
                  {g.emoji} {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Niveau 2 : marchés de la catégorie avec description */}
          {MARKET_GROUPS.filter((g) => g.id === marketGroup).map((g) => (
            <div key={g.id} className="space-y-1.5">
              <p className="text-[10px] text-gray-600 leading-snug">{g.subtitle}</p>
              <div className="grid grid-cols-1 gap-1.5">
                {g.markets.map((m) => (
                  <button key={m.value}
                    onClick={() => { setMarket(m.value); setTicket(null); }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                      market === m.value
                        ? 'bg-primary-500/10 border-primary-500/30'
                        : 'border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02]'
                    }`}>
                    <span className={`block text-xs font-semibold mb-0.5 ${market === m.value ? 'text-primary-400' : 'text-gray-300'}`}>
                      {m.label}
                    </span>
                    <span className="block text-[10px] text-gray-500 leading-snug">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Confiance minimale */}
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Confiance minimale</p>
          <div className="flex gap-2">
            {[
              { value: 'high',   label: '🟢 Élevée' },
              { value: 'medium', label: '🟡 Moyenne' },
              { value: 'low',    label: '⚪ Toutes' },
            ].map((o) => (
              <button key={o.value} onClick={() => setMinConf(o.value)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  minConf === o.value
                    ? 'bg-primary-500/15 text-primary-400 border-primary-500/30'
                    : 'text-gray-500 border-white/[0.06] hover:text-gray-300'
                }`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date / Période */}
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Période</p>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              {DATE_PRESETS.map((o) => (
                <button key={o.value} onClick={() => { setDateOpt(o.value); setTicket(null); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                    dateOpt === o.value
                      ? 'bg-primary-500/15 text-primary-400 border-primary-500/30'
                      : 'text-gray-500 border-white/[0.06] hover:text-gray-300'
                  }`}>
                  {o.label}
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
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Championnat</p>
            </div>
            {leagues.length > 0 && (
              <button onClick={() => { setLeagues([]); setTicket(null); }}
                className="text-[10px] text-gray-600 hover:text-primary-400 transition-colors">
                Tout afficher
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
                        ? 'bg-primary-500/15 text-primary-400 border-primary-500/30'
                        : 'text-gray-500 border-white/[0.06] hover:text-gray-300'
                    }`}>
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Sélection manuelle de matchs ────────────────────────────── */}
        <div>
          <button
            onClick={() => setShowMatchPicker((p) => !p)}
            className="w-full flex items-center justify-between py-2 group">
            <div className="flex items-center gap-1.5">
              <ListFilter size={11} className="text-gray-500" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-300 transition-colors">
                Choisir des matchs précis
              </p>
              {pinnedMatchIds.size > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary-500/20 text-primary-400">
                  {pinnedMatchIds.size} fixé{pinnedMatchIds.size > 1 ? 's' : ''}
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
                <p className="text-[10px] text-gray-600 py-2 text-center">Chargement des matchs…</p>
              ) : availableCandidates.length === 0 ? (
                <p className="text-[10px] text-gray-600 py-2 text-center">
                  Aucun match disponible avec ces filtres
                </p>
              ) : (
                <>
                  {/* Barre actions rapides */}
                  <div className="flex items-center gap-2">
                    <button onClick={selectAllCandidates}
                      className="text-[10px] text-gray-500 hover:text-gray-300 border border-white/[0.06] px-2 py-1 rounded-md transition-colors">
                      Tout cocher ({availableCandidates.length})
                    </button>
                    {pinnedMatchIds.size > 0 && (
                      <button onClick={clearPinnedMatches}
                        className="text-[10px] text-gray-500 hover:text-gray-300 border border-white/[0.06] px-2 py-1 rounded-md transition-colors">
                        Tout décocher
                      </button>
                    )}
                    <span className="ml-auto text-[10px] text-gray-600">
                      {pinnedMatchIds.size > 0
                        ? `${pinnedMatchIds.size} sélectionné${pinnedMatchIds.size > 1 ? 's' : ''}`
                        : 'Algo choisit'}
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
                              ? 'bg-primary-500/10 border-primary-500/25'
                              : 'border-white/[0.05] hover:border-white/[0.10]'
                          }`}>
                          {/* Checkbox */}
                          <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                            pinned ? 'bg-primary-500 border-primary-500' : 'border-white/[0.2]'
                          }`}>
                            {pinned && <Check size={9} className="text-white" strokeWidth={3} />}
                          </div>

                          {/* Infos match */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${pinned ? 'text-gray-200' : 'text-gray-400'}`}>
                              {c.match.homeTeam} vs {c.match.awayTeam}
                            </p>
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
                      ? 'Le ticket sera généré uniquement avec les matchs cochés.'
                      : "Aucun match coché → l'algorithme choisit les meilleurs automatiquement."}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Compteur de matchs disponibles */}
        <div className="flex items-center justify-center gap-2 py-1">
          {isLoading ? (
            <span className="text-[10px] text-gray-600">Recherche des matchs…</span>
          ) : (
            <>
              <span className={`text-[11px] font-semibold ${
                availableCandidates.length === 0
                  ? 'text-rose-400'
                  : availableCandidates.length < nbPicks
                    ? 'text-amber-400'
                    : 'text-primary-400'
              }`}>
                {availableCandidates.length} match{availableCandidates.length !== 1 ? 's' : ''} disponible{availableCandidates.length !== 1 ? 's' : ''}
              </span>
              <span className="text-gray-700">·</span>
              <span className="text-[10px] text-gray-600">
                {pinnedMatchIds.size > 0
                  ? `${pinnedMatchIds.size} sélectionné${pinnedMatchIds.size > 1 ? 's' : ''} manuellement`
                  : `meilleurs ${Math.min(nbPicks, availableCandidates.length)} retenus`}
              </span>
              {availableCandidates.length < nbPicks && availableCandidates.length > 0 && (
                <span className="text-[10px] text-amber-500">
                  · ticket réduit à {availableCandidates.length}
                </span>
              )}
            </>
          )}
        </div>

        {/* Bouton générer */}
        <button onClick={generateTicket} disabled={isLoading || availableCandidates.length === 0}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-40 disabled:cursor-not-allowed">
          <Zap size={16} />
          {isLoading ? 'Chargement…' : availableCandidates.length === 0 ? 'Aucun match disponible' : 'Générer le ticket'}
        </button>
      </div>

      {/* Résultat */}
      {ticket && (
        <div className="px-4 space-y-3">

          {/* ── Barre résultat ────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-200">
              {ticket.length} sélection{ticket.length > 1 ? 's' : ''} générée{ticket.length > 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={generateTicket}
                className="p-1.5 rounded-lg border border-white/[0.06] text-gray-500 hover:text-gray-300 transition-colors">
                <RefreshCw size={13} />
              </button>
              <button onClick={copyTicket}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors">
                {copied ? <Check size={12} className="text-primary-400" /> : <Copy size={12} />}
                {copied ? 'Copié !' : 'Copier'}
              </button>
              <button onClick={shareTicket} disabled={sharing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50">
                {sharing
                  ? <RefreshCw size={12} className="animate-spin" />
                  : navigator.share ? <Share2 size={12} /> : <Download size={12} />}
                {navigator.share ? 'Partager' : 'Image'}
              </button>
            </div>
          </div>

          {/* ── Simulation de mise ────────────────────────────────────── */}
          {totalOdds && ticket.length > 0 && (
            <div className="card p-3 flex items-center gap-3">
              {/* Cote totale */}
              <div className="shrink-0 text-center">
                <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Cote totale</p>
                <p className="text-lg font-black text-amber-400">×{totalOdds}</p>
              </div>

              <div className="w-px h-10 bg-white/[0.06] shrink-0" />

              {/* Input mise */}
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Votre mise</p>
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
                <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Gain potentiel</p>
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
              <p className="text-gray-500 text-sm">Aucune sélection ne correspond à ces critères</p>
              <p className="text-gray-600 text-xs mt-1">Essayez de baisser le niveau de confiance ou d'élargir la période</p>
            </div>
          ) : (
            <div className="card overflow-hidden divide-y divide-white/[0.04]">
              {ticket.map((t, idx) => {
                const c = CONF_COLORS[t.conf];
                return (
                  <div key={t.match.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-gray-600">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{t.match.homeTeam} vs {t.match.awayTeam}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        {t.match.competition?.name} · {format(new Date(t.match.scheduledAt), 'dd/MM HH:mm')}
                      </p>
                    </div>
                    <div className={`shrink-0 text-center px-2.5 py-1 rounded-lg border ${c.bg}`}>
                      <span className={`block text-xs font-bold ${c.text}`}>{PICK_LABELS[t.pick.type] || t.pick.type}</span>
                      <span className={`block text-[10px] font-semibold ${c.text}`}>{t.pick.prob}%</span>
                    </div>
                    <div className="shrink-0 flex flex-col items-center gap-1">
                      <OddsChip odd={t.odd} />
                      {t.value && <ValueBetBadge edge={getValueEdge(t.pick.prob, t.odd)} />}
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
