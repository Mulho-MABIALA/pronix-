import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let idCounter = 0;

const TYPE_STYLES = {
  success: {
    icon: CheckCircle,
    iconClass: 'text-emerald-400',
    bar: 'bg-emerald-500',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-red-400',
    bar: 'bg-red-500',
  },
  info: {
    icon: Info,
    iconClass: 'text-primary-400',
    bar: 'bg-primary-500',
  },
};

function ToastItem({ toast, onDismiss }) {
  const style = TYPE_STYLES[toast.type] || TYPE_STYLES.info;
  const Icon = style.icon;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl animate-slide-up overflow-hidden relative"
      style={{
        background: 'rgba(28,29,32,0.98)',
        border: '1px solid rgba(255,255,255,0.09)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* barre colorée gauche */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${style.bar}`} />

      <Icon size={16} className={`${style.iconClass} shrink-0`} />
      <p className="text-sm text-gray-200 flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/[0.06] transition-colors shrink-0"
        aria-label="Fermer"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * toast(message, type?, duration?)
   * type: 'success' | 'error' | 'info'  (default 'info')
   * duration: ms (default 3500)
   */
  const toast = useCallback(
    (message, type = 'info', duration = 3500) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div
          className="fixed bottom-24 md:bottom-6 right-4 left-4 md:left-auto md:w-80 z-[500] flex flex-col gap-2 pointer-events-none"
          aria-live="polite"
          aria-label="Notifications"
        >
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

/**
 * useToast() → toast(message, type?, duration?)
 * Exemple : toast('Notifications activées !', 'success')
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé à l\'intérieur de <ToastProvider>');
  return ctx;
}
