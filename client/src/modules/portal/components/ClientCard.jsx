import { useState } from 'react';
import { Copy, Check, ShieldCheck, Building2, User, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClientCard({ client, user }) {
  const [copied, setCopied] = useState(false);

  const copyClientId = () => {
    if (!client?.clientId) return;
    navigator.clipboard.writeText(client.clientId);
    setCopied(true);
    toast.success('Client ID copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const brandName = (client?.brand || 'Rudhram').toUpperCase();
  const company = client?.companyName || user?.name || 'Partner Account';
  const clientId = client?.clientId || 'RE-VIP-001';

  return (
    <div className="w-full bg-white rounded-2xl border border-zinc-200/80 p-6 sm:p-7 shadow-xs hover:shadow-sm transition-all relative overflow-hidden group">
      {/* Soft brand accent background element */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary-50 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none opacity-60" />

      {/* Card Top */}
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {company.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-900">
              <Sparkles className="w-3.5 h-3.5 text-primary-900" />
              <span>Executive Partner</span>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium">Verified Client Portal</p>
          </div>
        </div>

        <div className="text-right">
          <span className="font-heading font-bold text-sm text-primary-900 tracking-tight block">
            RUDHRAM
          </span>
          <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase">{brandName}</span>
        </div>
      </div>

      {/* Card Middle: Company / Contact */}
      <div className="my-6 relative z-10">
        <p className="text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1.5 uppercase tracking-wider">
          <Building2 className="w-3.5 h-3.5 text-zinc-400" /> Organization
        </p>
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 font-heading truncate">
          {company}
        </h3>
        {client?.contactPerson && client.contactPerson !== company && (
          <p className="text-xs text-zinc-600 font-medium mt-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-zinc-400" /> {client.contactPerson}
          </p>
        )}
      </div>

      {/* Card Bottom: Client ID & Verification */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-100 relative z-10">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-0.5">
            Client ID
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-zinc-800">
              {clientId}
            </span>
            <button
              type="button"
              onClick={copyClientId}
              className="p-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors"
              title="Copy Client ID"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Active Partner</span>
        </div>
      </div>
    </div>
  );
}
