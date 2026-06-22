import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { Spinner } from '../components/ui/States';

export function ProtectedRoute() {
  const { booting, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (booting) return <Spinner label="Recuperando sessão..." />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
