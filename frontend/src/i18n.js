import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './locales/fr.json';
import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      es: { translation: es },
      pt: { translation: pt },
    },
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en', 'es', 'pt'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'fpronix_lang',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // React gère déjà le XSS
    },
  });

export default i18n;
