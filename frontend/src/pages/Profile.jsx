import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Camera, Check, ChevronRight, Crown, LogOut, Mail,
  Bell, BellOff, Pencil, Shield, Star, TrendingUp, X, Gift, Copy,
  MessageCircle, HelpCircle, Trophy, Search, Globe, Trash2, AlertTriangle, PauseCircle,
  Fingerprint, KeyRound, Phone,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { hapticSuccess } from '../utils/haptics';
import { PlanBadge } from '../components/ui/Badge';
import SuccessRateBar from '../components/ui/SuccessRateBar';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import Disclaimer from '../components/layout/Disclaimer';
import CompetitionLogo from '../components/ui/CompetitionLogo';
import { COUNTRIES } from '../data/countries';
import { PHONE_CODES, matchPhoneCode } from '../data/phoneCodes';
import PasswordField from '../components/ui/PasswordField';

const LANGUAGES = [
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'pt', label: '🇵🇹 Português' },
];
const CURRENCIES = ['FCFA', 'EUR', 'USD', 'GBP', 'BRL', 'MXN', 'CAD', 'ZAR'];

/* ─── Compress & crop image to square base64 JPEG ─────────────────────────── */
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

/* ─── Avatar circle ─────────────────────────────────────────────────────────── */
function AvatarCircle({ src, letter, size = 'lg', onClick, uploading }) {
  const dim = size === 'lg' ? 'h-24 w-24 text-3xl' : 'h-14 w-14 text-xl';
  return (
    <div
      className={`relative ${dim} rounded-full shrink-0 cursor-pointer group`}
      onClick={onClick}
    >
      {src ? (
        <img
          src={src}
          alt="Avatar"
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <div className={`${dim} rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold`}>
          {letter}
        </div>
      )}
      {/* Overlay caméra au hover */}
      {onClick && (
        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading
            ? <div className="w-5 h-5 border-2 border-overlay/30 border-t-white rounded-full animate-spin" />
            : <Camera size={20} className="text-white" />
          }
        </div>
      )}
    </div>
  );
}

/* ─── Toggle switch ─────────────────────────────────────────────────────────── */
function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
      <span className="text-sm text-ink-3">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${
          checked ? 'bg-primary-500' : 'bg-surface-600'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}

/* ─── Section wrapper ───────────────────────────────────────────────────────── */
const SECTION_COLORS = {
  amber:   'bg-amber-500/15 text-amber-400',
  primary: 'bg-primary-500/15 text-primary-400',
  blue:    'bg-blue-500/15 text-blue-400',
  violet:  'bg-violet-500/15 text-violet-400',
  cyan:    'bg-cyan-500/15 text-cyan-400',
  indigo:  'bg-indigo-500/15 text-indigo-400',
  pink:    'bg-pink-500/15 text-pink-400',
};

function Section({ title, icon: Icon, color = 'primary', children, action }) {
  return (
    <section className="bento-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${SECTION_COLORS[color] || SECTION_COLORS.primary}`}>
              <Icon size={15} />
            </div>
          )}
          <h2 className="font-semibold text-ink-1 text-sm">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ─── Section parrainage ─────────────────────────────────────────────────────── */
// Doit rester synchronisé avec REFERRAL_REWARD_DAYS dans referralController.js (backend)
const REFERRAL_REWARD_DAYS = 7;

function ReferralSection() {
  const { t } = useTranslation();
  const toast = useToast();
  const [code, setCode] = useState(null);
  const [count, setCount] = useState(0);
  const [rewardedCount, setRewardedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchCode = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/referrals/my-code');
      setCode(data.data.code);
      setCount(data.data.referralCount);
      setRewardedCount(data.data.rewardedCount || 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCode(); }, []);

  const handleCopy = () => {
    if (!code) return;
    const shareUrl = `${window.location.origin}?ref=${code}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (toast) toast(t('profile.referral.linkCopiedToast'), 'success');
    });
  };

  return (
    <Section title={t('profile.referral.title')} icon={Gift} color="pink">
      <p className="text-xs text-ink-3 leading-relaxed">
        {t('profile.referral.desc')}
      </p>

      {loading ? (
        <div className="h-10 bg-surface-700/40 rounded-xl animate-pulse" />
      ) : code ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-surface-700/40 border border-overlay/[0.07] rounded-xl px-3 py-2.5">
            <span className="text-primary-400 font-mono font-bold text-sm tracking-widest">{code}</span>
          </div>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-colors border ${
              copied
                ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                : 'bg-pink-500/15 text-pink-400 border-pink-500/25 hover:bg-pink-500/20'
            }`}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? t('profile.referral.copied') : t('profile.referral.copy')}
          </button>
        </div>
      ) : null}

      {count > 0 && (
        <p className="text-xs text-ink-3">
          {t('profile.referral.referredCount', { count })}
        </p>
      )}
      {rewardedCount > 0 && (
        <p className="text-xs text-primary-400 font-medium">
          {t('profile.referral.rewardedCount', { count: rewardedCount, days: rewardedCount * REFERRAL_REWARD_DAYS })}
        </p>
      )}
    </Section>
  );
}

/* ─── Section championnats favoris ───────────────────────────────────────────
   Modifiable après l'inscription (favoriteLeagues est fixé une fois à
   l'onboarding sinon, sans aucun moyen d'y revenir). Même endpoint /matches/
   competitions et même queryKey que Machine.jsx pour partager le cache. ─── */
function FavoriteLeaguesSection() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);

  const { data: competitionsData, isLoading: competitionsLoading } = useQuery({
    queryKey: ['machine-competitions'],
    queryFn: () => api.get('/matches/competitions').then((r) => r.data),
    staleTime: Infinity,
  });
  const competitions = competitionsData?.data || [];

  const favoriteIds = user?.profile?.favoriteLeagues || [];
  const favoriteCompetitions = useMemo(
    () => competitions.filter((c) => favoriteIds.includes(String(c.externalId))),
    [competitions, favoriteIds]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return competitions;
    return competitions.filter((c) => c.name?.toLowerCase().includes(q) || c.country?.toLowerCase().includes(q));
  }, [competitions, search]);

  const startEditing = () => {
    setSelected(favoriteIds);
    setSearch('');
    setEditing(true);
  };

  const toggle = (id) => {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const saveLeagues = useMutation({
    mutationFn: (leagues) => api.patch('/profiles/me', { favoriteLeagues: leagues }),
    onSuccess: async () => {
      await refreshUser();
      setEditing(false);
      if (toast) toast(t('profile.leagues.saved'), 'success');
    },
  });

  return (
    <Section title={t('profile.leagues.title')} icon={Trophy} color="violet">
      {!editing ? (
        <>
          {favoriteCompetitions.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-3">
              {favoriteCompetitions.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-overlay/[0.04] border border-overlay/[0.07] text-xs font-medium text-ink-2">
                  <CompetitionLogo logo={c.logo} size={16} />
                  {c.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-3 mb-3">{t('profile.leagues.empty')}</p>
          )}
          <button onClick={startEditing} className="btn-secondary w-full flex items-center justify-center gap-2">
            <Pencil size={14} /> {t('profile.leagues.edit')}
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('profile.leagues.searchPlaceholder')}
              className="input pl-9 text-sm"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
            {competitionsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-overlay/[0.04] animate-pulse" />
              ))
            ) : filtered.length === 0 ? (
              <p className="text-xs text-ink-4 text-center py-4">{t('profile.leagues.noResults')}</p>
            ) : (
              filtered.map((c) => {
                const id = String(c.externalId);
                const isActive = selected.includes(id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(id)}
                    aria-pressed={isActive}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-colors ${
                      isActive ? 'border-primary-500 bg-primary-500/10 text-primary-300' : 'border-overlay/[0.07] text-ink-3 hover:border-surface-500'
                    }`}
                  >
                    <CompetitionLogo logo={c.logo} size={20} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium truncate">{c.name}</span>
                      <span className="block text-[11px] text-ink-4 truncate">{c.country}</span>
                    </span>
                    {isActive && <Check size={14} className="text-primary-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => saveLeagues.mutate(selected)}
              disabled={saveLeagues.isPending}
              className="btn-primary flex-1"
            >
              {saveLeagues.isPending ? t('profile.saving') : t('profile.save')}
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary flex-1">
              {t('profile.cancel')}
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}

/* ─── Section préférences : pays / langue / devise ───────────────────────────
   Modifiable après l'inscription (ces champs sont figés une fois à
   l'onboarding sinon). Endpoint dédié /profiles/me/preferences, séparé de
   /me/onboarding qui touche aussi favoriteLeagues/favoriteTeams. ─── */
function PreferencesSection() {
  const { t, i18n } = useTranslation();
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [language, setLanguage] = useState(user?.language || 'fr');
  const [currency, setCurrency] = useState(user?.currency || 'FCFA');
  const [country,  setCountry]  = useState(user?.country  || '');

  const savePrefs = useMutation({
    mutationFn: () => api.patch('/profiles/me/preferences', { language, currency, country: country || undefined }),
    onSuccess: async () => {
      await refreshUser();
      if (toast) toast(t('profile.preferences.saved'), 'success');
    },
    onError: () => {
      if (toast) toast(t('profile.preferences.saveError'), 'error');
    },
  });

  const dirty =
    language !== (user?.language || 'fr') ||
    currency !== (user?.currency || 'FCFA') ||
    country  !== (user?.country  || '');

  return (
    <Section title={t('profile.preferences.title')} icon={Globe} color="cyan">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-ink-3 mb-1.5">{t('profile.preferences.language')}</label>
          <select
            value={language}
            onChange={(e) => {
              const code = e.target.value;
              setLanguage(code);
              // Traduction immédiate de l'interface — pas besoin d'attendre
              // "Enregistrer" pour voir l'effet (le clic sur Enregistrer ne
              // fait ensuite que persister ce choix sur le compte).
              i18n.changeLanguage(code);
            }}
            className="input w-full"
          >
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-3 mb-1.5">{t('profile.preferences.currency')}</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input w-full">
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-3 mb-1.5">{t('auth.countryPreference')}</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="input w-full">
            <option value="">{t('auth.countryPreferencePlaceholder')}</option>
            {COUNTRIES.map(({ code, flag, label }) => (
              <option key={code} value={code}>{flag} {label}</option>
            ))}
          </select>
        </div>
        {dirty && (
          <button
            onClick={() => savePrefs.mutate()}
            disabled={savePrefs.isPending}
            className="btn-primary w-full py-2.5 text-sm disabled:opacity-50"
          >
            {savePrefs.isPending ? t('profile.saving') : t('profile.save')}
          </button>
        )}
      </div>
    </Section>
  );
}

// Déduit un nom d'appareil lisible depuis le user-agent, pour que la liste
// des passkeys soit compréhensible ("iPhone", "Android", "Mac"...) sans
// demander à l'utilisateur de nommer lui-même son appareil.
function guessDeviceName() {
  const ua = navigator.userAgent || '';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  return 'Appareil';
}

/* ─── Section passkeys : connexion biométrique (Face ID / empreinte) ────────
   N'apparaît que si le navigateur supporte WebAuthn. Permet d'ajouter un
   appareil (registration) et de gérer/retirer les appareils déjà enregistrés. */
function PasskeysSection() {
  const { t } = useTranslation();
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
    queryKey: ['webauthn-devices'],
    queryFn: () => api.get('/auth/webauthn/devices').then((r) => r.data.data),
    enabled: passkeySupported,
  });

  const removeDevice = useMutation({
    mutationFn: (id) => api.delete(`/auth/webauthn/devices/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webauthn-devices'] });
      if (toast) toast(t('profile.passkeys.removed'), 'success');
    },
    onError: () => { if (toast) toast(t('profile.passkeys.removeError'), 'error'); },
  });

  const registerPasskey = async () => {
    setRegistering(true);
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');
      const { data: optData } = await api.post('/auth/webauthn/registration-options');
      const regResponse = await startRegistration({ optionsJSON: optData.data });
      await api.post('/auth/webauthn/registration-verify', { response: regResponse, deviceName: guessDeviceName() });
      hapticSuccess();
      qc.invalidateQueries({ queryKey: ['webauthn-devices'] });
      if (toast) toast(t('profile.passkeys.added'), 'success');
    } catch (err) {
      if (err?.name !== 'NotAllowedError') {
        if (toast) toast(err.response?.data?.message || t('profile.passkeys.addError'), 'error');
      }
    } finally {
      setRegistering(false);
    }
  };

  if (!passkeySupported) return null;

  return (
    <Section title={t('profile.passkeys.title')} icon={Fingerprint} color="blue">
      <p className="text-xs text-ink-3 mb-3">{t('profile.passkeys.desc')}</p>

      {isLoading ? (
        <div className="h-10 bg-surface-700 rounded-lg animate-pulse mb-3" />
      ) : devices?.length > 0 ? (
        <div className="space-y-1 mb-3">
          {devices.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-2 border-b border-overlay/[0.05] last:border-0">
              <div className="min-w-0">
                <p className="text-sm text-ink-2 truncate">{d.deviceName || t('profile.passkeys.unnamedDevice')}</p>
                <p className="text-xs text-ink-4">
                  {t('profile.passkeys.addedOn', { date: format(new Date(d.createdAt), 'd MMM yyyy') })}
                </p>
              </div>
              <button
                onClick={() => removeDevice.mutate(d.id)}
                disabled={removeDevice.isPending}
                className="text-xs text-red-400 hover:text-red-300 font-medium shrink-0 ml-2 disabled:opacity-50"
              >
                {t('profile.passkeys.remove')}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-ink-4 mb-3">{t('profile.passkeys.none')}</p>
      )}

      <button onClick={registerPasskey} disabled={registering} className="btn-secondary w-full py-2.5 text-sm disabled:opacity-50">
        {registering ? t('profile.saving') : t('profile.passkeys.addCta')}
      </button>
    </Section>
  );
}

/* ─── Changer l'adresse email — formulaire inline ─────────────────────────────
   Exige le mot de passe actuel si le compte en a un (voir hasPassword côté
   /auth/me). Repasse emailVerified à false côté backend et envoie un nouveau
   lien de vérification vers la nouvelle adresse. */
function ChangeEmailRow({ user, refreshUser }) {
  const { t } = useTranslation();
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
      if (toast) toast(t('profile.changeEmail.successToast'), 'success');
    },
    onError: (err) => {
      setError(err?.response?.data?.message || t('profile.changeEmail.genericError'));
    },
  });

  const canSubmit = /\S+@\S+\.\S+/.test(newEmail) && (!user?.hasPassword || currentPassword.length > 0);

  if (!editing) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-overlay/[0.05]">
        <div className="flex items-center gap-2">
          <Mail size={14} className="text-ink-3" />
          <span className="text-sm text-ink-3">{t('profile.email')}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-3 truncate max-w-[160px]">{user?.email}</span>
          <button
            onClick={() => { setEditing(true); setNewEmail(''); setCurrentPassword(''); setError(''); }}
            className="text-xs text-primary-400 hover:text-primary-300 font-medium shrink-0"
          >
            {t('profile.changeEmail.editCta')}
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
          <span className="text-sm text-ink-2 font-medium">{t('profile.changeEmail.newEmailPlaceholder')}</span>
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
        <PasswordField
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder={t('profile.changeEmail.currentPasswordConfirmPlaceholder')}
          autoComplete="current-password"
        />
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        onClick={() => mutation.mutate()}
        disabled={!canSubmit || mutation.isPending}
        className="btn-primary w-full py-2 text-sm disabled:opacity-40"
      >
        {mutation.isPending ? t('profile.changeEmail.sendingCta') : t('profile.changeEmail.submitCta')}
      </button>
    </div>
  );
}

/* ─── Changer le mot de passe — formulaire inline ─────────────────────────────
   Si le compte n'a pas encore de mot de passe (Google), pas de champ "actuel"
   — même logique que le backend (voir routes/profiles.js PATCH /me/password). */
function ChangePasswordRow({ user }) {
  const { t } = useTranslation();
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
      if (toast) toast(t('profile.changePassword.successToast'), 'success');
    },
    onError: (err) => {
      setError(err?.response?.data?.message || t('profile.changePassword.genericError'));
    },
  });

  const canSubmit =
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    (!user?.hasPassword || currentPassword.length > 0);

  if (!editing) {
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-ink-3">{user?.hasPassword ? t('profile.password') : t('profile.googleLogin')}</span>
        <button
          onClick={() => { setEditing(true); reset(); }}
          className="text-xs text-primary-400 hover:text-primary-300 font-medium"
        >
          {user?.hasPassword ? t('profile.editPassword') : t('profile.setPassword')}
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
            {user?.hasPassword ? t('profile.changePassword.title') : t('profile.changePassword.setTitle')}
          </span>
        </div>
        <button onClick={() => setEditing(false)} className="text-ink-4 hover:text-ink-2 transition-colors">
          <X size={15} />
        </button>
      </div>
      {user?.hasPassword && (
        <PasswordField
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder={t('profile.changePassword.currentPlaceholder')}
          autoComplete="current-password"
        />
      )}
      <PasswordField
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder={t('profile.changePassword.newPlaceholder')}
        autoComplete="new-password"
      />
      <PasswordField
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder={t('profile.changePassword.confirmPlaceholder')}
        autoComplete="new-password"
      />
      {newPassword.length > 0 && newPassword.length < 8 && (
        <p className="text-xs text-amber-400">{t('profile.changePassword.tooShortError')}</p>
      )}
      {confirmPassword.length > 0 && newPassword !== confirmPassword && (
        <p className="text-xs text-amber-400">{t('profile.changePassword.mismatchError')}</p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        onClick={() => mutation.mutate()}
        disabled={!canSubmit || mutation.isPending}
        className="btn-primary w-full py-2 text-sm disabled:opacity-40"
      >
        {mutation.isPending ? t('profile.changePassword.savingCta') : t('profile.changePassword.submitCta')}
      </button>
    </div>
  );
}

/* ─── Section jeu responsable : pause auto-imposée ───────────────────────────
   Bloque côté backend la génération de tickets + l'initiation de paiement
   tant que selfExclusionUntil n'est pas expiré (voir middleware/auth.js).
   Volontairement pas de bouton pour annuler une pause en cours — sinon elle
   ne sert à rien comme garde-fou. ─── */
const SELF_EXCLUSION_DURATIONS = [
  { days: 1,  labelKey: 'profile.selfExclusion.duration24h' },
  { days: 7,  labelKey: 'profile.selfExclusion.duration7d' },
  { days: 30, labelKey: 'profile.selfExclusion.duration30d' },
];

function SelfExclusionSection() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [pendingDays, setPendingDays] = useState(null);

  const activeUntil = user?.selfExclusionUntil && new Date(user.selfExclusionUntil) > new Date()
    ? new Date(user.selfExclusionUntil)
    : null;

  const activate = useMutation({
    mutationFn: (days) => api.post('/profiles/me/self-exclusion', { days }),
    onSuccess: async () => {
      await refreshUser();
      setPendingDays(null);
      if (toast) toast(t('profile.selfExclusion.activatedToast'), 'success');
    },
    onError: (err) => {
      if (toast) toast(err?.response?.data?.message || t('profile.selfExclusion.error'), 'error');
    },
  });

  return (
    <Section title={t('profile.selfExclusion.title')} icon={PauseCircle} color="amber">
      <p className="text-xs text-ink-3 leading-relaxed">
        {t('profile.selfExclusion.desc')}
      </p>

      {activeUntil ? (
        <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2.5">
          <PauseCircle size={16} className="text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300">
            {t('profile.selfExclusion.activeUntil', { date: format(activeUntil, 'dd MMM yyyy', { locale: dateLocale }) })}
          </p>
        </div>
      ) : pendingDays ? (
        <div className="space-y-2 bg-surface-700/30 border border-overlay/[0.07] rounded-xl p-3">
          <p className="text-xs text-ink-2">
            {t('profile.selfExclusion.confirmPrompt', { days: pendingDays })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => activate.mutate(pendingDays)}
              disabled={activate.isPending}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-white transition-colors disabled:opacity-50"
            >
              {activate.isPending ? t('profile.saving') : t('profile.selfExclusion.confirmBtn')}
            </button>
            <button onClick={() => setPendingDays(null)} className="flex-1 py-2 rounded-lg text-xs font-semibold btn-secondary">
              {t('profile.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {SELF_EXCLUSION_DURATIONS.map(({ days, labelKey }) => (
            <button
              key={days}
              onClick={() => setPendingDays(days)}
              className="flex-1 min-w-[90px] py-2 rounded-lg text-xs font-semibold border border-overlay/[0.1] text-ink-2 hover:border-amber-500/40 hover:text-amber-400 transition-colors"
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ─── Modale de suppression de compte ────────────────────────────────────────── */
function DeleteAccountModal({ requiresPassword, onClose }) {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const CONFIRM_WORD = t('profile.deleteAccount.confirmWord');

  const deleteAccount = useMutation({
    mutationFn: () => api.delete('/profiles/me', { data: requiresPassword ? { password } : {} }),
    onSuccess: async () => {
      if (toast) toast(t('profile.deleteAccount.doneToast'), 'success');
      await logout();
    },
    onError: (err) => {
      setError(err?.response?.data?.message || t('profile.deleteAccount.error'));
    },
  });

  const canSubmit = confirmText.trim().toUpperCase() === CONFIRM_WORD.toUpperCase() && (!requiresPassword || password.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-red-500/25 p-5 space-y-4"
        style={{ background: 'var(--color-card)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} />
          </div>
          <h3 className="font-semibold text-ink-1 text-sm">{t('profile.deleteAccount.modalTitle')}</h3>
        </div>

        <p className="text-xs text-ink-3 leading-relaxed">{t('profile.deleteAccount.warning')}</p>

        {requiresPassword && (
          <div>
            <label className="block text-xs font-medium text-ink-3 mb-1.5">{t('profile.password')}</label>
            <PasswordField
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full"
              autoComplete="current-password"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-ink-3 mb-1.5">
            {t('profile.deleteAccount.typeToConfirm', { word: CONFIRM_WORD })}
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="input w-full"
            placeholder={CONFIRM_WORD}
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">
            {t('profile.cancel')}
          </button>
          <button
            onClick={() => deleteAccount.mutate()}
            disabled={!canSubmit || deleteAccount.isPending}
            className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-red-500 hover:bg-red-400 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleteAccount.isPending ? t('profile.deleteAccount.deleting') : t('profile.deleteAccount.confirmBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Section contact / support fpronix ────────────────────────────────────── */
const SUPPORT_EMAIL = 'support@fpronix.com';
const SUPPORT_WHATSAPP = '+221787308706';
const SUPPORT_WHATSAPP_LINK = 'https://wa.me/221787308706';

function ContactSection() {
  const { t } = useTranslation();
  return (
    <Section title={t('profile.contact.title')} icon={HelpCircle} color="cyan">
      <p className="text-xs text-ink-3 leading-relaxed mb-1">
        {t('profile.contact.desc')}
      </p>
      <div className="space-y-2">
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="flex items-center justify-between gap-2 bg-surface-700/40 border border-overlay/[0.07] rounded-xl px-3 py-2.5 hover:border-overlay/[0.15] transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Mail size={15} className="text-ink-3 shrink-0" />
            <span className="text-sm text-ink-3 truncate">{SUPPORT_EMAIL}</span>
          </div>
          <ChevronRight size={14} className="text-ink-4 shrink-0" />
        </a>
        <a
          href={SUPPORT_WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-2 bg-primary-500/10 border border-primary-500/25 rounded-xl px-3 py-2.5 hover:border-primary-500/40 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle size={15} className="text-primary-400 shrink-0" />
            <span className="text-sm text-primary-300 font-medium truncate">{SUPPORT_WHATSAPP}</span>
          </div>
          <ChevronRight size={14} className="text-primary-500/60 shrink-0" />
        </a>
      </div>
    </Section>
  );
}

/* ─── Section "Mes tickets" (support humain) ────────────────────────────────── */
const TICKET_STATUS_STYLE = {
  OPEN:        'bg-blue-500/15 text-blue-400',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-400',
  RESOLVED:    'bg-emerald-500/15 text-emerald-400',
  CLOSED:      'bg-gray-500/15 text-ink-3',
};

function TicketStatusBadge({ status }) {
  const { t } = useTranslation();
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${TICKET_STATUS_STYLE[status] || TICKET_STATUS_STYLE.OPEN}`}>
      {t(`profile.tickets.status.${status}`)}
    </span>
  );
}

function TicketCard({ ticket, onReply }) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    await onReply(ticket.id, reply.trim());
    setReply('');
    setSending(false);
  };

  return (
    <div className="rounded-xl border border-overlay/[0.08] overflow-hidden" style={{ background: 'rgb(var(--overlay-rgb) / 0.02)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-overlay/[0.03] transition-colors"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-1 truncate">{ticket.subject}</p>
          <p className="text-[11px] text-ink-3 mt-0.5">
            {format(new Date(ticket.createdAt), 'dd MMM yyyy', { locale: dateLocale })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TicketStatusBadge status={ticket.status} />
          <ChevronRight size={14} className={`text-ink-4 transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-overlay/[0.06] px-3 py-3 space-y-2">
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {ticket.messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isAdmin ? '' : 'justify-end'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  msg.isAdmin ? 'bg-surface-700 text-ink-2' : 'bg-primary-500/15 text-ink-1'
                }`}>
                  <p>{msg.content}</p>
                  <p className="text-[10px] text-ink-4 mt-1">
                    {format(new Date(msg.createdAt), 'dd MMM HH:mm', { locale: dateLocale })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {ticket.status !== 'CLOSED' && (
            <div className="flex gap-2 pt-1">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                placeholder={t('profile.tickets.replyPlaceholder')}
                className="flex-1 bg-surface-700/40 border border-overlay/[0.07] rounded-xl px-3 py-2 text-xs text-ink-2 placeholder-ph-a focus:outline-none focus:border-primary-500"
              />
              <button
                onClick={send}
                disabled={!reply.trim() || sending}
                className="px-3 rounded-xl bg-primary-500 text-white text-xs font-semibold disabled:opacity-40 hover:bg-primary-400 transition-colors shrink-0"
              >
                {t('profile.tickets.send')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SupportTicketsSection() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['my-support-tickets'],
    queryFn: () => api.get('/support/tickets/mine').then((r) => r.data),
  });
  const tickets = data?.data || [];

  const createTicket = async () => {
    if (subject.trim().length < 3 || message.trim().length < 10 || creating) return;
    setCreating(true);
    try {
      await api.post('/support/tickets', { subject: subject.trim(), message: message.trim() });
      setSubject('');
      setMessage('');
      setShowNew(false);
      toast(t('profile.tickets.createdToast'), 'success');
      qc.invalidateQueries({ queryKey: ['my-support-tickets'] });
    } catch {
      toast(t('profile.tickets.createError'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const reply = async (id, content) => {
    try {
      await api.post(`/support/tickets/${id}/reply`, { content });
      qc.invalidateQueries({ queryKey: ['my-support-tickets'] });
    } catch {
      toast(t('profile.tickets.replyError'), 'error');
    }
  };

  return (
    <Section
      title={t('profile.tickets.title')}
      icon={MessageCircle}
      color="indigo"
      action={
        <button
          onClick={() => setShowNew((s) => !s)}
          className="text-[12px] font-semibold text-primary-400 hover:text-primary-300 transition-colors"
        >
          {showNew ? t('profile.tickets.cancel') : t('profile.tickets.newTicket')}
        </button>
      }
    >
      {showNew && (
        <div className="space-y-2 bg-surface-700/30 border border-overlay/[0.06] rounded-xl p-3">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('profile.tickets.subjectPlaceholder')}
            className="w-full bg-surface-700/60 border border-overlay/[0.07] rounded-xl px-3 py-2 text-sm text-ink-2 placeholder-ph-a focus:outline-none focus:border-primary-500"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('profile.tickets.messagePlaceholder')}
            rows={3}
            className="w-full bg-surface-700/60 border border-overlay/[0.07] rounded-xl px-3 py-2 text-sm text-ink-2 placeholder-ph-a focus:outline-none focus:border-primary-500 resize-none"
          />
          <button
            onClick={createTicket}
            disabled={subject.trim().length < 3 || message.trim().length < 10 || creating}
            className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-400 disabled:opacity-40 transition-colors"
          >
            {t('profile.tickets.submit')}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="h-16 bg-surface-700/40 rounded-xl animate-pulse" />
      ) : tickets.length === 0 ? (
        !showNew && (
          <div className="text-center py-6">
            <MessageCircle size={22} className="mx-auto text-ink-4 mb-2" />
            <p className="text-xs text-ink-3 mb-3">{t('profile.tickets.noTickets')}</p>
            <button
              onClick={() => setShowNew(true)}
              className="text-[12px] font-semibold text-primary-400 hover:text-primary-300 transition-colors"
            >
              {t('profile.tickets.newTicket')}
            </button>
          </div>
        )
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} onReply={reply} />)}
        </div>
      )}
    </Section>
  );
}

/* ─── Carte "numéro manquant" ────────────────────────────────────────────────
   Affichée de façon proéminente en haut de la page tant que le profil n'a pas
   de téléphone — c'est ce que la bannière (IncompleteProfileBanner) promet en
   redirigeant ici : dire exactement quoi compléter, pas un formulaire caché. */
function PhoneCompletionCard({ user, refreshUser }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [code, setCode] = useState('+221');
  const [number, setNumber] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (phone) => api.patch('/profiles/me', { phone }),
    onSuccess: async () => {
      await refreshUser();
      setNumber('');
      setError('');
      if (toast) toast(t('profile.phoneCard.successToast'), 'success');
    },
    onError: (err) => {
      setError(err?.response?.data?.message || t('profile.phoneCard.genericError'));
    },
  });

  // Ne s'affiche que si le numéro manque vraiment.
  if (user?.profile?.phone) return null;

  const digits = number.trim().replace(/\s+/g, '');
  const canSubmit = digits.length >= 6;

  const handleSubmit = () => {
    if (!canSubmit) return;
    mutation.mutate(`${code}${digits}`);
  };

  return (
    <div className="flex flex-col gap-3 px-4 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/25">
      <div className="flex items-start gap-2.5">
        <Phone size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-200">{t('profile.phoneCard.title')}</p>
          <p className="text-xs text-amber-200/70 mt-0.5 leading-relaxed">{t('profile.phoneCard.desc')}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <select
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="input w-[110px] shrink-0 text-sm"
          aria-label={t('profile.phoneLabel')}
        >
          {PHONE_CODES.map((c) => (
            <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="numeric"
          className="input flex-1"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder={t('profile.phonePlaceholder')}
          maxLength={15}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || mutation.isPending}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? t('profile.saving') : t('profile.phoneCard.submitCta')}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   Page principale
══════════════════════════════════════════════════════════════════════════════ */
export default function Profile() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr;
  const { user, logout, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  /* état édition */
  const [editing,   setEditing]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const initForm = () => ({
    displayName: user?.profile?.displayName || '',
    bio:         user?.profile?.bio         || '',
    avatar:      user?.profile?.avatar      || '',
    notifEmail:  user?.profile?.notifEmail  ?? true,
    notifSms:    user?.profile?.notifSms    ?? false,
  });

  // Le numéro est toujours stocké avec son indicatif (ex: "+221771234567") —
  // on le décompose pour l'édition afin de forcer le choix de l'indicatif.
  const initPhoneParts = () => {
    const existing = user?.profile?.phone || '';
    const parsed = matchPhoneCode(existing);
    return {
      code:   parsed?.code || '+221',
      number: parsed ? existing.slice(parsed.code.length) : '',
    };
  };

  const [form,          setForm]          = useState(initForm);
  const [phoneParts,    setPhoneParts]    = useState(initPhoneParts);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  /* ── Requêtes ─────────────────────────────────────────────────────────────── */
  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn:  () => api.get('/subscriptions/me').then((r) => r.data),
  });

  const { data: myTipsData } = useQuery({
    queryKey: ['my-tips'],
    queryFn:  () => api.get('/tips/my?limit=5').then((r) => r.data),
  });

  /* ── Mutation PATCH profil ────────────────────────────────────────────────── */
  const updateProfile = useMutation({
    mutationFn: (data) => api.patch('/profiles/me', data),
    onSuccess: async () => {
      await refreshUser();
      setSaved(true);
      setEditing(false);
      setAvatarPreview(null);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  /* ── Upload avatar ────────────────────────────────────────────────────────── */
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    setUploading(true);
    try {
      const base64 = await resizeToSquareBase64(file, 400);
      setAvatarPreview(base64);
      setForm((f) => ({ ...f, avatar: base64 }));
      await api.patch('/profiles/me', { avatar: base64 });
      await refreshUser();
      // Garde le preview même après refreshUser
      setAvatarPreview(base64);
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setAvatarPreview(null);
      alert(t('profile.avatarUploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    const digits = phoneParts.number.trim().replace(/\s+/g, '');
    const payload = { ...form };
    if (digits) payload.phone = `${phoneParts.code}${digits}`;
    updateProfile.mutate(payload);
  };

  const handleCancel = () => {
    setForm(initForm());
    setPhoneParts(initPhoneParts());
    setAvatarPreview(null);
    setEditing(false);
  };

  /* ── Données ──────────────────────────────────────────────────────────────── */
  const { subscription, payments } = subData?.data || {};
  const myTips = myTipsData?.data || [];
  const stats  = user?.tipsterStats;

  const avatarSrc    = avatarPreview || user?.profile?.avatar || null;
  const displayName  = user?.profile?.displayName || user?.username || '';
  const isGoogleUser = !!user?.googleId;
  const isPremium    = ['PREMIUM', 'LIFETIME'].includes(subscription?.plan?.code);

  /* ── Rendu ────────────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-5 animate-fade-in pb-28 md:pb-8">

      {/* ── Hero identité ─────────────────────────────────────────────────── */}
      <section className="bento-card">
        <div className="flex items-start gap-4">

          {/* Avatar + upload */}
          <div>
            <AvatarCircle
              src={avatarSrc}
              letter={displayName.charAt(0).toUpperCase()}
              size="lg"
              uploading={uploading}
              onClick={() => fileInputRef.current?.click()}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <p className="text-xs text-primary-400 font-semibold text-center mt-1.5">{t('profile.changePhoto')}</p>
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-ink-1 text-lg leading-tight truncate">
                {displayName}
              </p>
              {isPremium && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  <Crown size={10} /> {t('profile.premium')}
                </span>
              )}
            </div>
            <p className="text-ink-3 text-sm mt-0.5">@{user?.username}</p>
            <p className="text-ink-4 text-xs mt-0.5 truncate">{user?.email}</p>
            {user?.profile?.phone && !editing && (
              <p className="text-ink-4 text-xs mt-0.5 truncate flex items-center gap-1">
                <Phone size={11} className="shrink-0" /> {user.profile.phone}
              </p>
            )}

            {/* Membre depuis / dernière connexion */}
            {user?.createdAt && (
              <p className="text-ink-4 text-[11px] mt-1.5">
                {t('profile.memberSince', { date: format(new Date(user.createdAt), 'MMM yyyy', { locale: dateLocale }) })}
                {user?.lastLoginAt && (
                  <>
                    {' · '}
                    {t('profile.lastLogin', { date: format(new Date(user.lastLoginAt), 'dd MMM yyyy', { locale: dateLocale }) })}
                  </>
                )}
              </p>
            )}

            {/* Badge Google */}
            {isGoogleUser && (
              <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                <svg viewBox="0 0 20 20" className="w-3 h-3" fill="none">
                  <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0z" fill="white" opacity="0.1"/>
                  <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.867h5.38a4.6 4.6 0 01-1.997 3.018v2.51h3.232C18.343 15.78 19.6 13.27 19.6 10.227z" fill="#4285F4"/>
                  <path d="M10 20c2.7 0 4.964-.895 6.615-2.423l-3.232-2.509c-.895.6-2.04.955-3.383.955-2.6 0-4.8-1.755-5.59-4.118H1.064v2.59A9.997 9.997 0 0010 20z" fill="#34A853"/>
                  <path d="M4.41 11.905a5.968 5.968 0 010-3.81V5.505H1.064a9.997 9.997 0 000 9 l3.345-2.6z" fill="#FBBC05"/>
                  <path d="M10 3.977c1.468 0 2.782.505 3.818 1.495l2.863-2.863C14.959 1 12.695 0 10 0 6.09 0 2.71 2.24 1.063 5.505l3.346 2.59C5.2 5.732 7.4 3.977 10 3.977z" fill="#EA4335"/>
                </svg>
                {t('profile.googleConnected')}
              </span>
            )}

            {/* Bio */}
            {user?.profile?.bio && !editing && (
              <p className="text-ink-4 text-xs mt-2 leading-relaxed line-clamp-2">
                {user.profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* Succès */}
        {saved && (
          <div className="flex items-center gap-2 bg-primary-500/10 border border-primary-500/30 text-primary-400 text-sm rounded-xl px-4 py-2 mt-4">
            <Check size={14} /> {t('profile.profileUpdated')}
          </div>
        )}

        {/* ── Formulaire d'édition ─────────────────────────────────────────── */}
        {editing ? (
          <div className="space-y-4 mt-4 pt-4 border-t border-overlay/[0.06]">

            <div>
              <label className="block text-xs font-semibold text-ink-4 mb-1.5 uppercase tracking-wider">
                {t('profile.displayNameLabel')}
              </label>
              <input
                type="text"
                className="input"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                maxLength={50}
                placeholder={t('profile.displayNamePlaceholder')}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-4 mb-1.5 uppercase tracking-wider">
                {t('profile.bioLabel')}
              </label>
              <textarea
                className="input resize-none h-24"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                maxLength={300}
                placeholder={t('profile.bioPlaceholder')}
              />
              <p className="text-right text-xs text-ink-4 mt-0.5">
                {form.bio.length}/300
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-4 mb-1.5 uppercase tracking-wider">
                {t('profile.phoneLabel')}
              </label>
              <div className="flex gap-2">
                <select
                  value={phoneParts.code}
                  onChange={(e) => setPhoneParts({ ...phoneParts, code: e.target.value })}
                  className="input w-[110px] shrink-0 text-sm"
                  aria-label={t('profile.phoneLabel')}
                >
                  {PHONE_CODES.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  inputMode="numeric"
                  className="input flex-1"
                  value={phoneParts.number}
                  onChange={(e) => setPhoneParts({ ...phoneParts, number: e.target.value })}
                  maxLength={15}
                  placeholder={t('profile.phonePlaceholder')}
                />
              </div>
              <p className="text-xs text-ink-4 mt-1">{t('profile.phoneHint')}</p>
            </div>

            <div className="space-y-3 pt-1">
              <p className="text-xs font-semibold text-ink-4 uppercase tracking-wider">
                {t('profile.notifications')}
              </p>
              <Toggle
                checked={form.notifEmail}
                onChange={(v) => setForm({ ...form, notifEmail: v })}
                label={t('profile.emailAlerts')}
              />
              <Toggle
                checked={form.notifSms}
                onChange={(v) => setForm({ ...form, notifSms: v })}
                label={t('profile.smsAlerts')}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={updateProfile.isPending}
                className="btn-primary flex-1"
              >
                {updateProfile.isPending ? t('profile.saving') : t('profile.save')}
              </button>
              <button onClick={handleCancel} className="btn-secondary flex-1">
                {t('profile.cancel')}
              </button>
            </div>

            {updateProfile.isError && (
              <p className="text-red-400 text-xs text-center">
                {t('profile.saveError')}
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={() => { setForm(initForm()); setPhoneParts(initPhoneParts()); setEditing(true); }}
            className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
          >
            <Pencil size={14} /> {t('profile.editProfile')}
          </button>
        )}
      </section>

      {/* ── Numéro manquant : proéminent, dit exactement quoi compléter ──────── */}
      <PhoneCompletionCard user={user} refreshUser={refreshUser} />

      {/* ── Abonnement ────────────────────────────────────────────────────────── */}
      <Section title={t('profile.subscription')} icon={Crown} color="amber">
        {subLoading ? (
          <SkeletonCard />
        ) : subscription ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <PlanBadge planCode={subscription.plan?.code} />
                <p className="text-xs text-ink-3">
                  {subscription.status === 'ACTIVE'
                    ? subscription.endDate
                      ? t('profile.expiresOn', { date: format(new Date(subscription.endDate), 'dd MMM yyyy', { locale: dateLocale }) })
                      : t('profile.noExpiration')
                    : <span className="text-red-400">{t('profile.expired')}</span>
                  }
                </p>
              </div>
              <Link
                to="/abonnement"
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 border transition-colors ${
                  subscription.plan?.code === 'FREE'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                    : 'bg-primary-500/10 border-primary-500/25 text-primary-400 hover:bg-primary-500/15'
                }`}
              >
                {subscription.plan?.code === 'FREE' ? (
                  <><Crown size={12} /> {t('profile.goPremium')}</>
                ) : t('profile.manage')}
              </Link>
            </div>

            {payments?.length > 0 && (
              <details className="group">
                <summary className="text-xs text-ink-3 cursor-pointer hover:text-ink-2 list-none flex items-center gap-1">
                  <ChevronRight size={12} className="group-open:rotate-90 transition-transform" />
                  {t('profile.paymentHistory', { count: payments.length })}
                </summary>
                <div className="mt-2 space-y-1.5 text-xs">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-1.5 border-b border-surface-700/60 last:border-0"
                    >
                      <span className="text-ink-3">
                        {format(new Date(p.createdAt), 'dd/MM/yyyy', { locale: dateLocale })}
                      </span>
                      <span className="text-ink-4">{p.method}</span>
                      <span className="text-ink-3 font-medium">
                        {p.amount.toLocaleString('fr-FR')} FCFA
                      </span>
                      <span className={p.status === 'COMPLETED' ? 'text-primary-400' : 'text-red-400'}>
                        {p.status === 'COMPLETED' ? '✓' : '✗'}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ) : (
          <p className="text-ink-3 text-sm">{t('profile.noSubscription')}</p>
        )}
      </Section>

      {/* ── Statistiques tipster ──────────────────────────────────────────────── */}
      {stats && (
        <Section title={t('profile.myStats')} icon={TrendingUp} color="primary">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bento-card py-3">
              <p className="text-xl font-display font-bold text-ink-1">{stats.totalTips}</p>
              <p className="text-xs text-ink-3 mt-0.5">{t('profile.picks')}</p>
            </div>
            <div className="bento-card py-3">
              <p className="text-xl font-display font-bold text-primary-400">
                {stats.successRate?.toFixed(0)}%
              </p>
              <p className="text-xs text-ink-3 mt-0.5">{t('tipsters.successRate')}</p>
            </div>
            <div className="bento-card py-3">
              <p className="text-xl font-display font-bold text-ink-1">
                {stats.totalTips > 0 ? (stats.successRate / 10).toFixed(1) : '—'}
              </p>
              <p className="text-xs text-ink-3 mt-0.5">{t('profile.score')}</p>
            </div>
          </div>
          <div className="mt-1">
            <SuccessRateBar rate={stats.successRate} total={stats.totalTips} />
          </div>
          <Link to={`/tipsters/${user.id}`} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
            <Star size={14} /> {t('profile.viewPublicProfile')}
          </Link>
        </Section>
      )}

      {/* ── Pronostics récents ────────────────────────────────────────────────── */}
      {myTips.length > 0 && (
        <section>
          <h2 className="font-semibold text-ink-1 text-sm mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-ink-3" />
            {t('profile.recentPicksTitle')}
          </h2>
          <div className="space-y-2">
            {myTips.map((tip) => (
              <Link
                key={tip.id}
                to={`/matchs/${tip.matchId}`}
                className="bento-card flex items-center justify-between gap-3 text-sm hover:border-overlay/10 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink-2 truncate">
                    {tip.match?.homeTeam} vs {tip.match?.awayTeam}
                  </p>
                  <p className="text-xs text-ink-3 mt-0.5 truncate">{tip.prediction}</p>
                </div>
                <span className={`badge shrink-0 ${
                  tip.result === 'WIN'  ? 'bg-primary-500/15 text-primary-400' :
                  tip.result === 'LOSS' ? 'bg-red-500/15 text-red-400' :
                                         'bg-surface-600 text-ink-3'
                }`}>
                  {tip.result === 'WIN' ? '✓ Gagné' :
                   tip.result === 'LOSS' ? '✗ Perdu' : 'Attente'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Sécurité / compte ─────────────────────────────────────────────────── */}
      <Section title={t('profile.account')} icon={Shield} color="blue">
        <div className="space-y-2">
          <ChangeEmailRow user={user} refreshUser={refreshUser} />
          <ChangePasswordRow user={user} />

          {isGoogleUser && (
            <p className="text-xs text-ink-4 flex items-center gap-1.5 pt-1">
              <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 shrink-0" fill="none">
                <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.867h5.38a4.6 4.6 0 01-1.997 3.018v2.51h3.232C18.343 15.78 19.6 13.27 19.6 10.227z" fill="#4285F4"/>
                <path d="M10 20c2.7 0 4.964-.895 6.615-2.423l-3.232-2.509c-.895.6-2.04.955-3.383.955-2.6 0-4.8-1.755-5.59-4.118H1.064v2.59A9.997 9.997 0 0010 20z" fill="#34A853"/>
                <path d="M4.41 11.905a5.968 5.968 0 010-3.81V5.505H1.064a9.997 9.997 0 000 9l3.345-2.6z" fill="#FBBC05"/>
                <path d="M10 3.977c1.468 0 2.782.505 3.818 1.495l2.863-2.863C14.959 1 12.695 0 10 0 6.09 0 2.71 2.24 1.063 5.505l3.346 2.59C5.2 5.732 7.4 3.977 10 3.977z" fill="#EA4335"/>
              </svg>
              {t('profile.googleLogin')}
            </p>
          )}

          <div className="flex items-center justify-between pt-3 mt-1 border-t border-overlay/[0.05]">
            <div className="flex items-center gap-2">
              <Trash2 size={14} className="text-red-400" />
              <span className="text-sm text-ink-3">{t('profile.deleteAccount.rowLabel')}</span>
            </div>
            <button onClick={() => setShowDeleteModal(true)} className="text-xs text-red-400 hover:text-red-300 font-medium">
              {t('profile.deleteAccount.rowAction')}
            </button>
          </div>
        </div>
      </Section>

      {/* ── Passkeys / connexion biométrique ─────────────────────────────────── */}
      <PasskeysSection />

      {/* ── Jeu responsable : pause auto-imposée ──────────────────────────────── */}
      <SelfExclusionSection />

      {/* ── Préférences (pays / langue / devise) ─────────────────────────────── */}
      <PreferencesSection />

      {/* ── Championnats favoris ──────────────────────────────────────────────── */}
      <FavoriteLeaguesSection />

      {/* ── Contact / support ─────────────────────────────────────────────────── */}
      <ContactSection />

      {/* ── Mes tickets support ──────────────────────────────────────────────── */}
      <SupportTicketsSection />

      {/* ── Parrainage ────────────────────────────────────────────────────────── */}
      <ReferralSection />

      {/* ── Déconnexion ───────────────────────────────────────────────────────── */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 text-sm text-red-400 hover:text-red-300 py-3 rounded-xl hover:bg-red-500/5 transition-colors border border-transparent hover:border-red-500/20"
      >
        <LogOut size={15} />
        {t('profile.logoutBtn')}
      </button>

      {/* ── Mentions légales / liens de bas de page (mobile uniquement — le
           bandeau global couvre déjà le PC) ─────────────────────────────────── */}
      <Disclaimer variant="inline" />

      {showDeleteModal && (
        <DeleteAccountModal requiresPassword={!isGoogleUser} onClose={() => setShowDeleteModal(false)} />
      )}
    </div>
  );
}
