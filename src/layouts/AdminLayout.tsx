import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, CalendarClock, CreditCard, 
  FolderOpen, Kanban, MessageSquare, UserCog, 
  Bot, BarChart3, Settings, LogOut, Menu, X, Building2
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { logOut } from '../lib/firebase';
import { cn } from '../lib/utils';
import { initAIEventListeners, cleanupAIEventListeners } from '../services/ai/eventListeners';
import { startOrchestrator, stopOrchestrator } from '../services/ai/orchestrator';

const navigation = [
  { name: 'Home', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/admin/clients', icon: Users },
  { name: 'Deadlines', href: '/admin/deadlines', icon: CalendarClock },
  { name: 'Payments', href: '/admin/payments', icon: CreditCard },
  { name: 'Documents', href: '/admin/documents', icon: FolderOpen },
  { name: 'Practices', href: '/admin/practices', icon: Kanban },
  { name: 'Communications', href: '/admin/communications', icon: MessageSquare },
  { name: 'Collaborators', href: '/admin/collaborators', icon: UserCog },
  { name: 'AI Subagents', href: '/admin/ai-subagents', icon: Bot },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (profile?.role === 'admin') {
      initAIEventListeners(true);
      startOrchestrator(10); // Start orchestrator with 10 min interval
    }
    return () => {
      cleanupAIEventListeners();
      stopOrchestrator();
    };
  }, [profile]);

  const handleLogout = async () => {
    await logOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/80 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-4 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="bg-sky-500 p-1.5 rounded-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight">M&C Elaborazioni</h1>
              <p className="text-[10px] text-sky-400 font-medium tracking-wider">BUSINESS INTELLIGENCE</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-sky-500 text-white" 
                    : "hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}&background=0EA5E9&color=fff`} 
              alt="" 
              className="w-10 h-10 rounded-full bg-slate-800"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.full_name}</p>
              <p className="text-xs text-slate-400 capitalize">{profile?.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-slate-400 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Esci
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center px-4 lg:hidden">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="text-slate-500 hover:text-slate-700"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="ml-4 font-semibold text-slate-900">M&C Elaborazioni</span>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
