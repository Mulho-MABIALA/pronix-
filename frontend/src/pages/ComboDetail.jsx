import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Crown, Trash2, TrendingUp, Layers, ArrowLeft, Lock, Share2, CheckCircle2, XCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SkeletonCard, SkeletonText } from '../components/ui/SkeletonLoader';

const PRED_LABELS = {
  HOME_WIN: '1 — Domicile', DRAW: 'X — Nul', AWAY_WIN: '2 — Extérieur',
  OVER_2_5: 'Plus de 2.5 buts', UNDER_2_5: 'Moins de 2.5 buts',
  BTTS_YES: 'Les 2 équipes marquent', BTTS_NO: 'BTTS Non',
};

function ResultIcon({ result }) {
  if (!result) return null;
  if (result === 'WIN')  return <CheckCircle2 size={16} className="text-green-400" />;
  if (result === 'LOSS') return <XCircle size={16} className="text-red-400" />;
  return null;
}

function EntryRow({ entry }) {
  const m = entry.match;
  const isFinished = m?.status === 'FINISHED';

  return (
    <div className={`bento-card space-y-2 ${
      entry.result === 'WIN' ? 'border-green-500/20 bg-green-500/5' :
      entry.result === 'LOSS' ? 'border-red-500/20 bg-red-500/5' : ''
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Link
            to={`/matchs/${m?.id}`}
            className="text-sm font-semibold text-gray-100 hover:text-primary-300 transition-colors block truncate"
          >
            {m?.homeTeam} vs {m?.awayTeam}
          </Link>
          <p className="text-xs text-gray-500 mt-0.5">
            {m?.competition?.name}
            {m?.matchDate && (
              <> · {format(new Date(m.matchDate || m.scheduledAt), 'dd MMM HH:mm', { locale: fr })}</>
            )}
          </p>
        </div>
        <ResultIcon result={entry.result} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-300 bg-surface-700 px-2 py-0.5 rounded-lg">
            {PRED_LABELS[entry.prediction] || entry.prediction}
          </span>
          <span className="text-primary-400 font-bold text-sm">@ {entry.odds.toFixed(2)}</span>
        </div>
        {isFinished && m?.homeScore != null && (
          <span className="text-xs text-gray-400 font-medium bg-surface-700 px-2 py-0.5 rounded">
            {m.homeScore} – {m.awayScore}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ComboDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['combo', id],
    queryFn: () => api.get(`/combos/${id}`).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/combos/${id}`),
    onSuccess: () => {
      addToast('Combiné supprimé', 'success');
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      queryClient.invalidateQueries({ queryKey: ['my-combos'] });
      navigate('/combos');
    },
    onError: () => addToast('Erreur lors de la suppression', 'error'),
  });

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: combo?.title || 'Combiné fpronix', url });
    } else {
      navigator.clipboard.writeText(url);
      addToast('Lien copié !', 'success');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <SkeletonCard className="h-24" />
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    );
  }

  // Paywall
  if (error?.response?.status === 403) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <Lock size={48} className="text-amber-400 mx-auto" />
        <h2 className="font-display font-bold text-xl text-gray-100">Combiné Premium</h2>
        <p className="text-gray-400">Ce combiné est réservé aux abonnés Premium. Passez à la formule supérieure pour y accéder.</p>
        <Link
          to="/abonnement"
          className="inline-block px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-400 transition-colors"
        >
          Voir les abonnements
        </Link>
        <button onClick={() => navigate(-1)} className="block mx-auto text-sm text-gray-500 hover:text-gray-300 mt-2">
          ← Retour
        </button>
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-gray-500">Combiné introuvable.</p>
        <Link to="/combos" className="text-primary-400 text-sm mt-2 inline-block">← Retour aux combinés</Link>
      </div>
    );
  }

  const combo = data.data;
  const creatorName = combo.user?.profile?.displayName || combo.user?.username;
  const isOwn = user?.id === combo.userId;
  const title = combo.title || `Combiné du ${format(new Date(combo.createdAt), 'dd MMMM yyyy', { locale: fr })}`;

  const wonCount  = combo.entries.filter((e) => e.result === 'WIN').length;
  const lostCount = combo.entries.filter((e) => e.result === 'LOSS').length;
  const pendingCount = combo.entries.filter((e) => !e.result).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">

      {/* ── Back ── */}
      <button onClick={() => navigate('/combos')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
        <ArrowLeft size={15} />
        Retour aux combinés
      </button>

      {/* ── Header ── */}
      <div className="bento-card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-bold text-xl text-gray-100">{title}</h1>
              {combo.isPremium && (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  <Crown size={10} /> PREMIUM
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Par{' '}
              <Link to={`/tipsters/${combo.user?.id}`} className="text-primary-400 hover:underline">
                {creatorName}
              </Link>
              {combo.user?.tipsterStats?.successRate != null && (
                <span className="text-gray-600 ml-1">
                  · {combo.user.tipsterStats.successRate.toFixed(0)}% réussite
                </span>
              )}
              <span className="text-gray-600 ml-1">
                · {format(new Date(combo.createdAt), 'dd MMM yyyy', { locale: fr })}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleShare}
              className="p-2 rounded-lg bg-surface-700 text-gray-400 hover:text-gray-200 transition-colors"
              title="Partager"
            >
              <Share2 size={14} />
            </button>
            {isOwn && (
              <button
                onClick={() => {
                  if (window.confirm('Supprimer ce combiné ?')) deleteMutation.mutate();
                }}
                className="p-2 rounded-lg bg-surface-700 text-gray-400 hover:text-red-400 transition-colors"
                title="Supprimer"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Résumé chiffres */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-surface-700">
          <div className="text-center">
            <p className="text-xl font-display font-bold text-primary-400">{combo.totalOdds.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
              <TrendingUp size={10} /> Cote totale
            </p>
          </div>
          <div className="text-center">
            <p className="text-xl font-display font-bold text-gray-100">{combo.entries.length}</p>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
              <Layers size={10} /> Sélections
            </p>
          </div>
          <div className="text-center">
            {combo.result ? (
              <>
                <p className={`text-xl font-display font-bold ${
                  combo.result === 'WIN' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {combo.result === 'WIN' ? 'Gagné' : 'Perdu'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Résultat</p>
              </>
            ) : (
              <>
                <p className="text-xl font-display font-bold text-gray-400">{pendingCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">En attente</p>
              </>
            )}
          </div>
        </div>

        {/* Progress si pas encore terminé */}
        {!combo.result && combo.entries.some((e) => e.result) && (
          <div className="flex items-center gap-2 text-xs pt-1">
            <span className="text-green-400 font-medium">✓ {wonCount} gagné{wonCount > 1 ? 's' : ''}</span>
            {lostCount > 0 && <span className="text-red-400 font-medium">✗ {lostCount} perdu{lostCount > 1 ? 's' : ''}</span>}
            {pendingCount > 0 && <span className="text-gray-500">{pendingCount} en attente</span>}
          </div>
        )}
      </div>

      {/* ── Entrées ── */}
      <section>
        <h2 className="font-semibold text-gray-100 mb-3">Sélections du coupon</h2>
        <div className="space-y-2">
          {combo.entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </div>
      </section>

      {/* ── CTA partage ── */}
      <div className="flex gap-3">
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-surface-600 text-gray-300 text-sm font-medium hover:bg-surface-700 transition-colors"
        >
          <Share2 size={14} /> Partager ce combiné
        </button>
        <Link
          to="/combos/creer"
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-400 transition-colors"
        >
          Créer le mien
        </Link>
      </div>

      <p className="disclaimer text-center">
        Les cotes indiquées sont indicatives. Vérifiez les cotes réelles chez votre bookmaker avant de parier. Jeu responsable.
      </p>
    </div>
  );
}
