import { api } from './api';

export const dashboardApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardOverview: builder.query({
      query: () => '/dashboard',
      providesTags: ['Dashboard'],
      keepUnusedDataFor: 120,
    }),
    getEmployeeDashboard: builder.query({
      query: () => '/dashboard/employee',
      providesTags: ['Dashboard'],
      keepUnusedDataFor: 120,
    }),
    getVentureDashboard: builder.query({
      query: (brand) => `/dashboard/venture/${brand}`,
      providesTags: (result, error, brand) => [{ type: 'Dashboard', id: `venture-${brand}` }],
      keepUnusedDataFor: 120,
    }),
  }),
});

export const { useGetDashboardOverviewQuery, useGetEmployeeDashboardQuery, useGetVentureDashboardQuery } = dashboardApi;
