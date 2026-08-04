import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Champ mot de passe avec bouton œil pour afficher/masquer la saisie —
// utilisé partout où un <input type="password"> apparaît (email/mot de passe
// dans Profile.jsx, suppression de compte...). `className` permet d'ajuster
// la classe de l'input (ex. sans "w-full" dans certains contextes).
export default function PasswordField({ value, onChange, placeholder, autoComplete, className = 'input w-full text-sm' }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className={`${className} pr-10`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-2 transition-colors"
        aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        tabIndex={-1}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
