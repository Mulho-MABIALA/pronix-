import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart2, ChevronDown, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { slugify } from '../utils/slugify';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import { usePageMeta } from '../hooks/usePageMeta';
import CompetitionLogo from '../components/ui/CompetitionLogo';

// ─── Sélecteur de compétition avec logos + recherche ──────────────────────────
function CompetitionPicker({ competitions, selectedId, onSelect }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  const selected = competitions.find((c) => c.id === selectedId);

  // Fermer au clic extérieur
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filtrage + tri par pays puis nom
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return competitions
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.country || '').toLowerCase().includes(q))
      .sort((a, b) => (a.country || '').localeCompare(b.country || '') || a.name.localeCompare(b.name));
  }, [competitions, search]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(''); }}
        className="input flex items-center gap-2.5 w-full text-left"
      >
        {selected ? (
          <>
            <CompetitionLogo logo={selected.logo} size={20} />
            <span className="flex-1 truncate text-gray-100">{selected.name}</span>
            <span className="text-xs text-gray-500 shrink-0">{selected.country}</span>
          </>
        ) : (
          <span className="flex-1 text-gray-500">{t('standings.choosePlaceholder')}</span>
        )}
        <ChevronDown size={16} className={`text-gray-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full bg-surface-800 border border-surface-600 rounded-xl shadow-2xl overflow-hidden">
          {/* Recherche */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-surface-700">
            <Search size={14} className="text-gray-500 shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('standings.searchPlaceholder')}
              className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-500 hover:text-gray-300">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-500">{t('standings.noCompetitionFound')}</p>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onSelect(c.id); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-surface-700/60 transition-colors ${
                  c.id === selectedId ? 'bg-primary-500/10' : ''
                }`}
              >
                <CompetitionLogo logo={c.logo} size={20} />
                <span className="flex-1 truncate text-sm text-gray-200">{c.name}</span>
                <span className="text-[11px] text-gray-500 shrink-0">{c.country}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const RESULT_COLORS = {
  W: 'bg-green-500',
  D: 'bg-yellow-500',
  L: 'bg-red-500',
};

export function StandingsTable({ standings, competitionName }) {
  const { t } = useTranslation();

  if (standings.length === 0) {
    return (
      <div className="bento-card text-center py-8 text-gray-500 text-sm">
        {t('standings.noMatchesFor', { name: competitionName })}
      </div>
    );
  }

  return (
    <div className="bento-card overflow-x-auto">
      <table className="w-full text-sm min-w-[420px]">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-surface-700">
            <th className="text-left py-2 pl-2 w-8">#</th>
            <th className="text-left py-2">{t('standings.team')}</th>
            <th className="text-center py-2 w-8">{t('standings.played')}</th>
            <th className="text-center py-2 w-8">{t('standings.won')}</th>
            <th className="text-center py-2 w-8">{t('standings.drawn')}</th>
            <th className="text-center py-2 w-8">{t('standings.lost')}</th>
            <th className="text-center py-2 w-10">{t('standings.goalDiff')}</th>
            <th className="text-center py-2 w-10 font-bold text-gray-300">{t('standings.points')}</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team, idx) => (
            <tr
              key={team.name}
              className={`border-b border-surface-800 hover:bg-surface-700/30 transition-colors ${
                idx < 4 ? 'border-l-2 border-l-primary-500' : ''
              }`}
            >
              <td className="py-2.5 pl-2 text-gray-500 text-xs">{idx + 1}</td>
              <td className="py-2.5">
                <div className="flex items-center gap-2">
                  {team.logo && (
                    <img src={team.logo} alt="" className="w-5 h-5 object-contain" aria-hidden="true" />
                  )}
                  <span className="text-gray-200 font-medium truncate max-w-[120px]">{team.name}</span>
                </div>
              </td>
              <td className="text-center py-2.5 text-gray-400">{team.MP}</td>
              <td className="text-center py-2.5 text-primary-400">{team.W}</td>
              <td className="text-center py-2.5 text-gray-400">{team.D}</td>
              <td className="text-center py-2.5 text-red-400">{team.L}</td>
              <td className={`text-center py-2.5 text-xs ${team.GD > 0 ? 'text-primary-400' : team.GD < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                {team.GD > 0 ? '+' : ''}{team.GD}
              </td>
              <td className="text-center py-2.5 font-bold text-gray-100">{team.Pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-600 mt-3 px-2">
        {t('standings.calcDisclaimer')}
      </p>
    </div>
  );
}

export default function Standings() {
  const { t } = useTranslation();
  usePageMeta(t('standings.title'), 'Classements des ligues de football — points, buts, forme récente. Liga, Premier League, Ligue 1, Serie A et plus.');
  const [selectedCompId, setSelectedCompId] = useState('');

  // Charger la liste des compétitions + classement de la compétition sélectionnée
  const { data, isLoading } = useQuery({
    queryKey: ['standings', selectedCompId],
    queryFn: () =>
      api.get('/matches/standings', {
        params: selectedCompId ? { competitionId: selectedCompId } : {},
      }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const standings = data?.data?.standings || [];
  const competitions = data?.data?.competitions || [];
  const competition = data?.data?.competition;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart2 size={22} className="text-primary-400" />
        <h1 className="font-display font-bold text-2xl text-gray-100">{t('standings.title')}</h1>
      </div>

      {/* Sélecteur de compétition */}
      <div className="bento-card">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          {t('standings.competitionLabel')}
        </label>
        <CompetitionPicker
          competitions={competitions}
          selectedId={selectedCompId}
          onSelect={setSelectedCompId}
        />
      </div>

      {isLoading && <SkeletonCard className="h-48" />}

      {!isLoading && selectedCompId && competition && (
        <>
          <div className="flex items-center gap-2">
            {competition.logo && (
              <img src={competition.logo} alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
            )}
            <h2 className="font-semibold text-gray-200">{competition.name}</h2>
            {competition.season && (
              <span className="text-xs text-gray-500">{competition.season}</span>
            )}
          </div>
          <StandingsTable standings={standings} competitionName={competition.name} />
        </>
      )}

      {!isLoading && !selectedCompId && competitions.length > 0 && (
        <>
          <div className="bento-card text-center py-8 text-gray-500 text-sm">
            {t('standings.selectPrompt')}
          </div>

          {/* Liens directs — pages dédiées par compétition (SEO + accès rapide) */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
              {t('standings.popularLeagues')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {competitions.slice(0, 12).map((c) => (
                <Link
                  key={c.id}
                  to={`/classements/${slugify(c.name)}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-primary-500/30 hover:bg-primary-500/[0.05] transition-colors text-xs text-gray-300"
                >
                  <CompetitionLogo logo={c.logo} size={14} />
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
