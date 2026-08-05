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

    updateMeetingNotes: builder.mutation({
      query: ({ id, notes }) => ({
        url: `/meetings/${id}/notes`,
        method: 'PATCH',
        body: { notes },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Meeting', id },
        'Meeting',
      ],
    }),

    deleteMeeting: builder.mutation({
      query: ({ id, allSeries }) => ({
        url: `/meetings/${id}`,
        method: 'DELETE',
        params: allSeries ? { allSeries: true } : undefined,
      }),
      invalidatesTags: ['Meeting'],
    }),

    addActionItem: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/meetings/${id}/action-items`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Meeting', id },
        'Meeting',
      ],
    }),

    updateActionItem: builder.mutation({
      query: ({ id, itemId, ...body }) => ({
        url: `/meetings/${id}/action-items/${itemId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Meeting', id },
        'Meeting',
      ],
    }),

    removeActionItem: builder.mutation({
      query: ({ id, itemId }) => ({
        url: `/meetings/${id}/action-items/${itemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Meeting', id },
        'Meeting',
      ],
    }),

    convertActionItem: builder.mutation({
      query: ({ id, itemId, projectId }) => ({
        url: `/meetings/${id}/action-items/${itemId}/convert`,
        method: 'POST',
        body: { projectId },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Meeting', id },
        'Meeting',
        'Task',
      ],
    }),
  }),
});

export const {
  useGetMeetingsQuery,
  useGetMeetingByIdQuery,
  useCreateMeetingMutation,
  useUpdateMeetingMutation,
  useUpdateMeetingNotesMutation,
  useDeleteMeetingMutation,
  useAddActionItemMutation,
  useUpdateActionItemMutation,
  useRemoveActionItemMutation,
  useConvertActionItemMutation,
} = meetingApi;
