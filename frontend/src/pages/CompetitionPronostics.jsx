import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { TrendingUp, ChevronRight, BarChart2, Calendar } from 'lucide-react';
import api from '../services/api';
import { slugify } from '../utils/slugify';
import MatchCard from '../components/matches/MatchCard';
import { SkeletonMatchCard } from '../components/ui/SkeletonLoader';
import { usePageMeta } from '../hooks/usePageMeta';

export default function CompetitionPronostics() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: compsData, isLoading: compsLoading } = useQuery({
    queryKey: ['competitions-list'],
    queryFn: () => api.get('/matches/competitions').then((r) => r.data),
    staleTime: 30 * 60 * 1000,
  });

  const competitions = compsData?.data || [];
  const competition = competitions.find((c) => slugify(c.name) === slug);

  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ['competition-matches', competition?.id, today],
    queryFn: () => api.get('/matches', {
      params: { date: today, competitionId: competition.id, limit: 50 },
    }).then((r) => r.data),
    enabled: !!competition?.id,
    staleTime: 5 * 60 * 1000,
  });

  const matches = matchesData?.data || [];
  const isLoading = compsLoading || (!!competition && matchesLoading);

  usePageMeta(
    competition ? t('competitionSeo.pronosticsTitle', { name: competition.name }) : t('pronostics.title'),
    competition
      ? t('competitionSeo.pronosticsDesc', { name: competition.name, country: competition.country })
      : undefined
  );

  if (!compsLoading && !competition) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center space-y-4">
        <p className="text-ink-3 text-sm">{t('competitionSeo.notFound')}</p>
        <Link to="/pronostics" className="btn-secondary inline-flex">{t('competitionSeo.seeAllPronostics')}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        {competition?.logo ? (
          <img src={competition.logo} alt="" className="w-7 h-7 object-contain" aria-hidden="true" />
        ) : (
          <TrendingUp size={22} className="text-primary-400" />
        )}
        <div className="min-w-0">
          <h1 className="font-display font-bold text-xl md:text-2xl text-ink-1 truncate">
            {competition ? t('competitionSeo.pronosticsTitle', { name: competition.name }) : t('pronostics.title')}
          </h1>
          {competition?.country && (
            <p className="text-xs text-ink-3 flex items-center gap-1">
              <Calendar size={11} />
              {format(new Date(), 'EEEE d MMMM')}
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonMatchCard key={i} />)}
        </div>
      ) : matches.length === 0 ? (
        <div className="card-p text-center py-12">
          <p className="text-ink-3 text-sm">{t('competitionSeo.noMatchesToday')}</p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-overlay/[0.04]">
          {matches.map((match, i) => <MatchCard key={match.id} match={match} index={i} />)}
        </div>
      )}

      {competition && (
        <Link
          to={`/classements/${slug}`}
          className="flex items-center justify-between px-4 py-3.5 rounded-2xl border border-primary-500/20 bg-primary-500/[0.04] hover:border-primary-500/40 transition-colors"
        >
          <span className="flex items-center gap-2.5 text-sm font-medium text-ink-2">
            <BarChart2 size={16} className="text-primary-400" />
            {t('competitionSeo.seeStandingsFor', { name: competition.name })}
          </span>
          <ChevronRight size={16} className="text-ink-3" />
        </Link>
      )}

      <div className="text-center">
        <Link to="/pronostics" className="text-xs text-ink-3 hover:text-ink-2 transition-colors">
          {t('competitionSeo.seeAllPronostics')}
        </Link>
      </div>
    </div>
  );
}
