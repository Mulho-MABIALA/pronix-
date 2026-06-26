import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, AlertTriangle, Eye, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../services/api';

const STATUS_LABELS = {
  PENDING: { label: 'En attente', cls: 'bg-orange-500/15 text-orange-400 border border-orange-500/20' },
  REVIEWED: { label: 'Examiné', cls: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  DISMISSED: { label: 'Ignoré', cls: 'bg-gray-500/15 text-gray-400 border border-gray-500/20' },
  ACTIONED: { label: 'Traité', cls: 'bg-primary-500/15 text-primary-400 border border-primary-500/20' },
};

export default function AdminReports() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', statusFilter],
    queryFn: () => api.get('/admin/reports', { params: { status: statusFilter || undefined } }).then((r) => r.data),
  });

  const resolve = useMutation({
    mutationFn: ({ reportId, ...payload }) => api.patch(`/admin/reports/${reportId}/resolve`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reports'] }),
  });

  const reports = data?.data || [];

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-50">Signalements</h1>
        <p className="text-sm text-gray-500 mt-0.5">{data?.pagination?.total ?? 0} signalement(s) au total</p>
      </div>

      {/* Filtres statut */}
      <div className="flex gap-2 flex-wrap">
        {[['', 'Tous'], ['PENDING', 'En attente'], ['ACTIONED', 'Traités'], ['DISMISSED', 'Ignorés']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
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

      {/* Liste */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-800 rounded-2xl h-32 animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-surface-800 border border-surface-700 rounded-2xl py-16 text-center">
          <ShieldCheck size={36} className="mx-auto text-primary-500/50 mb-3" />
          <p className="text-gray-400 font-medium">Aucun signalement</p>
          <p className="text-xs text-gray-600 mt-1">Pour ce filtre</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const st = STATUS_LABELS[report.status] || STATUS_LABELS.PENDING;
            return (
              <div key={report.id} className="bg-surface-800 border border-surface-700 rounded-2xl p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={14} className="text-orange-400" />
                      <span className="text-sm font-medium text-gray-200">
                        Signalé par <span className="text-primary-400">@{report.reporter?.username}</span>
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Raison : {report.reason}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {format(new Date(report.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg shrink-0 ${st.cls}`}>
                    {st.label}
                  </span>
                </div>

                {/* Pronostic signalé */}
                {report.tip && (
                  <div className="bg-surface-700/60 border border-surface-600 rounded-xl p-3.5">
                    <p className="text-xs font-semibold text-gray-400 mb-1.5">
                      Pronostic de <span className="text-gray-200">@{report.tip.user?.username}</span>
                    </p>
                    <p className="text-sm text-gray-300">
                      {report.tip.match?.homeTeam} vs {report.tip.match?.awayTeam}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Prédiction : <span className="text-gray-300 font-medium">{report.tip.prediction}</span>
                    </p>
                    {report.tip.analysis && (
                      <p className="text-xs text-gray-500 italic mt-1.5 border-t border-surface-600 pt-1.5">
                        "{report.tip.analysis}"
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                {report.status === 'PENDING' && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => resolve.mutate({ reportId: report.id, status: 'DISMISSED' })}
                      disabled={resolve.isPending}
                      className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-xl border border-surface-600 text-gray-400 hover:text-gray-200 hover:border-surface-500 transition-colors"
                    >
                      Ignorer
                    </button>
                    <button
                      onClick={() => resolve.mutate({ reportId: report.id, status: 'ACTIONED', hideTip: true })}
                      disabled={resolve.isPending}
                      className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-xl border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-colors"
                    >
                      <Eye size={12} /> Masquer le pronostic
                    </button>
                    <button
                      onClick={() => resolve.mutate({ reportId: report.id, status: 'ACTIONED', hideTip: true, suspendUser: true })}
                      disabled={resolve.isPending}
                      className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Ban size={12} /> Masquer + Suspendre
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
