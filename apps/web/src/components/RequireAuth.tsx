import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="screen-center">Loading workspace...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
