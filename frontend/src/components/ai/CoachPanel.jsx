import { useQuery } from '@tanstack/react-query';
import { Brain, TrendingUp, TrendingDown, Star, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../services/api';

const PRED_FR = {
  HOME_WIN: 'Victoire domicile', AWAY_WIN: 'Victoire extérieur', DRAW: 'Match nul',
  OVER_2_5: 'Plus de 2.5', UNDER_2_5: 'Moins de 2.5',
  BTTS_YES: 'Les 2 marquent', BTTS_NO: 'BTTS Non',
};

function ScoreRing({ score }) {
  const color = score >= 70 ? 'text-green-400' : score >= 45 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className={`text-center ${color}`}>
      <p className="text-4xl font-display font-black">{score}</p>
      <p className="text-xs text-gray-500 mt-0.5">score parieur</p>
    </div>
  );
}

export default function CoachPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['coach-advice'],
    queryFn: () => api.get('/coach/advice').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="bento-card flex items-center gap-3 text-gray-500">
        <Loader2 size={16} className="animate-spin text-primary-400" />
        <span className="text-sm">Analyse de votre historique en cours…</span>
      </div>
    );
  }

  if (error || !data) return null;

  if (!data.hasEnoughData) {
    return (
      <div className="bento-card flex items-start gap-3">
        <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-gray-200">Coach Personnel IA</p>
          <p className="text-xs text-gray-500 mt-0.5">{data.message}</p>
        </div>
      </div>
    );
  }

  const { stats, advice } = data;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-primary-500/15 flex items-center justify-center">
          <Brain size={16} className="text-primary-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-100">Coach Personnel IA</p>
          <p className="text-xs text-gray-500">Analyse de vos {stats.total} derniers paris</p>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bento-card text-center py-2 px-1">
          <p className="text-lg font-display font-bold text-gray-100">{stats.winRate}%</p>
          <p className="text-[10px] text-gray-500">Réussite</p>
        </div>
        <div className="bento-card text-center py-2 px-1">
          <p className={`text-lg font-display font-bold ${Number(stats.roi) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.roi}%
          </p>
          <p className="text-[10px] text-gray-500">ROI</p>
        </div>
        <div className="bento-card text-center py-2 px-1">
          <p className="text-lg font-display font-bold text-gray-100">{stats.avgOdds}</p>
          <p className="text-[10px] text-gray-500">Cote moy.</p>
        </div>
        {advice?.score != null && (
          <div className="bento-card text-center py-2 px-1">
            <ScoreRing score={advice.score} />
          </div>
        )}
      </div>

      {/* Points forts / faibles */}
      <div className="grid grid-cols-2 gap-2">
        {stats.strongestType && (
          <div className="bento-card flex items-start gap-2 border-green-500/20 bg-green-500/5">
            <TrendingUp size={14} className="text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-green-400 font-semibold uppercase tracking-wide">Point fort</p>
              <p className="text-xs text-gray-300 mt-0.5">
                {PRED_FR[stats.strongestType.name] || stats.strongestType.name}
              </p>
              <p className="text-[10px] text-gray-500">
                {stats.strongestType.wins}/{stats.strongestType.total} gagnés
              </p>
            </div>
          </div>
        )}
        {stats.weakestType && (
          <div className="bento-card flex items-start gap-2 border-red-500/20 bg-red-500/5">
            <TrendingDown size={14} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wide">À éviter</p>
              <p className="text-xs text-gray-300 mt-0.5">
                {PRED_FR[stats.weakestType.name] || stats.weakestType.name}
              </p>
              <p className="text-[10px] text-gray-500">
                {stats.weakestType.wins}/{stats.weakestType.total} gagnés
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Conseils IA */}
      {advice && (
        <div className="bento-card space-y-3">
          {advice.summary && (
            <p className="text-sm text-gray-300 italic">"{ advice.summary }"</p>
          )}
          {advice.tips?.map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <Star size={13} className="text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-200">{tip.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{tip.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
