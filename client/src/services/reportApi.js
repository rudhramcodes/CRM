import { api } from './api';

export const reportApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getReport: builder.query({
      query: ({ type, from, to }) => ({
        url: '/reports',
        params: { type, from, to },
      }),
      providesTags: (result, error, { type }) => [{ type: 'Report', id: type }],
      keepUnusedDataFor: 600, // 10 min cache — reports are aggregate snapshots
    }),
  }),
});

export const { useGetReportQuery } = reportApi;
