import { useState } from 'react';

/**
 * Avatar utilisateur/tipster unifié — affiche la vraie photo de profil si
 * disponible (user.profile.avatar), sinon retombe sur l'initiale du nom.
 */
export default function Avatar({ user, name, size = 40, className = '' }) {
  const [err, setErr] = useState(false);
  const avatar = user?.profile?.avatar;
  const displayName = name || user?.profile?.displayName || user?.username || '?';

  if (avatar && !err) {
    return (
      <img
        src={avatar}
        alt=""
        aria-hidden="true"
        style={{ width: size, height: size }}
        className={`rounded-full object-cover shrink-0 ${className}`}
        onError={() => setErr(true)}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {displayName.charAt(0).toUpperCase()}
    </div>
  );
}
