import { useState, useCallback } from 'react';
import { BarChart3, TrendingUp, Users, UserCheck, FileText, CheckSquare } from 'lucide-react';
import RefreshCwIcon from '../../../components/ui/RefreshCwIcon';
import { useGetReportQuery } from '../../../services/reportApi';
import RevenueReport from '../components/RevenueReport';
import PipelineReport from '../components/PipelineReport';
import ClientReport from '../components/ClientReport';
import InvoiceReport from '../components/InvoiceReport';
import ProductivityReport from '../components/ProductivityReport';

const TABS = [
  { key: 'revenue', label: 'Revenue', icon: TrendingUp },
  { key: 'pipeline', label: 'Pipeline', icon: Users },
  { key: 'clients', label: 'Clients', icon: UserCheck },
  { key: 'invoices', label: 'Invoices', icon: FileText },
  { key: 'productivity', label: 'Productivity', icon: CheckSquare },
];

const DATE_RANGES = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: 'This Month', special: 'thisMonth' },
  { label: 'Last Month', special: 'lastMonth' },
  { label: 'This Year', special: 'thisYear' },
  { label: 'All', special: 'all' },
];

const rangeCache = new Map();

function getDateRange(range) {
  const key = range.label;
  if (rangeCache.has(key)) return rangeCache.get(key);

  const now = new Date();
  let result;
  if (range.special === 'thisMonth') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    result = { from: from.toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
  } else if (range.special === 'lastMonth') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    result = { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
  } else if (range.special === 'thisYear') {
    const from = new Date(now.getFullYear(), 0, 1);
    result = { from: from.toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
  } else if (range.special === 'all') {
    result = { from: undefined, to: undefined };
  } else {
    const from = new Date(now.getTime() - range.days * 24 * 60 * 60 * 1000);
    result = { from: from.toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
  }
  rangeCache.set(key, result);
  return result;
}

const reportComponents = {
  revenue: RevenueReport,
  pipeline: PipelineReport,
  clients: ClientReport,
  invoices: InvoiceReport,
  productivity: ProductivityReport,
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('revenue');
  const [dateRange, setDateRange] = useState(DATE_RANGES[2]); // "This Month"

  const range = getDateRange(dateRange);
  const { data, isFetching, refetch } = useGetReportQuery({ type: activeTab, from: range.from, to: range.to });

  const reportData = data?.data;
  const Component = reportComponents[activeTab];
  const rangeKey = `${activeTab}-${dateRange.label}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-600" />
          Reports
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors disabled:opacity-50"
            title="Refresh reports"
          >
            <RefreshCwIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          {isFetching && <span className="text-xs text-zinc-400">Refreshing...</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white rounded-lg border border-zinc-200 p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Range */}
      <div className="flex items-center gap-1">
        {DATE_RANGES.map((range) => (
          <button
            key={range.label}
            type="button"
            onClick={() => setDateRange(range)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              dateRange.label === range.label
                ? 'bg-zinc-800 text-white'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div key={rangeKey}>
        {isFetching ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-lg border border-zinc-200 p-4 animate-pulse">
                  <div className="h-3 bg-zinc-100 rounded w-16 mb-2" />
                  <div className="h-6 bg-zinc-100 rounded w-24" />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg border border-zinc-200 p-4 animate-pulse">
              <div className="h-4 bg-zinc-100 rounded w-32 mb-4" />
              <div className="h-64 bg-zinc-50 rounded" />
            </div>
          </div>
        ) : reportData ? (
          <Component data={reportData} />
        ) : (
          <div className="bg-white rounded-lg border border-zinc-200 p-8 text-center">
            <BarChart3 className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
            <p className="text-zinc-500">Failed to load report. Try a different date range.</p>
          </div>
        )}
      </div>
    </div>
  );
}
