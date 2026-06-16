import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart2 } from 'lucide-react';
import api from '../services/api';
import { SkeletonCard } from '../components/ui/SkeletonLoader';

const RESULT_COLORS = {
  W: 'bg-green-500',
  D: 'bg-yellow-500',
  L: 'bg-red-500',
};

function StandingsTable({ standings, competitionName }) {
  if (standings.length === 0) {
    return (
      <div className="bento-card text-center py-8 text-gray-500 text-sm">
        Pas encore de matchs terminés pour {competitionName}.
      </div>
    );
  }

  return (
    <div className="bento-card overflow-x-auto">
      <table className="w-full text-sm min-w-[420px]">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-surface-700">
            <th className="text-left py-2 pl-2 w-8">#</th>
            <th className="text-left py-2">Équipe</th>
            <th className="text-center py-2 w-8">J</th>
            <th className="text-center py-2 w-8">G</th>
            <th className="text-center py-2 w-8">N</th>
            <th className="text-center py-2 w-8">P</th>
            <th className="text-center py-2 w-10">DB</th>
            <th className="text-center py-2 w-10 font-bold text-gray-300">Pts</th>
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
              <td className="text-center py-2.5 text-green-400">{team.W}</td>
              <td className="text-center py-2.5 text-gray-400">{team.D}</td>
              <td className="text-center py-2.5 text-red-400">{team.L}</td>
              <td className={`text-center py-2.5 text-xs ${team.GD > 0 ? 'text-green-400' : team.GD < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                {team.GD > 0 ? '+' : ''}{team.GD}
              </td>
              <td className="text-center py-2.5 font-bold text-gray-100">{team.Pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-600 mt-3 px-2">
        Classement calculé à partir des matchs disponibles dans notre base de données.
      </p>
    </div>
  );
}

export default function Standings() {
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
        <h1 className="font-display font-bold text-2xl text-gray-100">Classements</h1>
      </div>

      {/* Sélecteur de compétition */}
      <div className="bento-card">
        <label htmlFor="comp-select" className="block text-sm font-medium text-gray-400 mb-2">
          Compétition
        </label>
        <select
          id="comp-select"
          value={selectedCompId}
          onChange={(e) => setSelectedCompId(e.target.value)}
          className="input"
        >
          <option value="">— Choisir une compétition —</option>
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
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
        <div className="bento-card text-center py-8 text-gray-500 text-sm">
          Sélectionnez une compétition pour afficher le classement.
        </div>
      )}
    </div>
  );
}
