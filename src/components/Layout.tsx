import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import { DesktopNavbar } from './DesktopNavbar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 pb-24 md:pb-12 antialiased selection:bg-slate-900 selection:text-white">
      <DesktopNavbar />
      <div className="w-full max-w-md md:max-w-5xl lg:max-w-6xl mx-auto min-h-screen relative bg-transparent overflow-x-hidden">
        <main className="h-full overflow-y-auto">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
