import { z } from 'zod';
import { api } from '../../services/api';

const snapshotReference = z.object({ _id: z.string() }).passthrough();
const revisionResponse = z.object({
  data: z.object({
    revision: z.object({
      _id: z.string(),
      version: z.number().int().positive(),
      content: z.object({
        client: snapshotReference,
        project: snapshotReference.nullable().optional(),
      }).passthrough(),
    }).passthrough(),
  }),
});

const invoiceSourceApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getInvoiceSourceRevision: builder.query({
      query: ({ quotationId, version }) => `/quotations/${quotationId}/revisions/${version}`,
      transformResponse: (response) => revisionResponse.parse(response).data.revision,
      providesTags: (_result, _error, { quotationId }) => [{ type: 'Quotation', id: quotationId }],
    }),
  }),
});

export const { useGetInvoiceSourceRevisionQuery } = invoiceSourceApi;
