import { useState } from 'react';
import api from '../../services/api';

const FOTMOB_CDN = (id) =>
  id ? `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png` : null;

// Les logos media.api-sports.io pèsent 20-90 Ko en pleine résolution alors
// qu'ils s'affichent en 26-35px dans l'app (~600 Ko d'économie totale mesurés
// par PageSpeed). On les fait passer par notre proxy backend qui les
// redimensionne et les met en cache côté serveur (voir routes/imgProxy.js).
function resizedSrc(url, size) {
  if (!url || !url.includes('media.api-sports.io')) return url;
  const targetWidth = Math.round(size);
  return `${api.defaults.baseURL}/img-proxy?url=${encodeURIComponent(url)}&w=${targetWidth}`;
}

/** Logo d'équipe unifié — image réelle (fournie ou CDN Fotmob), fallback initiale. */
export default function TeamLogo({ logo, teamId, name, size = 20, className = '' }) {
  const [err, setErr] = useState(false);
  const src = resizedSrc(logo, size) || FOTMOB_CDN(teamId);

  if (src && !err) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
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
