import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import PWABanner from '../ui/PWABanner';
import EmailVerifyBanner from '../ui/EmailVerifyBanner';
import TrialBanner from '../ui/TrialBanner';
import SupportChat from '../ai/SupportChat';
import { useSwipeBack } from '../../hooks/useSwipeBack';

export default function Layout() {
  useSwipeBack();

  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <TrialBanner />
      <EmailVerifyBanner />
      {/* pb-28 mobile (7rem) couvre nav 64px + safe-area iPhone ~34px + marge */}
      <main className="flex-1 pb-28 md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
      <PWABanner />
      <SupportChat />
    </div>
  );
}
