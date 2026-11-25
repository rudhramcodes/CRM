import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { canAccessPayroll, canWriteModule } from '../utils/access';

const roleHome = () => '/dashboard';

export default function ProtectedRoute({ children, requiredRoles, requiredPayroll, requiredWriteModule }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  if (requiredPayroll && !canAccessPayroll(user)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  if (requiredWriteModule && !canWriteModule(user, requiredWriteModule)) {
    return <Navigate to={`/${requiredWriteModule}`} replace />;
  }

  return children;
}
