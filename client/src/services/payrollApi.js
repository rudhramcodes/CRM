import { api } from './api';

export const payrollApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPayrollRuns: builder.query({
      query: (params) => ({ url: '/payroll/runs', params }),
      providesTags: ['PayrollRun'],
    }),
    getPayrollRun: builder.query({
      query: (id) => `/payroll/runs/${id}`,
      providesTags: (result, error, id) => [{ type: 'PayrollRun', id }],
    }),
    generatePayroll: builder.mutation({
      query: (body) => ({ url: '/payroll/runs', method: 'POST', body }),
      invalidatesTags: ['PayrollRun'],
    }),
    finalizePayroll: builder.mutation({
      query: (id) => ({ url: `/payroll/runs/${id}/finalize`, method: 'POST' }),
      invalidatesTags: (result, error, id) => ['PayrollRun', 'SalarySlip', { type: 'PayrollRun', id }],
    }),
    reopenPayroll: builder.mutation({
      query: ({ id, reason }) => ({ url: `/payroll/runs/${id}/reopen`, method: 'POST', body: { reason } }),
      invalidatesTags: (result, error, { id }) => ['PayrollRun', 'SalarySlip', { type: 'PayrollRun', id }],
    }),
    getMySlips: builder.query({
      query: () => '/payroll/my-slips',
      providesTags: ['SalarySlip'],
    }),
    downloadSlipPdf: builder.query({
      query: (id) => ({ url: `/payroll/slips/${id}/pdf`, responseHandler: (response) => response.blob() }),
    }),
  }),
});

export const {
  useGetPayrollRunsQuery,
  useGetPayrollRunQuery,
  useGeneratePayrollMutation,
  useFinalizePayrollMutation,
  useReopenPayrollMutation,
  useGetMySlipsQuery,
  useLazyDownloadSlipPdfQuery,
} = payrollApi;
