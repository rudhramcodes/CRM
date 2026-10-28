import { Fragment, useState } from 'react';
import { Check, ShieldCheck, FileCheck2, PackageCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { PROJECT_STAGES, STAGE_PROGRESS } from '../../../constants';
import { useChangeProjectStageMutation } from '../../../services/projectApi';
import Button from '../../../components/ui/Button';
import StageReasonModal from './StageReasonModal';
import QualityCheckModal from './QualityCheckModal';
import ClosingNoteModal from './ClosingNoteModal';

const QC_ITEMS = ['scopeComplete', 'filesCorrect', 'clientCommitmentsMet', 'noOpenBlockers'];

export default function ProjectStageBar({ project, canManage, canQC }) {
  const [changeStage, { isLoading: isChanging }] = useChangeProjectStageMutation();
  const [showQualityCheck, setShowQualityCheck] = useState(false);
  const [showClosingNote, setShowClosingNote] = useState(false);
  const [reasonStage, setReasonStage] = useState(null);

  const currentIndex = PROJECT_STAGES.findIndex((stage) => stage.value === project.stage);
  const currentStage = PROJECT_STAGES[currentIndex];
  const isLegacy = currentIndex === -1 || !project.stage;
  const progress = isLegacy ? 0 : (project.progress ?? STAGE_PROGRESS[project.stage] ?? 0);
  const isDelivered = project.stage === 'delivered';

  const qcPassed = project.qcChecklist?.status === 'passed';
  const qcChecked = QC_ITEMS.filter((key) => project.qcChecklist?.[key]?.checked).length;
  const note = project.closingNote;
  const noteSaved = Boolean(note?.deliveredWhat?.trim() && note?.deliveredWhen && note?.writtenBy);
  const pendingDeliverables = (project.deliverables || []).filter((item) => item.status !== 'delivered');
  const deliveredReady = qcPassed && noteSaved && pendingDeliverables.length === 0;

  const missing = [
    !qcPassed && 'Admin QC pending',
    !noteSaved && 'Closing Note pending',
    pendingDeliverables.length > 0 && `${pendingDeliverables.length} deliverable${pendingDeliverables.length > 1 ? 's' : ''} undelivered`,
  ].filter(Boolean);

  const moveToStage = async (stage, reason) => {
    const label = PROJECT_STAGES.find((item) => item.value === stage)?.label || stage;
    try {
      await changeStage({ id: project._id, stage, reason }).unwrap();
      toast.success(`Project moved to ${label}`);
      setReasonStage(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to change project stage');
      throw err;
    }
  };

  const handleStageClick = (stage, index) => {
    if (!canManage || isLegacy || isChanging || index === currentIndex) return;
    if (index < currentIndex) {
      setReasonStage(stage);
      return;
    }
    if (stage === 'delivered' && !deliveredReady) {
      toast.error(missing[0] || 'Admin QC and Closing Note required');
      return;
    }
    moveToStage(stage).catch(() => {});
  };

  const handleDeliver = () => {
    moveToStage('delivered').catch(() => {});
  };

  const lastBackward = (project.stageHistory || [])
    .slice()
    .reverse()
    .find((entry) => STAGE_PROGRESS[entry.toStage] < STAGE_PROGRESS[entry.fromStage]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">SOP Stage</p>
          <div className="mt-1.5 flex items-center gap-2.5">
            <span className="inline-flex items-center rounded-full bg-primary-900 px-2.5 py-1 text-xs font-semibold text-white">
              {isLegacy ? 'Not migrated' : currentStage.label}
            </span>
            <span className="text-xs font-medium text-zinc-500">{progress}% complete</span>
          </div>
        </div>
        {isDelivered && project.completedAt && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            <Check className="h-3 w-3" /> Delivered
          </span>
        )}
      </div>

      <div className="overflow-x-auto px-5 py-5">
        <div className="flex min-w-[560px] items-start">
          {PROJECT_STAGES.map((stage, index) => {
            const complete = !isLegacy && index < currentIndex;
            const active = !isLegacy && index === currentIndex;
            const clickable = canManage && !isLegacy && !active;
            return (
              <Fragment key={stage.value}>
                <button
                  type="button"
                  onClick={() => handleStageClick(stage.value, index)}
                  disabled={!clickable || isChanging}
                  className={`flex w-20 shrink-0 flex-col items-center gap-1.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-900/20 ${
                    clickable ? 'cursor-pointer' : 'cursor-default'
                  }`}
                  title={clickable ? `Move to ${stage.label}` : undefined}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                      complete
                        ? 'border-primary-900 bg-primary-900 text-white'
                        : active
                          ? 'border-primary-900 bg-white text-primary-900 ring-4 ring-primary-900/10'
                          : 'border-zinc-200 bg-white text-zinc-400'
                    }`}
                  >
                    {complete ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className={`text-center text-[11px] leading-tight ${active ? 'font-semibold text-primary-900' : 'text-zinc-500'}`}>
                    {stage.label}
                  </span>
                  <span className="text-[10px] text-zinc-400">{stage.progress}%</span>
                </button>
                {index < PROJECT_STAGES.length - 1 && (
                  <div className={`mt-4 h-0.5 flex-1 ${index < currentIndex ? 'bg-primary-900' : 'bg-zinc-200'}`} />
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {isLegacy ? (
        <div className="border-t border-zinc-100 px-5 py-3.5">
          <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            This project is on the legacy workflow. Stage controls unlock after SOP migration.
          </p>
        </div>
      ) : (
        <div className="space-y-3 border-t border-zinc-100 px-5 py-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <ShieldCheck className={`h-4 w-4 shrink-0 ${qcPassed ? 'text-emerald-600' : 'text-zinc-300'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-primary-900">Quality Check</p>
                  <p className={`text-[11px] ${qcPassed ? 'text-emerald-600' : 'text-zinc-400'}`}>
                    {qcPassed ? 'Passed' : `${qcChecked}/4 checked`}
                  </p>
                </div>
              </div>
              {canQC && !isDelivered && (
                <Button type="button" size="sm" variant="outline" onClick={() => setShowQualityCheck(true)}>
                  {qcPassed ? 'Review' : 'Open'}
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <FileCheck2 className={`h-4 w-4 shrink-0 ${noteSaved ? 'text-emerald-600' : 'text-zinc-300'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-primary-900">Closing Note</p>
                  <p className={`text-[11px] ${noteSaved ? 'text-emerald-600' : 'text-zinc-400'}`}>
                    {noteSaved ? 'Saved' : 'Not saved'}
                  </p>
                </div>
              </div>
              {canManage && !isDelivered && (
                <Button type="button" size="sm" variant="outline" onClick={() => setShowClosingNote(true)}>
                  {noteSaved ? 'Edit' : 'Add'}
                </Button>
              )}
            </div>
          </div>

          {!isDelivered && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className={`text-xs ${deliveredReady ? 'text-emerald-600' : 'text-zinc-400'}`}>
                {deliveredReady ? 'Delivery ready' : `Delivery locked: ${missing.join(' · ')}`}
              </p>
              {canManage && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleDeliver}
                  loading={isChanging}
                  disabled={!deliveredReady}
                  title={deliveredReady ? 'Mark project as delivered' : missing.join(' · ')}
                >
                  <PackageCheck className="h-3.5 w-3.5" />
                  Mark as Delivered
                </Button>
              )}
            </div>
          )}

          {lastBackward?.reason && (
            <p className="border-t border-zinc-100 pt-3 text-[11px] text-zinc-400">
              Moved back to {PROJECT_STAGES.find((stage) => stage.value === lastBackward.toStage)?.label}
              {lastBackward.changedBy?.name ? ` by ${lastBackward.changedBy.name}` : ''}: {lastBackward.reason}
            </p>
          )}
        </div>
      )}

      <StageReasonModal
        open={!!reasonStage}
        onClose={() => setReasonStage(null)}
        title={`Reason for moving back to ${PROJECT_STAGES.find((stage) => stage.value === reasonStage)?.label || ''}`}
        description="Moving a project backward clears QC and the Closing Note. The reason is saved in history."
        confirmLabel="Move Back"
        onConfirm={(reason) => moveToStage(reasonStage, reason)}
      />
      <QualityCheckModal open={showQualityCheck} onClose={() => setShowQualityCheck(false)} project={project} />
      <ClosingNoteModal open={showClosingNote} onClose={() => setShowClosingNote(false)} project={project} />
    </div>
  );
}
