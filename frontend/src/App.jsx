import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import Layout from './components/layout/Layout';
import AdminLayout from './components/admin/AdminLayout';

import Home from './pages/Home';
import Matches from './pages/Matches';
import MatchDetail from './pages/MatchDetail';
import Tipsters from './pages/Tipsters';
import TipsterProfile from './pages/TipsterProfile';
import Subscription from './pages/Subscription';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Onboarding from './pages/Onboarding';
import PaymentConfirmation from './pages/PaymentConfirmation';
import News from './pages/News';
import Standings from './pages/Standings';
import Pronostics from './pages/Pronostics';
import Filtres from './pages/Filtres';
import Machine from './pages/Machine';
import StatsLigues from './pages/StatsLigues';
import NotFound from './pages/NotFound';
import CGU from './pages/CGU';
import PolitiqueConfidentialite from './pages/PolitiqueConfidentialite';
import FAQ from './pages/FAQ';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminReports from './pages/admin/Reports';
import AdminTipsters from './pages/admin/Tipsters';
import AdminCompetitions from './pages/admin/Competitions';
import AdminPayments from './pages/admin/Payments';
import AdminMatches from './pages/admin/AdminMatches';
import AdminAgents from './pages/admin/Agents';

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
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
                <Route path="/actualites" element={<News />} />
                <Route path="/classements" element={<Standings />} />
                <Route path="/pronostics" element={<Pronostics />} />
                <Route path="/outils/filtres" element={<Filtres />} />
                <Route path="/outils/machine" element={<Machine />} />
                <Route path="/outils/stats-ligues" element={<StatsLigues />} />
                <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/cgu" element={<CGU />} />
                <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
                <Route path="/faq" element={<FAQ />} />
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
                <Route path="/admin/agents" element={<AdminAgents />} />
              </Route>

              {/* Routes auth (sans layout) */}
              <Route path="/connexion" element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/inscription" element={<GuestRoute><Register /></GuestRoute>} />
              <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
