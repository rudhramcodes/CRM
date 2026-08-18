import { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDownToLine,
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Loader2,
  RefreshCw,
  Table2,
  Upload,
  X,
  ListChecks,
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { useImportLeadsMutation } from '../../../services/leadApi';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';

const ALLOWED_EXTENSIONS = ['xlsx', 'xls', 'csv'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const EXTENSIONS_TEXT = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(', ');

const STEPS = [
  { icon: Download, label: 'Download template' },
  { icon: FileSpreadsheet, label: 'Fill it in' },
  { icon: ArrowDownToLine, label: 'Drop to import' },
];

const COLUMN_GUIDE = [
  { name: 'Name', required: true, format: 'Lead name, min 2 characters' },
  { name: 'Email', required: true, format: 'Valid email, must not exist in the CRM' },
  { name: 'Phone', required: false, format: '10+ digits, with or without +91' },
  { name: 'Company', required: false, format: 'Company or organization name' },
  { name: 'Brand', required: false, format: 'Brand value or display name' },
  { name: 'Source', required: false, format: 'Value or display name' },
  { name: 'Status', required: false, format: 'Value or display name, defaults to new' },
  { name: 'Notes', required: false, format: 'One note per lead, max 2000 characters' },
  { name: 'Follow Up Date', required: false, format: 'YYYY-MM-DD' },
];

const RULES = [
  'First row of the file must be the column headers',
  'Only Name and Email are required',
  'Imported leads are always created as Unassigned',
  'Rows with errors are skipped, the rest are still imported',
];

const TEMPLATE_CSV = `Name,Email,Phone,Company,Brand,Source,Status,Notes,Follow Up Date
Rahul Sharma,rahul@example.com,+91 98765 43210,Acme Corp,panigrahna,google_ads,new,Interested in summer collection,2026-09-01
Priya Patel,priya@example.com,,Zenith Ltd,aghori,referral,contacted,Follow up call,2026-09-05`;

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const viewMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export default function LeadImportModal({ open, onClose }) {
  const [file, setFile] = useState(null);
  const [view, setView] = useState('upload');
  const [result, setResult] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [dragReject, setDragReject] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef(null);
  const [importLeads, { isLoading: isImporting }] = useImportLeadsMutation();

  useEffect(() => {
    if (open) {
      setFile(null);
      setView('upload');
      setResult(null);
      setApiError(null);
      setFileError(null);
      setDragActive(false);
      setDragReject(false);
      dragCounter.current = 0;
    }
  }, [open]);

  const handleFileSelect = useCallback(
    (selected) => {
      if (!selected) return;
      const ext = selected.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setFileError(`File type not supported. Choose a ${EXTENSIONS_TEXT} file.`);
        toast.error(`Only ${EXTENSIONS_TEXT} files are allowed`);
        return;
      }
      if (selected.size > MAX_FILE_SIZE) {
        setFileError('File is larger than 5MB. Choose a smaller file.');
        toast.error('Maximum file size is 5MB');
        return;
      }
      setFileError(null);
      setApiError(null);
      setFile(selected);
    },
    [],
  );

  const onDragEnter = useCallback((e) => {
    if (e.dataTransfer?.types?.includes('Files')) {
      dragCounter.current += 1;
      setDragActive(true);
    }
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    const hasFiles = e.dataTransfer?.types?.includes('Files');
    setDragReject(!hasFiles);
    if (hasFiles) {
      dragCounter.current = Math.max(dragCounter.current, 1);
      setDragActive(true);
    }
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    dragCounter.current = Math.max(dragCounter.current - 1, 0);
    if (dragCounter.current === 0) {
      setDragActive(false);
      setDragReject(false);
    }
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      dragCounter.current = 0;
      setDragActive(false);
      setDragReject(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect],
  );

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lead-import-template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!file) return;
    setApiError(null);
    setView('importing');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await importLeads(formData).unwrap();
      setResult(res.data);
      setView('result');
    } catch (err) {
      const message = err?.data?.message || 'Something went wrong. Please try again.';
      setApiError(message);
      setView('upload');
      toast.error('Import failed');
    }
  };

  const hasErrors = Boolean(fileError);

  return (
    <Modal open={open} onClose={onClose} title="Import Leads" size="xl">
      <AnimatePresence mode="wait">
        {view === 'importing' ? (
          <motion.div key="importing" {...viewMotion} className="flex flex-col items-center justify-center gap-5 py-16">
            <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-primary-50">
              <Loader2 className="w-6 h-6 text-primary-900 animate-spin" />
            </span>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-primary-900">Importing leads from "{file?.name}"</p>
              <p className="text-xs text-zinc-400">This usually takes a few seconds</p>
            </div>
            <div className="h-1.5 w-64 overflow-hidden rounded-full bg-zinc-100">
              <motion.div
                className="h-full w-1/3 rounded-full bg-primary-900"
                animate={{ x: ['-100%', '400%'] }}
                transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
              />
            </div>
          </motion.div>
        ) : view === 'result' ? (
          <motion.div key="result" {...viewMotion} className="space-y-5">
            <div
              className={cn(
                'flex items-start gap-4 rounded-2xl border p-5',
                result.skipped > 0
                  ? 'border-amber-200 bg-amber-50/70'
                  : 'border-green-200 bg-green-50/70',
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center w-11 h-11 rounded-full shrink-0',
                  result.skipped > 0 ? 'bg-amber-100' : 'bg-green-100',
                )}
              >
                {result.skipped > 0 ? (
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-primary-900">
                  Import complete. {result.imported} {result.imported === 1 ? 'lead' : 'leads'} imported.
                </p>
                {result.skipped > 0 ? (
                  <p className="text-sm text-zinc-600 mt-0.5">
                    {result.skipped} {result.skipped === 1 ? 'row was' : 'rows were'} skipped. Fix the rows below and
                    import the file again.
                  </p>
                ) : (
                  <p className="text-sm text-zinc-600 mt-0.5">All rows were imported and are now in the Leads list.</p>
                )}
              </div>
            </div>

            {result.skipped > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Skipped rows ({result.errors.length})
                  </p>
                </div>
                <div className="max-h-60 overflow-y-auto rounded-xl border border-zinc-200 divide-y divide-zinc-100">
                  {result.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                      <span className="shrink-0 inline-flex items-center justify-center min-w-14 px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-500 text-xs font-semibold">
                        Row {err.row}
                      </span>
                      <span className="text-sm text-zinc-700">{err.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
              <p className="text-xs text-zinc-400">
                {result.skipped > 0
                  ? 'Tip: download the template and check the column formats'
                  : 'You can import more files anytime'}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={onClose}>
                  Done
                </Button>
                <Button
                  onClick={() => {
                    setResult(null);
                    setFile(null);
                    setView('upload');
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Import another file
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="upload" {...viewMotion} className="space-y-5">
            <div className="grid grid-cols-3 gap-2">
              {STEPS.map((step, i) => (
                <div
                  key={step.label}
                  className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-3 text-center"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-zinc-200 text-primary-900 text-xs font-bold shadow-sm">
                    {i + 1}
                  </span>
                  <step.icon className="w-4 h-4 text-zinc-400" />
                  <p className="text-xs font-medium text-zinc-600">{step.label}</p>
                </div>
              ))}
            </div>

            <div>
              <div
                onDragEnter={onDragEnter}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center cursor-pointer outline-none transition-all duration-200',
                  dragReject
                    ? 'border-red-300 bg-red-50/60'
                    : dragActive
                      ? 'border-primary-900 bg-primary-50/80 ring-4 ring-primary-900/10 scale-[1.01]'
                      : 'border-zinc-300 bg-white hover:border-primary-900/50 hover:bg-zinc-50/50 focus-visible:ring-2 focus-visible:ring-primary-900/20',
                )}
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={dragReject ? 'reject' : dragActive ? 'active' : 'idle'}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      'flex items-center justify-center w-14 h-14 rounded-full',
                      dragReject
                        ? 'bg-red-100'
                        : dragActive
                          ? 'bg-primary-900'
                          : 'bg-primary-50',
                    )}
                  >
                    {dragReject ? (
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    ) : dragActive ? (
                      <ArrowDownToLine className="w-6 h-6 text-white animate-bounce" />
                    ) : (
                      <FileSpreadsheet className="w-6 h-6 text-primary-900" />
                    )}
                  </motion.span>
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={dragReject ? 'reject-text' : dragActive ? 'active-text' : 'idle-text'}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                  >
                    {dragReject ? (
                      <>
                        <p className="text-sm font-medium text-red-700">Only spreadsheet files are allowed</p>
                        <p className="text-xs text-red-500/80 mt-1">Choose a {EXTENSIONS_TEXT} file</p>
                      </>
                    ) : dragActive ? (
                      <>
                        <p className="text-sm font-semibold text-primary-900">Drop your file to import</p>
                        <p className="text-xs text-primary-900/60 mt-1">Release to start importing</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-zinc-800">
                          Drag &amp; drop your file here, or{' '}
                          <span className="underline underline-offset-2 text-primary-900 font-semibold">browse</span>
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">{EXTENSIONS_TEXT} · up to 5MB · up to 1000 leads</p>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    handleFileSelect(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>

              <AnimatePresence>
                {fileError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{fileError}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {file && !hasErrors && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-3 flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3"
                  >
                    <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100 shrink-0">
                      <FileUp className="w-5 h-5 text-green-700" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-800 truncate">{file.name}</p>
                      <p className="text-xs text-zinc-400">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      onClick={() => {
                        setFile(null);
                        setFileError(null);
                      }}
                      className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="rounded-2xl border border-zinc-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-50/80 border-b border-zinc-200">
                <div className="flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-primary-900" />
                  <p className="text-sm font-semibold text-primary-900">Columns in your file</p>
                </div>
                <span className="text-xs text-zinc-400">First row must be headers</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-zinc-100">
                    {COLUMN_GUIDE.map((col) => (
                      <tr key={col.name} className="hover:bg-zinc-50/60">
                        <td className="px-4 py-2 font-medium text-zinc-800 whitespace-nowrap">{col.name}</td>
                        <td className="px-4 py-2 w-20">
                          {col.required ? (
                            <span className="inline-flex px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 text-[11px] font-semibold">
                              Required
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-400">Optional</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-zinc-500">{col.format}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50/40">
                <ul className="space-y-1.5">
                  {RULES.map((rule) => (
                    <li key={rule} className="flex items-start gap-2 text-xs text-zinc-600">
                      <ListChecks className="w-3.5 h-3.5 text-primary-900/60 shrink-0 mt-px" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <AnimatePresence>
              {apiError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-700">Import failed</p>
                      <p className="text-sm text-red-600/90 mt-0.5">{apiError}</p>
                      <p className="text-xs text-red-500 mt-1">No changes were made. Check the file and try again.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
              <Button variant="ghost" onClick={downloadTemplate}>
                <Download className="w-3.5 h-3.5" />
                Download template
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={!file || hasErrors || isImporting}>
                  <Upload className="w-3.5 h-3.5" />
                  Import leads
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
