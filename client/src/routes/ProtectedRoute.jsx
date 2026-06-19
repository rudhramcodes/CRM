import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function ProtectedRoute({ children, requiredRoles }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
