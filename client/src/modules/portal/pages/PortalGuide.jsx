import { GUIDE_SECTIONS, FAQS } from '../data/onboardingContent';
import { motion } from 'framer-motion';
import { Sparkles, HelpCircle } from 'lucide-react';

export default function PortalGuide() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 border border-primary-100 text-xs font-mono uppercase tracking-widest text-primary-900 font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-primary-900" />
          Client Handbook & Resources
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">Client Portal Guide</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Everything you need to know to collaborate, review deliverables, book sessions, and manage invoices.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-4 rounded-full bg-primary-900" />
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-semibold">Capabilities & Workflows</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {GUIDE_SECTIONS.map((section, idx) => (
            <motion.div
              key={section.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-xs hover:border-zinc-300 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center mb-3 group-hover:bg-primary-900 group-hover:text-white text-primary-900 transition-colors">
                <section.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900 mb-2">{section.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{section.body}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-4 h-4 text-zinc-400" />
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-semibold">Frequently Asked Questions</h2>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200/80 divide-y divide-zinc-100 shadow-xs overflow-hidden">
          {FAQS.map((faq) => (
            <div key={faq.q} className="p-6 hover:bg-zinc-50/60 transition-colors">
              <h3 className="text-sm font-semibold text-zinc-900 mb-2">{faq.q}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}