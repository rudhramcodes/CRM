import { useSelector, useDispatch } from 'react-redux';
import { loginUser, registerUser, logout as logoutAction, clearError } from '../app/store/authSlice';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, error } = useSelector((state) => state.auth);

  const login = async (credentials) => {
    const result = await dispatch(loginUser(credentials));
    if (loginUser.fulfilled.match(result)) {
      navigate('/dashboard');
    }
    return result;
  };

  const register = async (userData) => {
    const result = await dispatch(registerUser(userData));
    if (registerUser.fulfilled.match(result)) {
      navigate('/dashboard');
    }
    return result;
  };

  const logout = () => {
    dispatch(logoutAction());
    navigate('/auth/login');
  };

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    clearError: () => dispatch(clearError()),
  };
}
