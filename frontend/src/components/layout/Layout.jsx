import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import Disclaimer from './Disclaimer';

export default function Layout() {
  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <Disclaimer />
      <BottomNav />
    </div>
  );
}
