import { api } from './api';

const revisionTags = (_result, _error, { id }) => [
  { type: 'Quotation', id }, 'Quotation', 'QuotationStats',
];

export const quotationApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getQuotationDefaults: builder.query({
      query: ({ clientId, projectId, templateId } = {}) => ({
        url: '/quotations/defaults',
        params: { clientId, projectId, templateId },
      }),
      keepUnusedDataFor: 0,
    }),

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

    getQuotationRevision: builder.query({
      query: ({ id, version }) => `/quotations/${id}/revisions/${version}`,
      providesTags: (_result, _error, { id }) => [{ type: 'Quotation', id }],
    }),
    getQuotationPreview: builder.query({
      query: ({ id, version }) => ({
        url: version === 'working'
          ? `/quotations/${id}/working-copy/html`
          : `/quotations/${id}/revisions/${version}/html`,
        responseHandler: 'text',
      }),
      providesTags: (_result, _error, { id }) => [{ type: 'Quotation', id }],
    }),
    createQuotationWorkingCopy: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/quotations/${id}/working-copy`, method: 'POST', body }),
      invalidatesTags: revisionTags,
    }),
    updateQuotationWorkingCopy: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/quotations/${id}/working-copy`, method: 'PATCH', body }),
      invalidatesTags: revisionTags,
    }),
    discardQuotationWorkingCopy: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/quotations/${id}/working-copy/discard`, method: 'POST', body }),
      invalidatesTags: revisionTags,
    }),
    saveQuotationRevision: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/quotations/${id}/revisions`, method: 'POST', body }),
      invalidatesTags: revisionTags,
    }),
    initializeQuotationHistory: builder.mutation({
      query: ({ id }) => ({ url: `/quotations/${id}/revisions/baseline`, method: 'POST' }),
      invalidatesTags: revisionTags,
    }),
    sendQuotationRevision: builder.mutation({
      query: ({ id, version }) => ({ url: `/quotations/${id}/revisions/${version}/send`, method: 'POST' }),
      invalidatesTags: revisionTags,
    }),
    resendQuotationRevision: builder.mutation({
      query: ({ id, version }) => ({ url: `/quotations/${id}/revisions/${version}/resend`, method: 'POST' }),
      invalidatesTags: revisionTags,
    }),
    updateQuotationRevisionStatus: builder.mutation({
      query: ({ id, version, ...body }) => ({ url: `/quotations/${id}/revisions/${version}/status`, method: 'PATCH', body }),
      invalidatesTags: revisionTags,
    }),
    setQuotationArchive: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/quotations/${id}/archive`, method: 'PATCH', body }),
      invalidatesTags: revisionTags,
    }),
  }),
});

export const {
  useGetQuotationDefaultsQuery,
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
  useGetQuotationRevisionQuery,
  useGetQuotationPreviewQuery,
  useCreateQuotationWorkingCopyMutation,
  useUpdateQuotationWorkingCopyMutation,
  useDiscardQuotationWorkingCopyMutation,
  useSaveQuotationRevisionMutation,
  useInitializeQuotationHistoryMutation,
  useSendQuotationRevisionMutation,
  useResendQuotationRevisionMutation,
  useUpdateQuotationRevisionStatusMutation,
  useSetQuotationArchiveMutation,
} = quotationApi;
