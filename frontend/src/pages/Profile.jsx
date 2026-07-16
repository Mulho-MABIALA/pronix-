import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import {
  Camera, Check, ChevronRight, Crown, LogOut, Mail,
  Bell, BellOff, Pencil, Shield, Star, TrendingUp, X,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PlanBadge } from '../components/ui/Badge';
import SuccessRateBar from '../components/ui/SuccessRateBar';
import { SkeletonCard } from '../components/ui/SkeletonLoader';

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
            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
      <span className="text-sm text-gray-300">{label}</span>
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
function Section({ title, icon: Icon, children, action }) {
  return (
    <section className="bento-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-gray-500" />}
          <h2 className="font-semibold text-gray-100 text-sm">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   Page principale
══════════════════════════════════════════════════════════════════════════════ */
export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  /* état édition */
  const [editing,   setEditing]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved,     setSaved]     = useState(false);

  const initForm = () => ({
    displayName: user?.profile?.displayName || '',
    bio:         user?.profile?.bio         || '',
    avatar:      user?.profile?.avatar      || '',
    notifEmail:  user?.profile?.notifEmail  ?? true,
    notifSms:    user?.profile?.notifSms    ?? false,
  });

  const [form,          setForm]          = useState(initForm);
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
      // Auto-save avatar immédiatement
      await api.patch('/profiles/me', { avatar: base64 });
      await refreshUser();
    } catch (err) {
      console.error('Avatar upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => updateProfile.mutate(form);

  const handleCancel = () => {
    setForm(initForm());
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
            <p className="text-[10px] text-gray-600 text-center mt-1.5">Changer</p>
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-100 text-lg leading-tight truncate">
                {displayName}
              </p>
              {isPremium && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  <Crown size={10} /> Premium
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-0.5">@{user?.username}</p>
            <p className="text-gray-600 text-xs mt-0.5 truncate">{user?.email}</p>

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
                Connecté avec Google
              </span>
            )}

            {/* Bio */}
            {user?.profile?.bio && !editing && (
              <p className="text-gray-400 text-xs mt-2 leading-relaxed line-clamp-2">
                {user.profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* Succès */}
        {saved && (
          <div className="flex items-center gap-2 bg-primary-500/10 border border-primary-500/30 text-primary-400 text-sm rounded-xl px-4 py-2 mt-4">
            <Check size={14} /> Profil mis à jour
          </div>
        )}

        {/* ── Formulaire d'édition ─────────────────────────────────────────── */}
        {editing ? (
          <div className="space-y-4 mt-4 pt-4 border-t border-white/[0.06]">

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Nom affiché
              </label>
              <input
                type="text"
                className="input"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                maxLength={50}
                placeholder="Ton nom public"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Bio
              </label>
              <textarea
                className="input resize-none h-24"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                maxLength={300}
                placeholder="Parle-toi un peu... équipe favorite, style de jeu..."
              />
              <p className="text-right text-[10px] text-gray-600 mt-0.5">
                {form.bio.length}/300
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Notifications
              </p>
              <Toggle
                checked={form.notifEmail}
                onChange={(v) => setForm({ ...form, notifEmail: v })}
                label="Alertes par email"
              />
              <Toggle
                checked={form.notifSms}
                onChange={(v) => setForm({ ...form, notifSms: v })}
                label="Alertes SMS"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={updateProfile.isPending}
                className="btn-primary flex-1"
              >
                {updateProfile.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button onClick={handleCancel} className="btn-secondary flex-1">
                Annuler
              </button>
            </div>

            {updateProfile.isError && (
              <p className="text-red-400 text-xs text-center">
                Une erreur est survenue. Réessaie.
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={() => { setForm(initForm()); setEditing(true); }}
            className="btn-secondary w-full mt-4 flex items-center justify-center gap-2"
          >
            <Pencil size={14} /> Modifier le profil
          </button>
        )}
      </section>

      {/* ── Abonnement ────────────────────────────────────────────────────────── */}
      <Section title="Abonnement" icon={Crown}>
        {subLoading ? (
          <SkeletonCard />
        ) : subscription ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <PlanBadge planCode={subscription.plan?.code} />
                <p className="text-xs text-gray-500">
                  {subscription.status === 'ACTIVE'
                    ? subscription.endDate
                      ? `Expire le ${format(new Date(subscription.endDate), 'dd MMM yyyy', { locale: fr })}`
                      : 'Sans date d\'expiration'
                    : <span className="text-red-400">Expiré</span>
                  }
                </p>
              </div>
              <Link
                to="/abonnement"
                className={`btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 ${
                  subscription.plan?.code === 'FREE' ? 'border-amber-500/30 text-amber-400 hover:border-amber-400' : ''
                }`}
              >
                {subscription.plan?.code === 'FREE' ? (
                  <><Crown size={12} /> Passer Premium</>
                ) : 'Gérer'}
              </Link>
            </div>

            {payments?.length > 0 && (
              <details className="group">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 list-none flex items-center gap-1">
                  <ChevronRight size={12} className="group-open:rotate-90 transition-transform" />
                  Historique des paiements ({payments.length})
                </summary>
                <div className="mt-2 space-y-1.5 text-xs">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-1.5 border-b border-surface-700/60 last:border-0"
                    >
                      <span className="text-gray-500">
                        {format(new Date(p.createdAt), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                      <span className="text-gray-400">{p.method}</span>
                      <span className="text-gray-300 font-medium">
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
          <p className="text-gray-500 text-sm">Aucun abonnement trouvé</p>
        )}
      </Section>

      {/* ── Statistiques tipster ──────────────────────────────────────────────── */}
      {stats && (
        <Section title="Mes statistiques" icon={TrendingUp}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bento-card py-3">
              <p className="text-xl font-display font-bold text-gray-100">{stats.totalTips}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Pronostics</p>
            </div>
            <div className="bento-card py-3">
              <p className="text-xl font-display font-bold text-primary-400">
                {stats.successRate?.toFixed(0)}%
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">Taux de réussite</p>
            </div>
            <div className="bento-card py-3">
              <p className="text-xl font-display font-bold text-gray-100">
                {stats.totalTips > 0 ? (stats.successRate / 10).toFixed(1) : '—'}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">Score</p>
            </div>
          </div>
          <div className="mt-1">
            <SuccessRateBar rate={stats.successRate} total={stats.totalTips} />
          </div>
          <Link to={`/tipsters/${user.id}`} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
            <Star size={14} /> Voir mon profil public
          </Link>
        </Section>
      )}

      {/* ── Pronostics récents ────────────────────────────────────────────────── */}
      {myTips.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-100 text-sm mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-gray-500" />
            Mes pronostics récents
          </h2>
          <div className="space-y-2">
            {myTips.map((tip) => (
              <Link
                key={tip.id}
                to={`/matchs/${tip.matchId}`}
                className="bento-card flex items-center justify-between gap-3 text-sm hover:border-white/10 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-200 truncate">
                    {tip.match?.homeTeam} vs {tip.match?.awayTeam}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{tip.prediction}</p>
                </div>
                <span className={`badge shrink-0 ${
                  tip.result === 'WIN'  ? 'bg-primary-500/15 text-primary-400' :
                  tip.result === 'LOSS' ? 'bg-red-500/15 text-red-400' :
                                         'bg-surface-600 text-gray-500'
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
      <Section title="Compte" icon={Shield}>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-white/[0.05]">
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-gray-500" />
              <span className="text-sm text-gray-300">Email</span>
            </div>
            <span className="text-xs text-gray-500 truncate max-w-[180px]">{user?.email}</span>
          </div>

          {isGoogleUser ? (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 20 20" className="w-4 h-4 shrink-0" fill="none">
                  <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.867h5.38a4.6 4.6 0 01-1.997 3.018v2.51h3.232C18.343 15.78 19.6 13.27 19.6 10.227z" fill="#4285F4"/>
                  <path d="M10 20c2.7 0 4.964-.895 6.615-2.423l-3.232-2.509c-.895.6-2.04.955-3.383.955-2.6 0-4.8-1.755-5.59-4.118H1.064v2.59A9.997 9.997 0 0010 20z" fill="#34A853"/>
                  <path d="M4.41 11.905a5.968 5.968 0 010-3.81V5.505H1.064a9.997 9.997 0 000 9l3.345-2.6z" fill="#FBBC05"/>
                  <path d="M10 3.977c1.468 0 2.782.505 3.818 1.495l2.863-2.863C14.959 1 12.695 0 10 0 6.09 0 2.71 2.24 1.063 5.505l3.346 2.59C5.2 5.732 7.4 3.977 10 3.977z" fill="#EA4335"/>
                </svg>
                <span className="text-sm text-gray-300">Connexion Google</span>
              </div>
              <Link to="/mot-de-passe-oublie" className="text-xs text-primary-400 hover:text-primary-300">
                Définir un mot de passe
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-300">Mot de passe</span>
              <Link to="/mot-de-passe-oublie" className="text-xs text-primary-400 hover:text-primary-300">
                Modifier
              </Link>
            </div>
          )}
        </div>
      </Section>

      {/* ── Déconnexion ───────────────────────────────────────────────────────── */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 text-sm text-red-400 hover:text-red-300 py-3 rounded-xl hover:bg-red-500/5 transition-colors border border-transparent hover:border-red-500/20"
      >
        <LogOut size={15} />
        Se déconnecter
      </button>
    </div>
  );
}
