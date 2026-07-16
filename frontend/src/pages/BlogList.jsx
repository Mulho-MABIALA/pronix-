import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BookOpen, Eye } from 'lucide-react';
import api from '../services/api';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import { usePageMeta } from '../hooks/usePageMeta';

const CATEGORIES = ['general', 'analyse', 'pronostic', 'actualite', 'conseil'];

function PostCard({ post }) {
  const date = post.publishedAt
    ? format(new Date(post.publishedAt), 'dd MMM yyyy', { locale: fr })
    : '';
  const author = post.author?.profile?.displayName || post.author?.username;

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="bento-card flex gap-4 hover:border-primary-500/40 transition-colors group cursor-pointer"
    >
      {post.coverImage ? (
        <img
          src={post.coverImage}
          alt=""
          className="w-24 h-24 object-cover rounded-lg shrink-0 bg-surface-700"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <div className="w-24 h-24 rounded-lg bg-surface-700 shrink-0 flex items-center justify-center">
          <BookOpen size={24} className="text-gray-600" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {post.category && (
            <span className="text-xs font-medium text-primary-400 capitalize">{post.category}</span>
          )}
          {date && <span className="text-xs text-gray-600">{date}</span>}
        </div>
        <h2 className="text-sm font-semibold text-gray-100 group-hover:text-primary-300 transition-colors line-clamp-2 leading-snug">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{post.excerpt}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
          {author && <span>par {author}</span>}
          <span className="flex items-center gap-1">
            <Eye size={10} />
            {post.views}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function BlogList() {
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  usePageMeta(
    'Blog Football — Analyses & Conseils',
    'Articles, analyses et conseils football par les experts fpronix. Pronostics, stratégies et actualités du foot.',
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['blog', category, page],
    queryFn: () => api.get('/blog', { params: { category: category || undefined, page } }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const posts = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen size={22} className="text-primary-400" />
        <h1 className="font-display font-bold text-2xl text-gray-100">Blog</h1>
      </div>

      {/* Filtre catégories */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <button
          onClick={() => { setCategory(''); setPage(1); }}
          className={`text-xs font-medium px-3 py-1.5 rounded-full shrink-0 transition-colors ${
            !category ? 'bg-primary-500 text-white' : 'bg-surface-800 text-gray-400 hover:text-gray-200'
          }`}
        >
          Tous
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => { setCategory(c); setPage(1); }}
            className={`text-xs font-medium px-3 py-1.5 rounded-full shrink-0 capitalize transition-colors ${
              category === c ? 'bg-primary-500 text-white' : 'bg-surface-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} className="h-28" />)}
        </div>
      )}

      {isError && (
        <div className="bento-card text-center py-8 text-gray-500">
          Impossible de charger les articles.
        </div>
      )}

      {!isLoading && posts.length === 0 && (
        <div className="bento-card text-center py-8 text-gray-500">
          Aucun article disponible pour le moment.
        </div>
      )}

      <div className="space-y-3">
        {posts.map((post) => <PostCard key={post.id} post={post} />)}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="text-xs px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-gray-400 hover:text-gray-200 disabled:opacity-40"
          >
            ← Précédent
          </button>
          <span className="text-xs text-gray-500">{page} / {pagination.pages}</span>
          <button
            disabled={page >= pagination.pages}
            onClick={() => setPage((p) => p + 1)}
            className="text-xs px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-gray-400 hover:text-gray-200 disabled:opacity-40"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
