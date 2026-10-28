import { api } from './api';

export const quotationApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getQuotations: builder.query({
      query: (params) => ({ url: '/quotations', params }),
      providesTags: ['Quotation'],
      keepUnusedDataFor: 0,
    }),

    getQuotationById: builder.query({
      query: (id) => `/quotations/${id}`,
      providesTags: (result, error, id) => [{ type: 'Quotation', id }],
    }),

    getQuotationStats: builder.query({
      query: () => '/quotations/stats',
      providesTags: ['QuotationStats'],
      keepUnusedDataFor: 0,
    }),

    createQuotation: builder.mutation({
      query: (body) => ({ url: '/quotations', method: 'POST', body }),
      invalidatesTags: ['Quotation', 'QuotationStats'],
    }),

    updateQuotation: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/quotations/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Quotation', id },
        'Quotation',
        'QuotationStats',
      ],
    }),

    updateQuotationStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/quotations/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Quotation', id },
        'Quotation',
        'QuotationStats',
      ],
    }),

    deleteQuotation: builder.mutation({
      query: (id) => ({ url: `/quotations/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Quotation', 'QuotationStats'],
    }),

    resendQuotationEmail: builder.mutation({
      query: (id) => ({ url: `/quotations/${id}/resend`, method: 'POST' }),
    }),

    getQuotationHtml: builder.query({
      query: (id) => ({ url: `/quotations/${id}/html`, responseHandler: 'text' }),
      providesTags: (result, error, id) => [{ type: 'Quotation', id }],
    }),

    getQuotationPdf: builder.query({
      query: (id) => ({
        url: `/quotations/${id}/pdf`,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useGetQuotationsQuery,
  useGetQuotationByIdQuery,
  useGetQuotationStatsQuery,
  useCreateQuotationMutation,
  useUpdateQuotationMutation,
  useUpdateQuotationStatusMutation,
  useDeleteQuotationMutation,
  useResendQuotationEmailMutation,
  useGetQuotationHtmlQuery,
  useLazyGetQuotationPdfQuery,
} = quotationApi;
