import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

import Layout from './components/layout/Layout';
// Home reste en import statique : c'est la page d'atterrissage la plus
// fréquente (visiteurs non connectés compris), pas besoin d'un aller-retour
// réseau supplémentaire juste pour elle. Tout le reste est chargé à la
// demande (React.lazy) — un audit PageSpeed a chiffré 559 Ko de JS inutilisé
// sur le bundle principal, en grande partie des pages jamais visitées par la
// plupart des utilisateurs (back-office admin en tête).
import Home from './pages/Home';

const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));

const Matches = lazy(() => import('./pages/Matches'));
const MatchDetail = lazy(() => import('./pages/MatchDetail'));
const Tipsters = lazy(() => import('./pages/Tipsters'));
const TipsterProfile = lazy(() => import('./pages/TipsterProfile'));
const Subscription = lazy(() => import('./pages/Subscription'));
const Profile = lazy(() => import('./pages/Profile'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const PaymentConfirmation = lazy(() => import('./pages/PaymentConfirmation'));
const News = lazy(() => import('./pages/News'));
const Standings = lazy(() => import('./pages/Standings'));
const Pronostics = lazy(() => import('./pages/Pronostics'));
const Filtres = lazy(() => import('./pages/Filtres'));
const Machine = lazy(() => import('./pages/Machine'));
const StatsLigues = lazy(() => import('./pages/StatsLigues'));
const NotFound = lazy(() => import('./pages/NotFound'));
const CGU = lazy(() => import('./pages/CGU'));
const PolitiqueConfidentialite = lazy(() => import('./pages/PolitiqueConfidentialite'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Transparency = lazy(() => import('./pages/Transparency'));
const Newsletter = lazy(() => import('./pages/Newsletter'));
const NewsletterUnsubscribe = lazy(() => import('./pages/NewsletterUnsubscribe'));
const CompetitionStandings = lazy(() => import('./pages/CompetitionStandings'));
const CompetitionPronostics = lazy(() => import('./pages/CompetitionPronostics'));
const CoupeDuMonde2026 = lazy(() => import('./pages/CoupeDuMonde2026'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const BetTracker = lazy(() => import('./pages/BetTracker'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const Comparateur = lazy(() => import('./pages/Comparateur'));
const BlogList = lazy(() => import('./pages/BlogList'));
const BlogPost = lazy(() => import('./pages/BlogPost'));

// Admin pages — jamais téléchargées par un visiteur/utilisateur normal
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const AdminTipsters = lazy(() => import('./pages/admin/Tipsters'));
const AdminCompetitions = lazy(() => import('./pages/admin/Competitions'));
const AdminPayments = lazy(() => import('./pages/admin/Payments'));
const AdminMatches = lazy(() => import('./pages/admin/AdminMatches'));
const AdminAgents = lazy(() => import('./pages/admin/Agents'));
const AdminFinances = lazy(() => import('./pages/admin/Finances'));
const AdminNotifications = lazy(() => import('./pages/admin/Notifications'));
const AdminSupport = lazy(() => import('./pages/admin/Support'));
const AdminPronostics = lazy(() => import('./pages/admin/AdminPronostics'));
const AdminCommentaires = lazy(() => import('./pages/admin/AdminCommentaires'));
const AdminBlog = lazy(() => import('./pages/admin/Blog'));
const AdminPartners = lazy(() => import('./pages/admin/Partners'));
const AdminNewsletter = lazy(() => import('./pages/admin/Newsletter'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/connexion" replace />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function AdminGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/connexion" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}

// ─── Écran de démarrage — évite le flash "invité" au lancement de l'app ──────
// Les tokens vivent dans des cookies httpOnly : on ne sait donc pas si la
// personne est connectée tant que /auth/me n'a pas répondu. Sans ce garde,
// les pages publiques (Home, Header, BottomNav...) affichent d'abord la
// version "non connecté" avant de basculer sur la version connectée dès que
// la réponse arrive — d'où le flash observé à chaque relance de la PWA.
function AppGate({ children }) {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <img
          src="/logo-circle.png"
          alt=""
          className="w-16 h-16 rounded-full animate-pulse"
        />
      </div>
    );
  }
  return children;
}

// Repli affiché le temps qu'un chunk de page (React.lazy) se télécharge —
// en pratique quasi invisible sur un chunk déjà en cache ou une connexion
// correcte, mais évite un écran blanc sur un premier chargement lent.
function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <img
        src="/logo-circle.png"
        alt=""
        className="w-10 h-10 rounded-full animate-pulse"
      />
    </div>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppGate>
          <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Routes publiques avec layout principal */}
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/matchs" element={<Matches />} />
                <Route path="/matchs/:id" element={<MatchDetail />} />
                <Route path="/tipsters" element={<Tipsters />} />
                <Route path="/tipsters/:userId" element={<TipsterProfile />} />
                <Route path="/abonnement" element={<Subscription />} />
                <Route path="/abonnement/confirmation" element={<PaymentConfirmation />} />
                <Route path="/abonnement/erreur" element={<PaymentConfirmation error />} />
                <Route path="/actualites" element={<News />} />
                <Route path="/classements" element={<Standings />} />
                <Route path="/classements/:slug" element={<CompetitionStandings />} />
                <Route path="/pronostics" element={<Pronostics />} />
                <Route path="/pronostics/:slug" element={<CompetitionPronostics />} />
                <Route path="/coupe-du-monde-2026" element={<CoupeDuMonde2026 />} />
                <Route path="/outils/filtres" element={<Filtres />} />
                <Route path="/outils/machine" element={<Machine />} />
                <Route path="/outils/stats-ligues" element={<StatsLigues />} />
                <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/cgu" element={<CGU />} />
                <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/transparence" element={<Transparency />} />
                <Route path="/newsletter" element={<Newsletter />} />
                <Route path="/newsletter/desinscription" element={<NewsletterUnsubscribe />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/mes-paris" element={<ProtectedRoute><BetTracker /></ProtectedRoute>} />
                <Route path="/equipes/:id" element={<TeamPage />} />
                <Route path="/comparateur" element={<Comparateur />} />
                <Route path="/blog" element={<BlogList />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="*" element={<NotFound />} />
              </Route>

              {/* Back-office admin — layout avec sidebar */}
              <Route element={<AdminGuard><AdminLayout /></AdminGuard>}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/utilisateurs" element={<AdminUsers />} />
                <Route path="/admin/tipsters" element={<AdminTipsters />} />
                <Route path="/admin/signalements" element={<AdminReports />} />
                <Route path="/admin/competitions" element={<AdminCompetitions />} />
                <Route path="/admin/matchs" element={<AdminMatches />} />
                <Route path="/admin/paiements" element={<AdminPayments />} />
                <Route path="/admin/finances" element={<AdminFinances />} />
                <Route path="/admin/notifications" element={<AdminNotifications />} />
                <Route path="/admin/agents" element={<AdminAgents />} />
                <Route path="/admin/blog" element={<AdminBlog />} />
                <Route path="/admin/support" element={<AdminSupport />} />
                <Route path="/admin/pronostics" element={<AdminPronostics />} />
                <Route path="/admin/commentaires" element={<AdminCommentaires />} />
                <Route path="/admin/partenaires" element={<AdminPartners />} />
                <Route path="/admin/newsletter" element={<AdminNewsletter />} />
              </Route>

              {/* Routes auth (sans layout) */}
              <Route path="/connexion" element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/inscription" element={<GuestRoute><Register /></GuestRoute>} />
              <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

            </Routes>
            </Suspense>
          </BrowserRouter>
          </ToastProvider>
          </AppGate>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
