import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, RefreshCw, Check, Star, Users, TrendingUp, Zap } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePageMeta } from '../hooks/usePageMeta';

const TRUST_BADGES = [
  { icon: Lock,       label: 'Paiement 100% sécurisé' },
  { icon: RefreshCw,  label: 'Annulation à tout moment' },
  { icon: Shield,     label: 'Sans engagement' },
];

const PAYMENT_METHODS = ['Wave', 'Orange Money', 'Airtel Money', 'MTN', 'Visa / Mastercard'];

const STATS = [
  { value: '500+',  label: 'Tipsters actifs' },
  { value: '10K+',  label: 'Pronostics publiés' },
  { value: '68%',   label: 'Taux de réussite moyen' },
];

const FAQ_ITEMS = [
  {
    q: 'Les pronostics sont-ils garantis ?',
    a: 'Non. Les pronostics sont générés par algorithme et publiés par la communauté. Aucune garantie de gain n\'est promise ou sous-entendue. Jouez de façon responsable.',
  },
  {
    q: 'Comment fonctionne le taux de réussite ?',
    a: 'Il est calculé automatiquement après chaque match en comparant le pronostic au résultat réel. Impossible de le manipuler manuellement.',
  },
  {
    q: 'Comment annuler mon abonnement ?',
    a: 'Depuis votre profil, à tout moment, en un clic. Votre accès reste actif jusqu\'à la fin de la période payée — aucun remboursement au prorata.',
  },
  {
    q: 'Quels moyens de paiement sont acceptés ?',
    a: 'Wave, Orange Money, Airtel Money, MTN Mobile Money, et carte bancaire Visa/Mastercard — via GeniusPay, plateforme certifiée.',
  },
];

// Couleurs par plan
const PLAN_STYLE = {
  FREE:    { ring: '', badge: null,                               btn: 'btn-secondary opacity-60 cursor-default justify-center' },
  PREMIUM: { ring: 'ring-1 ring-primary-500/50 border-primary-500/60', badge: '⭐ Recommandé', btn: 'btn-primary w-full' },
};

function PricingCard({ plan, billingCycle, isCurrentPlan, onSelect, loading }) {
  const isFree   = plan.code === 'FREE';
  const style    = PLAN_STYLE[plan.code] || PLAN_STYLE.FREE;
  const price    = billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;
  const monthly  = billingCycle === 'YEARLY' ? (plan.priceYearly / 12).toFixed(2) : null;

  return (
    <div className={`bento-card flex flex-col gap-5 relative ${style.ring}`}>
      {/* Badge */}
      {style.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-primary-500 text-white shadow-lg shadow-primary-500/30">
            {style.badge}
          </span>
        </div>
      )}

      {/* En-tête */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">{plan.displayName}</p>
        {isFree ? (
          <p className="text-4xl font-display font-bold text-gray-100">Gratuit</p>
        ) : (
          <div className="flex items-end gap-1.5 flex-wrap">
            <span className="text-4xl font-display font-bold text-gray-100">
              ${price?.toFixed(2)}
            </span>
            <span className="text-gray-500 pb-1 text-sm">/{billingCycle === 'YEARLY' ? 'an' : 'mois'}</span>
          </div>
        )}
        {monthly && (
          <p className="text-xs text-primary-400 mt-1">≈ ${parseFloat(monthly).toFixed(2)}/mois</p>
        )}
      </div>

      {/* Séparateur */}
      <div className="h-px bg-white/[0.06]" />

      {/* Features */}
      <ul className="space-y-2.5 flex-1">
        {(plan.features || []).map((feat, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
            <Check size={15} className="text-primary-400 mt-0.5 shrink-0" />
            <span>{feat}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isCurrentPlan ? (
        <div className="py-2.5 rounded-xl text-center text-sm font-semibold text-gray-400 border border-white/[0.08] bg-surface-700/40">
          ✓ Plan actuel
        </div>
      ) : isFree ? (
        <div className="py-2.5 rounded-xl text-center text-sm font-semibold text-gray-500 border border-white/[0.06]">
          Plan par défaut
        </div>
      ) : (
        <button
          onClick={() => onSelect(plan)}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? 'Chargement…' : `Commencer avec ${plan.displayName}`}
        </button>
      )}
    </div>
  );
}

export default function Subscription() {
  usePageMeta('Abonnement Premium', 'Passez à Premium fpronix — pronostics IA, value bets, données temps réel. Paiement sécurisé via Wave, Orange Money, Carte bancaire.');
  const { user, userPlan } = useAuth();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/subscriptions/plans').then((r) => r.data),
    staleTime: Infinity,
  });

  // N'afficher que FREE + PREMIUM (le premier plan payant)
  const allPlans = data?.data || [];
  const freePlan    = allPlans.find((p) => p.code === 'FREE');
  const premiumPlan = allPlans.find((p) => p.code === 'PREMIUM') || allPlans.filter((p) => p.code !== 'FREE')[0];
  const plans = [freePlan, premiumPlan].filter(Boolean);

  const handleSelectPlan = async (plan) => {
    if (!user) { navigate('/connexion'); return; }
    setError('');
    setLoading(true);
    try {
      const { data: res } = await api.post('/payments/geniuspay/init', { planId: plan.id, billingCycle });
      window.location.href = res.data.checkoutUrl;
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'initialisation du paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-semibold mb-2">
          <Zap size={12} />
          Propulsé par IA + données temps réel
        </div>
        <h1 className="font-display font-bold text-3xl text-gray-100 leading-tight">
          Passez au niveau supérieur<br />
          <span className="text-primary-400">avec les vraies données</span>
        </h1>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Forme récente, confrontations directes, classements, blessures — tout ça analysé par IA pour des pronostics fiables.
        </p>
      </div>

      {/* Statistiques de confiance */}
      <div className="grid grid-cols-3 gap-4">
        {STATS.map(({ value, label }) => (
          <div key={label} className="bento-card text-center py-4">
            <p className="text-2xl font-display font-bold text-primary-400">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Cycle de facturation */}
      <div className="flex items-center justify-center gap-2">
        {[
          { value: 'MONTHLY', label: 'Mensuel' },
          { value: 'YEARLY',  label: 'Annuel', badge: '-20%' },
        ].map(({ value, label, badge }) => (
          <button
            key={value}
            onClick={() => setBillingCycle(value)}
            className={`relative px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              billingCycle === value
                ? 'bg-primary-500/20 border border-primary-500/40 text-primary-400'
                : 'text-gray-400 border border-white/[0.08] hover:border-white/20'
            }`}
          >
            {label}
            {badge && (
              <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-500/20 text-primary-400">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 text-center">
          {error}
        </div>
      )}

      {/* Plans */}
      <div className={`grid gap-5 ${plans.length === 2 ? 'md:grid-cols-2' : 'grid-cols-1 max-w-sm mx-auto'}`}>
        {plans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            billingCycle={billingCycle}
            isCurrentPlan={userPlan === plan.code}
            onSelect={handleSelectPlan}
            loading={loading}
          />
        ))}
      </div>

      {/* Méthodes de paiement */}
      <div className="bento-card">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={14} className="text-primary-400" />
          <p className="text-sm font-semibold text-gray-200">Paiement sécurisé via GeniusPay</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => (
            <span key={m} className="text-xs px-3 py-1.5 rounded-lg bg-surface-600/50 border border-white/[0.07] text-gray-300 font-medium">
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Badges de confiance */}
      <div className="grid grid-cols-3 gap-3">
        {TRUST_BADGES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl bg-surface-700/30 border border-white/[0.05] text-center">
            <div className="w-8 h-8 rounded-full bg-primary-500/15 flex items-center justify-center">
              <Icon size={16} className="text-primary-400" />
            </div>
            <p className="text-xs text-gray-400 font-medium leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="disclaimer text-center">
        fpronix ne garantit aucun gain. Les pronostics sont fournis à titre informatif uniquement. Jouez de façon responsable — <a href="https://www.joueurs-info-service.fr" target="_blank" rel="noopener noreferrer" className="underline">aide aux joueurs</a>.
      </p>

      {/* FAQ */}
      <section className="space-y-3">
        <h2 className="font-semibold text-gray-100 text-center text-base mb-4">Questions fréquentes</h2>
        {FAQ_ITEMS.map(({ q, a }) => (
          <div key={q} className="bento-card">
            <p className="font-medium text-gray-200 text-sm">{q}</p>
            <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">{a}</p>
          </div>
        ))}
      </section>

    </div>
  );
}
