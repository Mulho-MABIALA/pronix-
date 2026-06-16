import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PlanCard({ plan, billingCycle, isCurrentPlan, onSelect, loading }) {
  const price = billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;
  const monthlyEquiv = billingCycle === 'YEARLY' && plan.priceMonthly > 0
    ? Math.round(plan.priceYearly / 12)
    : null;
  const isFree = plan.code === 'FREE';
  const isPro = plan.code === 'PRO';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`bento-card flex flex-col gap-4 relative ${
        isPro ? 'border-primary-500 ring-1 ring-primary-500/30' : ''
      } ${isCurrentPlan ? 'border-primary-400' : ''}`}
    >
      {isPro && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="badge bg-primary-500 text-white text-xs px-3 py-1">Recommandé</span>
        </div>
      )}

      {/* En-tête */}
      <div>
        <h3 className="font-display font-bold text-xl text-gray-100">{plan.displayName}</h3>
        <div className="mt-2 flex items-end gap-1">
          {isFree ? (
            <span className="text-3xl font-display font-bold text-gray-100">Gratuit</span>
          ) : (
            <>
              <span className="text-3xl font-display font-bold text-gray-100">
                {price.toLocaleString('fr-FR')} FCFA
              </span>
              <span className="text-gray-500 pb-1">/{billingCycle === 'YEARLY' ? 'an' : 'mois'}</span>
            </>
          )}
        </div>
        {monthlyEquiv && (
          <p className="text-xs text-primary-400 mt-1">
            Soit {monthlyEquiv.toLocaleString('fr-FR')} FCFA/mois — économisez 17%
          </p>
        )}
      </div>

      {/* Fonctionnalités */}
      <ul className="space-y-2 flex-1" aria-label={`Fonctionnalités du plan ${plan.displayName}`}>
        {(plan.features || []).map((feat, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
            <Check size={16} className="text-primary-400 mt-0.5 shrink-0" aria-hidden="true" />
            {feat}
          </li>
        ))}
      </ul>

      {/* Bouton */}
      {isCurrentPlan ? (
        <div className="btn-secondary opacity-70 cursor-default justify-center">
          Plan actuel
        </div>
      ) : isFree ? (
        <div className="btn-secondary opacity-50 cursor-default justify-center">
          Plan par défaut
        </div>
      ) : (
        <button
          onClick={() => onSelect(plan)}
          disabled={loading}
          className="btn-primary w-full"
          aria-label={`S'abonner au plan ${plan.displayName}`}
        >
          {loading ? 'Chargement…' : `Choisir ${plan.displayName}`}
        </button>
      )}
    </motion.div>
  );
}
