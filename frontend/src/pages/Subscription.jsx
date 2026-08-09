import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import {
  Shield, Lock, RefreshCw, Check, Star, Users, TrendingUp, Zap, AlertTriangle,
  ShieldCheck, MessageCircle, Radio, HeartHandshake, ArrowRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { useCurrency } from '../hooks/useCurrency';

// Logos dessinés en local (SVG inline, couleurs officielles de chaque marque)
// — pas de dépendance à un service externe (Clearbit ne renvoyait plus rien
// en production, laissant les badges de paiement vides).
function WaveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#1DC8CD" />
      <path d="M4 13c1.2 0 1.2-3 2.4-3s1.2 3 2.4 3 1.2-3 2.4-3 1.2 3 2.4 3 1.2-3 2.4-3 1.2 3 2.4 3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function OrangeMoneyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#FF7900" />
      <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="800" fontFamily="Arial, sans-serif" fill="#fff">O</text>
    </svg>
  );
}
function AirtelMoneyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#ED1C24" />
      <path d="M6.5 15c2-5.5 9-5.5 11 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
function MtnIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#FFCB05" />
      <text x="12" y="15.5" textAnchor="middle" fontSize="7.5" fontWeight="900" fontFamily="Arial, sans-serif" fill="#000">MTN</text>
    </svg>
  );
}
function VisaIcon() {
  return (
    <svg width="24" height="18" viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="24" rx="4" fill="#fff" />
      <text x="18" y="17" textAnchor="middle" fontSize="11" fontWeight="900" fontStyle="italic" fontFamily="Arial, sans-serif" fill="#1A1F71">VISA</text>
    </svg>
  );
}
function MastercardIcon() {
  return (
    <svg width="24" height="18" viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="24" rx="4" fill="#fff" />
      <circle cx="15" cy="12" r="7" fill="#EB001B" />
      <circle cx="23" cy="12" r="7" fill="#F79E1B" fillOpacity="0.9" />
    </svg>
  );
}

const PAYMENT_METHODS = [
  { name: 'Wave',         Icon: WaveIcon,        bg: 'bg-[#1DC8CD]/10' },
  { name: 'Orange Money', Icon: OrangeMoneyIcon, bg: 'bg-[#FF7900]/10' },
  { name: 'Airtel Money', Icon: AirtelMoneyIcon, bg: 'bg-[#ED1C24]/10' },
  { name: 'MTN',          Icon: MtnIcon,         bg: 'bg-[#FFCB05]/10' },
  { name: 'Visa',         Icon: VisaIcon,        bg: 'bg-[#1A1F71]/10' },
  { name: 'Mastercard',   Icon: MastercardIcon,  bg: 'bg-overlay/[0.05]' },
];

// Couleurs par plan (le libellé du badge est traduit dans PricingCard, pas ici —
// cet objet est défini hors composant donc sans accès à useTranslation)
const PLAN_STYLE = {
  FREE:     { ring: '', badgeKey: null, btn: 'btn-secondary opacity-60 cursor-default justify-center' },
  PREMIUM:  { ring: 'ring-1 ring-primary-500/50 border-primary-500/60', badgeKey: 'badgeRecommended', btn: 'btn-primary w-full' },
  LIFETIME: { ring: 'ring-1 ring-amber-500/50 border-amber-500/60', badgeKey: 'badgeBestValue', btn: 'w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 transition-all active:scale-[0.98]' },
};

function PricingCard({ plan, billingCycle, isCurrentPlan, onSelect, loading, premiumMonthlyPrice }) {
  const { t } = useTranslation();
  const isFree     = plan.code === 'FREE';
  const isLifetime = plan.code === 'LIFETIME';
  const isPremium  = plan.code === 'PREMIUM';
  const style      = PLAN_STYLE[plan.code] || PLAN_STYLE.FREE;
  const price      = isLifetime
    ? plan.priceMonthly
    : billingCycle === 'YEARLY'  ? plan.priceYearly
    : billingCycle === 'WEEKLY'  ? plan.priceWeekly
    : plan.priceMonthly;
  const monthly    = !isLifetime && billingCycle === 'YEARLY' ? (plan.priceYearly / 12).toFixed(2) : null;
  const unitLabel  = billingCycle === 'YEARLY' ? t('subscription.unitYear') : billingCycle === 'WEEKLY' ? t('subscription.unitWeek') : t('subscription.unitMonth');

  // Prix ramené à la journée — un prix mensuel/annuel se compare mal à une
  // dépense quotidienne, le ramener au jour le rend concret (technique
  // standard, honnête tant que le calcul est exact).
  const perDayPrice = !isFree && !isLifetime
    ? Math.round(price / (billingCycle === 'YEARLY' ? 365 : billingCycle === 'WEEKLY' ? 7 : 30))
    : null;

  // Seuil de rentabilité du Lifetime face à un abonnement Premium mensuel —
  // calcul réel à partir des prix actuels, pas un chiffre marketing.
  const breakevenMonths = isLifetime && premiumMonthlyPrice
    ? Math.ceil(plan.priceMonthly / premiumMonthlyPrice)
    : null;

  // Halo animé discret sur les plans mis en avant, pour attirer l'oeil sans surcharger
  const glowClass = plan.code === 'PREMIUM' || plan.code === 'LIFETIME' ? 'animate-glow-pulse shine-auto' : '';

  return (
    <div className={`bento-card flex flex-col gap-5 relative ${style.ring} ${glowClass} ${isPremium ? 'md:scale-[1.04] md:z-10' : ''}`}>
      {/* Badge */}
      {style.badgeKey && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-primary-500 text-white shadow-lg shadow-primary-500/30">
            {t(`subscription.${style.badgeKey}`)}
          </span>
        </div>
      )}

      {/* En-tête */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-ink-3 mb-1">{plan.displayName}</p>
        {isFree ? (
          <p className="text-4xl font-display font-bold text-ink-1">{t('subscription.plans.free')}</p>
        ) : (
          <div className="flex items-end gap-1.5 flex-wrap">
            <span className="text-4xl font-display font-bold text-ink-1">
              {new Intl.NumberFormat('fr-FR').format(price)}
            </span>
            <span className="text-ink-3 pb-1 text-sm">
              {' '}FCFA{isLifetime ? ` ${t('subscription.plans.lifetime')}` : `/${unitLabel}`}
            </span>
          </div>
        )}
        {monthly && (
          <p className="text-xs text-primary-400 mt-1">
            ≈ {new Intl.NumberFormat('fr-FR').format(Math.round(plan.priceYearly / 12))} FCFA/mois
          </p>
        )}
        {perDayPrice != null && (
          <p className="text-xs text-ink-4 mt-1">
            {t('subscription.perDay', { price: new Intl.NumberFormat('fr-FR').format(perDayPrice) })}
          </p>
        )}
        {breakevenMonths != null && (
          <p className="text-xs text-amber-400 mt-1 font-medium">
            {t('subscription.lifetimeBreakeven', { months: breakevenMonths })}
          </p>
        )}
      </div>

      {/* Séparateur */}
      <div className="h-px bg-overlay/[0.06]" />

      {/* Ce que tu débloques — comparaison directe avec les limites du plan
          Gratuit, sur le plan Premium uniquement (là où la bascule se joue). */}
      {isPremium && (
        <div className="rounded-xl bg-primary-500/[0.06] border border-primary-500/15 p-3 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary-400">{t('subscription.unlock.title')}</p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-4 line-through decoration-red-500/50">{t('subscription.unlock.predictionsLimit')}</span>
            <span className="font-semibold text-ink-1">{t('subscription.unlock.predictionsUnlimited')}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-4 line-through decoration-red-500/50">{t('subscription.unlock.chatLimit')}</span>
            <span className="font-semibold text-ink-1">{t('subscription.unlock.chatUnlimited')}</span>
          </div>
        </div>
      )}

      {/* Features */}
      <ul className="space-y-2.5 flex-1">
        {(plan.features || []).map((feat, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-ink-3">
            <Check size={15} className="text-primary-400 mt-0.5 shrink-0" />
            <span>{feat}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isCurrentPlan ? (
        <div className="py-2.5 rounded-xl text-center text-sm font-semibold text-ink-4 border border-overlay/[0.08] bg-surface-700/40">
          {t('common.currentPlan')}
        </div>
      ) : isFree ? (
        <div className="py-2.5 rounded-xl text-center text-sm font-semibold text-ink-3 border border-overlay/[0.06]">
          {t('common.defaultPlan')}
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={() => onSelect(plan)}
            disabled={loading}
            className={isLifetime ? style.btn : 'btn-primary w-full'}
          >
            {loading ? t('common.loading') : t('common.startWith', { plan: plan.displayName })}
          </button>
          <p className="text-center text-[11px] text-ink-4">
            {isLifetime ? t('subscription.reassurance.lifetimeOnce') : t('subscription.reassurance.cancelAnytime')}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Modale de confirmation — rappel jeu responsable juste avant paiement ─── */
function ConfirmPaymentModal({ plan, billingCycle, price, currency, formatIn, onCancel, onConfirm, loading }) {
  const { t } = useTranslation();
  const unitLabel = billingCycle === 'YEARLY' ? t('subscription.billing.yearly') : billingCycle === 'WEEKLY' ? t('subscription.billing.weekly') : t('subscription.billing.monthly');
  // Devise de paiement effective (peut différer de la devise détectée si elle
  // n'est pas supportée par CinetPay, cf. payCurrency) → paiement carte via
  // CinetPay, montant affiché directement dans cette devise. Sinon → FCFA
  // via GeniusPay (Mobile Money).
  const converted = currency ? formatIn(price, currency) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl border border-overlay/[0.1] p-5 space-y-4"
        style={{ background: 'var(--color-card)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-ink-1 text-sm">{t('subscription.confirmModal.title')}</h3>

        <div className="bg-overlay/[0.04] rounded-xl px-3 py-2.5 flex items-center justify-between">
          <span className="text-sm text-ink-2">{plan.displayName} — {unitLabel}</span>
          <span className="text-sm font-bold text-ink-1">
            {converted || `${new Intl.NumberFormat('fr-FR').format(price)} FCFA`}
          </span>
        </div>

        {currency && (
          <p className="text-[11px] text-ink-4 -mt-2">{t('subscription.confirmModal.cardPayment')}</p>
        )}

        <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2.5">
          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300 leading-relaxed">{t('subscription.confirmModal.reminder')}</p>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="btn-secondary flex-1 py-2.5 text-sm">
            {t('subscription.confirmModal.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('subscription.confirmModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Subscription() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  usePageMeta(t('subscription.metaTitle'), t('subscription.metaDesc'));
  const { user, userPlan } = useAuth();
  const navigate = useNavigate();
  // null = devise native FCFA (GeniusPay Mobile Money) ; sinon devise étrangère
  // détectée (carte internationale via CinetPay), cf. useCurrency.js.
  const { currency, formatIn } = useCurrency();
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingPlan, setPendingPlan] = useState(null);

  const TRUST_BADGES = [
    { icon: Lock,      label: t('subscription.trust.secure') },
    { icon: RefreshCw, label: t('subscription.trust.cancel') },
    { icon: Shield,    label: t('subscription.trust.noCommit') },
  ];

  // Ce qui différencie fpronix d'un groupe Telegram/WhatsApp gratuit — la
  // vraie raison de payer, pas juste "plus de pronostics". Chaque item
  // pointe vers quelque chose de concret et déjà construit dans l'app.
  const DIFF_ITEMS = [
    { icon: ShieldCheck,    title: t('subscription.diff.proof.title'),  desc: t('subscription.diff.proof.desc'),  link: '/transparence', linkLabel: t('subscription.diff.proof.link') },
    { icon: MessageCircle,  title: t('subscription.diff.reason.title'), desc: t('subscription.diff.reason.desc') },
    { icon: Radio,          title: t('subscription.diff.live.title'),   desc: t('subscription.diff.live.desc') },
    { icon: TrendingUp,     title: t('subscription.diff.tools.title'),  desc: t('subscription.diff.tools.desc') },
    { icon: HeartHandshake, title: t('subscription.diff.serious.title'), desc: t('subscription.diff.serious.desc') },
  ];

  const FAQ_ITEMS = [
    { q: t('subscription.faq.q1'), a: t('subscription.faq.a1') },
    { q: t('subscription.faq.q2'), a: t('subscription.faq.a2') },
    { q: t('subscription.faq.q3'), a: t('subscription.faq.a3') },
    { q: t('subscription.faq.q4'), a: t('subscription.faq.a4') },
    { q: t('subscription.faq.q5'), a: t('subscription.faq.a5') },
  ];

  const { data } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/subscriptions/plans').then((r) => r.data),
    staleTime: Infinity,
  });

  // Bilan public réel (même source que /transparence) — remplace les
  // chiffres marketing arrondis par des chiffres vérifiables, mis à jour
  // automatiquement à chaque match terminé. C'est la preuve, pas juste
  // l'argument.
  const { data: transparencyRes, isLoading: statsLoading } = useQuery({
    queryKey: ['transparency-stats'],
    queryFn: () => api.get('/transparency').then((r) => r.data),
    staleTime: 15 * 60 * 1000,
  });
  const trStats = transparencyRes?.data;

  // Afficher FREE + PREMIUM + LIFETIME
  const allPlans    = data?.data || [];
  const freePlan    = allPlans.find((p) => p.code === 'FREE');
  const premiumPlan = allPlans.find((p) => p.code === 'PREMIUM');
  const lifetimePlan = allPlans.find((p) => p.code === 'LIFETIME');
  const plans = [freePlan, premiumPlan, lifetimePlan].filter(Boolean);

  // Étape 1 : sélection d'un plan → ouvre la modale de confirmation (rappel
  // jeu responsable) au lieu d'initier le paiement directement.
  const handleSelectPlan = (plan) => {
    if (!user) { navigate('/connexion'); return; }
    setError('');
    setPendingPlan(plan);
  };

  // Devises réellement acceptées par CinetPay (carte internationale) — cf.
  // CINETPAY_CURRENCIES côté backend. Une devise détectée hors de cette
  // liste (GBP/BRL/MXN/CAD) retombe sur USD plutôt que de bloquer le paiement.
  const CINETPAY_CURRENCIES = ['EUR', 'USD', 'ZAR'];
  const payCurrency = currency ? (CINETPAY_CURRENCIES.includes(currency) ? currency : 'USD') : null;

  // Étape 2 : confirmation explicite dans la modale → initiation réelle du paiement.
  // Devise FCFA (native) → GeniusPay Mobile Money. Devise étrangère détectée
  // (useCurrency) → CinetPay, carte bancaire facturée dans cette devise.
  const confirmAndPay = async () => {
    if (!pendingPlan) return;
    setError('');
    setLoading(true);
    try {
      const endpoint = payCurrency ? '/payments/cinetpay/init' : '/payments/geniuspay/init';
      const body = payCurrency
        ? { planId: pendingPlan.id, billingCycle, currency: payCurrency }
        : { planId: pendingPlan.id, billingCycle };
      const { data: res } = await api.post(endpoint, body);
      window.location.href = res.data.checkoutUrl;
    } catch (err) {
      setError(err.response?.data?.message || t('subscription.paymentError'));
      setPendingPlan(null);
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
        <h1 className="font-display font-bold text-3xl text-ink-1 leading-tight">
          {t('subscription.title')}<br />
          <span className="text-primary-400">{t('subscription.titleHighlight')}</span>
        </h1>
        <p className="text-ink-4 text-sm max-w-md mx-auto">
          {t('subscription.description')}
        </p>
      </div>

      {/* Différenciation — pourquoi payer plutôt que rester sur un groupe gratuit */}
      <section className="space-y-4">
        <div className="text-center space-y-1.5">
          <h2 className="font-display font-bold text-xl text-ink-1">{t('subscription.diff.title')}</h2>
          <p className="text-ink-4 text-sm max-w-md mx-auto">{t('subscription.diff.subtitle')}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {DIFF_ITEMS.map(({ icon: Icon, title, desc, link, linkLabel }) => (
            <div key={title} className="bento-card flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-500/15 text-primary-400 flex items-center justify-center shrink-0">
                <Icon size={17} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-1">{title}</p>
                <p className="text-xs text-ink-3 mt-1 leading-relaxed">{desc}</p>
                {link && (
                  <Link to={link} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-400 hover:text-primary-300 mt-2">
                    {linkLabel} <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bilan réel et vérifiable — mêmes chiffres que /transparence, pas des
          nombres marketing arrondis. Affiche un tiret discret pendant le
          chargement plutôt qu'une fausse valeur. */}
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-4">
          <div className="bento-card text-center py-4">
            <p className="text-2xl font-display font-bold text-primary-400">
              {statsLoading ? '—' : `${trStats?.ai?.successRate ?? 0}%`}
            </p>
            <p className="text-xs text-ink-3 mt-1">{t('subscription.stats.successRate')}</p>
          </div>
          <div className="bento-card text-center py-4">
            <p className="text-2xl font-display font-bold text-primary-400">
              {statsLoading ? '—' : new Intl.NumberFormat('fr-FR').format((trStats?.ai?.totalPicks ?? 0) + (trStats?.tipsters?.totalPicks ?? 0))}
            </p>
            <p className="text-xs text-ink-3 mt-1">{t('subscription.stats.pronostics')}</p>
          </div>
          <div className="bento-card text-center py-4">
            <p className="text-2xl font-display font-bold text-primary-400">
              {statsLoading ? '—' : (trStats?.ai?.periodDays ?? 90)}
            </p>
            <p className="text-xs text-ink-3 mt-1">{t('subscription.stats.days')}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 text-[11px] text-ink-4">
          <Link to="/transparence" className="inline-flex items-center gap-1 font-semibold text-primary-400 hover:text-primary-300">
            {t('subscription.stats.viewFull')} <ArrowRight size={11} />
          </Link>
          {trStats?.generatedAt && (
            <span>{t('subscription.stats.updatedAt', { date: format(new Date(trStats.generatedAt), 'd MMM, HH:mm', { locale: dateLocale }) })}</span>
          )}
        </div>
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
                : 'text-ink-4 border border-overlay/[0.08] hover:border-overlay/20'
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
            premiumMonthlyPrice={premiumPlan?.priceMonthly}
          />
        ))}
      </div>

      {/* Méthodes de paiement */}
      <div className="bento-card">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={14} className="text-primary-400" />
          <p className="text-sm font-semibold text-ink-2">{t('subscription.payment.title')}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {PAYMENT_METHODS.map(({ name, Icon, bg }) => (
            <div
              key={name}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-overlay/[0.07] ${bg}`}
            >
              <Icon />
              <span className="text-xs text-ink-2 font-medium">{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Badges de confiance */}
      <div className="grid grid-cols-3 gap-3">
        {TRUST_BADGES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl bg-surface-700/30 border border-overlay/[0.05] text-center">
            <div className="w-8 h-8 rounded-full bg-primary-500/15 flex items-center justify-center">
              <Icon size={16} className="text-primary-400" />
            </div>
            <p className="text-xs text-ink-4 font-medium leading-tight">{label}</p>
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
        <h2 className="font-semibold text-ink-1 text-center text-base mb-4">{t('subscription.faq.title')}</h2>
        {FAQ_ITEMS.map(({ q, a }) => (
          <div key={q} className="bento-card">
            <p className="font-medium text-ink-2 text-sm">{q}</p>
            <p className="text-ink-3 text-sm mt-1.5 leading-relaxed">{a}</p>
          </div>
        ))}
      </section>

      {pendingPlan && (
        <ConfirmPaymentModal
          plan={pendingPlan}
          billingCycle={billingCycle}
          price={
            pendingPlan.code === 'LIFETIME'
              ? pendingPlan.priceMonthly
              : billingCycle === 'YEARLY' ? pendingPlan.priceYearly
              : billingCycle === 'WEEKLY' ? pendingPlan.priceWeekly
              : pendingPlan.priceMonthly
          }
          currency={payCurrency}
          formatIn={formatIn}
          loading={loading}
          onCancel={() => setPendingPlan(null)}
          onConfirm={confirmAndPay}
        />
      )}

    </div>
  );
}
