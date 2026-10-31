import { Home, Users, Bell, User, Plus } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';

export default function BottomNav() {
  const { currentUser, expenses } = useApp();

  const pendingCount = currentUser
    ? expenses.filter(e => e.kind === 'payment' && e.status === 'pending' && e.splitWith?.[0] === currentUser.id).length
    : 0;

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Users, label: 'Groups', path: '/groups' },
    { icon: Bell, label: 'Activity', path: '/activity', badge: pendingCount },
    { icon: User, label: 'Account', path: '/account' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 pb-safe-area md:hidden">
      <div className="flex justify-around items-center h-14 max-w-md mx-auto px-2">
        {navItems.slice(0, 2).map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-slate-900 font-semibold' : 'text-slate-400 hover:text-slate-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />
                <span className="text-[10px] mt-0.5 tracking-tight font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Center Add Action */}
        <Link to="/add-expense" className="px-2">
          <motion.div
            whileTap={{ scale: 0.94 }}
            className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm"
          >
            <Plus size={20} strokeWidth={2.4} />
          </motion.div>
        </Link>

        {navItems.slice(2).map(({ icon: Icon, label, path, badge }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-slate-900 font-semibold' : 'text-slate-400 hover:text-slate-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />
                  {Boolean(badge && badge > 0) && (
                    <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                      {badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
