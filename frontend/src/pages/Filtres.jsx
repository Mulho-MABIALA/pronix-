import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Filter, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { SkeletonMatchCard } from '../components/ui/SkeletonLoader';

const MARKET_FILTERS = [
  { value: '',       label: 'Tous les marchés' },
  { value: '1',      label: '1 — Domicile' },
  { value: 'X',      label: 'X — Nul' },
  { value: '2',      label: '2 — Extérieur' },
  { value: '1X',     label: 'Double chance 1X' },
  { value: 'X2',     label: 'Double chance X2' },
  { value: 'over25', label: 'Plus de 2.5 buts' },
  { value: 'over15', label: 'Plus de 1.5 buts' },
  { value: 'btts',   label: 'Les 2 équipes marquent' },
];

const CONF_FILTERS = [
  { value: '',       label: 'Toutes' },
  { value: 'high',   label: '🟢 Élevée (≥72%)' },
  { value: 'medium', label: '🟡 Moyenne (58–71%)' },
  { value: 'low',    label: '⚪ Faible (<58%)' },
];

const CONF_COLORS = {
  high:   'text-primary-400 bg-primary-500/10 border-primary-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  low:    'text-gray-500 bg-surface-700/50 border-white/[0.05]',
};

const PICK_LABELS = {
  '1': 'Domicile', 'X': 'Nul', '2': 'Extérieur',
  'over25': 'O2.5', 'over15': 'O1.5', 'btts': 'BTTS', '1X': '1X', 'X2': 'X2',
};

const FOTMOB_CDN = (id) => id ? `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png` : null;

function MiniLogo({ logo, teamId, name }) {
  const [err, setErr] = useState(false);
  const src = logo || FOTMOB_CDN(teamId);
  if (src && !err) return <img src={src} alt="" aria-hidden="true" className="w-5 h-5 object-contain shrink-0" onError={() => setErr(true)} />;
  return <div className="w-5 h-5 rounded-full bg-surface-600 flex items-center justify-center text-[8px] font-bold text-gray-500">{name?.[0]}</div>;
}

function FilterChips({ options, value, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value === value ? '' : o.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            value === o.value
              ? 'bg-primary-500/15 text-primary-400 border-primary-500/30'
              : 'text-gray-500 border-white/[0.06] hover:text-gray-300'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Filtres() {
  const [market, setMarket]   = useState('');
  const [conf, setConf]       = useState('');
  const [minProb, setMinProb] = useState(50);

  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');

  const { data: todayData }    = useQuery({ queryKey: ['filtres-today'],    queryFn: () => api.get(`/matches?date=${today}&limit=50`).then(r => r.data) });
  const { data: tomorrowData } = useQuery({ queryKey: ['filtres-tomorrow'], queryFn: () => api.get(`/matches?date=${tomorrow}&limit=50`).then(r => r.data) });

  const allMatches = useMemo(() => [
    ...(todayData?.data    || []),
    ...(tomorrowData?.data || []),
  ].filter((m) => m.predictions), [todayData, tomorrowData]);

  const filtered = useMemo(() => allMatches.filter((m) => {
    const p = m.predictions;
    if (!p) return false;
    if (market && p.bestPick.type !== market) return false;
    if (conf && p.confidence !== conf) return false;
    if (p.bestPick.prob < minProb) return false;
    return true;
  }), [allMatches, market, conf, minProb]);

  const isLoading = !todayData || !tomorrowData;

  return (
    <div className="max-w-2xl mx-auto py-5 space-y-5">

      {/* En-tête */}
      <div className="px-4">
        <div className="flex items-center gap-2 mb-1">
          <Filter size={18} className="text-primary-400" />
          <h1 className="section-title">Filtres avancés</h1>
        </div>
        <p className="text-xs text-gray-500">Filtrez les matchs d'aujourd'hui et demain selon vos critères</p>
      </div>

      {/* Filtres */}
      <div className="px-4 card p-4 space-y-4">
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Marché</p>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              {MARKET_FILTERS.map((o) => (
                <button key={o.value} onClick={() => setMarket(o.value === market ? '' : o.value)}
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

        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Niveau de confiance</p>
          <FilterChips options={CONF_FILTERS} value={conf} onChange={setConf} />
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
            Probabilité minimale : <span className="text-primary-400">{minProb}%</span>
          </p>
          <input type="range" min="40" max="90" step="5" value={minProb}
            onChange={(e) => setMinProb(Number(e.target.value))}
            className="w-full accent-primary-500 h-1.5 cursor-pointer" />
          <div className="flex justify-between text-[10px] text-gray-600 mt-1">
            <span>40%</span><span>90%</span>
          </div>
        </div>
      </div>

      {/* Résultats */}
      <div className="px-4">
        <p className="text-xs text-gray-500 mb-3">
          {isLoading ? 'Chargement…' : `${filtered.length} match${filtered.length > 1 ? 's' : ''} trouvé${filtered.length > 1 ? 's' : ''}`}
        </p>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonMatchCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-p text-center py-10">
            <p className="text-2xl mb-2">🔍</p>
            <p className="text-gray-500 text-sm">Aucun match ne correspond à ces critères</p>
            <button onClick={() => { setMarket(''); setConf(''); setMinProb(50); }}
              className="btn-secondary mt-3 text-sm">
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden divide-y divide-white/[0.04]">
            {filtered.map((m) => {
              const pred = m.predictions;
              const isToday = format(new Date(m.scheduledAt), 'yyyy-MM-dd') === today;
              return (
                <Link key={m.id} to={`/matchs/${m.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                  <div className="w-10 shrink-0 text-center">
                    <span className="text-[10px] text-gray-600 block">{isToday ? 'Auj.' : 'Dem.'}</span>
                    <span className="text-xs font-semibold text-gray-400 tabular-nums">
                      {format(new Date(m.scheduledAt), 'HH:mm')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <MiniLogo logo={m.homeTeamLogo} teamId={m.homeTeamId} name={m.homeTeam} />
                      <span className="text-sm font-medium text-gray-200 truncate">{m.homeTeam}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MiniLogo logo={m.awayTeamLogo} teamId={m.awayTeamId} name={m.awayTeam} />
                      <span className="text-sm font-medium text-gray-400 truncate">{m.awayTeam}</span>
                    </div>
                  </div>
                  <div className={`shrink-0 text-center px-3 py-1.5 rounded-lg border ${CONF_COLORS[pred.confidence]}`}>
                    <span className="block text-sm font-bold">{pred.bestPick.prob}%</span>
                    <span className="block text-[10px] font-semibold">{PICK_LABELS[pred.bestPick.type] || pred.bestPick.type}</span>
                  </div>
                  <ChevronRight size={14} className="text-gray-600 shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
