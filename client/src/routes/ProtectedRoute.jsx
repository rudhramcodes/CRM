import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

const roleHome = (role) => (role === 'client' ? '/portal' : '/dashboard');

export default function ProtectedRoute({ children, requiredRoles }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    const redirect = storedUser?.role === 'client' ? '/portal/login' : '/auth/login';
    return <Navigate to={redirect} state={{ from: location }} replace />;
  }

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return children;
}