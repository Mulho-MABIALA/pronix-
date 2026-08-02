import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { Mail, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function NewsletterUnsubscribe() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [status, setStatus] = useState('loading'); // loading | done | error

  useEffect(() => {
    if (!email) {
      setStatus('error');
      return;
    }
    api
      .post('/newsletter/unsubscribe', { email })
      .then(() => setStatus('done'))
      .catch(() => setStatus('error'));
  }, [email]);

  return (
    <div className="min-h-dvh bg-surface-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-4 animate-slide-up">
        <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto">
          {status === 'done' ? (
            <CheckCircle2 className="text-primary-400" size={28} />
          ) : (
            <Mail className="text-primary-400" size={28} />
          )}
        </div>
        <h1 className="font-display font-bold text-xl text-ink-1">
          {status === 'loading' && t('newsletterUnsub.loading')}
          {status === 'done' && t('newsletterUnsub.done')}
          {status === 'error' && t('newsletterUnsub.error')}
        </h1>
        <p className="text-ink-3 text-sm">
          {status === 'done' && t('newsletterUnsub.doneDesc')}
          {status === 'error' && t('newsletterUnsub.errorDesc')}
        </p>
        <Link to="/" className="btn-secondary w-full inline-block mt-2">{t('newsletterUnsub.backHome')}</Link>
      </div>
    </div>
  );
}
