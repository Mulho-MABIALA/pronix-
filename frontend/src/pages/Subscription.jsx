import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PlanCard from '../components/subscription/PlanCard';

export default function Subscription() {
  const { user, userPlan } = useAuth();
  const navigate = useNavigate();
  const billingCycle = 'MONTHLY';
  const [paymentMethod] = useState('FEDAPAY');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/subscriptions/plans').then((r) => r.data),
    staleTime: Infinity,
  });

  const plans = data?.data || [];

  const handleSelectPlan = async (plan) => {
    if (!user) { navigate('/connexion'); return; }
    setError('');
    setLoading(true);
    try {
      const { data: res } = await api.post('/payments/fedapay/init', { planId: plan.id, billingCycle });
      window.location.href = res.data.paymentUrl;
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'initialisation du paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="font-display font-bold text-3xl text-gray-100">Choisissez votre plan</h1>
        <p className="text-gray-400 mt-2">Accédez à des données fiables et à la communauté de tipsters</p>
        <p className="disclaimer mt-2">
          Ceci n'est pas un conseil financier. Aucune garantie de gain. Jouez de façon responsable.
        </p>
      </div>

      {/* Méthode de paiement */}
      <div className="max-w-md mx-auto">
        <p className="text-sm font-medium text-gray-300 mb-3 text-center">Moyen de paiement</p>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-primary-500/15 border-primary-500/40 text-primary-400">
          <span className="text-lg">💳</span>
          <div className="text-left">
            <p className="font-semibold text-sm">FedaPay</p>
            <p className="text-xs text-gray-400 mt-0.5">Wave · Orange Money · MTN · Carte Visa/MC</p>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="max-w-lg mx-auto bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Plans */}
      <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto w-full">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={userPlan === plan.code}
            onSelect={handleSelectPlan}
            loading={loading}
          />
        ))}
      </div>

      {/* FAQ rapide */}
      <section className="max-w-lg mx-auto space-y-4">
        <h2 className="font-semibold text-gray-100 text-center">Questions fréquentes</h2>
        {[
          { q: 'Les pronostics sont-ils garantis ?', a: 'Non. Les pronostics sont publiés par des membres de la communauté. Aucune garantie de gain n\'est promise ou sous-entendue.' },
          { q: 'Comment fonctionne le taux de réussite ?', a: 'Il est calculé automatiquement après chaque match en comparant le pronostic au résultat réel. Impossible de le manipuler.' },
          { q: 'Puis-je annuler mon abonnement ?', a: 'Oui, à tout moment depuis votre profil. Votre accès reste actif jusqu\'à la fin de la période payée.' },
        ].map(({ q, a }) => (
          <div key={q} className="bento-card">
            <p className="font-medium text-gray-200 text-sm">{q}</p>
            <p className="text-gray-500 text-sm mt-1">{a}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
