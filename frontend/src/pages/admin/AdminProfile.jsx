import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Camera, Check, Pencil, Shield, Mail, Fingerprint, LogOut, KeyRound, X,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { hapticSuccess } from '../../utils/haptics';

/* Console admin = usage interne, français uniquement (pas d'i18n ici,
   contrairement au reste de l'app — voir convention des autres pages admin). */

/* ─── Compress & crop image to square base64 JPEG (identique à Profile.jsx) ── */
function resizeToSquareBase64(file, size = 400) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = size;
        canvas.height = size;
        const ctx    = canvas.getContext('2d');
        const minDim = Math.min(img.width, img.height);
        const sx     = (img.width  - minDim) / 2;
        const sy     = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function AvatarCircle({ src, letter, onClick, uploading }) {
  return (
    <div className="relative h-20 w-20 rounded-full shrink-0 cursor-pointer group" onClick={onClick}>
      {src ? (
        <img src={src} alt="Avatar" className="w-full h-full rounded-full object-cover" />
      ) : (
        <div className="w-20 h-20 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-2xl">
          {letter}
        </div>
      )}
      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        {uploading
          ? <div className="w-5 h-5 border-2 border-overlay/30 border-t-white rounded-full animate-spin" />
          : <Camera size={18} className="text-white" />
        }
      </div>
    </div>
  );
}

const SECTION_COLORS = {
  blue: 'bg-blue-500/15 text-blue-400',
};

function Section({ title, icon: Icon, color = 'blue', children }) {
  return (
    <section className="bento-card space-y-4">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${SECTION_COLORS[color] || SECTION_COLORS.blue}`}>
            <Icon size={15} />
          </div>
        )}
        <h2 className="font-semibold text-ink-1 text-sm">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function guessDeviceName() {
  const ua = navigator.userAgent || '';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  return 'Appareil';
}

/* ─── Passkeys (connexion biométrique) — identique au principe de Profile.jsx ── */
function PasskeysSection() {
  const toast = useToast();
  const qc = useQueryClient();
  const [registering, setRegistering] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);

  useEffect(() => {
    import('@simplewebauthn/browser').then(({ browserSupportsWebAuthn }) => {
      setPasskeySupported(browserSupportsWebAuthn());
    }).catch(() => {});
  }, []);

  const { data: devices, isLoading } = useQuery({
    queryKey: ['admin-webauthn-devices'],
    queryFn: () => api.get('/auth/webauthn/devices').then((r) => r.data.data),
    enabled: passkeySupported,
  });

  const removeDevice = useMutation({
    mutationFn: (id) => api.delete(`/auth/webauthn/devices/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-webauthn-devices'] });
      if (toast) toast('Appareil retiré', 'success');
    },
    onError: () => { if (toast) toast('Erreur lors du retrait de l\'appareil', 'error'); },
  });

  const registerPasskey = async () => {
    setRegistering(true);
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');
      const { data: optData } = await api.post('/auth/webauthn/registration-options');
      const regResponse = await startRegistration({ optionsJSON: optData.data });
      await api.post('/auth/webauthn/registration-verify', { response: regResponse, deviceName: guessDeviceName() });
      hapticSuccess();
      qc.invalidateQueries({ queryKey: ['admin-webauthn-devices'] });
      if (toast) toast('Appareil ajouté', 'success');
    } catch (err) {
      if (err?.name !== 'NotAllowedError') {
        if (toast) toast(err.response?.data?.message || 'Erreur lors de l\'ajout de l\'appareil', 'error');
      }
    } finally {
      setRegistering(false);
    }
  };

  if (!passkeySupported) return null;

  return (
    <Section title="Connexion biométrique" icon={Fingerprint} color="blue">
      <p className="text-xs text-ink-3 mb-3">
        Connecte-toi avec Face ID, Touch ID ou ton empreinte digitale — plus besoin de mot de passe sur cet appareil.
      </p>

      {isLoading ? (
        <div className="h-10 bg-surface-700 rounded-lg animate-pulse mb-3" />
      ) : devices?.length > 0 ? (
        <div className="space-y-1 mb-3">
          {devices.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-2 border-b border-overlay/[0.05] last:border-0">
              <div className="min-w-0">
                <p className="text-sm text-ink-2 truncate">{d.deviceName || 'Appareil sans nom'}</p>
                <p className="text-xs text-ink-4">Ajouté le {format(new Date(d.createdAt), 'd MMM yyyy', { locale: fr })}</p>
              </div>
              <button
                onClick={() => removeDevice.mutate(d.id)}
                disabled={removeDevice.isPending}
                className="text-xs text-red-400 hover:text-red-300 font-medium shrink-0 ml-2 disabled:opacity-50"
              >
                Retirer
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-ink-4 mb-3">Aucun appareil enregistré.</p>
      )}

      <button onClick={registerPasskey} disabled={registering} className="btn-secondary w-full py-2.5 text-sm disabled:opacity-50">
        {registering ? 'Enregistrement...' : '+ Ajouter cet appareil'}
      </button>
    </Section>
  );
}

/* ─── Changer l'adresse email — formulaire inline ─────────────────────────────
   Exige le mot de passe actuel si le compte en a un (voir hasPassword côté
   /auth/me). Repasse emailVerified à false côté backend et envoie un nouveau
   lien de vérification vers la nouvelle adresse. */
function ChangeEmailRow({ user, refreshUser }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.patch('/profiles/me/email', {
      newEmail: newEmail.trim(),
      ...(user?.hasPassword ? { currentPassword } : {}),
    }),
    onSuccess: async () => {
      await refreshUser();
      setEditing(false);
      setNewEmail('');
      setCurrentPassword('');
      setError('');
      if (toast) toast('Email mis à jour — vérifie ta boîte mail pour la confirmer', 'success');
    },
    onError: (err) => {
      setError(err?.response?.data?.message || 'Erreur lors du changement d\'email');
    },
  });

  const canSubmit = /\S+@\S+\.\S+/.test(newEmail) && (!user?.hasPassword || currentPassword.length > 0);

  if (!editing) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-overlay/[0.05]">
        <div className="flex items-center gap-2">
          <Mail size={14} className="text-ink-3" />
          <span className="text-sm text-ink-3">Email</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-3 truncate max-w-[160px]">{user?.email}</span>
          <button
            onClick={() => { setEditing(true); setNewEmail(''); setCurrentPassword(''); setError(''); }}
            className="text-xs text-primary-400 hover:text-primary-300 font-medium shrink-0"
          >
            Modifier
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 border-b border-overlay/[0.05] space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail size={14} className="text-ink-3" />
          <span className="text-sm text-ink-2 font-medium">Nouvelle adresse email</span>
        </div>
        <button onClick={() => setEditing(false)} className="text-ink-4 hover:text-ink-2 transition-colors">
          <X size={15} />
        </button>
      </div>
      <input
        type="email"
        className="input w-full text-sm"
        value={newEmail}
        onChange={(e) => setNewEmail(e.target.value)}
        placeholder={user?.email}
        autoComplete="email"
      />
      {user?.hasPassword && (
        <input
          type="password"
          className="input w-full text-sm"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Mot de passe actuel (confirmation)"
          autoComplete="current-password"
        />
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        onClick={() => mutation.mutate()}
        disabled={!canSubmit || mutation.isPending}
        className="btn-primary w-full py-2 text-sm disabled:opacity-40"
      >
        {mutation.isPending ? 'Envoi...' : 'Changer l\'email'}
      </button>
    </div>
  );
}

/* ─── Changer le mot de passe — formulaire inline ─────────────────────────────
   Si le compte n'a pas encore de mot de passe (Google), pas de champ "actuel"
   — même logique que le backend (voir routes/profiles.js PATCH /me/password). */
function ChangePasswordRow({ user }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setError('');
  };

  const mutation = useMutation({
    mutationFn: () => api.patch('/profiles/me/password', {
      newPassword,
      ...(user?.hasPassword ? { currentPassword } : {}),
    }),
    onSuccess: () => {
      setEditing(false);
      reset();
      if (toast) toast('Mot de passe mis à jour', 'success');
    },
    onError: (err) => {
      setError(err?.response?.data?.message || 'Erreur lors du changement de mot de passe');
    },
  });

  const canSubmit =
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    (!user?.hasPassword || currentPassword.length > 0);

  if (!editing) {
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-ink-3">{user?.hasPassword ? 'Mot de passe' : 'Connexion Google — pas de mot de passe'}</span>
        <button
          onClick={() => { setEditing(true); reset(); }}
          className="text-xs text-primary-400 hover:text-primary-300 font-medium"
        >
          {user?.hasPassword ? 'Modifier' : 'Définir un mot de passe'}
        </button>
      </div>
    );
  }

  return (
    <div className="py-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound size={14} className="text-ink-3" />
          <span className="text-sm text-ink-2 font-medium">
            {user?.hasPassword ? 'Changer le mot de passe' : 'Définir un mot de passe'}
          </span>
        </div>
        <button onClick={() => setEditing(false)} className="text-ink-4 hover:text-ink-2 transition-colors">
          <X size={15} />
        </button>
      </div>
      {user?.hasPassword && (
        <input
          type="password"
          className="input w-full text-sm"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Mot de passe actuel"
          autoComplete="current-password"
        />
      )}
      <input
        type="password"
        className="input w-full text-sm"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="Nouveau mot de passe (8 caractères min.)"
        autoComplete="new-password"
      />
      <input
        type="password"
        className="input w-full text-sm"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirmer le nouveau mot de passe"
        autoComplete="new-password"
      />
      {newPassword.length > 0 && newPassword.length < 8 && (
        <p className="text-xs text-amber-400">8 caractères minimum</p>
      )}
      {confirmPassword.length > 0 && newPassword !== confirmPassword && (
        <p className="text-xs text-amber-400">Les mots de passe ne correspondent pas</p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        onClick={() => mutation.mutate()}
        disabled={!canSubmit || mutation.isPending}
        className="btn-primary w-full py-2 text-sm disabled:opacity-40"
      >
        {mutation.isPending ? 'Sauvegarde...' : 'Enregistrer'}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   Page principale — profil du compte administrateur
══════════════════════════════════════════════════════════════════════════════ */
export default function AdminProfile() {
  const { user, logout, refreshUser } = useAuth();
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  const initForm = () => ({
    displayName: user?.profile?.displayName || '',
    bio: user?.profile?.bio || '',
    avatar: user?.profile?.avatar || '',
  });

  const [form, setForm] = useState(initForm);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  const updateProfile = useMutation({
    mutationFn: (data) => api.patch('/profiles/me', data),
    onSuccess: async () => {
      await refreshUser();
      setSaved(true);
      setEditing(false);
      setAvatarPreview(null);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: () => { if (toast) toast('Erreur lors de la sauvegarde', 'error'); },
  });

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    setUploading(true);
    try {
      const base64 = await resizeToSquareBase64(file, 400);
      setAvatarPreview(base64);
      setForm((f) => ({ ...f, avatar: base64 }));
      await api.patch('/profiles/me', { avatar: base64 });
      await refreshUser();
      setAvatarPreview(base64);
      if (toast) toast('Photo mise à jour', 'success');
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setAvatarPreview(null);
      if (toast) toast('Erreur lors de l\'upload de la photo', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => updateProfile.mutate(form);
  const handleCancel = () => { setForm(initForm()); setAvatarPreview(null); setEditing(false); };

  const avatarSrc = avatarPreview || user?.profile?.avatar || null;
  const displayName = user?.profile?.displayName || user?.username || '';
  const isGoogleUser = !!user?.googleId;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-xl text-ink-1">Mon profil</h1>
        <p className="text-sm text-ink-3 mt-0.5">Informations du compte administrateur</p>
      </div>

      {/* ── Hero identité ── */}
      <section className="bento-card">
        <div className="flex items-start gap-4">
          <div>
            <AvatarCircle
              src={avatarSrc}
              letter={displayName.charAt(0).toUpperCase() || 'A'}
              uploading={uploading}
              onClick={() => fileInputRef.current?.click()}
            />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <p className="text-xs text-primary-400 font-semibold text-center mt-1.5">Changer</p>
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-ink-1 text-lg leading-tight truncate">{displayName}</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                <Shield size={10} /> {user?.role === 'ADMIN' ? 'Administrateur' : 'Membre'}
              </span>
            </div>
            <p className="text-ink-3 text-sm mt-0.5">@{user?.username}</p>
            <p className="text-ink-4 text-xs mt-0.5 truncate">{user?.email}</p>

            {user?.createdAt && (
              <p className="text-ink-4 text-[11px] mt-1.5">
                Membre depuis {format(new Date(user.createdAt), 'MMM yyyy', { locale: fr })}
                {user?.lastLoginAt && (
                  <> · dernière connexion le {format(new Date(user.lastLoginAt), 'dd MMM yyyy', { locale: fr })}</>
                )}
              </p>
            )}

            {user?.profile?.bio && !editing && (
              <p className="text-ink-4 text-xs mt-2 leading-relaxed line-clamp-2">{user.profile.bio}</p>
            )}
          </div>
        </div>

        {saved && (
          <div className="flex items-center gap-2 bg-primary-500/10 border border-primary-500/30 text-primary-400 text-sm rounded-xl px-4 py-2 mt-4">
            <Check size={14} /> Profil mis à jour
          </div>
        )}

        {editing ? (
          <div className="space-y-4 mt-4 pt-4 border-t border-overlay/[0.06]">
            <div>
              <label className="block text-xs font-semibold text-ink-4 mb-1.5 uppercase tracking-wider">Nom affiché</label>
              <input
                type="text"
                className="input"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                maxLength={50}
                placeholder="Ton nom"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-4 mb-1.5 uppercase tracking-wider">Bio</label>
              <textarea
                className="input resize-none h-24"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                maxLength={300}
                placeholder="Quelques mots sur toi..."
              />
              <p className="text-right text-xs text-ink-4 mt-0.5">{form.bio.length}/300</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={updateProfile.isPending} className="btn-primary flex-1">
                {updateProfile.isPending ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
              <button onClick={handleCancel} className="btn-secondary flex-1">Annuler</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setForm(initForm()); setEditing(true); }}
            className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
          >
            <Pencil size={14} /> Modifier le profil
          </button>
        )}
      </section>

      {/* ── Sécurité / compte ── */}
      <Section title="Compte" icon={Shield} color="blue">
        <div>
          <ChangeEmailRow user={user} refreshUser={refreshUser} />
          <ChangePasswordRow user={user} />
        </div>
        {isGoogleUser && (
          <p className="text-xs text-ink-4 flex items-center gap-1.5 pt-1">
            <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 shrink-0" fill="none">
              <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.867h5.38a4.6 4.6 0 01-1.997 3.018v2.51h3.232C18.343 15.78 19.6 13.27 19.6 10.227z" fill="#4285F4"/>
              <path d="M10 20c2.7 0 4.964-.895 6.615-2.423l-3.232-2.509c-.895.6-2.04.955-3.383.955-2.6 0-4.8-1.755-5.59-4.118H1.064v2.59A9.997 9.997 0 0010 20z" fill="#34A853"/>
              <path d="M4.41 11.905a5.968 5.968 0 010-3.81V5.505H1.064a9.997 9.997 0 000 9l3.345-2.6z" fill="#FBBC05"/>
              <path d="M10 3.977c1.468 0 2.782.505 3.818 1.495l2.863-2.863C14.959 1 12.695 0 10 0 6.09 0 2.71 2.24 1.063 5.505l3.346 2.59C5.2 5.732 7.4 3.977 10 3.977z" fill="#EA4335"/>
            </svg>
            Compte relié à Google
          </p>
        )}
      </Section>

      {/* ── Passkeys ── */}
      <PasskeysSection />

      {/* ── Déconnexion ── */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 text-sm text-red-400 hover:text-red-300 py-3 rounded-xl hover:bg-red-500/5 transition-colors border border-transparent hover:border-red-500/20"
      >
        <LogOut size={15} /> Se déconnecter
      </button>
    </div>
  );
}
