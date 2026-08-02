import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../services/api';

export default function AdminTipsters() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tipsters', search, page],
    queryFn: () => api.get('/admin/tipsters', {
      params: { page, limit: 20, ...(search && { search }) },
    }).then((r) => r.data),
  });

  const tipsters = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5 max-w-7xl">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-1">Tipsters</h1>
        <p className="text-sm text-ink-3 mt-0.5">
          {pagination?.total !== undefined ? `${pagination.total} tipsters actifs` : ''}
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
        <input
          type="search"
          className="input w-full pl-9 pr-4 py-2.5 text-sm"
          placeholder="Rechercher un tipster…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="rounded-2xl border border-overlay/[0.11] overflow-hidden shine-subtle"
        style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgb(var(--overlay-rgb) / 0.07)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-overlay/[0.07] divide-x divide-overlay/[0.07] text-xs text-ink-3 uppercase tracking-wider">
                <th className="text-left px-5 py-3.5 font-medium w-8">#</th>
                <th className="text-left px-4 py-3.5 font-medium">Tipster</th>
                <th className="text-center px-4 py-3.5 font-medium">Pronos</th>
                <th className="text-center px-4 py-3.5 font-medium">Taux de réussite</th>
                <th className="text-center px-4 py-3.5 font-medium hidden md:table-cell">Rang global</th>
                <th className="text-left px-4 py-3.5 font-medium hidden lg:table-cell">Plan</th>
                <th className="text-left px-5 py-3.5 font-medium hidden lg:table-cell">Inscrit le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-overlay/[0.04]">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="divide-x divide-overlay/[0.05]">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 skeleton rounded" />
                      </td>
                    ))}
                  </tr>
                ))
                : tipsters.map((t, i) => {
                  const rank = (page - 1) * 20 + i + 1;
                  const rate = t.tipsterStats?.successRate || 0;
                  const rateColor = rate >= 60 ? 'text-primary-400' : rate >= 45 ? 'text-amber-400' : 'text-red-400';
                  const plan = t.subscription?.plan?.code || 'FREE';

                  return (
                    <tr key={t.id} className="hover:bg-overlay/[0.025] transition-colors divide-x divide-overlay/[0.05]">
                      <td className="px-5 py-4 text-sm text-ink-4 font-semibold">{rank}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {t.profile?.avatar ? (
                              <img src={t.profile.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-sm font-bold">
                                {t.username?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            {rank <= 3 && (
                              <Trophy size={10} className={`absolute -top-1 -right-1 ${rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-ink-4' : 'text-orange-500'}`} />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-ink-2">{t.profile?.displayName || t.username}</p>
                            <p className="text-xs text-ink-3">{t.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-ink-3">
                        {t.tipsterStats?.totalTips || 0}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-sm font-bold ${rateColor}`}>
                            {rate.toFixed(1)}%
                          </span>
                          <div className="w-16 h-1 rounded-full bg-overlay/[0.08] overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${rateColor.replace('text-', 'bg-')}`} style={{ width: `${rate}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center hidden md:table-cell text-sm text-ink-3">
                        {t.tipsterStats?.globalRank ? `#${t.tipsterStats.globalRank}` : '–'}
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${
                          plan === 'PRO' ? 'bg-amber-500/15 text-amber-400' :
                          plan === 'PREMIUM' ? 'bg-primary-500/15 text-primary-400' :
                          'bg-gray-500/15 text-ink-4'
                        }`}>
                          {plan}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell text-xs text-ink-3">
                        {format(new Date(t.createdAt), 'dd MMM yyyy', { locale: fr })}
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>

        {pagination?.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-overlay/[0.07]">
            <p className="text-xs text-ink-3">Page {page} / {pagination.pages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                className="p-1.5 rounded-lg text-ink-4 hover:text-ink-2 hover:bg-overlay/[0.06] disabled:opacity-30 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages}
                className="p-1.5 rounded-lg text-ink-4 hover:text-ink-2 hover:bg-overlay/[0.06] disabled:opacity-30 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
