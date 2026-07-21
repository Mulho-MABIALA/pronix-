import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const FAQ_STRUCTURE = [
  { id: 'general', items: ['whatIsFpronix', 'sportsBetting', 'whoCanUse'] },
  { id: 'account', items: ['createAccount', 'freeVsPremium', 'howToPay', 'cancelSub', 'forgotPassword'] },
  { id: 'matches', items: ['dataSource', 'noStats', 'leaguesAvailable'] },
  { id: 'tipsters', items: ['howToPublish', 'rankingWorks', 'aiAnalysis', 'reliablePicks', 'reportAbuse'] },
  { id: 'notifications', items: ['enableNotifs', 'mobileNotifs'] },
  { id: 'technical', items: ['siteNotLoading', 'paymentFailed'] },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-surface-700 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 hover:text-gray-100 transition-colors"
      >
        <span className={`text-sm font-medium ${open ? 'text-gray-100' : 'text-gray-300'}`}>{q}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm text-gray-400 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function FAQ() {
  const { t } = useTranslation();
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-50">{t('faq.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('faq.noAnswer')}{' '}
          <a href="mailto:contact@pronix.sn" className="text-primary-400 underline">{t('faq.contactUs')}</a>
        </p>
      </div>

      {FAQ_STRUCTURE.map((section) => (
        <section key={section.id} className="space-y-1">
          <h2 className="font-semibold text-primary-400 text-xs uppercase tracking-widest mb-2">
            {t(`faq.categories.${section.id}`)}
          </h2>
          <div className="card p-0 overflow-hidden">
            <div className="px-5">
              {section.items.map((itemId) => (
                <FAQItem key={itemId} q={t(`faq.questions.${section.id}.${itemId}.q`)} a={t(`faq.questions.${section.id}.${itemId}.a`)} />
              ))}
            </div>
          </div>
        </section>
      ))}

      <div className="card p-6 text-center space-y-2">
        <p className="text-gray-300 font-medium text-sm">{t('faq.otherQuestions')}</p>
        <p className="text-gray-500 text-sm">{t('faq.respondWithin24h')}</p>
        <a
          href="mailto:contact@pronix.sn"
          className="btn-primary mt-2 inline-flex"
        >
          {t('faq.sendEmail')}
        </a>
      </div>
    </div>
  );
}
