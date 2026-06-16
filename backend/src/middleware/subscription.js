const { AppError } = require('./errorHandler');

// Niveaux d'accès : FREE < PREMIUM < PRO
const PLAN_LEVELS = { FREE: 0, PREMIUM: 1, PRO: 2 };

// Retourne le code plan actif de l'utilisateur authentifié
function getUserPlanCode(user) {
  const sub = user.subscription;
  if (!sub || sub.status !== 'ACTIVE') return 'FREE';
  return sub.plan?.code || 'FREE';
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

module.exports = { requirePlan, attachPlan, getUserPlanCode };
