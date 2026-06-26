import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../services/api';

const STATUS = {
  COMPLETED: { label: 'Complété',  Icon: CheckCircle, cls: 'text-primary-400 bg-primary-500/15 border-primary-500/20' },
  PENDING:   { label: 'En attente', Icon: Clock,        cls: 'text-amber-400 bg-amber-500/15 border-amber-500/20' },
  FAILED:    { label: 'Échoué',    Icon: XCircle,      cls: 'text-red-400 bg-red-500/15 border-red-500/20' },
  REFUNDED:  { label: 'Remboursé', Icon: XCircle,      cls: 'text-gray-400 bg-gray-500/15 border-gray-500/20' },
};

export default function AdminPayments() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', statusFilter, page],
    queryFn: () => api.get('/admin/payments', {
      params: { page, limit: 20, ...(statusFilter && { status: statusFilter }) },
    }).then((r) => r.data),
  });

  const payments = data?.data || [];
  const pagination = data?.pagination;
  const totalAmount = payments.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-5 max-w-7xl">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-50">Paiements</h1>
        <p className="text-sm text-gray-500 mt-0.5">{pagination?.total ?? 0} transactions</p>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {[['', 'Tous'], ['COMPLETED', 'Complétés'], ['PENDING', 'En attente'], ['FAILED', 'Échoués']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => { setStatusFilter(val); setPage(1); }}
            className={`text-xs font-medium px-3.5 py-2 rounded-xl border transition-colors ${
              statusFilter === val
                ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                : 'bg-surface-800 border-surface-700 text-gray-400 hover:border-surface-600 hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3.5 font-medium">Utilisateur</th>
                <th className="text-left px-4 py-3.5 font-medium">Montant</th>
                <th className="text-left px-4 py-3.5 font-medium">Méthode</th>
                <th className="text-left px-4 py-3.5 font-medium">Statut</th>
                <th className="text-left px-5 py-3.5 font-medium hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-surface-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
                : payments.map((p) => {
                  const st = STATUS[p.status] || STATUS.PENDING;
                  return (
                    <tr key={p.id} className="hover:bg-surface-700/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-surface-700 flex items-center justify-center text-gray-400 text-xs font-bold shrink-0">
                            {p.user?.username?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-200">{p.user?.profile?.displayName || p.user?.username}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[160px]">{p.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-bold text-gray-100">{p.amount.toLocaleString('fr-FR')}</span>
                        <span className="text-xs text-gray-500 ml-1">FCFA</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-gray-400 bg-surface-700 px-2.5 py-1 rounded-lg capitalize">
                          {p.provider || p.method}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${st.cls}`}>
                          <st.Icon size={11} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell text-xs text-gray-500">
                        {format(new Date(p.createdAt), 'dd MMM yyyy, HH:mm', { locale: fr })}
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>

        {pagination?.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-surface-700">
            <p className="text-xs text-gray-500">Page {page} / {pagination.pages} — {pagination.total} transactions</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-700 disabled:opacity-30 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-700 disabled:opacity-30 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
