import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import Disclaimer from './Disclaimer';
import PWABanner from '../ui/PWABanner';
import EmailVerifyBanner from '../ui/EmailVerifyBanner';
import SupportChat from '../ai/SupportChat';

export default function Layout() {
  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <EmailVerifyBanner />
      {/* pb-28 mobile (7rem) couvre nav 64px + safe-area iPhone ~34px + marge */}
      <main className="flex-1 pb-28 md:pb-0">
        <Outlet />
      </main>
      <Disclaimer />
      <BottomNav />
      <PWABanner />
      <SupportChat />
    </div>
  );
}
