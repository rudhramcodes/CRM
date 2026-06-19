import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Search, User, Settings, LogOut } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toggleSidebar } from '../app/store/uiSlice';
import { logout } from '../app/store/authSlice';
import axios from 'axios';
import { API_BASE_URL } from '../constants';

export default function Header({ onMobileMenuOpen }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const pageTitle = useSelector((state) => state.ui.pageTitle);
  const user = useSelector((state) => state.auth.user);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true });
    } catch {
      // Proceed with local logout even if API fails
    }
    dispatch(logout());
    navigate('/auth/login');
  };

  return (
    <header className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="hidden lg:flex p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"
        >
          <Menu className="w-4.5 h-4.5" strokeWidth={1.5} />
        </button>
        <button
          onClick={onMobileMenuOpen}
          className="lg:hidden p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"
        >
          <Menu className="w-4.5 h-4.5" strokeWidth={1.5} />
        </button>
        <h1 className="font-heading text-base font-semibold text-primary-900">
          {pageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center bg-zinc-50 rounded-lg px-3 py-1.5 border border-zinc-200">
          <Search className="w-3.5 h-3.5 text-zinc-400 mr-2" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent border-none outline-none text-sm text-zinc-600 placeholder-zinc-400 w-36"
          />
        </div>

        <button className="relative p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors">
          <Bell className="w-4.5 h-4.5" strokeWidth={1.5} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-zinc-800 rounded-full" />
        </button>

        {user && (
          <div className="relative pl-2 border-l border-zinc-200 ml-1" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <div className="w-7 h-7 bg-zinc-100 rounded-full flex items-center justify-center">
                <span className="text-primary-900 font-medium text-xs">
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-zinc-200 rounded-lg shadow-lg py-1">
                <div className="px-3 py-2 border-b border-zinc-100">
                  <p className="text-sm font-medium text-primary-900 truncate">{user.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => { setShowDropdown(false); navigate('/settings'); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
