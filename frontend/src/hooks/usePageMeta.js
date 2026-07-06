import { useEffect } from 'react';

const DEFAULT_TITLE       = 'fpronix — Stats football & pronostics';
const DEFAULT_DESCRIPTION = 'Statistiques football, pronostics et analyse des matchs en direct. Suivez vos tipsters, comparez les cotes et découvrez les value bets.';
const DEFAULT_IMAGE       = 'https://fpronix.com/og-cover.png';

function setMeta(attr, key, value) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

/**
 * Applique <title> + balises meta dynamiquement.
 *
 * @param {string|null}  title       — titre de la page (sans "| fpronix")
 * @param {string|null}  description — meta description
 * @param {object}       og          — surcharges Open Graph { title, description, image, type }
 */
export function usePageMeta(title, description, og = {}) {
  const fullTitle = title ? `${title} | fpronix` : DEFAULT_TITLE;
  const desc      = description || DEFAULT_DESCRIPTION;

  useEffect(() => {
    document.title = fullTitle;

    setMeta('name',     'description',   desc);
    setMeta('property', 'og:title',      og.title       || fullTitle);
    setMeta('property', 'og:description', og.description || desc);
    setMeta('property', 'og:image',      og.image       || DEFAULT_IMAGE);
    setMeta('property', 'og:type',       og.type        || 'website');
    setMeta('name',     'twitter:card',  'summary_large_image');
    setMeta('name',     'twitter:title', og.title       || fullTitle);
    setMeta('name',     'twitter:description', og.description || desc);

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [fullTitle, desc]); // eslint-disable-line react-hooks/exhaustive-deps
}
