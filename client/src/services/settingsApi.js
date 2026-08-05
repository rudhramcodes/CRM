import { api } from './api';

export const settingsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getNotifPrefs: builder.query({
      query: () => '/settings/notifications',
      providesTags: ['NotifPrefs'],
      transformResponse: (r) => r.data?.prefs,
    }),
    updateNotifPrefs: builder.mutation({
      query: (notify) => ({ url: '/settings/notifications', method: 'PUT', body: { notify } }),
      invalidatesTags: ['NotifPrefs'],
    }),
    getOrgSettings: builder.query({
      query: () => '/settings/organization',
      providesTags: ['OrgSettings'],
      transformResponse: (r) => r.data?.settings,
    }),
    updateOrgSettings: builder.mutation({
      query: (data) => ({ url: '/settings/organization', method: 'PUT', body: data }),
      invalidatesTags: ['OrgSettings'],
    }),
    updateProfile: builder.mutation({
      query: (data) => ({ url: '/auth/profile', method: 'PATCH', body: data }),
    }),
    changePassword: builder.mutation({
      query: (data) => ({ url: '/auth/password', method: 'PUT', body: data }),
    }),
    getRolesPermissions: builder.query({
      query: () => '/settings/roles',
      providesTags: ['RolesPerms'],
      transformResponse: (r) => r.data?.roles,
    }),
    updateRolePermissions: builder.mutation({
      query: (body) => ({ url: '/settings/roles', method: 'PUT', body }),
      invalidatesTags: ['RolesPerms'],
    }),
    getSecuritySettings: builder.query({
      query: () => '/settings/security',
      providesTags: ['SecuritySettings'],
      transformResponse: (r) => r.data?.settings,
    }),
    updateSecuritySettings: builder.mutation({
      query: (data) => ({ url: '/settings/security', method: 'PUT', body: data }),
      invalidatesTags: ['SecuritySettings'],
    }),
    getIntegrationSettings: builder.query({
      query: () => '/settings/integrations',
      providesTags: ['IntegrationSettings'],
      transformResponse: (r) => r.data?.settings,
    }),
    updateIntegrationSettings: builder.mutation({
      query: (data) => ({ url: '/settings/integrations', method: 'PUT', body: data }),
      invalidatesTags: ['IntegrationSettings'],
    }),
    getGoogleAuthUrl: builder.mutation({
      query: () => ({ url: '/settings/google/auth-url', method: 'GET' }),
      transformResponse: (r) => r.data?.url,
    }),
    disconnectGoogle: builder.mutation({
      query: () => ({ url: '/settings/google/disconnect', method: 'POST' }),
      invalidatesTags: ['IntegrationSettings'],
    }),
  }),
});

export const {
  useGetNotifPrefsQuery,
  useUpdateNotifPrefsMutation,
  useGetOrgSettingsQuery,
  useUpdateOrgSettingsMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useGetRolesPermissionsQuery,
  useUpdateRolePermissionsMutation,
  useGetSecuritySettingsQuery,
  useUpdateSecuritySettingsMutation,
  useGetIntegrationSettingsQuery,
  useUpdateIntegrationSettingsMutation,
  useGetGoogleAuthUrlMutation,
  useDisconnectGoogleMutation,
} = settingsApi;
