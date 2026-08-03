// ─── Onboarding progressif ──────────────────────────────────────────────────
// Au lieu de balancer toutes les fonctionnalités avancées (Coach IA,
// Comparateur...) dès l'inscription, on les révèle une seule fois au bon
// moment d'usage (ex: après avoir sauvegardé plusieurs tickets, après avoir
// consulté plusieurs matchs). Stocké en localStorage, pas besoin de compte.
const KEY = 'fpronix_feature_hints_seen';

function getSeen() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Un hint déjà vu/fermé une fois ne doit plus jamais réapparaître. */
export function hasSeenHint(hintKey) {
  return getSeen().includes(hintKey);
}

export function markHintSeen(hintKey) {
  try {
    const seen = getSeen();
    if (!seen.includes(hintKey)) {
      localStorage.setItem(KEY, JSON.stringify([...seen, hintKey]));
    }
  } catch {
    // localStorage indisponible — on ignore silencieusement
  }
}

// Petit compteur d'usage générique (ex: nombre de tickets sauvegardés) — sert
// à déclencher un hint après N actions plutôt qu'à la première occasion.
export function incrementUsageCounter(counterKey) {
  try {
    const current = parseInt(localStorage.getItem(`fpronix_usage_${counterKey}`) || '0', 10);
    const next = current + 1;
    localStorage.setItem(`fpronix_usage_${counterKey}`, String(next));
    return next;
  } catch {
    return 0;
  }
}

export function getUsageCounter(counterKey) {
  try {
    return parseInt(localStorage.getItem(`fpronix_usage_${counterKey}`) || '0', 10);
  } catch {
    return 0;
  }
}
