// Fine wrapper autour de window.gtag (Google Analytics 4, chargé en global
// dans index.html via le script gtag.js). Best-effort partout : si gtag
// n'est pas encore chargé (bloqueur de pub, réseau lent, VITE_GA_MEASUREMENT_ID
// vide en dev) les appels sont silencieusement ignorés plutôt que de planter
// l'app — l'analytics ne doit jamais être un point de défaillance produit.

function safeGtag(...args) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  try {
    window.gtag(...args);
  } catch {
    // jamais bloquant
  }
}

// Pageview manuel — nécessaire car gtag.js ne suit que le chargement initial
// (index.html) ; les navigations suivantes sont du routing client (SPA) et
// ne déclenchent pas de nouveau chargement de page. L'attribution de session
// (utm_source/medium/campaign) reste liée à la première entrée, donc ceci
// sert surtout à voir quelles pages sont vues dans le rapport GA4.
export function trackPageview(path) {
  safeGtag('event', 'page_view', { page_path: path });
}

// Événement générique (conversions incluses : sign_up, purchase, etc.)
export function trackEvent(name, params = {}) {
  safeGtag('event', name, params);
}
