import { Link } from 'react-router-dom';
import { Clock, Crown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Bannière de fin d'essai gratuit.
 * S'affiche à partir du 5e jour (≤ 2 jours restants) pour les utilisateurs
 * en essai sans abonnement payant, et pousse vers /abonnement.
 */
export default function TrialBanner() {
  const { user, hasPaidPlan, trialActive, trialDaysLeft } = useAuth();

  // Rien à afficher : pas connecté, déjà payant, pas en essai, ou essai encore loin de la fin
  if (!user || hasPaidPlan || !trialActive || trialDaysLeft > 2) return null;

  const message = trialDaysLeft <= 1
    ? 'Dernier jour de ton essai gratuit !'
    : `Ton essai gratuit se termine dans ${trialDaysLeft} jours`;

  return (
    <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-b border-amber-500/20">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Clock size={15} className="text-amber-400 shrink-0" />
          <p className="text-xs sm:text-sm text-amber-200 truncate">
            <span className="font-semibold">{message}</span>
            <span className="hidden sm:inline text-amber-200/70"> — garde l'accès aux pronos illimités, stats et analyses IA</span>
          </p>
        </div>
        <Link
          to="/abonnement"
          className="flex items-center gap-1.5 shrink-0 bg-amber-500 hover:bg-amber-400 text-surface-900 text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors"
        >
          <Crown size={12} />
          Passer Premium
        </Link>
      </div>
    </div>
  );
}
