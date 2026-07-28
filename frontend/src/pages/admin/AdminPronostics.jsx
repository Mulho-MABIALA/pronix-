import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Target, Trash2, Eye, EyeOff, ChevronLeft, ChevronRight,
  RefreshCw, Search, Filter, Star, MessageSquare, AlertTriangle,
  CheckCircle, XCircle, Minus,
} from 'lucide-react';
import api from '../../services/api';

const RESULT_MAP = {
  WIN:  { label: 'Gagné',   color: 'bg-emerald-500/15 text-emerald-400', icon: CheckCircle },
  LOSS: { label: 'Perdu',   color: 'bg-red-500/15 text-red-400',         icon: XCircle },
  PUSH: { label: 'Nul',     color: 'bg-gray-500/15 text-gray-400',       icon: Minus },
  null: { label: 'En cours',color: 'bg-amber-500/15 text-amber-400',     icon: RefreshCw },
};

const PRED_LABELS = {
  HOME_WIN: '1', DRAW: 'X', AWAY_WIN: '2',
  OVER_2_5: '+2.5', UNDER_2_5: '-2.5', BTTS: 'BTTS',
  HOME_WIN_OR_DRAW: '1X', AWAY_WIN_OR_DRAW: 'X2',
  OVER_3_5: '+3.5', UNDER_3_5: '-3.5',
};

export default function AdminPronostics() {
  const qc = useQueryClient();
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [result, setResult]   = useState('');
  const [confirm, setConfirm] = useState(null); // tipId à supprimer

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-tips', page, search, result],
    queryFn: () => {
      const params = new URLSearchParams({ page, limit: 30 });
      if (search) params.set('search', search);
      if (result) params.set('result', result === 'PENDING' ? 'PENDING' : result);
      return api.get(`/admin/tips?${params}`).then(r => r.data);
    },
    keepPreviousData: true,
  });

  const tips       = data?.data || [];
  const pagination = data?.pagination;

  const deleteTip = useMutation({
    mutationFn: (id) => api.delete(`/admin/tips/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tips'] }); setConfirm(null); },
  });

  const toggleVis = useMutation({
    mutationFn: ({ id, isVisible }) => api.patch(`/admin/tips/${id}/visibility`, { isVisible }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tips'] }),
  });

  function handleSearch(e) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Pronostics</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {pagination ? `${pagination.total} pronostics en base` : 'Modération des tips'}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-48">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Chercher tipster, équipe…"
              className="input pl-9 h-9 text-sm"
            />
          </div>
          <button type="submit" className="btn-secondary py-1.5 px-3 text-sm">
            <Filter size={14} />
          </button>
        </form>

        <div className="flex gap-1.5 flex-wrap">
          {[['', 'Tous'], ['WIN', '✅ Gagné'], ['LOSS', '❌ Perdu'], ['PUSH', '➖ Nul'], ['PENDING', '⏳ En cours']].map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => { setResult(val); setPage(1); }}
              className="filter-chip text-xs"
              data-active={result === val ? 'true' : 'false'}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl border border-white/[0.11] overflow-hidden"
        style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
      >
        {isLoading || isFetching ? (
          <div className="p-8 flex justify-center">
            <RefreshCw size={20} className="animate-spin text-gray-300" />
          </div>
        ) : tips.length === 0 ? (
          <div className="p-12 text-center">
            <Target size={32} className="text-gray-400 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Aucun pronostic trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  {['Tipster', 'Match', 'Prono', 'Conf.', 'Résultat', 'Commentaires', 'Signalements', 'Date', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] text-gray-300 font-semibold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {tips.map(tip => {
                  const res = RESULT_MAP[tip.result] || RESULT_MAP[null];
                  const ResIcon = res.icon;
                  return (
                    <tr key={tip.id} className={`hover:bg-white/[0.02] transition-colors ${!tip.isVisible ? 'opacity-40' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="text-gray-200 font-medium">{tip.user?.profile?.displayName || tip.user?.username}</p>
                        <p className="text-[11px] text-gray-400">{tip.isAiGenerated ? '🤖 IA' : '👤 Humain'}</p>
                      </td>
                      <td className="px-4 py-3 max-w-40">
                        <p className="text-gray-200 truncate">{tip.match?.homeTeam} - {tip.match?.awayTeam}</p>
                        <p className="text-[11px] text-gray-400">{tip.match?.competition?.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.08] text-gray-300 text-xs font-bold">
                          {PRED_LABELS[tip.prediction] || tip.prediction}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {tip.confidence ? (
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={10} className={i < tip.confidence ? 'text-amber-400 fill-amber-400' : 'text-gray-700'} />
                            ))}
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${res.color}`}>
                          <ResIcon size={11} />
                          {res.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-[12px] text-gray-400">
                          <MessageSquare size={12} /> {tip._count?.comments || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-[12px] ${tip._count?.reports > 0 ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                          <AlertTriangle size={12} /> {tip._count?.reports || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-400 whitespace-nowrap">
                        {format(new Date(tip.createdAt), 'dd MMM yyyy', { locale: fr })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleVis.mutate({ id: tip.id, isVisible: !tip.isVisible })}
                            title={tip.isVisible ? 'Masquer' : 'Afficher'}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.08] text-gray-300 hover:text-gray-200 transition-colors"
                          >
                            {tip.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <button
                            onClick={() => setConfirm(tip.id)}
                            title="Supprimer"
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/15 text-gray-300 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.07]">
            <p className="text-[12px] text-gray-300">
              Page {pagination.page} / {pagination.pages} · {pagination.total} total
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.08] text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.08] text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal confirmation suppression */}
      {confirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="rounded-2xl border border-white/[0.11] p-6 max-w-sm w-full"
            style={{ background: 'var(--color-card)' }}
          >
            <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-400" />
            </div>
            <h3 className="text-white font-bold text-lg text-center">Supprimer ce pronostic ?</h3>
            <p className="text-gray-400 text-sm text-center mt-2 mb-6">
              Cette action est irréversible. Les commentaires et signalements associés seront aussi supprimés.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={() => deleteTip.mutate(confirm)}
                disabled={deleteTip.isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-400 text-white font-semibold text-sm rounded-lg transition-all disabled:opacity-40"
              >
                {deleteTip.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
