import { useTranslation } from 'react-i18next';

export default function PolitiqueConfidentialite() {
  const { t } = useTranslation();
  const s2Items = t('privacy.sections.s2.items', { returnObjects: true });
  const s3Items = t('privacy.sections.s3.items', { returnObjects: true });
  const s5Items = t('privacy.sections.s5.items', { returnObjects: true });
  const s7Items = t('privacy.sections.s7.items', { returnObjects: true });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-50">{t('privacy.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('privacy.lastUpdated')}</p>
      </div>

      <Section title={t('privacy.sections.s1.title')}>
        <p>
          {t('privacy.sections.s1.body')} <a href="mailto:support@fpronix.com" className="text-primary-400 underline">support@fpronix.com</a>
        </p>
      </Section>

      <Section title={t('privacy.sections.s2.title')}>
        <p>{t('privacy.sections.s2.intro')}</p>
        <ul>
          {Array.isArray(s2Items) && s2Items.map((item, i) => (
            <li key={i}><strong className="text-gray-300">{item.label} </strong>{item.text}</li>
          ))}
        </ul>
      </Section>

      <Section title={t('privacy.sections.s3.title')}>
        <p>{t('privacy.sections.s3.intro')}</p>
        <ul>
          {Array.isArray(s3Items) && s3Items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </Section>

      <Section title={t('privacy.sections.s4.title')}>
        <p>
          {t('privacy.sections.s4.body')}
        </p>
      </Section>

      <Section title={t('privacy.sections.s5.title')}>
        <p>
          {t('privacy.sections.s5.intro')}
        </p>
        <ul>
          {Array.isArray(s5Items) && s5Items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </Section>

      <Section title={t('privacy.sections.s6.title')}>
        <p>
          {t('privacy.sections.s6.body')}
        </p>
      </Section>

      <Section title={t('privacy.sections.s7.title')}>
        <p>
          {t('privacy.sections.s7.intro')}
        </p>
        <ul>
          {Array.isArray(s7Items) && s7Items.map((item, i) => (
            <li key={i}><strong className="text-gray-300">{item.label} </strong>{item.text}</li>
          ))}
        </ul>
        <p>
          {t('privacy.sections.s7.contactPrefix')}{' '}
          <a href="mailto:support@fpronix.com" className="text-primary-400 underline">support@fpronix.com</a>.
          {' '}{t('privacy.sections.s7.responseTime')}
        </p>
      </Section>

      <Section title={t('privacy.sections.s8.title')}>
        <p>
          {t('privacy.sections.s8.body')}
        </p>
      </Section>

      <Section title={t('privacy.sections.s9.title')}>
        <p>
          {t('privacy.sections.s9.body')}
        </p>
      </Section>

      <Section title={t('privacy.sections.s10.title')}>
        <p>
          {t('privacy.sections.s10.body')}
        </p>
      </Section>

      <Section title={t('privacy.sections.s11.title')}>
        <p>
          {t('privacy.sections.s11.body')} <a href="mailto:support@fpronix.com" className="text-primary-400 underline">support@fpronix.com</a>
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-gray-100 text-base">{title}</h2>
      <div className="text-sm text-gray-400 space-y-2 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  );
}
