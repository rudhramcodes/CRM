import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import ClientPortalLayout from '../layouts/ClientPortalLayout';
import ClientAuthLayout from '../layouts/ClientAuthLayout';
import ProtectedRoute from './ProtectedRoute';

import Login from '../pages/auth/Login';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import ChangePassword from '../pages/auth/ChangePassword';
import VerifyEmailScreen from '../pages/VerifyEmailScreen';
import Dashboard from '../pages/Dashboard';
import VentureDashboard from '../pages/VentureDashboard';
import NotFound from '../pages/NotFound';
import TaskRedirect from './TaskRedirect';
import ClientPortalLogin from '../modules/portal/pages/ClientPortalLogin';
import AcceptInvite from '../modules/portal/pages/AcceptInvite';
import OnboardingWizard from '../modules/portal/pages/OnboardingWizard';
import ClientDashboard from '../modules/portal/pages/ClientDashboard';
import PortalGuide from '../modules/portal/pages/PortalGuide';
import PortalProfile from '../modules/portal/pages/PortalProfile';
import PortalProjects from '../modules/portal/pages/PortalProjects';
import PortalProjectDetail from '../modules/portal/pages/PortalProjectDetail';
import PortalMeetings from '../modules/portal/pages/PortalMeetings';
import PortalMeetingNew from '../modules/portal/pages/PortalMeetingNew';
import PortalMeetingDetail from '../modules/portal/pages/PortalMeetingDetail';
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
import InvoiceList from '../modules/invoices/pages/InvoiceList';
import InvoiceCreate from '../modules/invoices/pages/InvoiceCreate';
import InvoiceDetail from '../modules/invoices/pages/InvoiceDetail';
import PaymentList from '../modules/payments/pages/PaymentList';
import PaymentDetail from '../modules/payments/pages/PaymentDetail';
import ReportsPage from '../modules/reports/pages/ReportsPage';
import NotificationList from '../modules/notifications/pages/NotificationList';
import AttendanceCalendar from '../modules/attendance/pages/AttendanceCalendar';
import AttendanceList from '../modules/attendance/pages/AttendanceList';
import AttendanceShifts from '../modules/attendance/pages/AttendanceShifts';
import AttendanceLeaves from '../modules/attendance/pages/AttendanceLeaves';
import AttendanceHolidays from '../modules/attendance/pages/AttendanceHolidays';
import AttendanceReports from '../modules/attendance/pages/AttendanceReports';
import SettingsPage from '../modules/settings/pages/SettingsPage';
import UserManagement from '../modules/users/pages/UserManagement';

const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { index: true, element: <Navigate to="/auth/login" replace /> },
      { path: 'login', element: <Login /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'reset-password', element: <ResetPassword /> },
      { path: 'change-password', element: <ChangePassword /> },
    ],
  },
  {
    path: '/portal/login',
    element: <ClientAuthLayout />,
    children: [{ index: true, element: <ClientPortalLogin /> }],
  },
  {
    path: '/portal/accept-invite',
    element: <ClientAuthLayout />,
    children: [{ index: true, element: <AcceptInvite /> }],
  },
  {
    path: '/portal',
    element: (
      <ProtectedRoute requiredRoles={['client']}>
        <ClientPortalLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <ClientDashboard /> },
      { path: 'onboarding', element: <OnboardingWizard /> },
      { path: 'guide', element: <PortalGuide /> },
      { path: 'profile', element: <PortalProfile /> },
      { path: 'projects', element: <PortalProjects /> },
      { path: 'projects/:id', element: <PortalProjectDetail /> },
      { path: 'meetings', element: <PortalMeetings /> },
      { path: 'meetings/new', element: <PortalMeetingNew /> },
      { path: 'meetings/:id', element: <PortalMeetingDetail /> },
    ],
  },
  {
    path: '/verify-email',
    element: (
      <ProtectedRoute>
        <VerifyEmailScreen />
      </ProtectedRoute>
    ),
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
      { path: 'dashboard/venture/:brand', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager']}><VentureDashboard /></ProtectedRoute> },
      { path: 'leads', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><LeadList /></ProtectedRoute> },
      { path: 'leads/new', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><LeadForm /></ProtectedRoute> },
      { path: 'leads/:id', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><LeadDetail /></ProtectedRoute> },
      { path: 'clients', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><ClientList /></ProtectedRoute> },
      { path: 'clients/new', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager']}><ClientForm /></ProtectedRoute> },
      { path: 'clients/:id', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><ClientDetail /></ProtectedRoute> },
      { path: 'meetings', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><MeetingList /></ProtectedRoute> },
      { path: 'meetings/:id', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><MeetingDetail /></ProtectedRoute> },
      { path: 'projects', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><ProjectList /></ProtectedRoute> },
      { path: 'projects/:id', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><ProjectDetail /></ProtectedRoute> },
      { path: 'tasks/:id', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><TaskRedirect /></ProtectedRoute> },
      { path: 'invoices', element: <ProtectedRoute requiredRoles={['super_admin', 'admin']}><InvoiceList /></ProtectedRoute> },
      { path: 'invoices/new', element: <ProtectedRoute requiredRoles={['super_admin', 'admin']}><InvoiceCreate /></ProtectedRoute> },
      { path: 'invoices/:id', element: <ProtectedRoute requiredRoles={['super_admin', 'admin']}><InvoiceDetail /></ProtectedRoute> },
      { path: 'payments', element: <ProtectedRoute requiredRoles={['super_admin', 'admin']}><PaymentList /></ProtectedRoute> },
      { path: 'payments/:id', element: <ProtectedRoute requiredRoles={['super_admin', 'admin']}><PaymentDetail /></ProtectedRoute> },
      { path: 'reports', element: <ProtectedRoute requiredRoles={['super_admin', 'admin']}><ReportsPage /></ProtectedRoute> },
      { path: 'attendance', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><AttendanceCalendar /></ProtectedRoute> },
      { path: 'attendance/list', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager']}><AttendanceList /></ProtectedRoute> },
      { path: 'attendance/shifts', element: <ProtectedRoute requiredRoles={['super_admin', 'admin']}><AttendanceShifts /></ProtectedRoute> },
      { path: 'attendance/leaves', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><AttendanceLeaves /></ProtectedRoute> },
      { path: 'attendance/holidays', element: <ProtectedRoute requiredRoles={['super_admin', 'admin']}><AttendanceHolidays /></ProtectedRoute> },
      { path: 'attendance/reports', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager']}><AttendanceReports /></ProtectedRoute> },
      { path: 'notifications', element: <ProtectedRoute requiredRoles={['super_admin', 'admin', 'manager', 'employee']}><NotificationList /></ProtectedRoute> },
      { path: 'users', element: <ProtectedRoute requiredRoles={['super_admin', 'admin']}><UserManagement /></ProtectedRoute> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  }, 
]);

export default router;
