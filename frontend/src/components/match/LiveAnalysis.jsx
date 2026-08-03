import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Radio, Zap, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import api from '../../services/api';
import AiBadge from '../ui/AiBadge';

const MOMENTUM_ICONS = { HOME: TrendingUp, AWAY: TrendingDown, BALANCED: Minus };
const MOMENTUM_COLORS = { HOME: 'text-primary-400', AWAY: 'text-red-400', BALANCED: 'text-ink-4' };

export default function LiveAnalysis({ matchId }) {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['live-analysis', matchId],
    queryFn: () => api.get(`/matches/${matchId}/live-analysis`).then((r) => r.data.data),
    // Refresh toutes les 5 minutes (aligné sur le cache backend)
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="bento-card flex items-center gap-3 text-ink-3 py-4">
        <Loader2 size={15} className="animate-spin text-live-400 shrink-0" />
        <span className="text-sm">{t('liveAnalysis.analyzing')}</span>
      </div>
    );
  }

  if (!data) return null;

  const MomentumIcon = MOMENTUM_ICONS[data.momentum] || Minus;
  const momentumColor = MOMENTUM_COLORS[data.momentum] || 'text-ink-4';
  const momentumLabel = data.momentum ? t(`liveAnalysis.momentum.${data.momentum}`) : '';

  return (
    <div className="bento-card space-y-3 border-live-500/20 bg-live-500/[0.03]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-live-500/15 flex items-center justify-center shrink-0">
            <Radio size={13} className="text-live-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-1 flex items-center gap-1.5">
              {t('liveAnalysis.title')}
              <AiBadge />
            </p>
            {data.minute && (
              <p className="text-[10px] text-live-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-live-500 animate-pulse inline-block" />
                {data.minute === 'HT' ? t('liveAnalysis.halftime') : `${data.minute}'`}
              </p>
            )}
          </div>
        </div>

        {/* Momentum badge */}
        <div className={`flex items-center gap-1 text-[11px] font-semibold ${momentumColor}`}>
          <MomentumIcon size={13} />
          <span className="hidden sm:inline">{momentumLabel}</span>
        </div>
      </div>

      {/* Headline */}
      <p className="text-sm font-semibold text-ink-1">{data.headline}</p>

      {/* Analysis */}
      <p className="text-xs text-ink-4 leading-relaxed">{data.analysis}</p>

      {/* Key fact */}
      {data.keyFact && (
        <div className="flex items-start gap-2 pt-1 border-t border-overlay/[0.05]">
          <Zap size={12} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-ink-4">{data.keyFact}</p>
        </div>
      )}

      {/* Footer */}
      {data.generatedAt && (
        <p className="text-xs text-ink-4">
          {t('liveAnalysis.updatedAt', { time: new Date(data.generatedAt).toLocaleTimeString(i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR', { hour: '2-digit', minute: '2-digit' }) })}
        </p>
      )}
    </div>
  );
}
