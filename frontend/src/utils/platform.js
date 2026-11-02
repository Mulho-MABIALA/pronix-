// ─── App Android (Play Store) ────────────────────────────────────────────────
// L'app Play Store est le site affiché par Chrome en plein écran (TWA). Google
// interdit de vendre un abonnement numérique dans une app Android autrement
// qu'avec son propre système de paiement (pas d'exception au Sénégal) : dans
// l'app, on n'affiche donc ni prix ni bouton d'achat, ni lien vers le site
// pour payer. Les abonnés existants se connectent et retrouvent leur accès.
//
// Détection :
//  - lancement depuis l'icône : start_url de l'app = /?source=twa ;
//  - ouverture via un lien (deep link) : Chrome renseigne document.referrer
//    = android-app://com.fpronix.app.
// Mémorisé en sessionStorage (propre à l'onglet de l'app) et SURTOUT PAS en
// localStorage : l'app partage le stockage de Chrome, le site ouvert ensuite
// dans le navigateur se croirait dans l'app et masquerait l'achat.
export const ANDROID_PACKAGE = 'com.fpronix.app';
const KEY = 'fpronix:android-app';

export function detectAndroidApp() {
  try {
    const fromReferrer = (document.referrer || '').startsWith(`android-app://${ANDROID_PACKAGE}`);
    const fromStartUrl = new URLSearchParams(window.location.search).get('source') === 'twa';
    if (fromReferrer || fromStartUrl) sessionStorage.setItem(KEY, '1');
  } catch {
    /* stockage indisponible : on reste en mode site */
  }
}

export function isAndroidApp() {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
