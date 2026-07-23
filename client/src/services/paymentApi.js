import { api } from './api';

export const paymentApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPayments: builder.query({
      query: (params) => ({
        url: '/payments',
        params,
      }),
      providesTags: ['Payment'],
      keepUnusedDataFor: 0,
    }),

    getPaymentById: builder.query({
      query: (id) => `/payments/${id}`,
      providesTags: (result, error, id) => [{ type: 'Payment', id }],
    }),

    getPaymentStats: builder.query({
      query: () => '/payments/stats',
      providesTags: ['PaymentStats'],
      keepUnusedDataFor: 0,
    }),

    getInvoicePayments: builder.query({
      query: (invoiceId) => `/payments/invoice/${invoiceId}`,
      providesTags: (result, error, id) => [{ type: 'Payment', id: `invoice-${id}` }],
    }),

    createPayment: builder.mutation({
      query: (body) => ({
        url: '/payments',
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, body) => [
        'PaymentStats',
        'Invoice',
        'InvoiceStats',
        { type: 'Payment', id: `invoice-${body.invoice}` },
        { type: 'Invoice', id: body.invoice },
      ],
    }),

    updatePayment: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/payments/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Payment', id },
        'Payment',
        'PaymentStats',
        'Invoice',
        'InvoiceStats',
      ],
    }),

    getPaymentReceipt: builder.query({
      query: (id) => ({
        url: `/payments/${id}/receipt`,
        responseHandler: (response) => response.blob(),
      }),
    }),

    deletePayment: builder.mutation({
      query: (id) => ({
        url: `/payments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        'Payment',
        'PaymentStats',
        'Invoice',
        'InvoiceStats',
        // full re-fetch since we don't have the invoice id at delete time
        { type: 'Invoice', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetPaymentsQuery,
  useGetPaymentByIdQuery,
  useGetPaymentStatsQuery,
  useGetInvoicePaymentsQuery,
  useCreatePaymentMutation,
  useUpdatePaymentMutation,
  useDeletePaymentMutation,
  useLazyGetPaymentReceiptQuery,
} = paymentApi;
