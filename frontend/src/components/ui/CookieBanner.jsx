import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Cookie } from 'lucide-react';

// Bandeau cookies — informatif : fpronix n'utilise que des cookies techniques
// strictement nécessaires (connexion, cf. backend/src/config/cookies.js) et
// aucun tracker publicitaire, donc pas d'obligation légale de consentement
// RGPD/CNIL. Affiché quand même par transparence, avec un seul bouton
// (rien à "refuser" puisqu'il n'y a pas de cookie non-essentiel).
const CONSENT_KEY = 'fpronix_cookie_consent';

export default function CookieBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-20 md:bottom-0 left-0 right-0 z-50 border-t border-overlay/[0.10] bg-surface-800 px-4 py-3.5 md:px-6"
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <Cookie size={18} className="text-primary-400 shrink-0 mt-0.5" />
          <p className="text-xs text-ink-3 leading-relaxed">
            {t('cookieBanner.message')}{' '}
            <a href="/politique-confidentialite" className="text-primary-400 hover:text-primary-300 font-medium underline">
              {t('cookieBanner.learnMore')}
            </a>
          </p>
        </div>
        <button onClick={accept} className="btn-primary text-xs px-4 py-2 h-auto shrink-0 w-full md:w-auto">
          {t('cookieBanner.accept')}
        </button>
      </div>
    </div>
  );
}
