import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, X, Send, Bot, Loader2, ChevronDown } from 'lucide-react';
import api from '../../services/api';

const QUICK_QUESTION_KEYS = ['tipster', 'premium'];

function Message({ msg }) {
  const isBot = msg.role === 'assistant';
  return (
    <div className={`flex gap-2 ${isBot ? '' : 'flex-row-reverse'}`}>
      {isBot && (
        <div className="w-7 h-7 rounded-full bg-primary-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <Bot size={14} className="text-primary-400" />
        </div>
      )}
      <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
        isBot
          ? 'bg-surface-700 text-gray-200 rounded-tl-sm'
          : 'bg-primary-500 text-white rounded-tr-sm'
      }`}>
        {msg.content}
      </div>
    </div>
  );
}

export default function SupportChat() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: t('supportChat.greeting') }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
      const res = await api.post('/support/chat', { message: msg, history });
      const answer = res.data?.data?.answer || t('supportChat.noAnswer');
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: t('supportChat.error'),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Bulle flottante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 md:bottom-6 z-50 w-14 h-14 rounded-full bg-primary-500 shadow-lg flex items-center justify-center hover:bg-primary-400 active:scale-95 transition-all"
          aria-label={t('supportChat.ariaLabel')}
        >
          <MessageCircle size={24} className="text-white" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-surface-900" />
        </button>
      )}

      {/* Fenêtre de chat */}
      {open && (
        <div className="fixed bottom-24 right-4 md:bottom-6 z-50 w-80 md:w-96 rounded-2xl border border-white/[0.08] shadow-2xl flex flex-col overflow-hidden"
          style={{ background: 'rgba(23,24,25,0.98)', backdropFilter: 'blur(20px)', maxHeight: '70vh' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
              <Bot size={16} className="text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-100">{t('supportChat.assistantName')}</p>
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                {t('supportChat.online')}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-gray-300 hover:text-gray-200 hover:bg-white/[0.05] transition-colors"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map((msg, i) => <Message key={i} msg={msg} />)}

            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-primary-500/20 flex items-center justify-center shrink-0">
                  <Bot size={14} className="text-primary-400" />
                </div>
                <div className="px-3 py-2 bg-surface-700 rounded-2xl rounded-tl-sm">
                  <Loader2 size={14} className="text-gray-400 animate-spin" />
                </div>
              </div>
            )}

            {/* Questions rapides (affiché seulement au début) */}
            {messages.length <= 1 && (
              <div className="space-y-1.5 pt-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide">{t('supportChat.quickQuestionsLabel')}</p>
                {QUICK_QUESTION_KEYS.map((k) => (
                  <button
                    key={k}
                    onClick={() => sendMessage(t(`supportChat.quickQuestions.${k}`))}
                    className="w-full text-left text-xs px-3 py-1.5 rounded-xl bg-surface-700 text-gray-300 hover:bg-surface-600 transition-colors"
                  >
                    {t(`supportChat.quickQuestions.${k}`)}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-white/[0.06] shrink-0">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={t('supportChat.inputPlaceholder')}
                disabled={loading}
                className="flex-1 bg-surface-700 border border-surface-600 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500 disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center disabled:opacity-40 hover:bg-primary-400 transition-colors shrink-0"
              >
                <Send size={14} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
