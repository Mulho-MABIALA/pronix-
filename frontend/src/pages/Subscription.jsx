import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, RefreshCw, Check, Star, Users, TrendingUp, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePageMeta } from '../hooks/usePageMeta';

const PAYMENT_METHODS = [
  {
    name: 'Wave',
    logo: 'https://logo.clearbit.com/wave.com',
    bg: 'bg-[#1ebcd5]/10',
  },
  {
    name: 'Orange Money',
    logo: 'https://logo.clearbit.com/orange.com',
    bg: 'bg-orange-500/10',
  },
  {
    name: 'Airtel Money',
    logo: 'https://logo.clearbit.com/airtel.com',
    bg: 'bg-red-500/10',
  },
  {
    name: 'MTN',
    logo: 'https://logo.clearbit.com/mtn.com',
    bg: 'bg-yellow-400/10',
  },
  {
    name: 'Visa',
    logo: 'https://logo.clearbit.com/visa.com',
    bg: 'bg-blue-600/10',
  },
  {
    name: 'Mastercard',
    logo: 'https://logo.clearbit.com/mastercard.com',
    bg: 'bg-red-500/10',
  },
];

// Couleurs par plan
const PLAN_STYLE = {
  FREE:     { ring: '', badge: null, btn: 'btn-secondary opacity-60 cursor-default justify-center' },
  PREMIUM:  { ring: 'ring-1 ring-primary-500/50 border-primary-500/60', badge: '⭐ Recommandé', btn: 'btn-primary w-full' },
  LIFETIME: { ring: 'ring-1 ring-amber-500/50 border-amber-500/60', badge: '🏆 Meilleure valeur', btn: 'w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 transition-all active:scale-[0.98]' },
};

function PricingCard({ plan, billingCycle, isCurrentPlan, onSelect, loading }) {
  const { t } = useTranslation();
  const isFree     = plan.code === 'FREE';
  const isLifetime = plan.code === 'LIFETIME';
  const style      = PLAN_STYLE[plan.code] || PLAN_STYLE.FREE;
  const price      = isLifetime
    ? plan.priceMonthly
    : billingCycle === 'YEARLY'  ? plan.priceYearly
    : billingCycle === 'WEEKLY'  ? plan.priceWeekly
    : plan.priceMonthly;
  const monthly    = !isLifetime && billingCycle === 'YEARLY' ? (plan.priceYearly / 12).toFixed(2) : null;
  const unitLabel  = billingCycle === 'YEARLY' ? 'an' : billingCycle === 'WEEKLY' ? 'semaine' : 'mois';

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
        <p className="text-xs font-bold uppercase tracking-widest text-gray-300 mb-1">{plan.displayName}</p>
        {isFree ? (
          <p className="text-4xl font-display font-bold text-gray-100">Gratuit</p>
        ) : (
          <div className="flex items-end gap-1.5 flex-wrap">
            <span className="text-4xl font-display font-bold text-gray-100">
              {new Intl.NumberFormat('fr-FR').format(price)}
            </span>
            <span className="text-gray-300 pb-1 text-sm">
              {' '}FCFA{isLifetime ? ' · paiement unique' : `/${unitLabel}`}
            </span>
          </div>
        )}
        {monthly && (
          <p className="text-xs text-primary-400 mt-1">
            ≈ {new Intl.NumberFormat('fr-FR').format(Math.round(plan.priceYearly / 12))} FCFA/mois
          </p>
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
          {t('common.currentPlan')}
        </div>
      ) : isFree ? (
        <div className="py-2.5 rounded-xl text-center text-sm font-semibold text-gray-300 border border-white/[0.06]">
          {t('common.defaultPlan')}
        </div>
      ) : (
        <button
          onClick={() => onSelect(plan)}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? t('common.loading') : t('common.startWith', { plan: plan.displayName })}
        </button>
      )}
    </div>
  );
}

export default function Subscription() {
  usePageMeta('Abonnement Premium', 'Passez à Premium fpronix — pronostics IA, value bets, données temps réel. Paiement sécurisé via Wave, Orange Money, Carte bancaire.');
  const { t } = useTranslation();
  const { user, userPlan } = useAuth();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const TRUST_BADGES = [
    { icon: Lock,      label: t('subscription.trust.secure') },
    { icon: RefreshCw, label: t('subscription.trust.cancel') },
    { icon: Shield,    label: t('subscription.trust.noCommit') },
  ];

  const STATS = [
    { value: '500+', label: t('subscription.stats.tipsters') },
    { value: '10K+', label: t('subscription.stats.pronostics') },
    { value: '68%',  label: t('subscription.stats.successRate') },
  ];

  const FAQ_ITEMS = [
    { q: t('subscription.faq.q1'), a: t('subscription.faq.a1') },
    { q: t('subscription.faq.q2'), a: t('subscription.faq.a2') },
    { q: t('subscription.faq.q3'), a: t('subscription.faq.a3') },
    { q: t('subscription.faq.q4'), a: t('subscription.faq.a4') },
  ];

  const { data } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/subscriptions/plans').then((r) => r.data),
    staleTime: Infinity,
  });

  // Afficher FREE + PREMIUM + LIFETIME
  const allPlans    = data?.data || [];
  const freePlan    = allPlans.find((p) => p.code === 'FREE');
  const premiumPlan = allPlans.find((p) => p.code === 'PREMIUM');
  const lifetimePlan = allPlans.find((p) => p.code === 'LIFETIME');
  const plans = [freePlan, premiumPlan, lifetimePlan].filter(Boolean);

  const handleSelectPlan = async (plan) => {
    if (!user) { navigate('/connexion'); return; }
    setError('');
    setLoading(true);
    try {
      // PayDunya a remplacé GeniusPay comme moyen de paiement actif
      const { data: res } = await api.post('/payments/paydunya/init', { planId: plan.id, billingCycle });
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
          {t('subscription.pageBadge')}
        </div>
        <h1 className="font-display font-bold text-3xl text-gray-100 leading-tight">
          {t('subscription.title')}<br />
          <span className="text-primary-400">{t('subscription.titleHighlight')}</span>
        </h1>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          {t('subscription.description')}
        </p>
      </div>

      {/* Statistiques de confiance */}
      <div className="grid grid-cols-3 gap-4">
        {STATS.map(({ value, label }) => (
          <div key={label} className="bento-card text-center py-4">
            <p className="text-2xl font-display font-bold text-primary-400">{value}</p>
            <p className="text-xs text-gray-300 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Cycle de facturation */}
      <div className="flex items-center justify-center gap-2">
        {[
          { value: 'WEEKLY',  label: t('subscription.billing.weekly') },
          { value: 'MONTHLY', label: t('subscription.billing.monthly') },
          { value: 'YEARLY',  label: t('subscription.billing.yearly'), badge: t('subscription.billing.yearlyBadge') },
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
      <div className={`grid gap-5 ${plans.length >= 3 ? 'md:grid-cols-3' : plans.length === 2 ? 'md:grid-cols-2' : 'grid-cols-1 max-w-sm mx-auto'}`}>
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
          <p className="text-sm font-semibold text-gray-200">{t('subscription.payment.title')}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {PAYMENT_METHODS.map((m) => (
            <div
              key={m.name}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.07] ${m.bg}`}
            >
              <img
                src={m.logo}
                alt={m.name}
                className="h-5 w-5 object-contain rounded"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <span className="text-xs text-gray-200 font-medium">{m.name}</span>
            </div>
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
        {t('subscription.disclaimer')}{' '}
        <a href="https://www.joueurs-info-service.fr" target="_blank" rel="noopener noreferrer" className="underline">
          {t('subscription.disclaimerLink')}
        </a>.
      </p>

      {/* FAQ */}
      <section className="space-y-3">
        <h2 className="font-semibold text-gray-100 text-center text-base mb-4">{t('subscription.faq.title')}</h2>
        {FAQ_ITEMS.map(({ q, a }) => (
          <div key={q} className="bento-card">
            <p className="font-medium text-gray-200 text-sm">{q}</p>
            <p className="text-gray-300 text-sm mt-1.5 leading-relaxed">{a}</p>
          </div>
        ))}
      </section>

    </div>
  );
}
