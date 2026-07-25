import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BarChart2, ChevronRight, TrendingUp } from 'lucide-react';
import api from '../services/api';
import { slugify } from '../utils/slugify';
import { StandingsTable } from './Standings';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import { usePageMeta } from '../hooks/usePageMeta';

export default function CompetitionStandings() {
  const { t } = useTranslation();
  const { slug } = useParams();

  const { data: compsData, isLoading: compsLoading } = useQuery({
    queryKey: ['competitions-list'],
    queryFn: () => api.get('/matches/competitions').then((r) => r.data),
    staleTime: 30 * 60 * 1000,
  });

  const competitions = compsData?.data || [];
  const competition = competitions.find((c) => slugify(c.name) === slug);

  const { data: standingsData, isLoading: standingsLoading } = useQuery({
    queryKey: ['standings', competition?.id],
    queryFn: () => api.get('/matches/standings', { params: { competitionId: competition.id } }).then((r) => r.data),
    enabled: !!competition?.id,
    staleTime: 5 * 60 * 1000,
  });

  const standings = standingsData?.data?.standings || [];
  const isLoading = compsLoading || (!!competition && standingsLoading);

  usePageMeta(
    competition ? t('competitionSeo.standingsTitle', { name: competition.name }) : t('standings.title'),
    competition
      ? t('competitionSeo.standingsDesc', { name: competition.name, country: competition.country })
      : undefined
  );

  if (!compsLoading && !competition) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center space-y-4">
        <p className="text-gray-500 text-sm">{t('competitionSeo.notFound')}</p>
        <Link to="/classements" className="btn-secondary inline-flex">{t('competitionSeo.seeAllStandings')}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        {competition?.logo ? (
          <img src={competition.logo} alt="" className="w-7 h-7 object-contain" aria-hidden="true" />
        ) : (
          <BarChart2 size={22} className="text-primary-400" />
        )}
        <div className="min-w-0">
          <h1 className="font-display font-bold text-xl md:text-2xl text-gray-100 truncate">
            {competition ? t('competitionSeo.standingsTitle', { name: competition.name }) : t('standings.title')}
          </h1>
          {competition?.country && (
            <p className="text-xs text-gray-500">{competition.country}</p>
          )}
        </div>
      </div>

      {isLoading ? (
        <SkeletonCard className="h-64" />
      ) : (
        <StandingsTable standings={standings} competitionName={competition?.name} />
      )}

      {competition && (
        <Link
          to={`/pronostics/${slug}`}
          className="flex items-center justify-between px-4 py-3.5 rounded-2xl border border-primary-500/20 bg-primary-500/[0.04] hover:border-primary-500/40 transition-colors"
        >
          <span className="flex items-center gap-2.5 text-sm font-medium text-gray-200">
            <TrendingUp size={16} className="text-primary-400" />
            {t('competitionSeo.seePronosticsFor', { name: competition.name })}
          </span>
          <ChevronRight size={16} className="text-gray-500" />
        </Link>
      )}

      <div className="text-center">
        <Link to="/classements" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          {t('competitionSeo.seeAllStandings')}
        </Link>
      </div>
    </div>
  );
}
