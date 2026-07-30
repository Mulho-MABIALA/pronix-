import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, CheckCircle2, Zap, Bell, TrendingUp } from 'lucide-react';
import api from '../services/api';
import i18n from '../i18n';

export default function Newsletter() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | already | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const { data } = await api.post('/newsletter/subscribe', {
        email,
        language: i18n.language || 'fr',
        source: 'newsletter_page',
      });
      setStatus(data.alreadySubscribed ? 'already' : 'success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err?.response?.data?.message || t('newsletter.genericError'));
    }
  };

  const perks = [
    { icon: TrendingUp, key: 'perkPicks' },
    { icon: Bell, key: 'perkAlerts' },
    { icon: Zap, key: 'perkExclusive' },
  ];

  return (
    <div className="min-h-dvh bg-surface-900 px-4 py-10">
      <div className="max-w-md mx-auto space-y-8 animate-slide-up">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto">
            <Mail className="text-primary-400" size={28} />
          </div>
          <h1 className="font-display font-bold text-2xl text-ink-1">{t('newsletter.title')}</h1>
          <p className="text-ink-3 text-sm">{t('newsletter.subtitle')}</p>
        </div>

        <div className="bento-card space-y-3">
          {perks.map(({ icon: Icon, key }) => (
            <div key={key} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center shrink-0">
                <Icon className="text-primary-400" size={16} />
              </div>
              <p className="text-sm text-ink-2 pt-1">{t(`newsletter.${key}`)}</p>
            </div>
          ))}
        </div>

        <div className="bento-card">
          {status === 'success' || status === 'already' ? (
            <div className="text-center space-y-3 py-2">
              <CheckCircle2 className="text-primary-400 mx-auto" size={40} />
              <p className="text-ink-1 font-semibold">
                {status === 'already' ? t('newsletter.alreadySubscribed') : t('newsletter.successTitle')}
              </p>
              <p className="text-ink-4 text-sm">{t('newsletter.successDesc')}</p>
              <Link to="/" className="btn-secondary w-full inline-block mt-2">{t('newsletter.backHome')}</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="newsletter-email" className="block text-sm font-medium text-ink-3 mb-1.5">
                  {t('newsletter.emailLabel')}
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                />
              </div>
              {status === 'error' && (
                <p className="text-danger-400 text-sm">{errorMsg}</p>
              )}
              <button type="submit" disabled={status === 'loading'} className="btn-primary w-full">
                {status === 'loading' ? t('newsletter.sending') : t('newsletter.subscribeBtn')}
              </button>
              <p className="text-ink-5 text-xs text-center">{t('newsletter.disclaimer')}</p>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-ink-3">
          <Link to="/" className="text-primary-400 hover:underline">← {t('common.back')}</Link>
        </p>
      </div>
    </div>
  );
}
