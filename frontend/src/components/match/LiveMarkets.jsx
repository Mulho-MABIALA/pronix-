import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Radio, Target, Flag } from 'lucide-react';
import api from '../../services/api';

// Marchés live (1X2 / over-under buts / score exact / corners) — recalculés
// côté backend à chaque requête à partir de l'état courant du match (voir
// predictionService.deriveLiveMarkets). Polling 25s pendant que le match est
// LIVE : assez réactif pour "suivre" le match sans spammer l'API interne
// (le backend, lui, ne recalcule rien de coûteux — pas d'appel API-Football
// déclenché par ce polling, seulement une lecture DB + calcul Poisson local).
export default function LiveMarkets({ matchId, homeTeam, awayTeam }) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['live-markets', matchId],
    queryFn: () => api.get(`/matches/${matchId}/live-markets`).then((r) => r.data.data),
    refetchInterval: 25_000,
    staleTime: 20_000,
  });

  if (isLoading || !data) return null;

  const lines = [
    { key: '05', label: '0.5' },
    { key: '15', label: '1.5' },
    { key: '25', label: '2.5' },
    { key: '35', label: '3.5' },
  ];

  return (
    <div className="bento-card space-y-3 border-live-500/20 bg-live-500/[0.03]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-live-500/15 flex items-center justify-center shrink-0">
            <Radio size={13} className="text-live-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-1">{t('liveMarkets.title')}</p>
            <p className="text-[10px] text-live-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-live-500 animate-pulse inline-block" />
              {data.minute === 'HT' ? t('liveAnalysis.halftime') : data.minute}
              {' · '}{data.currentScore}
            </p>
          </div>
        </div>
      </div>

      {/* 1X2 live */}
      <div>
        <p className="text-[11px] text-ink-4 mb-1.5">{t('liveMarkets.result1x2')}</p>
        <div className="grid grid-cols-3 gap-2">
          <MarketChip label={homeTeam} value={data.live1} />
          <MarketChip label={t('liveMarkets.draw')} value={data.liveX} />
          <MarketChip label={awayTeam} value={data.live2} />
        </div>
      </div>

      {/* Over/Under buts */}
      <div>
        <p className="text-[11px] text-ink-4 mb-1.5">{t('liveMarkets.totalGoals')}</p>
        <div className="grid grid-cols-4 gap-2">
          {lines.map(({ key, label }) => (
            <MarketChip
              key={key}
              label={`+${label}`}
              value={data[`liveOver${key}`]}
              compact
            />
          ))}
        </div>
      </div>

      {/* Score exact live */}
      <div className="flex items-center gap-2 pt-1 border-t border-overlay/[0.05]">
        <Target size={13} className="text-primary-400 shrink-0" />
        <p className="text-xs text-ink-4">
          {t('liveMarkets.exactScore')} :{' '}
          <span className="text-ink-1 font-semibold">{data.liveExactScore}</span>{' '}
          <span className="text-primary-400">({data.liveExactScoreProb}%)</span>
        </p>
      </div>

      {/* Corners live */}
      {data.hasLiveCornerData && (
        <div className="pt-1 border-t border-overlay/[0.05]">
          <p className="text-[11px] text-ink-4 mb-1.5 flex items-center gap-1.5">
            <Flag size={11} className="text-orange-400" />
            {t('liveMarkets.corners')} · {data.currentCorners}
          </p>
          <div className="grid grid-cols-4 gap-2">
            <MarketChip label="+7.5" value={data.liveCornerOver75} compact />
            <MarketChip label="+8.5" value={data.liveCornerOver85} compact />
            <MarketChip label="+9.5" value={data.liveCornerOver95} compact />
            <MarketChip label="+10.5" value={data.liveCornerOver105} compact />
          </div>
        </div>
      )}
    </div>
  );
}

function MarketChip({ label, value, compact }) {
  if (value == null) return null;
  return (
    <div className={`rounded-lg bg-surface-700/60 border border-overlay/[0.06] text-center ${compact ? 'py-1.5 px-1' : 'py-2 px-1.5'}`}>
      <p className="text-[10px] text-ink-4 truncate">{label}</p>
      <p className="text-sm font-bold text-ink-1">{value}%</p>
    </div>
  );
}
