import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../constants';

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include',
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const refreshResult = await baseQuery(
      { url: '/auth/refresh-token', method: 'POST' },
      api,
      extraOptions,
    );

    if (refreshResult.data) {
      const newToken = refreshResult.data?.data?.accessToken;
      if (newToken) localStorage.setItem('accessToken', newToken);
      result = await baseQuery(args, api, extraOptions);
    } else {
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      window.location.href = storedUser?.role === 'client' ? '/portal/login' : '/auth/login';
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Lead',
    'LeadStats',
    'Client',
    'ClientMe',
    'PortalStaff',
    'Meeting',
    'Project',
    'Task',
    'Invoice',
    'Payment',
    'Notification',
    'User',
    'UserStats',
    'NotifPrefs',
    'OrgSettings',
    'RolesPerms',
    'SecuritySettings',
    'IntegrationSettings',
    'Attendance',
    'AttendanceToday',
    'AttendanceStats',
    'AttendanceReport',
    'Leave',
    'LeaveBalance',
    'Shift',
    'Holiday',
  ],
  endpoints: () => ({}),
});
