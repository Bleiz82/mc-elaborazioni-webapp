import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, FolderOpen, CalendarClock, CreditCard, User, Bell } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { cn } from '../lib/utils';
import NotificationBell from '../components/NotificationBell';
import ThemeToggle from '../components/ThemeToggle';

const navigation = [
  { name: 'Home', href: '/client/home', icon: Home },
  { name: 'Documenti', href: '/client/documents', icon: FolderOpen },
  { name: 'Scadenze', href: '/client/deadlines', icon: CalendarClock },
  { name: 'Pagamenti', href: '/client/payments', icon: CreditCard },
  { name: 'Profilo', href: '/client/profile', icon: User },
];

export default function ClientLayout() {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col pb-16 lg:pb-0">
      {/* Mobile Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Benvenuto,</p>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
            {profile?.full_name?.split(' ')[0]}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900">
        <Outlet />
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center h-16 px-2 z-40 lg:hidden">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) => cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                isActive ? "text-sky-500" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn("w-6 h-6", isActive && "fill-sky-500/20")} />
                  {isActive && <span className="text-[10px] font-medium">{item.name}</span>}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
