import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';

function StatPill({ value, color }) {
  return (
    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-md ${color}`}>
      {value}%
    </span>
  );
}

function MiniBar({ pct, color }) {
  return (
    <div className="h-1 rounded-full bg-surface-600 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const SORT_OPTIONS = [
  { value: 'avgGoals',   label: 'Moy. buts' },
  { value: 'bttsRate',   label: 'BTTS' },
  { value: 'over25Rate', label: 'O2.5' },
  { value: 'homeWinRate',label: '% Dom.' },
  { value: 'totalMatches', label: 'Matchs' },
];

function CompLogo({ logo, name }) {
  const [err, setErr] = useState(false);
  if (logo && !err) {
    return <img src={logo} alt="" className="w-6 h-6 object-contain shrink-0" onError={() => setErr(true)} />;
  }
  return (
    <div className="w-6 h-6 rounded-full bg-surface-600 flex items-center justify-center text-[9px] font-bold text-gray-500 shrink-0">
      {name?.[0]}
    </div>
  );
}

export default function StatsLigues() {
  const [sort, setSort]       = useState('avgGoals');
  const [asc, setAsc]         = useState(false);
  const [search, setSearch]   = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['league-stats'],
    queryFn: () => api.get('/matches/league-stats').then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const rows = (data?.data || [])
    .filter(r => r.competition.name.toLowerCase().includes(search.toLowerCase()) ||
                 r.competition.country.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const diff = a[sort] - b[sort];
      return asc ? diff : -diff;
    });

  function toggleSort(key) {
    if (sort === key) setAsc(v => !v);
    else { setSort(key); setAsc(false); }
  }

  function SortBtn({ k, label }) {
    const active = sort === k;
    return (
      <button onClick={() => toggleSort(k)}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
          active ? 'bg-primary-500/15 text-primary-400 border-primary-500/25' : 'text-gray-500 border-white/[0.06] hover:text-gray-300'
        }`}>
        {label}
        {active ? (asc ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : null}
      </button>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-5 space-y-5">

      {/* En-tête */}
      <div className="px-4">
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 size={18} className="text-primary-400" />
          <h1 className="section-title">Stats par ligue</h1>
        </div>
        <p className="text-xs text-gray-500">Statistiques calculées depuis les matchs terminés en base</p>
      </div>

      {/* Recherche + tri */}
      <div className="px-4 space-y-3">
        <input
          type="text"
          placeholder="Rechercher une ligue ou un pays…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input w-full"
        />
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {SORT_OPTIONS.map(o => <SortBtn key={o.value} k={o.value} label={o.label} />)}
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="px-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-surface-800 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="card-p text-center py-12 mx-4">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-gray-500 text-sm">Aucune donnée disponible</p>
          <p className="text-gray-600 text-xs mt-1">Les stats se calculent à partir des matchs terminés en base.</p>
        </div>
      ) : (
        <div className="px-4 card overflow-hidden divide-y divide-white/[0.04]">
          {rows.map((r) => (
            <div key={r.competition.id} className="px-4 py-3 space-y-2.5">
              {/* Ligne compétition */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <CompLogo logo={r.competition.logo} name={r.competition.name} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-200 truncate">{r.competition.name}</p>
                    <p className="text-[10px] text-gray-600">{r.competition.country} · {r.totalMatches} matchs</p>
                  </div>
                </div>
                <div className="shrink-0 text-right pl-3">
                  <span className="text-lg font-display font-bold text-primary-400">{r.avgGoals}</span>
                  <p className="text-[10px] text-gray-600">buts/match</p>
                </div>
              </div>

              {/* Barres 1X2 */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Dom.</span><span className="font-semibold text-gray-300">{r.homeWinRate}%</span>
                  </div>
                  <MiniBar pct={r.homeWinRate} color="bg-primary-500" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Nul</span><span className="font-semibold text-gray-300">{r.drawRate}%</span>
                  </div>
                  <MiniBar pct={r.drawRate} color="bg-amber-500" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Ext.</span><span className="font-semibold text-gray-300">{r.awayWinRate}%</span>
                  </div>
                  <MiniBar pct={r.awayWinRate} color="bg-blue-500" />
                </div>
              </div>

              {/* Pills Over/BTTS */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-gray-600">Marchés :</span>
                <StatPill value={r.over25Rate} color="text-violet-400 bg-violet-500/10" />
                <span className="text-[10px] text-gray-600">O2.5</span>
                <StatPill value={r.over15Rate} color="text-blue-400 bg-blue-500/10" />
                <span className="text-[10px] text-gray-600">O1.5</span>
                <StatPill value={r.bttsRate} color="text-orange-400 bg-orange-500/10" />
                <span className="text-[10px] text-gray-600">BTTS</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
