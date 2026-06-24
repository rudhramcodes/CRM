import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import ProtectedRoute from './ProtectedRoute';

import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import VerifyEmail from '../pages/auth/VerifyEmail';
import Dashboard from '../pages/Dashboard';
import NotFound from '../pages/NotFound';
import LeadList from '../modules/leads/pages/LeadList';
import LeadDetail from '../modules/leads/pages/LeadDetail';
import LeadForm from '../modules/leads/components/LeadForm';
import ClientList from '../modules/clients/pages/ClientList';
import ClientDetail from '../modules/clients/pages/ClientDetail';
import ClientForm from '../modules/clients/components/ClientForm';
import MeetingList from '../modules/meetings/pages/MeetingList';
import MeetingDetail from '../modules/meetings/pages/MeetingDetail';
import ProjectList from '../modules/projects/pages/ProjectList';
import ProjectDetail from '../modules/projects/pages/ProjectDetail';

const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { index: true, element: <Navigate to="/auth/login" replace /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'reset-password', element: <ResetPassword /> },
      { path: 'verify-email', element: <VerifyEmail /> },
    ],
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'leads', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><LeadList /></ProtectedRoute> },
      { path: 'leads/new', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager']}><LeadForm /></ProtectedRoute> },
      { path: 'leads/:id', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><LeadDetail /></ProtectedRoute> },
      { path: 'clients', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><ClientList /></ProtectedRoute> },
      { path: 'clients/new', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager']}><ClientForm /></ProtectedRoute> },
      { path: 'clients/:id', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><ClientDetail /></ProtectedRoute> },
      { path: 'meetings', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><MeetingList /></ProtectedRoute> },
      { path: 'meetings/:id', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><MeetingDetail /></ProtectedRoute> },
      { path: 'projects', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><ProjectList /></ProtectedRoute> },
      { path: 'projects/:id', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><ProjectDetail /></ProtectedRoute> },
      { path: 'tasks', element: <div>Tasks Module (Coming Soon)</div> },
      { path: 'invoices', element: <div>Invoices Module (Coming Soon)</div> },
      { path: 'invoices/new', element: <div>New Invoice (Coming Soon)</div> },
      { path: 'invoices/:id', element: <div>Invoice Detail (Coming Soon)</div> },
      { path: 'payments', element: <div>Payments Module (Coming Soon)</div> },
      { path: 'reports', element: <div>Reports Module (Coming Soon)</div> },
      { path: 'notifications', element: <div>Notifications (Coming Soon)</div> },
      { path: 'settings', element: <div>Settings (Coming Soon)</div> },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

export default router;
