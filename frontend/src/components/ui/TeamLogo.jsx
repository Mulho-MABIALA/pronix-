import { useState } from 'react';

const FOTMOB_CDN = (id) =>
  id ? `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png` : null;

/** Logo d'équipe unifié — image réelle (fournie ou CDN Fotmob), fallback initiale. */
export default function TeamLogo({ logo, teamId, name, size = 20, className = '' }) {
  const [err, setErr] = useState(false);
  const src = logo || FOTMOB_CDN(teamId);

  if (src && !err) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        style={{ width: size, height: size }}
        className={`object-contain shrink-0 ${className}`}
        onError={() => setErr(true)}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-surface-600 flex items-center justify-center text-gray-300 font-bold shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}
