import { api } from './api';

export const meetingApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMeetings: builder.query({
      query: (params) => ({
        url: '/meetings',
        params,
      }),
      providesTags: ['Meeting'],
      keepUnusedDataFor: 0,
    }),

    getMeetingById: builder.query({
      query: (id) => `/meetings/${id}`,
      providesTags: (result, error, id) => [{ type: 'Meeting', id }],
    }),

    createMeeting: builder.mutation({
      query: (body) => ({
        url: '/meetings',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Meeting'],
    }),

    updateMeeting: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/meetings/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Meeting', id },
        'Meeting',
      ],
    }),

    deleteMeeting: builder.mutation({
      query: (id) => ({
        url: `/meetings/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Meeting'],
    }),
  }),
});

export const {
  useGetMeetingsQuery,
  useGetMeetingByIdQuery,
  useCreateMeetingMutation,
  useUpdateMeetingMutation,
  useDeleteMeetingMutation,
} = meetingApi;
