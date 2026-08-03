import { Bot } from 'lucide-react';

// Badge visuel "robot IA" — repris partout où l'IA intervient (pronostics
// générés, coach, analyse live, chat...) pour attirer l'attention de
// l'utilisateur sur le fait que le contenu est produit par intelligence
// artificielle. Toujours le même style (violet + icône Bot) pour rester
// immédiatement reconnaissable dans toute l'app.
const SIZES = {
  xs: { pad: 'px-1 py-0.5',   text: 'text-[8px]',  icon: 7,  gap: 'gap-0.5' },
  sm: { pad: 'px-1 py-0.5',   text: 'text-[9px]',  icon: 8,  gap: 'gap-0.5' },
  md: { pad: 'px-1.5 py-0.5', text: 'text-[10px]', icon: 11, gap: 'gap-1'   },
};

export default function AiBadge({ size = 'sm', label = 'IA', className = '' }) {
  const s = SIZES[size] || SIZES.sm;
  return (
    <span
      className={`shrink-0 inline-flex items-center ${s.gap} ${s.pad} rounded font-bold ${s.text} bg-violet-500/15 text-violet-400 border border-violet-500/20 ${className}`}
    >
      <Bot size={s.icon} />{label}
    </span>
  );
}
