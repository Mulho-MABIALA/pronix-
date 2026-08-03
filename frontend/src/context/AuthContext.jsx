import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import i18n from '../i18n';

const AuthContext = createContext(null);

// Applique la langue enregistrée sur le compte lors de la connexion sur un
// nouvel appareil/navigateur — sans écraser un choix manuel déjà fait sur
// CET appareil via le sélecteur de langue (localStorage 'fpronix_lang').
function applyAccountLanguage(user) {
  if (!user?.language) return;
  const manualOverride = localStorage.getItem('fpronix_lang');
  if (!manualOverride) i18n.changeLanguage(user.language);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Les tokens vivent désormais dans des cookies httpOnly posés par le serveur
  // (plus de localStorage) — on ne peut donc plus "voir" si l'utilisateur est
  // connecté côté JS ; on le déduit en interrogeant /auth/me au chargement.
  const loadUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data);
      applyAccountLanguage(data.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  // Connexion mot de passe. Cas particulier : un compte ADMIN avec passkey déjà
  // enregistrée ne reçoit pas de session directement — le serveur renvoie
  // code:'PASSKEY_REQUIRED' + un jeton d'étape à confirmer via
  // loginWithPasskeyStepUp() (voir Login.jsx).
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.code === 'PASSKEY_REQUIRED') {
      return { requiresPasskey: true, stepUpToken: data.data.stepUpToken };
    }
    setUser(data.data.user);
    applyAccountLanguage(data.data.user);
    return { user: data.data.user };
  };

  // Confirmation biométrique après mot de passe (comptes ADMIN protégés).
  // Contrairement à loginWithPasskey(), restreinte aux passkeys du compte déjà
  // identifié par mot de passe (allowCredentials côté serveur).
  const loginWithPasskeyStepUp = async (stepUpToken) => {
    const { startAuthentication } = await import('@simplewebauthn/browser');
    const { data: optData } = await api.post('/auth/webauthn/admin-step-up-options', { stepUpToken });
    const { options, challengeId } = optData.data;
    const authResponse = await startAuthentication({ optionsJSON: options });
    const { data } = await api.post('/auth/webauthn/admin-step-up-verify', { stepUpToken, challengeId, response: authResponse });
    setUser(data.data.user);
    applyAccountLanguage(data.data.user);
    return data.data.user;
  };

  const register = async (email, password, username, language, currency, ageConfirmed) => {
    const { data } = await api.post('/auth/register', { email, password, username, language, currency, ageConfirmed });
    setUser(data.data.user);
    return data.data.user;
  };

  const loginWithGoogle = async (credential, ageConfirmed) => {
    const { data } = await api.post('/auth/google', { credential, ageConfirmed });
    setUser(data.data.user);
    applyAccountLanguage(data.data.user);
    return data.data.user;
  };

  // Connexion biométrique (passkey) — "usernameless" : le navigateur propose
  // directement les passkeys enregistrées pour ce domaine, aucun email requis.
  const loginWithPasskey = async () => {
    const { startAuthentication } = await import('@simplewebauthn/browser');
    const { data: optData } = await api.post('/auth/webauthn/login-options');
    const { options, challengeId } = optData.data;
    const authResponse = await startAuthentication({ optionsJSON: options });
    const { data } = await api.post('/auth/webauthn/login-verify', { challengeId, response: authResponse });
    setUser(data.data.user);
    applyAccountLanguage(data.data.user);
    return data.data.user;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    setUser(null);
  };

  const refreshUser = loadUser;

  const userPlan = user?.subscription?.plan?.code || 'FREE';

  // Essai gratuit 7 jours après inscription
  const trialActive = !!(user?.trialEndsAt && new Date(user.trialEndsAt) > new Date());
  const trialDaysLeft = trialActive
    ? Math.ceil((new Date(user.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  // Premium = abonnement payant OU essai en cours
  const hasPaidPlan = ['PREMIUM', 'PRO', 'LIFETIME'].includes(userPlan);
  const isPremium = hasPaidPlan || trialActive;
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, loginWithPasskey, loginWithPasskeyStepUp, logout, refreshUser, userPlan, isPremium, hasPaidPlan, trialActive, trialDaysLeft, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
