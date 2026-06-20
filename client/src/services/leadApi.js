import { api } from './api';

export const leadApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getLeads: builder.query({
      query: (params) => ({
        url: '/leads',
        params,
      }),
      providesTags: ['Lead'],
      keepUnusedDataFor: 0,
    }),

    getLeadById: builder.query({
      query: (id) => `/leads/${id}`,
      providesTags: (result, error, id) => [{ type: 'Lead', id }],
    }),

    createLead: builder.mutation({
      query: (body) => ({
        url: '/leads',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Lead'],
    }),

    updateLead: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/leads/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Lead', id },
        'Lead',
        'Client',
        'LeadStats',
      ],
    }),

    deleteLead: builder.mutation({
      query: (id) => ({
        url: `/leads/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Lead', 'LeadStats'],
    }),

    addLeadNote: builder.mutation({
      query: ({ id, text }) => ({
        url: `/leads/${id}/notes`,
        method: 'POST',
        body: { text },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Lead', id }],
    }),

    getLeadStats: builder.query({
      query: () => '/leads/stats',
      providesTags: ['LeadStats'],
      keepUnusedDataFor: 0,
    }),
  }),
});

export const {
  useGetLeadsQuery,
  useGetLeadByIdQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useDeleteLeadMutation,
  useAddLeadNoteMutation,
  useGetLeadStatsQuery,
} = leadApi;
