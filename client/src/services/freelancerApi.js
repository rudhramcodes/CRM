import { api } from './api';

export const freelancerApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getFreelancers: builder.query({
      query: (params) => ({ url: '/freelancers', params }),
      providesTags: ['Freelancer'],
      keepUnusedDataFor: 0,
    }),
    getFreelancerStats: builder.query({
      query: () => '/freelancers/stats',
      providesTags: ['Freelancer'],
      keepUnusedDataFor: 0,
    }),
    getFreelancerById: builder.query({
      query: (id) => `/freelancers/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Freelancer', id }],
    }),
    createFreelancer: builder.mutation({
      query: (body) => ({ url: '/freelancers', method: 'POST', body }),
      invalidatesTags: ['Freelancer'],
    }),
    createFreelancerPublic: builder.mutation({
      query: (body) => ({ url: '/freelancers/public/apply', method: 'POST', body }),
    }),
    updateFreelancer: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/freelancers/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => ['Freelancer', { type: 'Freelancer', id }],
    }),
    deleteFreelancer: builder.mutation({
      query: (id) => ({ url: `/freelancers/${id}/hard`, method: 'DELETE' }),
      invalidatesTags: ['Freelancer'],
    }),
    archiveFreelancer: builder.mutation({
      query: (id) => ({ url: `/freelancers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Freelancer'],
    }),
  }),
});

export const {
  useGetFreelancersQuery,
  useGetFreelancerStatsQuery,
  useGetFreelancerByIdQuery,
  useCreateFreelancerMutation,
  useCreateFreelancerPublicMutation,
  useUpdateFreelancerMutation,
  useArchiveFreelancerMutation,
  useDeleteFreelancerMutation,
} = freelancerApi;
