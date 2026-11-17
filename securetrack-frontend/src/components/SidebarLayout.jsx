import NotificationMenu from './NotificationMenu';
import LogoutConfirmation from './LogoutConfirmation';
import useTranslation from '../useTranslation';
import React, { useState, useEffect } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Bell,
  Users,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  Truck,
  Search,
  Menu,
  X,
} from 'lucide-react';

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

const NAV_ITEMS = [
  { to: '/app/notifications', label: 'Notifications', icon: Bell, roles: ['OWNER', 'CUSTOM_OFFICER', 'CUSTOMS_OFFICER', 'INSPECTOR', 'DRIVER'] },
  { to: '/app/dashboard', label: 'Dashboard', icon: Home, roles: ['ADMIN', 'CUSTOM_OFFICER', 'OWNER'] },
  { to: '/app/available-vehicles', label: 'Available Vehicles', icon: Truck, roles: ['CUSTOM_OFFICER'] },
  { to: '/app/inspector-dashboard', label: 'Inspector Dashboard', icon: Home, roles: ['INSPECTOR'] },
  // Fakt INSPECTOR sathi navin Container Search tab:
  { to: '/app/container-search', label: 'Search Container', icon: Search, roles: ['INSPECTOR'] },
  { to: '/app/alerts', label: 'Alerts', icon: Bell, roles: ['CUSTOM_OFFICER', 'OWNER'] },
  { to: '/app/admin', label: 'Admin Panel', icon: Users, roles: ['ADMIN'] },
  { to: '/app/reports', label: 'Reports', icon: FileText, roles: ['CUSTOM_OFFICER'] },
  { to: '/app/driver', label: 'Driver Dashboard', icon: Truck, roles: ['DRIVER'] },
  { to: '/app/driver-alerts', label: 'Alerts', icon: Bell, roles: ['DRIVER'] },
  { to: '/app/settings', label: 'Settings', icon: SettingsIcon, roles: ['ADMIN', 'CUSTOM_OFFICER', 'INSPECTOR', 'DRIVER'] },
];

function SidebarLayout() {
  const t = useTranslation();
  const [profileName, setProfileName] = useState('');
  useEffect(() => {
    const updateProfile = ({ detail }) => {
      setProfileName([detail?.firstName, detail?.lastName].filter(Boolean).join(' '));
    };
    window.addEventListener('user-profile-changed', updateProfile);
    return () => window.removeEventListener('user-profile-changed', updateProfile);
  }, []);
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  const [currentUser, setCurrentUser] = useState(() => ({
    username: 'User',
    role: localStorage.getItem('role') || 'UNKNOWN',
  }));

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = parseJwt(token);
      if (decoded) {
        setCurrentUser({
          username: decoded.sub || decoded.username || 'Officer',
          role: storedRole || decoded.role || 'CUSTOMS_OFFICER'
        });
      }
    }
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setShowLogoutConfirmation(false);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  const filteredNavItems = NAV_ITEMS.filter(item => item.roles.includes(currentUser.role));
  const ownerHasRouteAccess = currentUser.role !== 'OWNER'
    || ['/app/dashboard', '/app/alerts', '/app/notifications'].includes(location.pathname);

  if (!ownerHasRouteAccess) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <div className="app-shell flex h-screen bg-gray-50">
      {isSidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label={t("Close navigation menu")}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <aside className={`app-sidebar flex w-64 flex-shrink-0 flex-col bg-[#0B3A5A]${isSidebarOpen ? ' drawer-open' : ''}`}>
        
        <div className="sidebar-brand flex flex-col items-center gap-2 border-b border-white/10 px-6 py-8">
          <div className="sidebar-mobile-heading">
            <span className="text-sm font-semibold text-white">{t("Navigation")}</span>
            <button
              type="button"
              className="sidebar-close-button"
              aria-label={t("Close navigation menu")}
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={22} />
            </button>
          </div>
          <img 
            src="/clogo.jpeg" 
            alt="SecureTrack Logo" 
            className="mx-auto h-40 w-40 rounded-full object-cover shadow-lg border-2 border-white/20"
          />
        </div>

        
        <nav className="sidebar-nav flex-1 space-y-1 px-3 py-5">
          {filteredNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg border-l-4 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-sky-400 bg-white/10 text-white'
                    : 'border-transparent text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={18} strokeWidth={2} />
              {t(label)}
            </NavLink>
          ))}
        </nav>

        
        <div className="sidebar-footer border-t border-white/10 p-3">
          <div className="mb-2 rounded-lg bg-white/5 px-3 py-2.5">
            <p className="text-sm font-semibold text-white capitalize">{profileName || currentUser.username}</p>
            <p className="text-xs text-slate-400 capitalize">{currentUser.role.replace('_', ' ')}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowLogoutConfirmation(true)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut size={16} />{t("Logout")}</button>
        </div>
      </aside>

      
      <div className="app-content flex flex-1 flex-col overflow-hidden">
        <header className="app-header flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-8 py-4">
          <div className="app-header-brand">
            <button
              type="button"
              className="mobile-menu-button"
              aria-label={t("Open navigation menu")}
              aria-expanded={isSidebarOpen}
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={23} />
            </button>
            <img src="/clogo.jpeg" alt="SecureTrack Logo" className="mobile-header-logo" />
            <div>
            <h1 className="text-xl font-bold text-slate-900">{t("Container Monitoring System")}</h1>
            <p className="text-sm text-slate-500">{t("Sri Lanka Customs")}</p>
            </div>
          </div>


          <NotificationMenu key={localStorage.getItem('token') || 'signed-out'} role={currentUser.role} />

        </header>

        <main className="app-main min-w-0 flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
      {showLogoutConfirmation && <LogoutConfirmation onCancel={() => setShowLogoutConfirmation(false)} onConfirm={handleLogout} />}
    </div>
  );
}

export default SidebarLayout;
