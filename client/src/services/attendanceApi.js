import { api } from './api';

export const attendanceApi = api.injectEndpoints({
  endpoints: (builder) => ({
    clockIn: builder.mutation({
      query: (body) => ({
        url: '/attendance/clock-in',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Attendance', 'AttendanceToday', 'AttendanceStats'],
    }),

    clockOut: builder.mutation({
      query: (body = {}) => ({
        url: '/attendance/clock-out',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Attendance', 'AttendanceToday', 'AttendanceStats'],
    }),

    startBreak: builder.mutation({
      query: () => ({
        url: '/attendance/break/start',
        method: 'POST',
      }),
      invalidatesTags: ['Attendance', 'AttendanceToday'],
    }),

    endBreak: builder.mutation({
      query: () => ({
        url: '/attendance/break/end',
        method: 'POST',
      }),
      invalidatesTags: ['Attendance', 'AttendanceToday'],
    }),

    getTodayStatus: builder.query({
      query: (params) => ({
        url: '/attendance/today',
        params,
      }),
      providesTags: ['AttendanceToday'],
      keepUnusedDataFor: 0,
    }),

    getAttendanceSummary: builder.query({
      query: ({ employeeId, date }) => ({
        url: `/attendance/summary/${employeeId || ''}`,
        params: date ? { date } : {},
      }),
      providesTags: ['Attendance'],
    }),

    getAttendanceList: builder.query({
      query: (params) => ({
        url: '/attendance',
        params,
      }),
      providesTags: ['Attendance'],
      keepUnusedDataFor: 0,
    }),

    getAttendanceCalendar: builder.query({
      query: ({ employeeId, year, month }) => ({
        url: `/attendance/calendar/${employeeId}`,
        params: { year, month },
      }),
      providesTags: ['Attendance'],
      keepUnusedDataFor: 0,
    }),

    getAttendanceStats: builder.query({
      query: (params) => ({
        url: '/attendance/stats',
        params,
      }),
      providesTags: ['AttendanceStats'],
      keepUnusedDataFor: 0,
    }),

    getAttendanceOverviewStats: builder.query({
      query: (params) => ({
        url: '/attendance/overview-stats',
        params,
      }),
      providesTags: ['AttendanceStats', 'AttendanceToday', 'Attendance'],
      keepUnusedDataFor: 0,
    }),

    manualOverride: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/attendance/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Attendance', 'AttendanceToday', 'AttendanceStats'],
    }),

    manualEntry: builder.mutation({
      query: (body) => ({
        url: '/attendance/manual',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Attendance', 'AttendanceStats'],
    }),

    requestRegularization: builder.mutation({
      query: (body) => ({
        url: '/attendance/regularize',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Attendance'],
    }),

    approveRegularization: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/attendance/${id}/regularize`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Attendance'],
    }),

    applyLeave: builder.mutation({
      query: (body) => ({
        url: '/attendance/leaves',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Leave', 'LeaveBalance'],
    }),

    getLeaves: builder.query({
      query: (params) => ({
        url: '/attendance/leaves',
        params,
      }),
      providesTags: ['Leave'],
      keepUnusedDataFor: 0,
    }),

    getLeaveById: builder.query({
      query: (id) => `/attendance/leaves/${id}`,
      providesTags: (result, error, id) => [{ type: 'Leave', id }],
    }),

    approveLeave: builder.mutation({
      query: ({ id, comment }) => ({
        url: `/attendance/leaves/${id}/approve`,
        method: 'PATCH',
        body: { comment },
      }),
      invalidatesTags: ['Leave', 'LeaveBalance', 'Attendance', 'AttendanceToday', 'AttendanceStats'],
    }),

    rejectLeave: builder.mutation({
      query: ({ id, comment }) => ({
        url: `/attendance/leaves/${id}/reject`,
        method: 'PATCH',
        body: { comment },
      }),
      invalidatesTags: ['Leave', 'LeaveBalance', 'Attendance', 'AttendanceToday', 'AttendanceStats'],
    }),

    getLeaveBalance: builder.query({
      query: (employeeId) => ({
        url: `/attendance/leaves/balance/${employeeId}`,
      }),
      providesTags: ['LeaveBalance'],
      keepUnusedDataFor: 0,
    }),

    getShifts: builder.query({
      query: () => '/attendance/shifts',
      providesTags: ['Shift'],
      keepUnusedDataFor: 0,
    }),

    createShift: builder.mutation({
      query: (body) => ({
        url: '/attendance/shifts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Shift'],
    }),

    updateShift: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/attendance/shifts/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Shift'],
    }),

    deleteShift: builder.mutation({
      query: (id) => ({
        url: `/attendance/shifts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Shift'],
    }),

    getHolidays: builder.query({
      query: (params) => ({
        url: '/attendance/holidays',
        params,
      }),
      providesTags: ['Holiday'],
      keepUnusedDataFor: 0,
    }),

    createHoliday: builder.mutation({
      query: (body) => ({
        url: '/attendance/holidays',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Holiday'],
    }),

    updateHoliday: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/attendance/holidays/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Holiday'],
    }),

    deleteHoliday: builder.mutation({
      query: (id) => ({
        url: `/attendance/holidays/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Holiday'],
    }),

    getDailyReport: builder.query({
      query: (params) => ({
        url: '/attendance/report/daily',
        params,
      }),
      providesTags: ['AttendanceReport'],
      keepUnusedDataFor: 0,
    }),

    getWeeklyReport: builder.query({
      query: (params) => ({
        url: '/attendance/report/weekly',
        params,
      }),
      providesTags: ['AttendanceReport'],
      keepUnusedDataFor: 0,
    }),

    getMonthlyReport: builder.query({
      query: (params) => ({
        url: '/attendance/report/monthly',
        params,
      }),
      providesTags: ['AttendanceReport'],
      keepUnusedDataFor: 0,
    }),
  }),
});

export const {
  useClockInMutation,
  useClockOutMutation,
  useStartBreakMutation,
  useEndBreakMutation,
  useGetTodayStatusQuery,
  useGetAttendanceSummaryQuery,
  useGetAttendanceListQuery,
  useGetAttendanceCalendarQuery,
  useGetAttendanceStatsQuery,
  useGetAttendanceOverviewStatsQuery,
  useManualOverrideMutation,
  useManualEntryMutation,
  useRequestRegularizationMutation,
  useApproveRegularizationMutation,
  useApplyLeaveMutation,
  useGetLeavesQuery,
  useGetLeaveByIdQuery,
  useApproveLeaveMutation,
  useRejectLeaveMutation,
  useGetLeaveBalanceQuery,
  useGetShiftsQuery,
  useCreateShiftMutation,
  useUpdateShiftMutation,
  useDeleteShiftMutation,
  useGetHolidaysQuery,
  useCreateHolidayMutation,
  useUpdateHolidayMutation,
  useDeleteHolidayMutation,
  useGetDailyReportQuery,
  useGetWeeklyReportQuery,
  useGetMonthlyReportQuery,
} = attendanceApi;
