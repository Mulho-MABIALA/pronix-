import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { Zap, Copy, Check, RefreshCw, Share2, Download } from 'lucide-react';
import api from '../services/api';

function drawTicketCanvas(ticket, totalOdds) {
  const W = 640;
  const ROW_H = 64;
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
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, W, H);

  // Bande verte en haut
  ctx.fillStyle = '#09bb57';
  ctx.fillRect(0, 0, W, 4);

  // Logo + titre
  ctx.fillStyle = '#09bb57';
  roundRect(ctx, 16, 16, 32, 32, 8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('SF', 32, 37);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('Pronix — Mon Ticket', 58, 30);

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
  const CONF_BG   = { high: '#09bb5722', medium: '#f59e0b22', low: '#3a3a3a' };
  const CONF_TEXT = { high: '#16d465',   medium: '#fbbf24',   low: '#888888' };

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
    const badgeW = 72;
    const badgeX = W - 16 - badgeW;
    const badgeY = y + 12;
    ctx.fillStyle = CONF_BG[t.conf];
    roundRect(ctx, badgeX, badgeY, badgeW, 36, 8);
    ctx.fill();

    ctx.fillStyle = CONF_TEXT[t.conf];
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(PICK_LABELS[t.pick.type] || t.pick.type, badgeX + badgeW / 2, badgeY + 14);
    ctx.font = 'bold 11px system-ui';
    ctx.fillText(`${t.pick.prob}%`, badgeX + badgeW / 2, badgeY + 28);
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

const MARKETS = [
  { value: 'auto',   label: 'Meilleur pick auto' },
  { value: '1',      label: '1 — Domicile' },
  { value: 'X',      label: 'X — Nul' },
  { value: '2',      label: '2 — Extérieur' },
  { value: '1X',     label: 'Double chance 1X' },
  { value: 'X2',     label: 'Double chance X2' },
  { value: 'over25', label: 'Plus de 2.5 buts' },
  { value: 'over15', label: 'Plus de 1.5 buts' },
  { value: 'btts',   label: 'Les 2 équipes marquent' },
];

const CONF_THRESHOLDS = { high: 72, medium: 58, low: 0 };
const CONF_COLORS = {
  high:   { text: 'text-primary-400', bg: 'bg-primary-500/10 border-primary-500/20', dot: 'bg-primary-400' },
  medium: { text: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     dot: 'bg-amber-400' },
  low:    { text: 'text-gray-500',    bg: 'bg-surface-700/50 border-white/[0.05]',   dot: 'bg-gray-500' },
};
const PICK_LABELS = {
  '1': 'Dom.', 'X': 'Nul', '2': 'Ext.', 'over25': 'O2.5', 'over15': 'O1.5', 'btts': 'BTTS', '1X': '1X', 'X2': 'X2',
};

function getProb(pred, market) {
  if (market === 'auto' || !market) return pred.bestPick;
  const probMap = { '1': pred.home, 'X': pred.draw, '2': pred.away, over25: pred.over25, over15: pred.over15, btts: pred.btts, '1X': pred.dc1x, 'X2': pred.dc2x };
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
  const [nbPicks, setNbPicks]     = useState(5);
  const [market, setMarket]       = useState('auto');
  const [minConf, setMinConf]     = useState('medium');
  const [dateOpt, setDateOpt]     = useState('today');
  const [leagues, setLeagues]     = useState([]);
  const [ticket, setTicket]       = useState(null);
  const [copied, setCopied]       = useState(false);
  const [sharing, setSharing]     = useState(false);

  const today    = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const todayQ    = useQuery({ queryKey: ['machine', today],    queryFn: () => api.get(`/matches?date=${today}&limit=100`).then(r => r.data),    staleTime: 5 * 60 * 1000 });
  const tomorrowQ = useQuery({ queryKey: ['machine', tomorrow], queryFn: () => api.get(`/matches?date=${tomorrow}&limit=100`).then(r => r.data), staleTime: 5 * 60 * 1000 });

  const isLoading = todayQ.isLoading || tomorrowQ.isLoading;

  function generateTicket() {
    const todayMatches    = dateOpt !== 'tomorrow' ? (todayQ.data?.data    || []) : [];
    const tomorrowMatches = dateOpt !== 'today'    ? (tomorrowQ.data?.data || []) : [];
    const allMatches = [...todayMatches, ...tomorrowMatches];
    const candidates = allMatches
      .filter((m) => {
        if (m.status !== 'SCHEDULED') return false;
        if (!m.predictions) return false;
        const pick = getProb(m.predictions, market);
        const conf = getConfidence(pick.prob);
        const minProb = CONF_THRESHOLDS[minConf];
        if (pick.prob < minProb) return false;
        if (leagues.length > 0 && !leagues.includes(m.competition?.externalId)) return false;
        return true;
      })
      .map((m) => {
        const pick = getProb(m.predictions, market);
        return { match: m, pick, conf: getConfidence(pick.prob) };
      })
      .sort((a, b) => b.pick.prob - a.pick.prob);

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
          await navigator.share({ files: [file], title: 'Mon ticket Pronix' });
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
      return `${i + 1}. ${t.match.homeTeam} vs ${t.match.awayTeam} — ${PICK_LABELS[t.pick.type] || t.pick.type} (${t.pick.prob}%) — ${time}`;
    });
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const totalOdds = ticket
    ? ticket.reduce((acc, t) => acc * (100 / t.pick.prob), 1).toFixed(2)
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

        {/* Nombre de picks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nombre de sélections</p>
            <span className="text-sm font-bold text-primary-400">{nbPicks}</span>
          </div>
          <input type="range" min="2" max="12" step="1" value={nbPicks}
            onChange={(e) => setNbPicks(Number(e.target.value))}
            className="w-full accent-primary-500 h-1.5 cursor-pointer" />
          <div className="flex justify-between text-[10px] text-gray-600 mt-1">
            <span>2</span><span>12</span>
          </div>
        </div>

        {/* Marché */}
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Marché</p>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              {MARKETS.map((o) => (
                <button key={o.value} onClick={() => setMarket(o.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                    market === o.value
                      ? 'bg-primary-500/15 text-primary-400 border-primary-500/30'
                      : 'text-gray-500 border-white/[0.06] hover:text-gray-300'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
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

        {/* Date */}
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Journée</p>
          <div className="flex gap-2">
            {[
              { value: 'today',    label: "Aujourd'hui" },
              { value: 'tomorrow', label: 'Demain' },
              { value: 'both',     label: 'Les deux' },
            ].map((o) => (
              <button key={o.value} onClick={() => setDateOpt(o.value)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  dateOpt === o.value
                    ? 'bg-primary-500/15 text-primary-400 border-primary-500/30'
                    : 'text-gray-500 border-white/[0.06] hover:text-gray-300'
                }`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bouton générer */}
        <button onClick={generateTicket} disabled={isLoading}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3">
          <Zap size={16} />
          {isLoading ? 'Chargement…' : 'Générer le ticket'}
        </button>
      </div>

      {/* Résultat */}
      {ticket && (
        <div className="px-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-200">
              {ticket.length} sélection{ticket.length > 1 ? 's' : ''} générée{ticket.length > 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              {totalOdds && (
                <span className="text-xs text-gray-500">
                  Cote indicative : <span className="text-amber-400 font-semibold">× {totalOdds}</span>
                </span>
              )}
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

          {ticket.length === 0 ? (
            <div className="card-p text-center py-8">
              <p className="text-2xl mb-2">🎯</p>
              <p className="text-gray-500 text-sm">Aucune sélection ne correspond à ces critères</p>
              <p className="text-gray-600 text-xs mt-1">Essayez de baisser le niveau de confiance ou de changer la journée</p>
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
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[10px] text-gray-600 text-center">
            La cote indicative est calculée à partir des probabilités algorithmiques. Les cotes réelles varient selon le bookmaker.
          </p>
        </div>
      )}
    </div>
  );
}
