import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../hooks/useCurrency';

export default function PlanCard({ plan, isCurrentPlan, onSelect, loading, billingCycle = 'MONTHLY' }) {
  const { t, i18n } = useTranslation();
  const { formatConverted } = useCurrency();
  const isFree = plan.code === 'FREE';
  const isPremium = plan.code === 'PREMIUM';
  const isYearly = billingCycle === 'YEARLY';
  const displayPrice = isYearly ? plan.priceYearly : plan.priceMonthly;
  const monthlyEquiv = isYearly ? Math.round(plan.priceYearly / 12) : null;
  const fmt = (n) => new Intl.NumberFormat(i18n.language).format(n);
  const convertedPrice = !isFree ? formatConverted(displayPrice) : null;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`bento-card flex flex-col gap-4 relative ${
        isPremium ? 'border-primary-500 ring-1 ring-primary-500/30' : ''
      } ${isCurrentPlan ? 'border-primary-400' : ''}`}
    >
      {isPremium && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="badge bg-primary-500 text-white text-xs px-3 py-1">{t('planCard.recommended')}</span>
        </div>
      )}

      {/* En-tête */}
      <div>
        <h3 className="font-display font-bold text-xl text-ink-1">{plan.displayName}</h3>
        <div className="mt-2 flex items-end gap-1 flex-wrap">
          {isFree ? (
            <span className="text-3xl font-display font-bold text-ink-1">{t('planCard.free')}</span>
          ) : (
            <>
              <span className="text-3xl font-display font-bold text-ink-1">
                {fmt(displayPrice)}
              </span>
              <span className="text-ink-3 pb-1"> FCFA{isYearly ? t('planCard.perYear') : t('planCard.perMonth')}</span>
              {monthlyEquiv && (
                <span className="text-xs text-primary-400 pb-1 ml-1">{t('planCard.monthlyEquiv', { amount: fmt(monthlyEquiv) })}</span>
              )}
            </>
          )}
        </div>
        {convertedPrice && (
          <p className="text-xs text-ink-4 mt-1">≈ {convertedPrice}</p>
        )}
      </div>

      {/* Fonctionnalités */}
      <ul className="space-y-2 flex-1" aria-label={t('planCard.featuresLabel', { plan: plan.displayName })}>
        {(plan.features || []).map((feat, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-ink-3">
            <Check size={16} className="text-primary-400 mt-0.5 shrink-0" aria-hidden="true" />
            {feat}
          </li>
        ))}
      </ul>

      {/* Bouton */}
      {isCurrentPlan ? (
        <div className="btn-secondary opacity-70 cursor-default justify-center">
          {t('planCard.currentPlan')}
        </div>
      ) : isFree ? (
        <div className="btn-secondary opacity-50 cursor-default justify-center">
          {t('planCard.defaultPlan')}
        </div>
      ) : (
        <button
          onClick={() => onSelect(plan)}
          disabled={loading}
          className="btn-primary w-full"
          aria-label={t('planCard.subscribeLabel', { plan: plan.displayName })}
        >
          {loading ? t('planCard.loading') : t('planCard.choosePlan', { plan: plan.displayName })}
        </button>
      )}
    </motion.div>
  );
}
