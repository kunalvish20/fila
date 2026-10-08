import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, Boxes, ClipboardList, Gauge, History, LogOut, Settings, Users, BarChart3, PencilRuler } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ToastHost } from './Toast';
import { ErrorBoundary } from './ErrorBoundary';

const links = [
  { to: '/', label: 'Dashboard', icon: Gauge, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/inventory', label: 'Inventory', icon: Boxes, roles: ['ADMIN', 'MANAGER'] },
  { to: '/requests', label: 'Requests', icon: ClipboardList, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/usage', label: 'Usage', icon: PencilRuler, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/employees', label: 'Employees', icon: Users, roles: ['ADMIN', 'MANAGER'] },
  { to: '/transactions', label: 'Transactions', icon: History, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
  { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['ADMIN'] }
] as const;

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const visibleLinks = links.filter((link) => (link.roles as readonly string[]).includes(user!.role));
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">F</div>
          <div>
            <strong>FilamentOps</strong>
            <span>Manual Inventory</span>
          </div>
        </div>
        <nav className="nav-list">
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            return <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Icon size={18} />{link.label}</NavLink>;
          })}
        </nav>
        <button className="logout" onClick={() => { logout(); navigate('/login'); }}><LogOut size={17} /> Sign out</button>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">3D Printing Studio</p>
            <h1>Filament Tracking & Inventory</h1>
          </div>
          <div className="user-pill"><span>{user!.role}</span><strong>{user!.name}</strong></div>
        </header>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <ToastHost />
    </div>
  );
}
