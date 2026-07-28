import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Eye, Calendar, User } from 'lucide-react';
import api from '../services/api';
import { SkeletonCard, SkeletonText } from '../components/ui/SkeletonLoader';
import { usePageMeta } from '../hooks/usePageMeta';

export default function BlogPost() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  const { slug } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: () => api.get(`/blog/${slug}`).then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const post = data?.data;
  const author = post?.author?.profile?.displayName || post?.author?.username;
  const date = post?.publishedAt
    ? format(new Date(post.publishedAt), 'dd MMMM yyyy', { locale: dateLocale })
    : '';

  usePageMeta(
    post ? (post.metaTitle || post.title) : t('blog.articleFallback'),
    post ? (post.metaDesc || post.excerpt || t('blog.metaDescFallback', { title: post.title })) : '',
    post?.coverImage ? { image: post.coverImage, type: 'article' } : { type: 'article' },
  );

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <SkeletonCard className="h-48" />
        <SkeletonText lines={8} />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bento-card text-center py-12 text-gray-300">
          {t('blog.articleNotFound')}{' '}
          <Link to="/blog" className="text-primary-400 hover:underline">{t('blog.backToBlog')}</Link>
        </div>
      </div>
    );
  }

  return (
    <article className="max-w-2xl mx-auto px-4 py-6 space-y-5 animate-fade-in">
      {/* Navigation retour */}
      <Link
        to="/blog"
        className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-gray-200 transition-colors"
      >
        <ChevronLeft size={16} />
        {t('blog.title')}
      </Link>

      {/* Image de couverture */}
      {post.coverImage && (
        <img
          src={post.coverImage}
          alt={post.title}
          className="w-full h-52 object-cover rounded-2xl bg-surface-700"
        />
      )}

      {/* Meta */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-300">
        {post.category && (
          <span className="text-primary-400 font-medium capitalize">{t(`blog.categories.${post.category}`, { defaultValue: post.category })}</span>
        )}
        {date && (
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {date}
          </span>
        )}
        {author && (
          <span className="flex items-center gap-1">
            <User size={11} />
            {author}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Eye size={11} />
          {t('blog.viewsCount', { count: post.views })}
        </span>
      </div>

      {/* Titre */}
      <h1 className="font-display font-bold text-2xl text-gray-100 leading-tight">
        {post.title}
      </h1>

      {/* Excerpt */}
      {post.excerpt && (
        <p className="text-gray-400 text-base leading-relaxed border-l-2 border-primary-500/50 pl-4">
          {post.excerpt}
        </p>
      )}

      {/* Contenu — rendu comme HTML simple ou texte brut */}
      <div
        className="prose-fpronix text-gray-300 text-sm leading-relaxed space-y-4"
        style={{ lineHeight: '1.75' }}
        dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br/>') }}
      />

      {/* Retour */}
      <div className="pt-4 border-t border-surface-700">
        <Link to="/blog" className="text-sm text-primary-400 hover:underline">
          ← {t('blog.viewAllArticles')}
        </Link>
      </div>
    </article>
  );
}
