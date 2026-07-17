import { useState } from 'react';
import { Mail, X, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function EmailVerifyBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('emailBannerDismissed') === '1'
  );
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Only show if user is logged in and email is NOT verified
  if (!user || user.emailVerified || dismissed) return null;

  const handleSend = async () => {
    setLoading(true);
    try {
      await api.post('/auth/send-verification');
      setSent(true);
      toast(t('emailVerify.sent', 'Email de vérification envoyé ! Vérifie ta boîte mail.'), 'success');
    } catch {
      toast(t('emailVerify.error', 'Erreur lors de l\'envoi. Réessaie plus tard.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex items-center gap-3 px-4 py-2.5 text-sm"
      style={{
        background: 'rgba(245,158,11,0.08)',
        borderBottom: '1px solid rgba(245,158,11,0.2)',
      }}
    >
      <Mail size={15} className="text-amber-400 shrink-0" />
      <p className="flex-1 text-[12px] text-amber-200/80 leading-tight">
        {sent
          ? t('emailVerify.checkInbox', '✉️ Vérifie ta boîte mail pour confirmer ton adresse.')
          : t('emailVerify.prompt', 'Ton adresse email n\'est pas vérifiée.')}
      </p>
      {!sent && (
        <button
          onClick={handleSend}
          disabled={loading}
          className="shrink-0 text-[11px] font-semibold text-amber-400 hover:text-amber-300 border border-amber-500/40 rounded-lg px-2 py-1 transition-colors disabled:opacity-50"
        >
          {loading ? '...' : t('emailVerify.send', 'Vérifier')}
        </button>
      )}
      {sent && <CheckCircle size={14} className="text-amber-400 shrink-0" />}
      <button
        onClick={() => { localStorage.setItem('emailBannerDismissed', '1'); setDismissed(true); }}
        className="p-0.5 rounded text-amber-600 hover:text-amber-400 transition-colors shrink-0"
        aria-label="Fermer"
      >
        <X size={13} />
      </button>
    </div>
  );
}
