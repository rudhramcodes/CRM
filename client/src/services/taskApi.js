import { api } from './api';

export const taskApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTasks: builder.query({
      query: (params) => ({ url: '/tasks', params }),
      providesTags: ['Task'],
      keepUnusedDataFor: 0,
    }),
    getTaskById: builder.query({
      query: (id) => `/tasks/${id}`,
      providesTags: (result, error, id) => [{ type: 'Task', id }],
    }),
    getTaskStats: builder.query({
      query: () => '/tasks/stats',
      providesTags: ['TaskStats'],
    }),
    createTask: builder.mutation({
      query: (body) => ({ url: '/tasks', method: 'POST', body }),
      invalidatesTags: ['Task', 'TaskStats'],
    }),
    updateTask: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/tasks/${id}`, method: 'PATCH', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }, 'Task', 'TaskStats'],
    }),
    deleteTask: builder.mutation({
      query: (id) => ({ url: `/tasks/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Task', 'TaskStats'],
    }),
    addTaskComment: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/tasks/${id}/comments`, method: 'POST', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }],
    }),
    bulkUpdateTasks: builder.mutation({
      query: (body) => ({ url: '/tasks/bulk', method: 'PATCH', body }),
      invalidatesTags: ['Task', 'TaskStats'],
    }),
    reorderTasks: builder.mutation({
      query: (body) => ({ url: '/tasks/reorder', method: 'PATCH', body }),
      invalidatesTags: ['Task'],
    }),
  }),
});

export const {
  useGetTasksQuery,
  useGetTaskByIdQuery,
  useGetTaskStatsQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useAddTaskCommentMutation,
  useBulkUpdateTasksMutation,
  useReorderTasksMutation,
} = taskApi;
