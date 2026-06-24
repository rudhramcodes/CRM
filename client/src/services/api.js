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
      result = await baseQuery(args, api, extraOptions);
    } else {
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Lead', 'LeadStats', 'Client', 'Meeting', 'Project', 'Task', 'Invoice', 'Payment', 'Notification', 'User'],
  endpoints: () => ({}),
});
