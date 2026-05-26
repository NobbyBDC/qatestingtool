import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield, Code2, Eye, Search, LayoutDashboard,
  Users, LogOut, Menu, ChevronRight, Zap
} from 'lucide-react';

const NAV = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/security', icon: Shield, label: 'ZAP Security' },
  { path: '/sonarqube', icon: Code2, label: 'SonarQube' },
  { path: '/accessibility', icon: Eye, label: 'Accessibility' },
  { path: '/seo', icon: Search, label: 'SEO Audit' }
];

const ADMIN_NAV = [
  { path: '/admin', icon: Users, label: 'User Management' }
];

function NavItem({ item, onClick }) {
  const location = useLocation();
  const active = item.exact
    ? location.pathname === item.path
    : location.pathname.startsWith(item.path);

  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
        active
          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
      }`}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{item.label}</span>
      {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
    </Link>
  );
}

function SidebarContent({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800/80">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-slate-800/80 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-white tracking-tight">QA Suite</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          Testing
        </p>
        <div className="space-y-0.5">
          {NAV.map(item => (
            <NavItem key={item.path} item={item} onClick={onClose} />
          ))}
        </div>

        {user?.role === 'admin' && (
          <>
            <p className="px-3 mt-5 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Admin
            </p>
            <div className="space-y-0.5">
              {ADMIN_NAV.map(item => (
                <NavItem key={item.path} item={item} onClick={onClose} />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="flex-shrink-0 px-3 py-3 border-t border-slate-800/80 space-y-0.5">
        <Link
          to="/profile"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/60 transition-all group"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-200 truncate">{user?.username}</div>
            <div className="text-xs text-slate-500">
              {user?.role === 'admin' ? 'Administrator' : 'User'}
            </div>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-56 flex-shrink-0">
        <div className="w-full">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-56 h-full shadow-2xl">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 h-14 px-4 bg-slate-900 border-b border-slate-800">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-white">QA Suite</span>
        </div>

        <main className="flex-1 overflow-y-auto bg-slate-950">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
