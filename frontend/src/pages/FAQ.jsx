import { useMemo, useState } from 'react';
import { ChevronDown, Search, HelpCircle, CreditCard, Calendar, Trophy, Bell, Wrench, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FAQ_STRUCTURE = [
  { id: 'general',       items: ['whatIsFpronix', 'sportsBetting', 'whoCanUse'] },
  { id: 'account',       items: ['createAccount', 'freeVsPremium', 'howToPay', 'cancelSub', 'forgotPassword'] },
  { id: 'matches',       items: ['dataSource', 'noStats', 'leaguesAvailable'] },
  { id: 'tipsters',      items: ['howToPublish', 'rankingWorks', 'aiAnalysis', 'reliablePicks', 'reportAbuse'] },
  { id: 'notifications', items: ['enableNotifs', 'mobileNotifs'] },
  { id: 'technical',     items: ['siteNotLoading', 'paymentFailed'] },
];

// Icône + couleur par catégorie — aide à scanner visuellement la page au lieu
// d'une liste uniforme de 19 questions sans repère.
const CATEGORY_STYLE = {
  general:       { Icon: HelpCircle,  color: 'text-primary-400', bg: 'bg-primary-500/15' },
  account:       { Icon: CreditCard,  color: 'text-amber-400',   bg: 'bg-amber-500/15' },
  matches:       { Icon: Calendar,    color: 'text-blue-400',    bg: 'bg-blue-500/15' },
  tipsters:      { Icon: Trophy,      color: 'text-violet-400',  bg: 'bg-violet-500/15' },
  notifications: { Icon: Bell,        color: 'text-cyan-400',    bg: 'bg-cyan-500/15' },
  technical:     { Icon: Wrench,      color: 'text-pink-400',    bg: 'bg-pink-500/15' },
};

// Normalise pour une recherche insensible à la casse et aux accents
// ("garanti" doit matcher "garantis", "cree" doit matcher "créer").
function normalize(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function FAQItem({ q, a, forceOpen }) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;

  return (
    <div className="border-b border-overlay/[0.06] last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 group"
      >
        <span className={`text-sm font-medium transition-colors ${isOpen ? 'text-ink-1' : 'text-ink-3 group-hover:text-ink-2'}`}>
          {q}
        </span>
        <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-primary-500/15 text-primary-400' : 'text-ink-4 group-hover:bg-overlay/[0.06]'}`}>
          <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <p className="pb-4 text-sm text-ink-4 leading-relaxed">{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQ() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const q = normalize(query);
  const searching = q.length > 0;

  // Résout tout le contenu traduit une fois, puis filtre en mémoire — évite
  // de rappeler t() à chaque frappe pour chaque question.
  const sections = useMemo(() => {
    return FAQ_STRUCTURE.map((section) => ({
      id: section.id,
      label: t(`faq.categories.${section.id}`),
      items: section.items.map((itemId) => ({
        id: itemId,
        q: t(`faq.questions.${section.id}.${itemId}.q`),
        a: t(`faq.questions.${section.id}.${itemId}.a`),
      })),
    }));
  }, [t]);

  const filteredSections = useMemo(() => {
    if (!searching) return sections;
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => normalize(item.q).includes(q) || normalize(item.a).includes(q)),
      }))
      .filter((section) => section.items.length > 0);
  }, [sections, searching, q]);

  const totalResults = filteredSections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div className="space-y-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink-1">{t('faq.title')}</h1>
          <p className="text-sm text-ink-3 mt-1">
            {t('faq.noAnswer')}{' '}
            <a href="mailto:support@fpronix.com" className="text-primary-400 underline">{t('faq.contactUs')}</a>
          </p>
        </div>

        {/* Recherche — la page a 6 catégories et ~19 questions, une recherche
            évite de scroller/déplier à l'aveugle pour trouver une réponse. */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('faq.searchPlaceholder')}
            className="input w-full pl-10 pr-9"
          />
          {searching && (
            <button
              onClick={() => setQuery('')}
              aria-label={t('faq.clearSearch')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-2 transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {searching && totalResults === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-ink-3 text-sm">{t('faq.noResults', { query })}</p>
        </div>
      ) : (
        filteredSections.map((section) => {
          const style = CATEGORY_STYLE[section.id] || CATEGORY_STYLE.general;
          return (
            <section key={section.id} className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${style.bg}`}>
                  <style.Icon size={14} className={style.color} />
                </div>
                <h2 className={`font-semibold text-xs uppercase tracking-widest ${style.color}`}>
                  {section.label}
                </h2>
              </div>
              <div className="card p-0 overflow-hidden">
                <div className="px-5">
                  {section.items.map((item) => (
                    <FAQItem key={item.id} q={item.q} a={item.a} forceOpen={searching} />
                  ))}
                </div>
              </div>
            </section>
          );
        })
      )}

      <div className="card p-6 text-center space-y-2">
        <p className="text-ink-3 font-medium text-sm">{t('faq.otherQuestions')}</p>
        <p className="text-ink-3 text-sm">{t('faq.respondWithin24h')}</p>
        <a
          href="mailto:support@fpronix.com"
          className="btn-primary mt-2 inline-flex"
        >
          {t('faq.sendEmail')}
        </a>
      </div>
    </div>
  );
}
