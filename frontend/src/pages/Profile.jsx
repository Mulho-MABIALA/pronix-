import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PlanBadge } from '../components/ui/Badge';
import SuccessRateBar from '../components/ui/SuccessRateBar';
import { SkeletonCard } from '../components/ui/SkeletonLoader';

export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: user?.profile?.displayName || '', bio: user?.profile?.bio || '' });
  const [saved, setSaved] = useState(false);

  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => api.get('/subscriptions/me').then((r) => r.data),
  });

  const { data: myTipsData } = useQuery({
    queryKey: ['my-tips'],
    queryFn: () => api.get('/tips/my?limit=10').then((r) => r.data),
  });

  const updateProfile = useMutation({
    mutationFn: (data) => api.patch('/profiles/me', data),
    onSuccess: async () => {
      await refreshUser();
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const { subscription, payments } = subData?.data || {};
  const myTips = myTipsData?.data || [];
  const stats = user?.tipsterStats;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <h1 className="font-display font-bold text-2xl text-gray-100">Mon profil</h1>

      {/* Identité */}
      <section className="bento-card space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-2xl font-bold shrink-0">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-100">{user?.profile?.displayName || user?.username}</p>
            <p className="text-gray-500 text-sm">@{user?.username}</p>
            <p className="text-gray-500 text-sm">{user?.email}</p>
          </div>
        </div>

        {saved && (
          <div role="status" className="bg-primary-500/10 border border-primary-500/30 text-primary-400 text-sm rounded-xl px-4 py-2">
            ✓ Profil mis à jour
          </div>
        )}

        {editing ? (
          <div className="space-y-3">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1.5">Nom affiché</label>
              <input id="displayName" type="text" className="input" value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })} maxLength={50} />
            </div>
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-1.5">Bio</label>
              <textarea id="bio" className="input resize-none h-20" value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={300} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => updateProfile.mutate(form)} disabled={updateProfile.isPending} className="btn-primary flex-1">
                {updateProfile.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button onClick={() => setEditing(false)} className="btn-secondary flex-1">Annuler</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="btn-secondary w-full">
            Modifier le profil
          </button>
        )}
      </section>

      {/* Abonnement */}
      <section className="bento-card space-y-3">
        <h2 className="font-semibold text-gray-100">Abonnement</h2>
        {subLoading ? (
          <SkeletonCard />
        ) : subscription ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <PlanBadge planCode={subscription.plan?.code} />
                <p className="text-sm text-gray-400 mt-1">
                  {subscription.status === 'ACTIVE' ? (
                    subscription.endDate
                      ? `Expire le ${format(new Date(subscription.endDate), 'dd MMM yyyy', { locale: fr })}`
                      : 'Plan gratuit — sans expiration'
                  ) : (
                    <span className="text-red-400">Expiré</span>
                  )}
                </p>
              </div>
              <Link to="/abonnement" className="btn-secondary text-sm">
                {subscription.plan?.code === 'FREE' ? 'Passer Premium' : 'Gérer'}
              </Link>
            </div>

            {payments?.length > 0 && (
              <details className="text-sm">
                <summary className="text-gray-500 cursor-pointer hover:text-gray-300">
                  Historique des paiements ({payments.length})
                </summary>
                <div className="mt-2 space-y-1">
                  {payments.map((p) => (
                    <div key={p.id} className="flex justify-between text-xs text-gray-400 py-1 border-b border-surface-700">
                      <span>{format(new Date(p.createdAt), 'dd/MM/yyyy', { locale: fr })}</span>
                      <span>{p.method} — {p.amount.toLocaleString('fr-FR')} FCFA</span>
                      <span className={p.status === 'COMPLETED' ? 'text-primary-400' : 'text-red-400'}>{p.status}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        ) : (
          <p className="text-gray-500 text-sm">Aucun abonnement trouvé</p>
        )}
      </section>

      {/* Mes stats de tipster */}
      {stats && (
        <section className="bento-card space-y-3">
          <h2 className="font-semibold text-gray-100">Mes statistiques</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-2xl font-display font-bold text-gray-100">{stats.totalTips}</p>
              <p className="text-xs text-gray-500">Pronostics</p>
            </div>
            <div>
              <SuccessRateBar rate={stats.successRate} total={stats.totalTips} />
            </div>
          </div>
          <Link to={`/tipsters/${user.id}`} className="btn-secondary w-full text-sm">
            Voir mon profil public
          </Link>
        </section>
      )}

      {/* Mes pronostics récents */}
      {myTips.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-100 mb-3">Mes pronostics récents</h2>
          <div className="space-y-2">
            {myTips.map((tip) => (
              <div key={tip.id} className="bento-card flex items-center justify-between gap-3 text-sm">
                <div>
                  <Link to={`/matchs/${tip.matchId}`} className="font-medium text-gray-200 hover:text-primary-300">
                    {tip.match?.homeTeam} vs {tip.match?.awayTeam}
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5">{tip.prediction}</p>
                </div>
                <span className={`badge ${tip.result === 'WIN' ? 'bg-primary-500/20 text-primary-400' : tip.result === 'LOSS' ? 'bg-red-500/20 text-red-400' : 'bg-surface-600 text-gray-500'}`}>
                  {tip.result || 'En attente'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Déconnexion */}
      <button onClick={logout} className="w-full text-center text-sm text-red-400 hover:text-red-300 py-2">
        Se déconnecter
      </button>
    </div>
  );
}
