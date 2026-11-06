import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import EmptyState from '../../../components/ui/EmptyState';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../../components/ui/Select';
import { Popover, PopoverTrigger, PopoverContent } from '../../../components/ui/Popover';
import { formatHours } from '../../../utils/formatters';

const DEFAULT_PAGE_SIZE = 10;

export default function AttendanceSummaryTable({
  data = [],
  isLoading = false,
  periodLabel = '',
  pageSize = DEFAULT_PAGE_SIZE,
}) {
  const [page, setPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    setPage(1);
    setSelectedEmployee('all');
  }, [periodLabel]);

  useEffect(() => {
    setPage(1);
  }, [selectedEmployee]);

  const employeeOptions = useMemo(() => {
    const list = data.map((item) => item.employee?.name).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    if (!selectedEmployee || selectedEmployee === 'all') return data;
    return data.filter((item) => item.employee?.name === selectedEmployee);
  }, [data, selectedEmployee]);

  const total = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const handleExportExcel = () => {
    if (!filteredData.length) {
      toast.error('No data available to export');
      return;
    }
    const exportColumns = [
      'Employee',
      'Present Days',
      'Absent Days',
      'WFH',
      'Leaves',
      'Weekends',
      'Total Hours',
    ];
    const rows = filteredData.map((item) => ({
      Employee: item.employee?.name || '—',
      'Present Days': item.presentDays || 0,
      'Absent Days': item.absentDays || 0,
      WFH: item.wfhDays || 0,
      Leaves: item.leaveDays || 0,
      Weekends: item.weekendDays || 0,
      'Total Hours': formatHours(item.totalWorkHours || 0),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: exportColumns });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Summary');
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `attendance-summary-${dateStr}.xlsx`);
    toast.success('Exported Excel file successfully');
    setExportOpen(false);
  };

  const handleExportPdf = () => {
    if (!filteredData.length) {
      toast.error('No data available to export');
      return;
    }
    const exportColumns = [
      'Employee',
      'Present Days',
      'Absent Days',
      'WFH',
      'Leaves',
      'Weekends',
      'Total Hours',
    ];
    const doc = new jsPDF({ orientation: 'portrait' });

    doc.setFontSize(16);
    doc.setTextColor(24, 24, 27);
    doc.text('Attendance Summary', 14, 16);

    doc.setFontSize(10);
    doc.setTextColor(113, 113, 122);
    const subtext = periodLabel
      ? `Period: ${periodLabel} | Generated on ${new Date().toLocaleDateString('en-IN')}`
      : `Generated on ${new Date().toLocaleDateString('en-IN')}`;
    doc.text(subtext, 14, 23);

    const rows = filteredData.map((item) => [
      item.employee?.name || '—',
      item.presentDays || 0,
      item.absentDays || 0,
      item.wfhDays || 0,
      item.leaveDays || 0,
      item.weekendDays || 0,
      formatHours(item.totalWorkHours || 0),
    ]);

    autoTable(doc, {
      startY: 28,
      head: [exportColumns],
      body: rows,

      styles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },

      headStyles: {
        fillColor: [137, 91, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },

      alternateRowStyles: {
        fillColor: [250, 243, 234], // Slightly warmer cream
      },

      bodyStyles: {
        fillColor: [255, 255, 255],
      },
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    doc.save(`attendance-summary-${dateStr}.pdf`);
    toast.success('Exported PDF file successfully');
    setExportOpen(false);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2.5 border-b border-zinc-200 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-zinc-900">Attendance Summary</h3>
          <p className="text-xs text-zinc-400">
            {total} {total === 1 ? 'employee' : 'employees'}
            {periodLabel ? ` · ${periodLabel}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Employee Filter Dropdown */}
          {employeeOptions.length > 0 && (
            <div className="w-full sm:w-48">
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-full h-9 rounded-xl text-xs border-zinc-200 bg-white shadow-2xs focus:ring-2 focus:ring-primary-900/10 focus:border-primary-900 font-medium cursor-pointer">
                  <SelectValue placeholder="Filter by name" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employeeOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Export Dropdown */}
          <Popover open={exportOpen} onOpenChange={setExportOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-between gap-1.5 h-9 px-3 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 shadow-2xs transition-all cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-zinc-500" />
                <span>Export</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-44 p-1 shadow-xl border-zinc-200 rounded-xl bg-white z-50"
            >
              <button
                type="button"
                onClick={handleExportPdf}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 rounded-lg transition-colors cursor-pointer text-left"
              >
                <FileText className="w-4 h-4 text-rose-500" />
                <span>Export as PDF</span>
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 rounded-lg transition-colors cursor-pointer text-left"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export as Excel</span>
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : total === 0 ? (
        <div className="p-8">
          <EmptyState
            icon={BarChart3}
            title="No summary available"
            description="Choose another date or reporting period."
          />
        </div>
      ) : (
        <>
          {/* Desktop View */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[700px]">
              <thead className="bg-zinc-50/80">
                <tr>
                  {[
                    '',
                    'Employee',
                    'Present Days',
                    'Absent Days',
                    'WFH',
                    'Leaves',
                    'Weekends',
                    'Total Hours',
                  ].map((heading, index) => (
                    <th
                      key={heading || index}
                      className="border-b border-zinc-200 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedData.map((item) => (
                  <tr key={item.key} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="w-8 px-3 py-3 text-zinc-400"></td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                      {item.employee?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{item.presentDays}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{item.absentDays}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{item.wfhDays}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{item.leaveDays}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{item.weekendDays}</td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-800">
                      {formatHours(item.totalWorkHours)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="space-y-3 p-3 md:hidden">
            {paginatedData.map((item) => (
              <div
                key={item.key}
                className="rounded-xl border border-zinc-200 p-4 transition-shadow hover:shadow-sm"
              >
                <div className="font-medium text-zinc-900 mb-2">{item.employee?.name || '—'}</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600">
                  <span>
                    Present Days:{' '}
                    <strong className="font-medium text-zinc-800">{item.presentDays}</strong>
                  </span>
                  <span>
                    Absent Days:{' '}
                    <strong className="font-medium text-zinc-800">{item.absentDays}</strong>
                  </span>
                  <span>
                    WFH: <strong className="font-medium text-zinc-800">{item.wfhDays}</strong>
                  </span>
                  <span>
                    Leaves: <strong className="font-medium text-zinc-800">{item.leaveDays}</strong>
                  </span>
                  <span>
                    Weekends:{' '}
                    <strong className="font-medium text-zinc-800">{item.weekendDays}</strong>
                  </span>
                  <span>
                    Total Hours:{' '}
                    <strong className="font-medium text-zinc-800">
                      {formatHours(item.totalWorkHours)}
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-5 py-3">
              <span className="text-xs text-zinc-500">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}{' '}
                employees
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <span className="text-xs font-medium text-zinc-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
