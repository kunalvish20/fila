import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RequireAuth } from './components/RequireAuth';
import { Layout } from './components/Layout';
import { AuthCallback } from './pages/AuthCallback';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Requests } from './pages/Requests';
import { Usage } from './pages/Usage';
import { Employees } from './pages/Employees';
import { Transactions } from './pages/Transactions';
import { Reports } from './pages/Reports';
import { Notifications } from './pages/Notifications';
import { Settings } from './pages/Settings';

export function App() {
  return <AuthProvider><BrowserRouter><Routes><Route path="/login" element={<Login />} /><Route path="/auth/callback" element={<AuthCallback />} /><Route path="/" element={<RequireAuth><Layout /></RequireAuth>}><Route index element={<Dashboard />} /><Route path="inventory" element={<Inventory />} /><Route path="requests" element={<Requests />} /><Route path="usage" element={<Usage />} /><Route path="employees" element={<Employees />} /><Route path="transactions" element={<Transactions />} /><Route path="reports" element={<Reports />} /><Route path="notifications" element={<Notifications />} /><Route path="settings" element={<Settings />} /></Route></Routes></BrowserRouter></AuthProvider>;
}
