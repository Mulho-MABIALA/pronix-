import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ExternalLink, Newspaper } from 'lucide-react';
import api from '../services/api';
import { SkeletonCard } from '../components/ui/SkeletonLoader';

function ArticleCard({ article }) {
  let dateLabel = '';
  try {
    const d = new Date(article.pubDate);
    if (isValid(d)) dateLabel = format(d, 'dd MMM yyyy', { locale: fr });
  } catch {}

  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="bento-card flex gap-3 hover:border-primary-500/40 transition-colors group cursor-pointer"
    >
      {article.image ? (
        <img
          src={article.image}
          alt=""
          className="w-20 h-20 object-cover rounded-lg shrink-0 bg-surface-700"
          aria-hidden="true"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <div className="w-20 h-20 rounded-lg bg-surface-700 shrink-0 flex items-center justify-center">
          <Newspaper size={24} className="text-gray-600" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-primary-400">{article.source}</span>
          {dateLabel && (
            <span className="text-xs text-gray-600">{dateLabel}</span>
          )}
        </div>
        <h2 className="text-sm font-semibold text-gray-100 group-hover:text-primary-300 transition-colors line-clamp-2 leading-snug">
          {article.title}
        </h2>
        {article.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{article.description}</p>
        )}
      </div>

      <ExternalLink size={13} className="text-gray-600 shrink-0 mt-0.5 group-hover:text-primary-400 transition-colors" />
    </a>
  );
}

export default function News() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['news'],
    queryFn: () => api.get('/news').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const articles = data?.data || [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <Newspaper size={22} className="text-primary-400" />
        <h1 className="font-display font-bold text-2xl text-gray-100">Actualités</h1>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="h-24" />
          ))}
        </div>
      )}

      {isError && (
        <div className="bento-card text-center py-8 text-gray-500">
          Impossible de charger les actualités. Réessayez plus tard.
        </div>
      )}

      {!isLoading && !isError && articles.length === 0 && (
        <div className="bento-card text-center py-8 text-gray-500">
          Aucune actualité disponible pour le moment.
        </div>
      )}

      {!isLoading && articles.length > 0 && (
        <div className="space-y-3">
          {articles.map((article, i) => (
            <ArticleCard key={`${article.link}-${i}`} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
