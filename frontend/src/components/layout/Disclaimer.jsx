import { useTranslation } from 'react-i18next';

// Ouvre le chat support flottant (déjà présent partout dans l'app) au lieu
// d'un mailto: qui ne déclenche rien si aucun client mail n'est configuré.
function openSupportChat(e) {
  e.preventDefault();
  window.dispatchEvent(new Event('fpronix:open-support'));
}

// Bloc légal — s'affiche uniquement en bas de la page Profil (pas globalement).
export default function Disclaimer() {
  const { t } = useTranslation();
  const linkClass = 'text-primary-400 hover:text-primary-300 font-medium transition-colors';
  return (
    <div className="pt-2 space-y-2 border-t border-surface-700">
      <p className="disclaimer text-center pt-3">
        {t('disclaimer.intro')}{' '}
        <strong>{t('disclaimer.warning')}</strong>{' '}
        {t('disclaimer.playResponsibly')}
      </p>
      <div className="flex items-center justify-center gap-x-3 gap-y-1.5 text-xs flex-wrap pb-1">
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
    </div>
  );
}
