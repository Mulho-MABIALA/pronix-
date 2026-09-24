import { useTranslation } from 'react-i18next';

export default function CGV() {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-1">{t('cgv.title')}</h1>
        <p className="text-sm text-ink-3 mt-1">{t('cgv.lastUpdated')}</p>
      </div>

      <Section title={t('cgv.sections.s1.title')}>
        <p>{t('cgv.sections.s1.body')}</p>
      </Section>

      <Section title={t('cgv.sections.s2.title')}>
        <p>{t('cgv.sections.s2.body1')}</p>
        <p>{t('cgv.sections.s2.body2')}</p>
      </Section>

      <Section title={t('cgv.sections.s3.title')}>
        <p>{t('cgv.sections.s3.body')}</p>
      </Section>

      <Section title={t('cgv.sections.s4.title')}>
        <p>{t('cgv.sections.s4.body')}</p>
      </Section>

      <Section title={t('cgv.sections.s5.title')}>
        <p>{t('cgv.sections.s5.body')}</p>
      </Section>

      <Section title={t('cgv.sections.s6.title')}>
        <p>{t('cgv.sections.s6.body1')}</p>
        <p>{t('cgv.sections.s6.body2')}</p>
      </Section>

      <Section title={t('cgv.sections.s7.title')}>
        <p>
          {t('cgv.sections.s7.body')}
        </p>
      </Section>

      <Section title={t('cgv.sections.s8.title')}>
        <p>{t('cgv.sections.s8.body')}</p>
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
