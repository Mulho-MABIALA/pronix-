import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Users, Bot, Info } from 'lucide-react';
import api from '../services/api';
import SuccessRateBar from '../components/ui/SuccessRateBar';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import { usePageMeta } from '../hooks/usePageMeta';

function rateColor(pct) {
  return pct >= 65 ? 'bg-primary-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
}

function WeeklyBars({ weeks, locale }) {
  const { t } = useTranslation();
  if (!weeks?.length) {
    return <p className="text-xs text-ink-4">{t('transparency.noWeeklyData')}</p>;
  }

  const maxTips = Math.max(...weeks.map((w) => w.tips), 1);

  return (
    <div className="flex items-end gap-1.5 h-24">
      {weeks.map((w) => {
        const heightPct = Math.max(6, Math.round((w.tips / maxTips) * 100));
        const label = format(new Date(w.weekStart), 'd MMM', { locale });
        return (
          <div key={w.weekStart} className="flex-1 flex flex-col items-center justify-end h-full group relative">
            <div
              className={`w-full rounded-t-md ${rateColor(w.successRate)} transition-all`}
              style={{ height: `${heightPct}%`, opacity: w.tips > 0 ? 1 : 0.15 }}
              title={`${label} — ${w.successRate}% (${w.correct}/${w.tips})`}
            />
            <span className="text-[11px] text-ink-4 mt-1 rotate-0 whitespace-nowrap">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function BilanSection({ icon: Icon, title, desc, data, locale }) {
  const { t } = useTranslation();
  if (!data) return null;

  return (
    <div className="bento-card space-y-4 min-w-0">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-primary-400" />
        <p className="font-semibold text-ink-1">{title}</p>
      </div>
      <p className="text-xs text-ink-3">{desc}</p>

      <SuccessRateBar rate={data.successRate} total={data.totalPicks} size="lg" />

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="text-center">
          <p className="text-lg font-display font-bold text-ink-1">{data.correctPicks}</p>
          <p className="text-[11px] text-ink-3">{t('transparency.correctPicks')}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-display font-bold text-ink-1">{data.totalPicks}</p>
          <p className="text-[11px] text-ink-3">{t('transparency.totalPicks')}</p>
        </div>
      </div>

      {data.activeTipsters != null && (
        <p className="text-xs text-ink-3 flex items-center gap-1.5">
          <Users size={12} />
          {t('transparency.activeTipsters', { count: data.activeTipsters })}
        </p>
      )}
      {data.periodDays && (
        <p className="text-xs text-ink-4">{t('transparency.periodNote', { days: data.periodDays })}</p>
      )}

      <div className="pt-2 border-t border-overlay/[0.06]">
        <p className="text-[11px] font-semibold text-ink-4 mb-2">{t('transparency.weeklyTrend')}</p>
        <WeeklyBars weeks={data.weekly} locale={locale} />
      </div>
    </div>
  );
}

export default function Transparency() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? enUS : fr;

  usePageMeta(
    t('transparency.title'),
    t('transparency.metaDesc')
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['transparency-stats'],
    queryFn: () => api.get('/transparency').then((r) => r.data),
    staleTime: 15 * 60 * 1000,
  });

  const stats = data?.data;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-semibold">
          <ShieldCheck size={13} />
          {t('transparency.badge')}
        </div>
        <h1 className="font-display font-bold text-2xl md:text-3xl text-ink-1">{t('transparency.title')}</h1>
        <p className="text-ink-4 text-sm max-w-xl mx-auto leading-relaxed">{t('transparency.intro')}</p>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-64" />
        </div>
      ) : isError || !stats ? (
        <div className="bento-card text-center py-10">
          <p className="text-ink-3 text-sm">{t('transparency.loadError')}</p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            <BilanSection
              icon={Users}
              title={t('transparency.tipstersTitle')}
              desc={t('transparency.tipstersDesc')}
              data={stats.tipsters}
              locale={locale}
            />
            <BilanSection
              icon={Bot}
              title={t('transparency.aiTitle')}
              desc={t('transparency.aiDesc')}
              data={stats.ai}
              locale={locale}
            />
          </div>

          <div className="bento-card flex items-start gap-3">
            <Info size={16} className="text-ink-3 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs text-ink-4 leading-relaxed">{t('transparency.methodology')}</p>
              {stats.generatedAt && (
                <p className="text-[11px] text-ink-4">
                  {t('transparency.lastUpdated', {
                    date: format(new Date(stats.generatedAt), 'd MMM yyyy, HH:mm', { locale }),
                  })}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
