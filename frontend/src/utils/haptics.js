// Retour haptique léger sur les actions clés (mobile) — API Vibration
// standard, aucune dépendance. iOS Safari ne supporte pas navigator.vibrate
// (ni en PWA installée) : l'appel échoue silencieusement (retourne false),
// donc aucun risque d'erreur ni de coût de perf sur ces appareils — c'est
// un bonus Android/desktop-compatible sans dégrader l'expérience iOS.
function fire(pattern) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Certains navigateurs lèvent si appelé hors d'un geste utilisateur — sans impact.
  }
}

/** Confirmation courte et discrète — action réussie (ticket sauvegardé, favori ajouté...). */
export function hapticSuccess() {
  fire(15);
}

/** Confirmation plus marquée — moment fort (ticket généré, paiement confirmé). */
export function hapticImpact() {
  fire([20, 40, 20]);
}

/** Signal d'erreur/refus — quota épuisé, action bloquée. */
export function hapticError() {
  fire([30, 30, 30]);
}
