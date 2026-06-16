import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, addDays, isToday, isYesterday, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TrendingUp, ChevronRight, Info } from 'lucide-react';
import api from '../services/api';
import { SkeletonCard } from '../components/ui/SkeletonLoader';

const PICK_LABELS = {
  '1':      'Victoire domicile',
  'X':      'Match nul',
  '2':      'Victoire extérieur',
  'over25': 'Plus de 2.5 buts',
  'over15': 'Plus de 1.5 buts',
  'btts':   'Les 2 équipes marquent',
  '1X':     'Double chance 1X',
  'X2':     'Double chance X2',
};

const CONF = {
  high:   { label: 'Confiance élevée',  color: 'text-primary-400', bg: 'bg-primary-500/10 border-primary-500/20', dot: 'bg-primary-400' },
  medium: { label: 'Confiance moyenne', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     dot: 'bg-amber-400' },
  low:    { label: 'Confiance faible',  color: 'text-gray-500',    bg: 'bg-surface-700/50 border-white/[0.05]',   dot: 'bg-gray-500' },
};

function formatTabDate(d) {
  if (isToday(d))     return 'Aujourd\'hui';
  if (isYesterday(d)) return 'Hier';
  if (isTomorrow(d))  return 'Demain';
  return format(d, 'EEE dd', { locale: fr });
}

const FOTMOB_CDN = (id) =>
  id ? `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png` : null;

function TeamLogo({ logo, teamId, name, size = 22 }) {
  const [err, setErr] = useState(false);
  const src = logo || FOTMOB_CDN(teamId);
  if (src && !err) {
    return <img src={src} alt="" aria-hidden="true" style={{ width: size, height: size }} className="object-contain shrink-0" onError={() => setErr(true)} />;
  }
  return (
    <div className="rounded-full bg-surface-600 flex items-center justify-center text-gray-500 font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}

function PronoCard({ match }) {
  const pred = match.predictions;
  if (!pred) return null;
  const conf = CONF[pred.confidence] || CONF.low;
  const isFinished = match.status === 'FINISHED';
  const isLive = match.status === 'LIVE';
  const pickLabel = PICK_LABELS[pred.bestPick.type] || pred.bestPick.label;

  // Pour un match terminé, vérifier si le pick était correct
  let resultIcon = null;
  if (isFinished && match.homeScore !== null) {
    const hWon = match.homeScore > match.awayScore;
    const aWon = match.awayScore > match.homeScore;
    const draw = match.homeScore === match.awayScore;
    const t = pred.bestPick.type;
    const correct =
      (t === '1' && hWon) ||
      (t === 'X' && draw) ||
      (t === '2' && aWon) ||
      (t === '1X' && (hWon || draw)) ||
      (t === 'X2' && (aWon || draw)) ||
      (t === 'over25' && (match.homeScore + match.awayScore) > 2.5) ||
      (t === 'over15' && (match.homeScore + match.awayScore) > 1.5) ||
      (t === 'btts' && match.homeScore > 0 && match.awayScore > 0);
    resultIcon = correct ? '✓' : '✗';
  }

  return (
    <Link to={`/matchs/${match.id}`} className="card p-4 block hover:border-white/10 transition-colors">
      {/* Header : compétition + heure */}
      <div className="flex items-center justify-between mb-3">
        <span className="comp-label">{match.competition?.name}</span>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="live-pill">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {match.minute || 'LIVE'}
            </span>
          )}
          {isFinished && (
            <span className="text-[10px] text-gray-600 font-semibold">
              {match.homeScore} - {match.awayScore}
            </span>
          )}
          {!isFinished && !isLive && (
            <span className="text-xs font-semibold text-gray-400">
              {format(new Date(match.scheduledAt), 'HH:mm')}
            </span>
          )}
        </div>
      </div>

      {/* Équipes */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeamLogo logo={match.homeTeamLogo} teamId={match.homeTeamId} name={match.homeTeam} />
          <span className="text-sm font-semibold text-gray-200 truncate">{match.homeTeam}</span>
        </div>
        <span className="text-gray-700 text-xs shrink-0">vs</span>
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-sm font-semibold text-gray-200 truncate text-right">{match.awayTeam}</span>
          <TeamLogo logo={match.awayTeamLogo} teamId={match.awayTeamId} name={match.awayTeam} />
        </div>
      </div>

      {/* Pick recommandé */}
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${conf.bg}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${conf.dot} shrink-0`} />
          <div>
            <span className={`text-xs font-bold ${conf.color}`}>{conf.label}</span>
            <p className="text-sm font-semibold text-gray-100 mt-0.5">{pickLabel}</p>
          </div>
        </div>
        <div className="text-right shrink-0 flex items-center gap-2">
          {resultIcon && (
            <span className={`text-lg font-bold ${resultIcon === '✓' ? 'text-primary-400' : 'text-red-400'}`}>
              {resultIcon}
            </span>
          )}
          <div>
            <span className={`block text-xl font-display font-bold ${conf.color}`}>{pred.bestPick.prob}%</span>
            <span className="block text-[10px] text-gray-600">{pred.bestPick.market}</span>
          </div>
        </div>
      </div>

      {/* 1X2 mini-barre */}
      <div className="mt-3 flex items-center gap-1.5">
        <div className="flex-1 text-center">
          <p className="text-[10px] text-gray-600 mb-1">1</p>
          <div className="h-1 bg-surface-600 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pred.home}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5 font-semibold">{pred.home}%</p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-[10px] text-gray-600 mb-1">X</p>
          <div className="h-1 bg-surface-600 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pred.draw}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5 font-semibold">{pred.draw}%</p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-[10px] text-gray-600 mb-1">2</p>
          <div className="h-1 bg-surface-600 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pred.away}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5 font-semibold">{pred.away}%</p>
        </div>
        <div className="w-px h-6 bg-white/[0.05]" />
        <div className="flex-1 text-center">
          <p className="text-[10px] text-gray-600 mb-1">O2.5</p>
          <div className="h-1 bg-surface-600 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pred.over25}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5 font-semibold">{pred.over25}%</p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-[10px] text-gray-600 mb-1">BTTS</p>
          <div className="h-1 bg-surface-600 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pred.btts}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5 font-semibold">{pred.btts}%</p>
        </div>
      </div>
    </Link>
  );
}

export default function Pronostics() {
  const [date, setDate] = useState(new Date());
  const dateStr = format(date, 'yyyy-MM-dd');
  const tabs = [subDays(new Date(), 1), new Date(), addDays(new Date(), 1), addDays(new Date(), 2)];

  const { data, isLoading } = useQuery({
    queryKey: ['pronostics', dateStr],
    queryFn: () => api.get(`/matches?date=${dateStr}&limit=50`).then((r) => r.data),
  });

  const matches = (data?.data || []).filter((m) => m.predictions);

  // Grouper par confiance
  const grouped = { high: [], medium: [], low: [] };
  for (const m of matches) {
    const c = m.predictions?.confidence || 'low';
    grouped[c]?.push(m);
  }

  return (
    <div className="max-w-2xl mx-auto py-5 space-y-5">

      {/* En-tête */}
      <div className="px-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={18} className="text-primary-400" />
          <h1 className="section-title">Pronostics</h1>
        </div>
        <p className="text-xs text-gray-500">Picks générés par algorithme basé sur la forme récente</p>
      </div>

      {/* Date tabs */}
      <div className="overflow-x-auto scrollbar-hide px-4">
        <div className="flex gap-2 min-w-max">
          {tabs.map((d, i) => {
            const dStr = format(d, 'yyyy-MM-dd');
            const isSelected = dStr === dateStr;
            return (
              <button key={i} onClick={() => setDate(d)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  isSelected
                    ? 'bg-primary-500/15 text-primary-400 border-primary-500/30'
                    : 'text-gray-500 border-white/[0.06] hover:text-gray-300'
                }`}>
                {formatTabDate(d)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mx-4 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-surface-700/50 border border-white/[0.04]">
        <Info size={13} className="text-gray-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-gray-600 leading-relaxed">
          Ces pronostics sont générés automatiquement. Ils ne constituent pas un conseil financier. Jouez de façon responsable.
        </p>
      </div>

      {/* Contenu */}
      <div className="px-4 space-y-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} className="h-40" />)}
          </div>
        ) : matches.length === 0 ? (
          <div className="card-p text-center py-12">
            <p className="text-3xl mb-3">📊</p>
            <p className="text-gray-500 text-sm">Aucun pronostic disponible pour cette date</p>
            <p className="text-gray-600 text-xs mt-1">Les prédictions se calculent automatiquement lors de la synchronisation des matchs.</p>
          </div>
        ) : (
          <>
            {['high', 'medium', 'low'].map((lvl) => {
              const group = grouped[lvl];
              if (!group.length) return null;
              const conf = CONF[lvl];
              return (
                <section key={lvl}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full ${conf.dot}`} />
                    <p className={`text-xs font-bold uppercase tracking-wider ${conf.color}`}>
                      {conf.label} ({group.length})
                    </p>
                  </div>
                  <div className="space-y-3">
                    {group.map((m) => <PronoCard key={m.id} match={m} />)}
                  </div>
                </section>
              );
            })}

            <div className="text-center pt-2">
              <Link to="/matchs" className="text-xs text-primary-400 hover:underline flex items-center justify-center gap-1">
                Voir tous les matchs <ChevronRight size={12} />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
