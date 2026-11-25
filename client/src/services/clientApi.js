import { api } from './api';

export const clientApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getClients: builder.query({
      query: (params) => ({
        url: '/clients',
        params,
      }),
      providesTags: ['Client'],
      keepUnusedDataFor: 0,
    }),

    getClientById: builder.query({
      query: (id) => `/clients/${id}`,
      providesTags: (result, error, id) => [{ type: 'Client', id }],
    }),

    createClient: builder.mutation({
      query: (body) => ({
        url: '/clients',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Client'],
    }),

    updateClient: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/clients/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Client', id },
        'Client',
      ],
    }),

    deleteClient: builder.mutation({
      query: (id) => ({
        url: `/clients/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Client'],
    }),

    convertLeadToClient: builder.mutation({
      query: (leadId) => ({
        url: `/clients/convert/${leadId}`,
        method: 'POST',
      }),
      invalidatesTags: ['Client', 'Lead'],
    }),

    getClientStats: builder.query({
      query: () => '/clients/stats',
      providesTags: ['Client'],
      keepUnusedDataFor: 0,
    }),
  }),
});

export const {
  useGetClientsQuery,
  useGetClientByIdQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
  useConvertLeadToClientMutation,
  useGetClientStatsQuery,
} = clientApi;
