import { useState } from 'react';
import {
  ShieldAlert,
  Copy,
  Check,
  ArrowRight,
  Phone,
  User,
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import {
  BRAND_METAS,
  BRAND_COMMUNITY_NAMES,
  VENTURE_CODES,
} from '../../../constants';
import { cn } from '../../../utils/cn';
import toast from 'react-hot-toast';

export default function LeadCommunityGroupModal({
  open,
  onClose,
  onConfirm,
  lead,
  targetStatus = 'contacted',
  isCallAction = false,
  loading = false,
}) {
  const [copied, setCopied] = useState(false);
  const [groupCreatedChecked, setGroupCreatedChecked] = useState(false);

  if (!lead) return null;

  const brand = lead.brand || 'panigrahna';
  const brandMeta = BRAND_METAS[brand] || {};
  const brandLabel = brandMeta.label || (brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : 'Panigrahna');
  const communityName = BRAND_COMMUNITY_NAMES[brand] || `${brandLabel} by Rudhram Enterprises`;

  const year = new Date().getFullYear();
  const ventureCode = VENTURE_CODES[brand] || 'PG';
  const rawClientId = lead.clientId || lead.convertedToClient?.clientId;
  const displayClientId = rawClientId || `RE-${ventureCode}-${year}-001`;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayClientId);
    setCopied(true);
    toast.success('Client ID copied to clipboard!');
    setTimeout(() => setCopied(false), 2200);
  };

  const handleProceed = () => {
    if (!groupCreatedChecked) return;
    onConfirm?.();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Brand Community Group"
      description="Standard Operating Procedure (SOP) before contacting this lead"
      size="md"
    >
      <div className="space-y-4">
        {/* Concise SOP Reminder */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Create the WhatsApp group inside the brand community <strong>before</strong> calling or marking as Contacted.
          </span>
        </div>

        {/* Lead & Brand Group Setup Card */}
        <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-4 space-y-3.5">
          {/* Lead & Brand Identity Row */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-200/70">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Lead</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-bold text-primary-900 truncate">{lead.name}</span>
                {lead.phone && (
                  <span className="text-xs text-zinc-500 font-mono flex items-center gap-1">
                    · <Phone className="w-3 h-3 text-zinc-400 inline" /> {lead.phone}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {brandMeta.logo ? (
                <img
                  src={brandMeta.logo}
                  alt={brandLabel}
                  className="w-6 h-6 rounded-md object-contain bg-white p-0.5 border border-zinc-200/90 shadow-2xs"
                />
              ) : (
                <div
                  className={cn(
                    'w-6 h-6 rounded-md text-white font-bold text-[10px] flex items-center justify-center shadow-2xs bg-gradient-to-br',
                    brandMeta.gradient || 'from-zinc-800 to-zinc-950',
                  )}
                >
                  {brandMeta.initial || brandLabel[0]}
                </div>
              )}
              <span className="text-xs font-semibold text-zinc-800">{brandLabel}</span>
            </div>
          </div>

          {/* Target Community Guideline */}
          <div className="text-xs text-zinc-600 leading-relaxed">
            Open WhatsApp community{' '}
            <strong className="text-primary-900 font-semibold underline decoration-zinc-300">
              {communityName}
            </strong>{' '}
            and create a group titled with this Client ID:
          </div>

          {/* Group Name Display & Copy Action */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-zinc-200/90 shadow-2xs">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Group Name (Client ID)
              </span>
              <span className="font-mono text-sm sm:text-base font-bold text-primary-900 tracking-wide select-all block truncate mt-0.5">
                {displayClientId}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100 text-xs font-semibold text-zinc-700 transition shadow-2xs shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
              <span>{copied ? 'Copied' : 'Copy Client ID'}</span>
            </button>
          </div>
        </div>

        {/* Confirmation Checkbox Card */}
        <label
          className={cn(
            'flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none',
            groupCreatedChecked
              ? 'border-primary-900/40 bg-zinc-50/90 shadow-2xs'
              : 'border-zinc-200 bg-white hover:border-zinc-300',
          )}
        >
          <input
            type="checkbox"
            checked={groupCreatedChecked}
            onChange={(e) => setGroupCreatedChecked(e.target.checked)}
            className="w-4 h-4 rounded text-primary-900 border-zinc-300 focus:ring-primary-900/20 cursor-pointer"
          />
          <span className="text-xs text-zinc-700 leading-snug font-medium">
            I confirm that I have created the group in{' '}
            <strong className="text-primary-900 font-semibold">{communityName}</strong>
          </span>
        </label>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl"
          >
            Cancel / Go Back
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleProceed}
            disabled={!groupCreatedChecked || loading}
            loading={loading}
            className="rounded-xl gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>{isCallAction ? 'Group Created, Proceed to Call' : 'Group Created, Mark as Contacted'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
