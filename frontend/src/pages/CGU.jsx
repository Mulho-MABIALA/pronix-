import { useTranslation } from 'react-i18next';

export default function CGU() {
  const { t } = useTranslation();
  const s3Items = t('cgu.sections.s3.items', { returnObjects: true });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-50">{t('cgu.title')}</h1>
        <p className="text-sm text-gray-300 mt-1">{t('cgu.lastUpdated')}</p>
      </div>

      <Section title={t('cgu.sections.s1.title')}>
        <p>{t('cgu.sections.s1.body')}</p>
      </Section>

      <Section title={t('cgu.sections.s2.title')}>
        <p>{t('cgu.sections.s2.body')}</p>
      </Section>

      <Section title={t('cgu.sections.s3.title')}>
        <p>{t('cgu.sections.s3.intro')}</p>
        <ul>
          {Array.isArray(s3Items) && s3Items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
        <p className="mt-3 font-medium text-amber-400">
          {t('cgu.sections.s3.important')}
        </p>
      </Section>

      <Section title={t('cgu.sections.s4.title')}>
        <p>{t('cgu.sections.s4.body1')}</p>
        <p>{t('cgu.sections.s4.body2')}</p>
      </Section>

      <Section title={t('cgu.sections.s5.title')}>
        <p>{t('cgu.sections.s5.body1')}</p>
        <p>{t('cgu.sections.s5.body2')}</p>
      </Section>

      <Section title={t('cgu.sections.s6.title')}>
        <p>{t('cgu.sections.s6.body1')}</p>
        <p>{t('cgu.sections.s6.body2')}</p>
      </Section>

      <Section title={t('cgu.sections.s7.title')}>
        <p>{t('cgu.sections.s7.body1')}</p>
        <p>{t('cgu.sections.s7.body2')}</p>
      </Section>

      <Section title={t('cgu.sections.s8.title')}>
        <p>{t('cgu.sections.s8.body')}</p>
      </Section>

      <Section title={t('cgu.sections.s9.title')}>
        <p>
          {t('cgu.sections.s9.bodyPrefix')}{' '}
          <a href="/politique-confidentialite" className="text-primary-400 underline">
            {t('cgu.sections.s9.linkText')}
          </a>.
        </p>
      </Section>

      <Section title={t('cgu.sections.s10.title')}>
        <p>{t('cgu.sections.s10.body')}</p>
      </Section>

      <Section title={t('cgu.sections.s11.title')}>
        <p>
          {t('cgu.sections.s11.body')}
          <a href="mailto:support@fpronix.com" className="text-primary-400 underline ml-1">support@fpronix.com</a>
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-gray-100 text-base">{title}</h2>
      <div className="text-sm text-gray-400 space-y-2 leading-relaxed">
        {children}
      </div>
    </section>
  );
}
