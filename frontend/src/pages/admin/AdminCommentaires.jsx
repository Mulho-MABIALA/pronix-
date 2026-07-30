import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  MessageSquare, Trash2, ChevronLeft, ChevronRight,
  RefreshCw, Search, Filter, ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function AdminCommentaires() {
  const qc = useQueryClient();
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [confirm, setConfirm]   = useState(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-comments', page, search],
    queryFn: () => {
      const params = new URLSearchParams({ page, limit: 30 });
      if (search) params.set('search', search);
      return api.get(`/admin/comments?${params}`).then(r => r.data);
    },
    keepPreviousData: true,
  });

  const comments   = data?.data || [];
  const pagination = data?.pagination;

  const deleteComment = useMutation({
    mutationFn: (id) => api.delete(`/admin/comments/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-comments'] }); setConfirm(null); },
  });

  function handleSearch(e) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Commentaires</h1>
          <p className="text-sm text-ink-4 mt-0.5">
            {pagination ? `${pagination.total} commentaires en base` : 'Modération'}
          </p>
        </div>
      </div>

      {/* Recherche */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Chercher par contenu ou utilisateur…"
            className="input pl-9 h-9 text-sm"
          />
        </div>
        <button type="submit" className="btn-secondary py-1.5 px-3 text-sm">
          <Filter size={14} />
        </button>
      </form>

      {/* Table */}
      <div
        className="rounded-2xl border border-overlay/[0.11] overflow-hidden"
        style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgb(var(--overlay-rgb) / 0.06)' }}
      >
        {isLoading || isFetching ? (
          <div className="p-8 flex justify-center">
            <RefreshCw size={20} className="animate-spin text-ink-3" />
          </div>
        ) : comments.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare size={32} className="text-ink-4 mx-auto mb-3" />
            <p className="text-ink-4 font-medium">Aucun commentaire trouvé</p>
          </div>
        ) : (
          <div className="divide-y divide-overlay/[0.05]">
            {comments.map(comment => (
              <div key={comment.id} className="flex items-start gap-4 p-4 hover:bg-overlay/[0.02] transition-colors group">
                {/* Avatar */}
                {comment.user?.profile?.avatar ? (
                  <img src={comment.user.profile.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-overlay/[0.08] flex items-center justify-center text-ink-4 text-sm font-bold shrink-0">
                    {(comment.user?.profile?.displayName || comment.user?.username)?.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-white">
                      {comment.user?.profile?.displayName || comment.user?.username}
                    </p>
                    <span className="text-[11px] text-ink-4">
                      {format(new Date(comment.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </span>
                  </div>
                  <p className="text-sm text-ink-3 leading-relaxed">{comment.content}</p>
                  {comment.tip && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] text-ink-4">Sur le tip :</span>
                      <Link
                        to={`/tipsters/${comment.tip.userId}`}
                        className="inline-flex items-center gap-1 text-[11px] text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        {comment.tip.match?.homeTeam} vs {comment.tip.match?.awayTeam}
                        <ExternalLink size={10} />
                      </Link>
                      <span className="text-[11px] text-ink-4">
                        par {comment.tip.user?.profile?.displayName || comment.tip.user?.username}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <button
                  onClick={() => setConfirm(comment.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/15 text-ink-3 hover:text-red-400 transition-all shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-overlay/[0.07]">
            <p className="text-[12px] text-ink-3">
              Page {pagination.page} / {pagination.pages} · {pagination.total} total
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-overlay/[0.08] text-ink-4 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-overlay/[0.08] text-ink-4 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal confirmation */}
      {confirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="rounded-2xl border border-overlay/[0.11] p-6 max-w-sm w-full"
            style={{ background: 'var(--color-card)' }}
          >
            <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-400" />
            </div>
            <h3 className="text-white font-bold text-lg text-center">Supprimer ce commentaire ?</h3>
            <p className="text-ink-4 text-sm text-center mt-2 mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={() => deleteComment.mutate(confirm)}
                disabled={deleteComment.isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-400 text-white font-semibold text-sm rounded-lg transition-all disabled:opacity-40"
              >
                {deleteComment.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
