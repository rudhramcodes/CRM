import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Mail,
  Smartphone,
  Monitor,
  Maximize2,
  Copy,
  Check,
  ExternalLink,
  Search,
  Code,
  Sliders,
  Layers,
  Send,
  FileCode,
  Sparkles,
  Info,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useGetEmailPreviewsQuery } from '../services/settingsApi';
import { cn } from '../utils/cn';

const CATEGORIES = [
  'All',
  'Client & Portal',
  'Financials',
  'HR & Attendance',
  'Meetings & Calendar',
  'Authentication',
  'Freelancers',
  'Leads & Sales',
  'System',
];

export default function EmailPreviewStudio() {
  const { data: templates = [], isLoading, refetch } = useGetEmailPreviewsQuery();
  const [selectedId, setSelectedId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewportMode, setViewportMode] = useState('desktop'); // 'desktop' | 'mobile' | 'full'
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'html' | 'variables'
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const iframeRef = useRef(null);

  // Set default selection when templates load
  useEffect(() => {
    if (templates.length > 0 && !selectedId) {
      setSelectedId(templates[0].id);
    }
  }, [templates, selectedId]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesCat =
        selectedCategory === 'All' ||
        tpl.category?.toLowerCase() === selectedCategory.toLowerCase() ||
        (selectedCategory === 'Leads & System' && (tpl.category === 'Leads & Sales' || tpl.category === 'System'));

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        tpl.title?.toLowerCase().includes(q) ||
        tpl.subject?.toLowerCase().includes(q) ||
        tpl.recipient?.toLowerCase().includes(q) ||
        tpl.trigger?.toLowerCase().includes(q) ||
        tpl.functionName?.toLowerCase().includes(q) ||
        tpl.category?.toLowerCase().includes(q);

      return matchesCat && matchesQuery;
    });
  }, [templates, selectedCategory, searchQuery]);

  const currentTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedId) || filteredTemplates[0] || templates[0];
  }, [templates, selectedId, filteredTemplates]);

  // Update iframe content when template changes
  useEffect(() => {
    if (iframeRef.current && currentTemplate?.html) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(currentTemplate.html);
        doc.close();
      }
    }
  }, [currentTemplate, viewportMode, activeTab]);

  const handleCopySubject = () => {
    if (!currentTemplate?.subject) return;
    navigator.clipboard.writeText(currentTemplate.subject);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  const handleCopyHtml = () => {
    if (!currentTemplate?.html) return;
    navigator.clipboard.writeText(currentTemplate.html);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handleCopyPath = () => {
    if (!currentTemplate?.functionName) return;
    const text = `import { ${currentTemplate.functionName} } from './${currentTemplate.filePath}';`;
    navigator.clipboard.writeText(text);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-900 text-white flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-primary-900">Email Templates & Preview Studio</h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {templates.length || 18} Templates
                </span>
              </div>
              <p className="text-sm text-zinc-500 mt-0.5">
                Preview, inspect, and redesign all transactional and brand emails across Rudhram CRM
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/mail.html"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-700 hover:text-primary-900 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 transition-all shadow-2xs"
            title="Open full-screen standalone preview in new window"
          >
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            Standalone View (/mail.html)
          </a>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 hover:text-primary-900 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 transition-all cursor-pointer"
            title="Refresh templates from server"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 text-zinc-400', isLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Main Workspace ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Sidebar: Template Directory ── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 shadow-xs space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search templates, subjects, roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-zinc-50/80 border border-zinc-200/90 rounded-xl text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-900/10 focus:border-primary-900 transition-all"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 border',
                      isActive
                        ? 'bg-primary-900 text-white border-primary-900 shadow-2xs'
                        : 'bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border-zinc-200/70',
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Template Cards List */}
            <div className="space-y-1.5 max-h-[750px] overflow-y-auto pr-1">
              {filteredTemplates.map((tpl) => {
                const isSelected = tpl.id === (currentTemplate?.id || selectedId);
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedId(tpl.id)}
                    className={cn(
                      'p-3.5 rounded-xl border transition-all cursor-pointer group text-left relative',
                      isSelected
                        ? 'bg-primary-900/5 border-primary-900/40 shadow-xs ring-1 ring-primary-900/15'
                        : 'bg-white hover:bg-zinc-50/80 border-zinc-100 hover:border-zinc-200/80',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                        {tpl.category}
                      </span>
                      {tpl.badge && (
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0',
                            tpl.badge.includes('Luxury')
                              ? 'bg-amber-50 text-amber-800 border border-amber-200/80'
                              : tpl.badge.includes('PDF') || tpl.badge.includes('Billing')
                                ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                                : tpl.badge.includes('Security') || tpl.badge.includes('OTP')
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                                  : 'bg-zinc-100 text-zinc-700',
                          )}
                        >
                          {tpl.badge}
                        </span>
                      )}
                    </div>

                    <h4
                      className={cn(
                        'text-xs font-bold transition-colors line-clamp-1',
                        isSelected ? 'text-primary-900' : 'text-zinc-800 group-hover:text-primary-900',
                      )}
                    >
                      {tpl.title}
                    </h4>

                    <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5 font-normal">
                      {tpl.subject}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400 pt-2 border-t border-zinc-100">
                      <span className="truncate max-w-[190px]">To: {tpl.recipient}</span>
                      <ChevronRight
                        className={cn(
                          'w-3.5 h-3.5 transition-transform shrink-0',
                          isSelected ? 'text-primary-900 translate-x-0.5' : 'text-zinc-300 group-hover:text-zinc-500',
                        )}
                      />
                    </div>
                  </div>
                );
              })}

              {filteredTemplates.length === 0 && (
                <div className="text-center py-10 px-4 text-zinc-400">
                  <p className="text-xs font-medium">No templates match your search</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                    }}
                    className="mt-2 text-xs font-semibold text-primary-900 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Canvas: Preview & Inspector ── */}
        <div className="lg:col-span-8 space-y-4">
          {currentTemplate ? (
            <div className="space-y-4">
              {/* Template Meta Card */}
              <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-zinc-900">{currentTemplate.title}</h2>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                        {currentTemplate.category}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                      <span className="font-semibold text-zinc-700">Recipient:</span>
                      <span className="bg-zinc-100 px-2 py-0.5 rounded text-zinc-800 font-mono text-[11px]">
                        {currentTemplate.recipient}
                      </span>
                    </p>
                  </div>

                  {/* Viewport & View Mode Toggles */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center p-1 rounded-xl bg-zinc-100 border border-zinc-200/80">
                      <button
                        type="button"
                        onClick={() => setViewportMode('desktop')}
                        className={cn(
                          'p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer',
                          viewportMode === 'desktop'
                            ? 'bg-white text-primary-900 font-bold shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-900',
                        )}
                        title="Desktop view (600px standard email card)"
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Desktop</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewportMode('mobile')}
                        className={cn(
                          'p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer',
                          viewportMode === 'mobile'
                            ? 'bg-white text-primary-900 font-bold shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-900',
                        )}
                        title="Mobile view (375px responsive phone)"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Mobile</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewportMode('full')}
                        className={cn(
                          'p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer',
                          viewportMode === 'full'
                            ? 'bg-white text-primary-900 font-bold shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-900',
                        )}
                        title="Full width preview"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Full</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subject Line Bar with Copy */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200/70">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                      Subject Line
                    </p>
                    <p className="text-xs font-semibold text-zinc-800 truncate mt-0.5">
                      {currentTemplate.subject}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySubject}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-all cursor-pointer shadow-2xs shrink-0"
                  >
                    {copiedSubject ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Copy Subject</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Trigger & Developer Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100/80">
                    <div className="flex items-center gap-1.5 font-semibold text-blue-900 mb-1">
                      <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      When this sends:
                    </div>
                    <p className="text-blue-800/80 leading-relaxed text-[11px]">
                      {currentTemplate.trigger}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 font-semibold text-zinc-800">
                        <FileCode className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        Code Reference:
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyPath}
                        className="text-[10px] text-primary-900 hover:underline font-semibold cursor-pointer"
                        title="Copy import statement"
                      >
                        {copiedPath ? 'Copied import!' : 'Copy import'}
                      </button>
                    </div>
                    <p className="text-zinc-600 font-mono text-[11px] truncate">
                      {currentTemplate.functionName}
                    </p>
                    <p className="text-zinc-400 text-[10px] font-mono mt-0.5 truncate">
                      {currentTemplate.filePath}
                    </p>
                  </div>
                </div>

                {/* Action Tabs: Preview / Code / Variables */}
                <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
                  <div className="flex items-center gap-1">
                    {[
                      { id: 'preview', label: 'Visual Preview', icon: Monitor },
                      { id: 'variables', label: 'Dynamic Variables', icon: Sliders },
                      { id: 'html', label: 'HTML Source Code', icon: Code },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const active = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                            active
                              ? 'bg-zinc-900 text-white shadow-2xs'
                              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100',
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {activeTab === 'html' && (
                    <button
                      type="button"
                      onClick={handleCopyHtml}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-all cursor-pointer shadow-2xs"
                    >
                      {copiedHtml ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-zinc-400" />
                          <span>Copy HTML</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* ── Tab Content ── */}
              {activeTab === 'preview' && (
                <div className="bg-zinc-900 rounded-2xl p-4 sm:p-8 flex justify-center shadow-lg overflow-x-auto min-h-[600px]">
                  {/* Browser / Email Client Chrome */}
                  <div
                    className={cn(
                      'bg-white rounded-xl overflow-hidden shadow-2xl transition-all duration-300 flex flex-col',
                      viewportMode === 'desktop'
                        ? 'w-full max-w-[650px]'
                        : viewportMode === 'mobile'
                          ? 'w-[375px]'
                          : 'w-full max-w-full',
                    )}
                  >
                    {/* Simulated Email Header Window */}
                    <div className="bg-zinc-100 px-4 py-2.5 border-b border-zinc-200 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate max-w-[300px] font-mono">
                        {currentTemplate.subject}
                      </div>
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase">
                        {viewportMode}
                      </span>
                    </div>

                    {/* Rendered HTML in Sandboxed iframe */}
                    <div className="flex-1 bg-white min-h-[580px]">
                      <iframe
                        ref={iframeRef}
                        title={`Preview: ${currentTemplate.title}`}
                        className="w-full h-full min-h-[650px] border-0"
                        sandbox="allow-same-origin allow-popups"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'variables' && (
                <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Dynamic Fields & Variables</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      These variables are dynamically supplied by backend controllers when triggering this email.
                    </p>
                  </div>

                  <div className="divide-y divide-zinc-100 border border-zinc-200/80 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-12 bg-zinc-50 p-3 text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                      <div className="col-span-4">Field / Parameter</div>
                      <div className="col-span-8">Sample Value / Description</div>
                    </div>
                    {(currentTemplate.editableFields || []).map((field, idx) => (
                      <div key={idx} className="grid grid-cols-12 p-3 text-xs items-center gap-2 hover:bg-zinc-50/50">
                        <div className="col-span-4 font-semibold text-zinc-800">
                          {field.label}
                        </div>
                        <div className="col-span-8 text-zinc-600 font-mono text-[11px] break-words bg-zinc-50/80 p-2 rounded-lg border border-zinc-100">
                          {field.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-900">Developer Design Tip:</p>
                      <p className="text-amber-800/90 leading-relaxed text-[11px]">
                        To customize typography, colors, or header/footer banners, edit{' '}
                        <code className="font-mono font-semibold bg-amber-100/80 px-1.5 py-0.5 rounded">
                          {currentTemplate.filePath}
                        </code>{' '}
                        inside function{' '}
                        <code className="font-mono font-semibold bg-amber-100/80 px-1.5 py-0.5 rounded">
                          {currentTemplate.functionName}
                        </code>
                        . All email clients support inline CSS and table-based layouts best.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'html' && (
                <div className="bg-zinc-950 rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between text-zinc-400 text-xs">
                    <span className="font-mono text-[11px]">Rendered HTML Output</span>
                    <button
                      type="button"
                      onClick={handleCopyHtml}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all cursor-pointer"
                    >
                      {copiedHtml ? 'Copied! ✓' : 'Copy Full HTML'}
                    </button>
                  </div>
                  <pre className="text-zinc-300 font-mono text-[11px] leading-relaxed p-4 bg-zinc-900/90 rounded-xl overflow-x-auto max-h-[550px] border border-zinc-800">
                    <code>{currentTemplate.html}</code>
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-12 text-center text-zinc-400">
              <Mail className="w-10 h-10 mx-auto text-zinc-300 mb-2" />
              <p className="text-sm font-semibold">Select an email template from the left directory to view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

