import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Send, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SUGGESTION_KEYS = ['prediction', 'favorite', 'goalsValue', 'recentTrend'];

export default function ChatIA({ matchId, matchLabel }) {
  const { t } = useTranslation();
  const { user, isPremium } = useAuth();
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [quota,     setQuota]     = useState(null); // { used, limit, unlimited }
  const [error,     setError]     = useState('');
  const bottomRef = useRef(null);

  // Scroll auto au dernier message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text) {
    if (!text.trim() || loading) return;
    setError('');
    const question = text.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setLoading(true);

    try {
      const { data } = await api.post(`/matches/${matchId}/chat`, { question });
      setMessages((prev) => [...prev, { role: 'ai', text: data.data.answer }]);
      setQuota(data.data.quota);
    } catch (err) {
      const msg = err.response?.data?.message || t('chatIA.aiError');
      setError(msg);
      // Retirer le dernier message utilisateur si erreur quota
      if (err.response?.status === 429) {
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setLoading(false);
    }
  }

  // Non connecté → CTA connexion
  if (!user) {
    return (
      <section className="card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Bot size={15} className="text-violet-400" />
          <h2 className="font-semibold text-gray-100 text-sm">{t('chatIA.title')}</h2>
        </div>
        <div className="text-center py-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto">
            <Lock size={20} className="text-violet-400" />
          </div>
          <p className="text-sm text-gray-400">{t('chatIA.loginPrompt')}</p>
          <Link to="/connexion" className="btn-primary inline-flex px-6 py-2 text-sm">
            {t('auth.loginCta')}
          </Link>
        </div>
      </section>
    );
  }

  const quotaExhausted = quota && !quota.unlimited && quota.used >= quota.limit;

  return (
    <section className="card p-4 space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-violet-500/15 flex items-center justify-center">
            <Bot size={14} className="text-violet-400" />
          </div>
          <h2 className="font-semibold text-gray-100 text-sm">{t('chatIA.title')}</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20 font-semibold">
            {t('chatIA.beta')}
          </span>
        </div>
        {quota && !quota.unlimited && (
          <span className="text-[11px] text-gray-300">
            {t('chatIA.questionsToday', { used: quota.used, limit: quota.limit })}
          </span>
        )}
        {quota?.unlimited && (
          <span className="text-[11px] text-primary-400">∞ Premium</span>
        )}
      </div>

      {/* Messages */}
      {messages.length > 0 && (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'ai' && (
                <div className="w-6 h-6 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                  <Bot size={11} className="text-violet-400" />
                </div>
              )}
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-select-500/15 text-select-300 border border-select-500/20'
                  : 'bg-surface-700/60 text-gray-200 border border-white/[0.06]'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="w-6 h-6 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0 mr-2">
                <Bot size={11} className="text-violet-400 animate-pulse" />
              </div>
              <div className="bg-surface-700/60 border border-white/[0.06] px-3 py-2 rounded-xl flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Suggestions (première fois) */}
      {messages.length === 0 && !loading && (
        <div className="space-y-2">
          <p className="text-xs text-gray-300">{t('chatIA.suggestedQuestions')}</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTION_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => sendMessage(t(`chatIA.suggestions.${k}`))}
                className="text-xs px-3 py-1.5 rounded-lg bg-surface-700/50 border border-white/[0.07] text-gray-400 hover:text-gray-200 hover:border-white/15 transition-colors text-left"
              >
                {t(`chatIA.suggestions.${k}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Erreur quota */}
      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
          {!isPremium && error.includes('Quota') && (
            <Link to="/abonnement" className="ml-2 text-primary-400 underline font-semibold">
              {t('chatIA.goPremiumArrow')}
            </Link>
          )}
        </div>
      )}

      {/* Zone de saisie */}
      {quotaExhausted ? (
        <div className="text-center py-3 space-y-2">
          <p className="text-xs text-gray-300">{t('chatIA.freeQuestionsUsed')}</p>
          <Link to="/abonnement" className="btn-primary inline-flex px-5 py-2 text-xs">
            {t('chatIA.premiumUnlimited')}
          </Link>
        </div>
      ) : (
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('chatIA.inputPlaceholder', { matchLabel })}
            maxLength={500}
            disabled={loading}
            className="input flex-1 text-sm py-2"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-400 hover:bg-violet-500/30 transition-colors flex items-center justify-center disabled:opacity-40 shrink-0"
          >
            <Send size={14} />
          </button>
        </form>
      )}

      <p className="disclaimer">{t('chatIA.disclaimer')}</p>
    </section>
  );
}
