import { api } from './api';

export const invoiceApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getInvoices: builder.query({
      query: (params) => ({
        url: '/invoices',
        params,
      }),
      providesTags: ['Invoice'],
      keepUnusedDataFor: 0,
    }),

    getInvoiceById: builder.query({
      query: (id) => `/invoices/${id}`,
      providesTags: (result, error, id) => [{ type: 'Invoice', id }],
    }),

    getInvoiceStats: builder.query({
      query: () => '/invoices/stats',
      providesTags: ['InvoiceStats'],
      keepUnusedDataFor: 0,
    }),

    createInvoice: builder.mutation({
      query: (body) => ({
        url: '/invoices',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Invoice', 'InvoiceStats'],
    }),

    updateInvoice: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/invoices/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Invoice', id },
        'Invoice',
      ],
    }),

    updateInvoiceStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/invoices/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Invoice', id },
        'Invoice',
        'InvoiceStats',
      ],
    }),

    deleteInvoice: builder.mutation({
      query: (id) => ({
        url: `/invoices/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Invoice', 'InvoiceStats'],
    }),

    resendInvoiceEmail: builder.mutation({
      query: (id) => ({
        url: `/invoices/${id}/resend`,
        method: 'POST',
      }),
    }),

    getInvoiceHtml: builder.query({
      query: (id) => ({
        url: `/invoices/${id}/html`,
        responseHandler: 'text',
      }),
      providesTags: (result, error, id) => [{ type: 'Invoice', id }],
    }),

    getInvoicePdf: builder.query({
      query: (id) => ({
        url: `/invoices/${id}/pdf`,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useGetInvoicesQuery,
  useGetInvoiceByIdQuery,
  useGetInvoiceStatsQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useUpdateInvoiceStatusMutation,
  useDeleteInvoiceMutation,
  useResendInvoiceEmailMutation,
  useGetInvoiceHtmlQuery,
  useLazyGetInvoicePdfQuery,
} = invoiceApi;
