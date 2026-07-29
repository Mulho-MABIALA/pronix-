import { useTranslation } from 'react-i18next';

// Ouvre le chat support flottant (déjà présent partout dans l'app) au lieu
// d'un mailto: qui ne déclenche rien si aucun client mail n'est configuré.
function openSupportChat(e) {
  e.preventDefault();
  window.dispatchEvent(new Event('fpronix:open-support'));
}

function FooterLinks() {
  const { t } = useTranslation();
  const linkClass = 'text-primary-400 hover:text-primary-300 font-medium transition-colors';
  return (
    <>
      <p className="disclaimer text-center">
        {t('disclaimer.intro')}{' '}
        <strong>{t('disclaimer.warning')}</strong>{' '}
        {t('disclaimer.playResponsibly')}
      </p>
      <div className="flex items-center justify-center gap-x-3 gap-y-1.5 text-xs flex-wrap">
        <a href="/transparence" className={linkClass}>{t('disclaimer.transparencyLink')}</a>
        <span className="text-gray-400" aria-hidden="true">·</span>
        <a href="/cgu" className={linkClass}>{t('disclaimer.termsLink')}</a>
        <span className="text-gray-400" aria-hidden="true">·</span>
        <a href="/politique-confidentialite" className={linkClass}>{t('disclaimer.privacyLink')}</a>
        <span className="text-gray-400" aria-hidden="true">·</span>
        <a href="/faq" className={linkClass}>{t('disclaimer.faqLink')}</a>
        <span className="text-gray-400" aria-hidden="true">·</span>
        <button type="button" onClick={openSupportChat} className={linkClass}>{t('disclaimer.contactLink')}</button>
      </div>
    </>
  );
}

/**
 * variant="global" (défaut) — bandeau pleine largeur, visible uniquement sur
 * PC (comme avant), affiché sur toutes les pages via Layout.
 * variant="inline" — bloc simple, visible uniquement sur mobile, à intégrer
 * en bas d'une page précise (page Profil) puisque le bandeau global est
 * masqué sur mobile.
 */
export default function Disclaimer({ variant = 'global' }) {
  if (variant === 'inline') {
    return (
      <div className="md:hidden pt-3 pb-1 space-y-2 border-t border-surface-700">
        <FooterLinks />
      </div>
    );
  }
  return (
    <footer className="hidden md:block bg-surface-800 border-t border-surface-700 py-4 px-4">
      <div className="max-w-6xl mx-auto space-y-2">
        <FooterLinks />
      </div>
    </footer>
  );
}
