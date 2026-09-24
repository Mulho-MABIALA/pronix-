import { useTranslation } from 'react-i18next';

export default function MentionsLegales() {
  const { t } = useTranslation();
  const linkClass = 'text-primary-400 underline';

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-1">{t('mentionsLegales.title')}</h1>
        <p className="text-sm text-ink-3 mt-1">{t('mentionsLegales.lastUpdated')}</p>
      </div>

      <Section title={t('mentionsLegales.sections.s1.title')}>
        <p>{t('mentionsLegales.sections.s1.body')}</p>
        <p>
          {t('mentionsLegales.sections.s1.contact')}
          <a href="mailto:support@fpronix.com" className={linkClass}>support@fpronix.com</a>
        </p>
      </Section>

      <Section title={t('mentionsLegales.sections.s2.title')}>
        <p>{t('mentionsLegales.sections.s2.body')}</p>
      </Section>

      <Section title={t('mentionsLegales.sections.s3.title')}>
        <p>{t('mentionsLegales.sections.s3.body')}</p>
      </Section>

      <Section title={t('mentionsLegales.sections.s4.title')}>
        <p>{t('mentionsLegales.sections.s4.body')}</p>
      </Section>

      <Section title={t('mentionsLegales.sections.s5.title')}>
        <p>{t('mentionsLegales.sections.s5.body')}</p>
      </Section>

      <Section title={t('mentionsLegales.sections.s6.title')}>
        <p>{t('mentionsLegales.sections.s6.body')}</p>
      </Section>

      <Section title={t('mentionsLegales.sections.s7.title')}>
        <p>
          {t('mentionsLegales.sections.s7.body')}{' '}
          <a href="/cgu" className={linkClass}>{t('disclaimer.termsLink')}</a>,{' '}
          <a href="/cgv" className={linkClass}>{t('disclaimer.salesTermsLink')}</a>,{' '}
          <a href="/politique-confidentialite" className={linkClass}>{t('disclaimer.privacyLink')}</a>.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-ink-1 text-base">{title}</h2>
      <div className="text-sm text-ink-4 space-y-2 leading-relaxed">
        {children}
      </div>
    </section>
  );
}
