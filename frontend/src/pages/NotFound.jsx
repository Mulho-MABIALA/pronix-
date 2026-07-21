import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <p className="text-8xl font-display font-bold text-primary-400">404</p>
      <h1 className="mt-4 text-xl font-semibold text-gray-100">{t('errors.notFound')}</h1>
      <p className="mt-2 text-gray-500 text-sm">
        {t('errors.notFoundDesc')}
      </p>
      <div className="flex items-center justify-center gap-3 mt-8">
        <Link to="/" className="btn-primary">{t('errors.backHome')}</Link>
        <Link to="/matchs" className="btn-secondary">{t('notFound.viewMatches')}</Link>
      </div>
    </div>
  );
}
