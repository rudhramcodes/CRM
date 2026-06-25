import { api } from './api';

export const projectApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query({
      query: (params) => ({ url: '/projects', params }),
      providesTags: ['Project'],
      keepUnusedDataFor: 0,
    }),
    getProjectById: builder.query({
      query: (id) => `/projects/${id}`,
      providesTags: (result, error, id) => [{ type: 'Project', id }],
    }),
    getProjectStats: builder.query({
      query: () => '/projects/stats',
      providesTags: ['ProjectStats'],
    }),
    createProject: builder.mutation({
      query: (body) => ({ url: '/projects', method: 'POST', body }),
      invalidatesTags: ['Project', 'ProjectStats'],
    }),
    updateProject: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/projects/${id}`, method: 'PATCH', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Project', id }, 'Project', 'ProjectStats'],
    }),
    deleteProject: builder.mutation({
      query: (id) => ({ url: `/projects/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Project', 'ProjectStats'],
    }),
    getProjectActivities: builder.query({
      query: (id) => `/projects/${id}/activities`,
      providesTags: (result, error, id) => [{ type: 'ProjectActivities', id }],
    }),
    addProjectTask: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/projects/${id}/tasks`, method: 'POST', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Project', id }, 'Project'],
    }),
    updateProjectTask: builder.mutation({
      query: ({ id, taskId, ...body }) => ({ url: `/projects/${id}/tasks/${taskId}`, method: 'PATCH', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Project', id }, 'Project'],
    }),
    deleteProjectTask: builder.mutation({
      query: ({ id, taskId }) => ({ url: `/projects/${id}/tasks/${taskId}`, method: 'DELETE' }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Project', id }, 'Project'],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useGetProjectStatsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useGetProjectActivitiesQuery,
  useAddProjectTaskMutation,
  useUpdateProjectTaskMutation,
  useDeleteProjectTaskMutation,
} = projectApi;
