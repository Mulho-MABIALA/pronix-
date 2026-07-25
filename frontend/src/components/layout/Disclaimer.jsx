import { useTranslation } from 'react-i18next';

export default function Disclaimer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-surface-800 border-t border-surface-700 py-4 px-4 hidden md:block">
      <div className="max-w-6xl mx-auto space-y-2">
        <p className="disclaimer text-center">
          {t('disclaimer.intro')}{' '}
          <strong>{t('disclaimer.warning')}</strong>{' '}
          {t('disclaimer.playResponsibly')}
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-gray-600 flex-wrap">
          <a href="/transparence" className="hover:text-gray-400 transition-colors">{t('disclaimer.transparencyLink')}</a>
          <span aria-hidden="true">·</span>
          <a href="/cgu" className="hover:text-gray-400 transition-colors">{t('disclaimer.termsLink')}</a>
          <span aria-hidden="true">·</span>
          <a href="/politique-confidentialite" className="hover:text-gray-400 transition-colors">{t('disclaimer.privacyLink')}</a>
          <span aria-hidden="true">·</span>
          <a href="/faq" className="hover:text-gray-400 transition-colors">{t('disclaimer.faqLink')}</a>
          <span aria-hidden="true">·</span>
          <a href="mailto:contact@pronix.sn" className="hover:text-gray-400 transition-colors">{t('disclaimer.contactLink')}</a>
        </div>
      </div>
    </footer>
  );
}
