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

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.data.user);
    applyAccountLanguage(data.data.user);
    return data.data.user;
  };

  const register = async (email, password, username, language, currency) => {
    const { data } = await api.post('/auth/register', { email, password, username, language, currency });
    setUser(data.data.user);
    return data.data.user;
  };

  const loginWithGoogle = async (credential) => {
    const { data } = await api.post('/auth/google', { credential });
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
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout, refreshUser, userPlan, isPremium, hasPaidPlan, trialActive, trialDaysLeft, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
