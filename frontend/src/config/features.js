// ─── Interrupteurs de fonctionnalités ─────────────────────────────────────────
// Tipsters (communauté, publication de pronostics, abonnements payants aux
// tipsters, follows, commentaires) : masqués au lancement. Code et données
// conservés — pour réactiver : VITE_FEATURE_TIPSTERS=true dans frontend/.env
// (au build) ET FEATURE_TIPSTERS=true dans backend/.env.
export const TIPSTERS_ENABLED = import.meta.env.VITE_FEATURE_TIPSTERS === 'true';

// Compte du tipster IA officiel (services/aiTipsterService.js côté backend) —
// ses pronostics restent visibles même quand les tipsters sont masqués.
export const AI_TIPSTER_USERNAME = 'fpronix_ai';

// Paiement par carte bancaire (devise étrangère, via PayTech) : désactivé tant
// qu'aucun prestataire carte n'est validé en production. Les visiteurs hors
// zone FCFA paient alors en FCFA par Mobile Money (SenePay), avec un message
// clair. Pour réactiver : VITE_FEATURE_CARD_PAYMENTS=true (frontend) ET
// FEATURE_CARD_PAYMENTS=true (backend).
export const CARD_PAYMENTS_ENABLED = import.meta.env.VITE_FEATURE_CARD_PAYMENTS === 'true';
