import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import Disclaimer from './Disclaimer';
import PWABanner from '../ui/PWABanner';
import EmailVerifyBanner from '../ui/EmailVerifyBanner';
import IncompleteProfileBanner from '../ui/IncompleteProfileBanner';
import TrialBanner from '../ui/TrialBanner';
import ReviewPromptModal from '../ui/ReviewPromptModal';
import CookieBanner from '../ui/CookieBanner';
import SupportChat from '../ai/SupportChat';
import { useSwipeBack } from '../../hooks/useSwipeBack';

export default function Layout() {
  useSwipeBack();

  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <TrialBanner />
      <EmailVerifyBanner />
      <IncompleteProfileBanner />
      {/* pb-32 mobile (8rem) couvre la pastille flottante (64px + 0.6rem d'écart
          au bord) + safe-area iPhone ~34px + marge de respiration */}
      <main className="flex-1 pb-32 md:pb-0">
        <Outlet />
      </main>
      <Disclaimer />
      <BottomNav />
      <PWABanner />
      <SupportChat />
      <ReviewPromptModal />
      <CookieBanner />
    </div>
  );
}
