import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { useSaveProjectQualityCheckMutation } from '../../../services/projectApi';
import { formatDateTime } from '../../../utils/formatters';

const ITEMS = [
  { key: 'scopeComplete', label: 'Scope Complete', hint: 'All agreed work is covered.' },
  { key: 'filesCorrect', label: 'Files Correct & Formatted', hint: 'Files follow the correct format and naming.' },
  { key: 'clientCommitmentsMet', label: 'Client Commitments Met', hint: 'All client commitments are fulfilled.' },
  { key: 'noOpenBlockers', label: 'No Open Blockers', hint: 'No pending blockers or dependencies remain.' },
];

const EMPTY_CHECKS = Object.fromEntries(ITEMS.map((item) => [item.key, false]));

export default function QualityCheckModal({ open, onClose, project }) {
  const [checks, setChecks] = useState(EMPTY_CHECKS);
  const [saveQualityCheck, { isLoading }] = useSaveProjectQualityCheckMutation();

  useEffect(() => {
    if (!open) return;
    setChecks(Object.fromEntries(
      ITEMS.map((item) => [item.key, project?.qcChecklist?.[item.key]?.checked === true]),
    ));
  }, [open, project?._id]);

  if (!project) return null;

  const allChecked = ITEMS.every((item) => checks[item.key]);

  const handleSave = async () => {
    try {
      await saveQualityCheck({ id: project._id, ...checks }).unwrap();
      toast.success('Quality check saved');
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save quality check');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Admin Quality Check"
      description="Complete all checks before marking the project delivered."
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5">
          <ShieldCheck className="h-4 w-4 text-zinc-400" />
          <p className="text-xs text-zinc-500">
            The sign-off Admin name and time will be recorded.
          </p>
        </div>

        <div className="space-y-2">
          {ITEMS.map((item) => {
            const saved = project.qcChecklist?.[item.key];
            const checked = checks[item.key];
            return (
              <label
                key={item.key}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                  checked ? 'border-zinc-300 bg-white' : 'border-zinc-200 bg-white hover:bg-zinc-50/60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => setChecks((current) => ({ ...current, [item.key]: event.target.checked }))}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary-900"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-primary-900">
                    {checked ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-zinc-300" />
                    )}
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">{item.hint}</span>
                  {checked && saved?.checked && saved.checkedAt && (
                    <span className="mt-1 block text-[11px] text-zinc-400">
                      {saved.checkedBy?.name || 'Admin'} &middot; {formatDateTime(saved.checkedAt)}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-zinc-400">
            {allChecked ? 'All checks complete' : 'All 4 checks required to pass QC'}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} loading={isLoading}>
              Save QC
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
