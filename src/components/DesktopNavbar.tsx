import { NavLink, Link } from 'react-router-dom';
import { Home, Users, Bell, User, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { NotificationButton } from './NotificationModal';

export function DesktopNavbar() {
  const { currentUser, expenses } = useApp();

  const pendingCount = currentUser
    ? expenses.filter(e => e.kind === 'payment' && e.status === 'pending' && e.splitWith?.[0] === currentUser.id).length
    : 0;

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Users, label: 'Groups', path: '/groups' },
    { icon: Bell, label: 'Activity', path: '/activity', badge: pendingCount },
    { icon: User, label: 'Account', path: '/account' },
  ];

  return (
    <header className="hidden md:block sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
            S/
          </div>
          <span className="text-base font-bold text-slate-900 tracking-tight">
            Splits
          </span>
        </Link>

        {/* Center Nav Links */}
        <nav className="flex items-center gap-1">
          {navItems.map(({ icon: Icon, label, path, badge }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <Icon size={16} strokeWidth={2} />
              <span>{label}</span>
              {Boolean(badge && badge > 0) && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-bold rounded-full">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right User & Action Controls */}
        <div className="flex items-center gap-3">
          <NotificationButton />

          <Link to="/add-expense">
            <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold shadow-sm shadow-slate-900/10 transition-all flex items-center gap-1.5 active:scale-95">
              <Plus size={16} strokeWidth={2.5} />
              Add Expense
            </button>
          </Link>

          {currentUser && (
            <Link to="/account" className="flex items-center gap-2.5 p-1 pr-3 rounded-full hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200">
              <img
                src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=0f172a&color=ffffff&bold=true`}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shadow-2xs"
              />
              <span className="text-xs font-bold text-slate-800 hidden lg:inline">
                {currentUser.name}
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
