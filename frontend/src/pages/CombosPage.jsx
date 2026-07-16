import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PlusCircle, Crown, Trash2, TrendingUp, Layers, ChevronRight, Lock } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SkeletonCard } from '../components/ui/SkeletonLoader';

const PRED_LABELS = {
  HOME_WIN: '1', DRAW: 'X', AWAY_WIN: '2',
  OVER_2_5: '+2.5', UNDER_2_5: '-2.5',
  BTTS_YES: 'BTTS Oui', BTTS_NO: 'BTTS Non',
};

function ResultBadge({ result }) {
  if (!result) return null;
  const map = {
    WIN:  'text-green-400 bg-green-500/10',
    LOSS: 'text-red-400 bg-red-500/10',
    VOID: 'text-gray-400 bg-surface-700',
  };
  const labels = { WIN: 'Gagné', LOSS: 'Perdu', VOID: 'Annulé' };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[result] || map.VOID}`}>
      {labels[result] || result}
    </span>
  );
}

function ComboCard({ combo, isOwn, onDelete }) {
  const name = combo.user?.profile?.displayName || combo.user?.username || 'Anonyme';
  const title = combo.title || `Combiné du ${format(new Date(combo.createdAt), 'dd MMM', { locale: fr })}`;

  return (
    <div className="bento-card space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-100 truncate">{title}</h3>
            {combo.isPremium && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                <Crown size={9} /> PREMIUM
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            par{' '}
            <Link to={`/tipsters/${combo.user?.id}`} className="text-primary-400 hover:underline">
              {name}
            </Link>
            {combo.user?.tipsterStats?.successRate != null && (
              <span className="ml-1 text-gray-600">
                · {combo.user.tipsterStats.successRate.toFixed(0)}% réussite
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ResultBadge result={combo.result} />
          {isOwn && (
            <button
              onClick={() => onDelete(combo.id)}
              className="p-1 text-gray-600 hover:text-red-400 transition-colors"
              title="Supprimer"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Entries preview */}
      <div className="space-y-1.5">
        {combo.entries.slice(0, 3).map((entry) => (
          <div key={entry.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-gray-400 truncate flex-1">
              {entry.match?.homeTeam} vs {entry.match?.awayTeam}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-medium text-gray-300 bg-surface-700 px-1.5 py-0.5 rounded">
                {PRED_LABELS[entry.prediction] || entry.prediction}
              </span>
              <span className="text-primary-400 font-semibold">{entry.odds.toFixed(2)}</span>
              <ResultBadge result={entry.result} />
            </div>
          </div>
        ))}
        {combo.entries.length > 3 && (
          <p className="text-xs text-gray-600">
            +{combo.entries.length - 3} autre{combo.entries.length - 3 > 1 ? 's' : ''} sélection{combo.entries.length - 3 > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-surface-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Layers size={11} />
            {combo.entries.length} sélection{combo.entries.length > 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-primary-400">
            <TrendingUp size={11} />
            Cote {combo.totalOdds.toFixed(2)}
          </div>
        </div>
        <Link
          to={`/combos/${combo.id}`}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-400 transition-colors"
        >
          Voir <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}

export default function CombosPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('tous');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['combos', page],
    queryFn: () => api.get(`/combos?limit=15&page=${page}`).then((r) => r.data),
    staleTime: 60 * 1000,
  });

  const { data: myData, isLoading: myLoading } = useQuery({
    queryKey: ['my-combos'],
    queryFn: () => api.get('/combos/my').then((r) => r.data),
    enabled: !!user && tab === 'moi',
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/combos/${id}`),
    onSuccess: () => {
      addToast('Combiné supprimé', 'success');
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      queryClient.invalidateQueries({ queryKey: ['my-combos'] });
    },
    onError: () => addToast('Erreur lors de la suppression', 'error'),
  });

  const combos = data?.data || [];
  const myCombos = myData?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = Math.ceil(total / 15);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-100">Combinés</h1>
          <p className="text-gray-500 text-sm mt-0.5">Coupons multi-picks partagés par la communauté</p>
        </div>
        {user && (
          <Link
            to="/combos/creer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-400 transition-colors"
          >
            <PlusCircle size={15} />
            Créer
          </Link>
        )}
      </div>

      {/* ── Tabs ── */}
      {user && (
        <div className="flex gap-1 bg-surface-800 p-1 rounded-xl">
          {[
            { id: 'tous', label: 'Explorer' },
            { id: 'moi', label: 'Mes combinés' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-surface-600 text-gray-100' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
              {t.id === 'moi' && myCombos.length > 0 && (
                <span className="ml-1.5 text-xs text-primary-400">({myCombos.length})</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      {tab === 'tous' && (
        <>
          {isLoading ? (
            <div className="space-y-3">
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          ) : combos.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Layers size={40} className="text-gray-600 mx-auto" />
              <p className="text-gray-400 font-medium">Aucun combiné pour l'instant</p>
              <p className="text-gray-600 text-sm">Soyez le premier à créer un coupon !</p>
              {user && (
                <Link
                  to="/combos/creer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-400 transition-colors mt-2"
                >
                  <PlusCircle size={15} /> Créer un combiné
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {combos.map((combo) => (
                <ComboCard
                  key={combo.id}
                  combo={combo}
                  isOwn={user?.id === combo.userId}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg bg-surface-700 text-gray-300 text-sm disabled:opacity-40"
              >
                ← Préc
              </button>
              <span className="text-xs text-gray-500">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg bg-surface-700 text-gray-300 text-sm disabled:opacity-40"
              >
                Suiv →
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'moi' && (
        <>
          {myLoading ? (
            <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
          ) : myCombos.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Layers size={40} className="text-gray-600 mx-auto" />
              <p className="text-gray-400 font-medium">Vous n'avez pas encore de combinés</p>
              <Link
                to="/combos/creer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-400 transition-colors"
              >
                <PlusCircle size={15} /> Créer mon premier combiné
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Link
                  to="/combos/creer"
                  className="flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary-300"
                >
                  <PlusCircle size={14} /> Nouveau
                </Link>
              </div>
              {myCombos.map((combo) => (
                <ComboCard
                  key={combo.id}
                  combo={combo}
                  isOwn
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {!user && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-500/10 border border-primary-500/20">
          <Lock size={18} className="text-primary-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-gray-200 font-medium">Créez et partagez vos combinés</p>
            <p className="text-xs text-gray-500 mt-0.5">Connectez-vous pour créer vos propres coupons</p>
          </div>
          <Link to="/connexion" className="text-xs font-semibold text-primary-400 hover:text-primary-300">
            Se connecter
          </Link>
        </div>
      )}
    </div>
  );
}
