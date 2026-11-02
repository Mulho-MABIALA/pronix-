import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePageMeta } from '../hooks/usePageMeta';

// Page publique (sans connexion) exigée par Google Play : explique comment
// supprimer son compte et ce qui est supprimé / conservé. URL à déclarer dans
// la Play Console : https://fpronix.com/suppression-compte
export default function SuppressionCompte() {
  const { t } = useTranslation();
  usePageMeta(t('deleteAccountPage.title'), t('deleteAccountPage.intro'));
  const linkClass = 'text-primary-400 underline';
  const deleted = t('deleteAccountPage.deletedItems', { returnObjects: true });
  const kept = t('deleteAccountPage.keptItems', { returnObjects: true });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-1">{t('deleteAccountPage.title')}</h1>
        <p className="text-sm text-ink-3 mt-2 leading-relaxed">{t('deleteAccountPage.intro')}</p>
      </div>

      <Section title={t('deleteAccountPage.option1Title')}>
        <ol className="list-decimal pl-5 space-y-1">
          <li>{t('deleteAccountPage.option1Step1')}</li>
          <li>{t('deleteAccountPage.option1Step2')}</li>
          <li>{t('deleteAccountPage.option1Step3')}</li>
        </ol>
        <p>
          <Link to="/profil" className={linkClass}>{t('deleteAccountPage.option1Link')}</Link>
        </p>
      </Section>

      <Section title={t('deleteAccountPage.option2Title')}>
        <p>
          {t('deleteAccountPage.option2Body')}{' '}
          <a href="mailto:support@fpronix.com?subject=Suppression%20de%20compte" className={linkClass}>support@fpronix.com</a>
        </p>
        <p>{t('deleteAccountPage.option2Delay')}</p>
      </Section>

      <Section title={t('deleteAccountPage.deletedTitle')}>
        <ul className="list-disc pl-5 space-y-1">
          {Array.isArray(deleted) && deleted.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </Section>

      <Section title={t('deleteAccountPage.keptTitle')}>
        <ul className="list-disc pl-5 space-y-1">
          {Array.isArray(kept) && kept.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </Section>

      <p className="text-xs text-ink-4">
        {t('deleteAccountPage.subscriptionNote')}{' '}
        <Link to="/politique-confidentialite" className={linkClass}>{t('deleteAccountPage.privacyLink')}</Link>
      </p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold text-ink-1 text-base">{title}</h2>
      <div className="text-sm text-ink-3 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}
