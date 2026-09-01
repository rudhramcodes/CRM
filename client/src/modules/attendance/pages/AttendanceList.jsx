import { useState } from 'react';
import { useGetAttendanceListQuery, useManualOverrideMutation } from '../../../services/attendanceApi';
import { useGetUsersQuery } from '../../../services/userApi';
import { format } from 'date-fns';
import { Search, Filter, ChevronLeft, ChevronRight, Edit } from 'lucide-react';

const STATUS_COLORS = {
  present: 'bg-green-100 text-green-800',
  absent: 'bg-red-100 text-red-800',
  late: 'bg-yellow-100 text-yellow-800',
  half_day: 'bg-orange-100 text-orange-800',
  leave: 'bg-purple-100 text-purple-800',
  holiday: 'bg-blue-100 text-blue-800',
  weekend: 'bg-gray-100 text-gray-800',
  wfh: 'bg-indigo-100 text-indigo-800',
};

export default function AttendanceList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const queryParams = {
    page,
    limit: 20,
    ...(search && { search }),
    ...(statusFilter && { status: statusFilter }),
    ...(employeeFilter && { employee: employeeFilter }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };

  const { data, isLoading } = useGetAttendanceListQuery(queryParams);
  const { data: usersData } = useGetUsersQuery({ limit: 100 });

  const records = data?.data?.records || [];
  const pagination = data?.data?.pagination || {};
  const users = usersData?.data?.users || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Records</h1>
        <p className="text-sm text-gray-500">View and manage all employee attendance records</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Status</option>
            {Object.keys(STATUS_COLORS).map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <select
            value={employeeFilter}
            onChange={(e) => { setEmployeeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Employees</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock In</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock Out</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No records found</td></tr>
            ) : (
              records.map((rec) => (
                <tr key={rec._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{rec.employee?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{format(new Date(rec.date), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{rec.clockIn?.time ? format(new Date(rec.clockIn.time), 'hh:mm a') : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{rec.clockOut?.time ? format(new Date(rec.clockOut.time), 'hh:mm a') : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{rec.workHours ? `${rec.workHours}h` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[rec.status] || 'bg-gray-100 text-gray-800'}`}>
                      {rec.status?.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.pages} ({pagination.total} records)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage}
              className="p-2 border rounded-lg disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!pagination.hasNextPage}
              className="p-2 border rounded-lg disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
