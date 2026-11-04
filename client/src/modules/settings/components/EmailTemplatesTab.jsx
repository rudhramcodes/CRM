import { Link } from 'react-router-dom';
import { Mail, ExternalLink, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useGetEmailPreviewsQuery } from '../../../services/settingsApi';

export default function EmailTemplatesTab() {
  const { data: templates = [] } = useGetEmailPreviewsQuery();

  const categories = [
    { name: 'Client & Portal', count: 3, desc: 'Welcome onboarding, client login credentials, portal invites' },
    { name: 'Financials', count: 3, desc: 'Invoices with PDF, Quotations with PDF, Payment receipts' },
    { name: 'HR & Attendance', count: 3, desc: 'Leave applications, leave approvals, leave rejections' },
    { name: 'Meetings & Calendar', count: 2, desc: 'Meeting scheduling confirmations & 1-hour cron reminders' },
    { name: 'Authentication', count: 3, desc: '6-digit OTP verification, user welcome, password reset' },
    { name: 'Freelancers', count: 2, desc: 'Talent application admin alerts & applicant acknowledgements' },
    { name: 'Leads & System', count: 2, desc: 'New lead capture notifications & in-app notification mirrors' },
  ];

  return (
    <div className="space-y-6">
      {/* Featured Banner */}
      <div className="bg-gradient-to-br from-primary-950 via-primary-900 to-zinc-900 text-white rounded-2xl p-6 sm:p-7 shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Developer & Designer Tool
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Email Templates & Preview Studio
            </h2>
            <p className="text-zinc-300 text-sm mt-1 max-w-xl leading-relaxed">
              Explore and test all 18 transactional and brand email designs. Switch between Desktop and Mobile viewports, inspect dynamic variables, and copy HTML or subject lines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/email-previews"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-primary-950 font-bold text-xs hover:bg-zinc-100 transition-all shadow-sm group"
            >
              Open Interactive Preview Studio
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <a
              href="/mail.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-all border border-white/15"
            >
              <ExternalLink className="w-3.5 h-3.5 text-zinc-300" />
              Standalone HTML View (/mail.html)
            </a>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary-900" />
            Email Categories & Inventory ({templates.length || 18} Active Templates)
          </h3>
          <span className="text-xs text-zinc-400 font-mono">server/src/services/emailService.js</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {categories.map((c, i) => (
            <div key={i} className="p-3.5 rounded-xl border border-zinc-100 bg-zinc-50/60 hover:bg-zinc-50 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-zinc-800">{c.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-900/10 text-primary-900">
                  {c.count} Templates
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-snug">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Code Architecture Quick Reference */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 space-y-3 shadow-xs text-xs">
        <h3 className="text-sm font-bold text-zinc-900">For Developers Redesigning Emails:</h3>
        <ul className="space-y-2 text-zinc-600">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              All email HTML templates and styles are centralized in{' '}
              <code className="font-mono text-zinc-800 bg-zinc-100 px-1 py-0.5 rounded">server/src/services/emailService.js</code>.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Templates use table-based HTML with inline styles for maximum compatibility across Outlook, Gmail, Apple Mail, and mobile clients.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Venture-specific branding (Panigrahna, Aghori, Damrru, etc.) utilizes the{' '}
              <code className="font-mono text-zinc-800 bg-zinc-100 px-1 py-0.5 rounded">getBrandSupportInfo(brand)</code> helper to dynamically inject specific phone numbers and support emails.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

