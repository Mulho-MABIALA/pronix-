import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, X, Send, Bot, Loader2, ChevronDown, UserRound } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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
          ? 'bg-surface-700 text-ink-2 rounded-tl-sm'
          : 'bg-primary-500 text-white rounded-tr-sm'
      }`}>
        {msg.content}
      </div>
    </div>
  );
}

export default function SupportChat() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: t('supportChat.greeting') }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSending, setTicketSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Permet d'ouvrir le chat depuis n'importe où dans l'app (ex: lien "Contact" du footer)
  useEffect(() => {
    const openFromOutside = () => setOpen(true);
    window.addEventListener('fpronix:open-support', openFromOutside);
    return () => window.removeEventListener('fpronix:open-support', openFromOutside);
  }, []);

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

  const openTicketForm = () => {
    setShowTicketForm(true);
    // Pré-remplit le sujet avec le dernier message envoyé, si présent
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg && !ticketSubject) setTicketSubject(lastUserMsg.content.slice(0, 100));
  };

  const sendTicket = async () => {
    if (!ticketSubject.trim() || ticketMessage.trim().length < 10 || ticketSending) return;
    setTicketSending(true);
    try {
      await api.post('/support/tickets', { subject: ticketSubject.trim(), message: ticketMessage.trim() });
      setMessages((prev) => [...prev, { role: 'assistant', content: t('supportChat.ticketCreated') }]);
      setShowTicketForm(false);
      setTicketSubject('');
      setTicketMessage('');
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: t('supportChat.ticketError') }]);
    } finally {
      setTicketSending(false);
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
        <div className="fixed bottom-24 right-4 md:bottom-6 z-50 w-80 md:w-96 rounded-2xl border border-overlay/[0.08] shadow-2xl flex flex-col overflow-hidden"
          style={{ background: 'rgb(var(--surface-900-rgb) / 0.98)', backdropFilter: 'blur(20px)', maxHeight: '70vh' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-overlay/[0.06] shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
              <Bot size={16} className="text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink-1">{t('supportChat.assistantName')}</p>
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                {t('supportChat.online')}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-ink-3 hover:text-ink-2 hover:bg-overlay/[0.05] transition-colors"
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
                  <Loader2 size={14} className="text-ink-4 animate-spin" />
                </div>
              </div>
            )}

            {/* Questions rapides (affiché seulement au début) */}
            {messages.length <= 1 && (
              <div className="space-y-1.5 pt-2">
                <p className="text-xs text-ink-4 uppercase tracking-wide">{t('supportChat.quickQuestionsLabel')}</p>
                {QUICK_QUESTION_KEYS.map((k) => (
                  <button
                    key={k}
                    onClick={() => sendMessage(t(`supportChat.quickQuestions.${k}`))}
                    className="w-full text-left text-xs px-3 py-1.5 rounded-xl bg-surface-700 text-ink-3 hover:bg-surface-600 transition-colors"
                  >
                    {t(`supportChat.quickQuestions.${k}`)}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Escalade vers un humain / Input */}
          <div className="border-t border-overlay/[0.06] shrink-0">
            {showTicketForm ? (
              <div className="px-3 py-3 space-y-2">
                {user ? (
                  <>
                    <input
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder={t('supportChat.ticketSubjectPlaceholder')}
                      className="w-full bg-surface-700 border border-surface-600 rounded-xl px-3 py-2 text-sm text-ink-2 placeholder-ph-b focus:outline-none focus:border-primary-500"
                    />
                    <textarea
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder={t('supportChat.ticketMessagePlaceholder')}
                      rows={3}
                      className="w-full bg-surface-700 border border-surface-600 rounded-xl px-3 py-2 text-sm text-ink-2 placeholder-ph-b focus:outline-none focus:border-primary-500 resize-none"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowTicketForm(false)}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold text-ink-3 bg-surface-700 hover:bg-surface-600 transition-colors"
                      >
                        {t('supportChat.cancel')}
                      </button>
                      <button
                        onClick={sendTicket}
                        disabled={!ticketSubject.trim() || ticketMessage.trim().length < 10 || ticketSending}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-primary-500 hover:bg-primary-400 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
                      >
                        {ticketSending ? <Loader2 size={13} className="animate-spin" /> : t('supportChat.sendTicket')}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-2 bg-surface-700 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-ink-3">{t('supportChat.loginToContact')}</p>
                    <Link
                      to="/connexion"
                      onClick={() => setOpen(false)}
                      className="text-xs font-semibold text-primary-400 hover:text-primary-300 shrink-0"
                    >
                      {t('supportChat.loginCta')}
                    </Link>
                  </div>
                )}
                <button
                  onClick={() => setShowTicketForm(false)}
                  className="w-full text-[11px] text-ink-4 hover:text-ink-3 transition-colors"
                >
                  {t('supportChat.backToChat')}
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={openTicketForm}
                  className="w-full flex items-center justify-center gap-1.5 text-[11px] text-ink-4 hover:text-primary-400 pt-2 pb-1 transition-colors"
                >
                  <UserRound size={12} />
                  {t('supportChat.talkToHuman')}
                </button>
                <div className="px-3 pb-3 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder={t('supportChat.inputPlaceholder')}
                      disabled={loading}
                      className="flex-1 bg-surface-700 border border-surface-600 rounded-xl px-3 py-2 text-sm text-ink-2 placeholder-ph-b focus:outline-none focus:border-primary-500 disabled:opacity-50"
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
