const { AppError } = require('./errorHandler');

// NB : 'PRO' n'existe pas comme plan réel en base (seed.js ne crée que
// FREE/PREMIUM/LIFETIME) — c'est un palier réservé pour une éventuelle offre
// future. getUserPlanCode() ne peut donc jamais retourner 'PRO' aujourd'hui ;
// il est conservé ici et dans les checks .includes(['PREMIUM','PRO',...])
// disséminés dans le code par simple défense en profondeur, pas par bug.
const PLAN_LEVELS = { FREE: 0, PREMIUM: 1, PRO: 1, LIFETIME: 2 };

// L'utilisateur est-il en période d'essai gratuit (7 jours après inscription) ?
function isInTrial(user) {
  return !!(user?.trialEndsAt && new Date(user.trialEndsAt) > new Date());
}

// Retourne le code plan actif de l'utilisateur authentifié
// Pendant l'essai 7 jours, l'utilisateur est traité comme PREMIUM
// Un abonnement n'est valable que tant que endDate n'est pas dépassée. Le cron
// checkSubscriptions ne passe les abonnements en EXPIRED qu'une fois par jour
// (8h) : sans ce contrôle, un Pass Jour 24h acheté à 9h restait actif jusqu'au
// lendemain 8h suivant l'échéance (~47h), et un abonnement hebdo/mensuel
// jusqu'à 24h de trop. endDate null = pas d'échéance (plan FREE).
function isSubscriptionLive(sub) {
  if (!sub || sub.status !== 'ACTIVE') return false;
  return !sub.endDate || new Date(sub.endDate) > new Date();
}

function getUserPlanCode(user) {
  const sub = user.subscription;
  const paidPlan = (isSubscriptionLive(sub) && sub.plan?.code) || 'FREE';
  if (paidPlan !== 'FREE') return paidPlan;
  if (isInTrial(user)) return 'PREMIUM'; // essai actif → accès premium
  return 'FREE';
}

// Middleware : exige un plan minimum
function requirePlan(minPlan) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentification requise', 401, 'UNAUTHORIZED'));
    }

    const userPlan = getUserPlanCode(req.user);
    const userLevel = PLAN_LEVELS[userPlan] ?? 0;
    const requiredLevel = PLAN_LEVELS[minPlan] ?? 0;

    if (userLevel < requiredLevel) {
      return next(new AppError(
        `Cette fonctionnalité nécessite un abonnement ${minPlan}`,
        403,
        'SUBSCRIPTION_REQUIRED'
      ));
    }

    req.userPlan = userPlan;
    next();
  };
}

// Middleware : attache le plan sans bloquer (pour adapter la réponse selon le plan)
function attachPlan(req, res, next) {
  if (req.user) {
    req.userPlan = getUserPlanCode(req.user);
  } else {
    req.userPlan = 'FREE';
  }
  next();
}

module.exports = { requirePlan, attachPlan, getUserPlanCode, isInTrial, isSubscriptionLive };
