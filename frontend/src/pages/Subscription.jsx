import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PlanCard from '../components/subscription/PlanCard';

export default function Subscription() {
  const { user, userPlan } = useAuth();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [paymentMethod, setPaymentMethod] = useState('FEDAPAY');
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
      if (paymentMethod === 'FEDAPAY') {
        const { data: res } = await api.post('/payments/fedapay/init', { planId: plan.id, billingCycle });
        window.location.href = res.data.paymentUrl;
      } else if (paymentMethod === 'WAVE') {
        const { data: res } = await api.post('/payments/wave/init', { planId: plan.id, billingCycle });
        window.location.href = res.data.waveUrl;
      } else {
        const { data: res } = await api.post('/payments/cinetpay/init', { planId: plan.id, billingCycle });
        window.location.href = res.data.paymentUrl;
      }
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

      {/* Toggle facturation */}
      <div className="flex justify-center">
        <div className="flex gap-1 bg-surface-800 border border-surface-700 rounded-xl p-1" role="group" aria-label="Cycle de facturation">
          {[
            { value: 'MONTHLY', label: 'Mensuel' },
            { value: 'YEARLY', label: 'Annuel  −17%' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setBillingCycle(value)}
              aria-pressed={billingCycle === value}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                billingCycle === value ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Méthode de paiement */}
      <div className="max-w-md mx-auto">
        <p className="text-sm font-medium text-gray-300 mb-3 text-center">Moyen de paiement</p>
        <div className="grid grid-cols-1 gap-2">
          {/* FedaPay — option principale recommandée */}
          <button
            onClick={() => setPaymentMethod('FEDAPAY')}
            aria-pressed={paymentMethod === 'FEDAPAY'}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors border ${
              paymentMethod === 'FEDAPAY'
                ? 'bg-primary-500/15 border-primary-500/40 text-primary-400'
                : 'bg-surface-800 border-surface-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="text-lg">💳</span>
            <div className="text-left">
              <p className="font-semibold">FedaPay <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-400">Recommandé</span></p>
              <p className="text-xs text-gray-500 mt-0.5">Wave · Orange Money · MTN · Carte Visa/MC</p>
            </div>
          </button>

          <button
            onClick={() => setPaymentMethod('WAVE')}
            aria-pressed={paymentMethod === 'WAVE'}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors border ${
              paymentMethod === 'WAVE'
                ? 'bg-primary-500/15 border-primary-500/40 text-primary-400'
                : 'bg-surface-800 border-surface-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="text-lg">📱</span>
            <div className="text-left">
              <p className="font-semibold">Wave direct</p>
              <p className="text-xs text-gray-500 mt-0.5">Paiement Wave Sénégal uniquement</p>
            </div>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="max-w-lg mx-auto bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            billingCycle={billingCycle}
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
