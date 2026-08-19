import { GUIDE_SECTIONS, FAQS } from '../data/onboardingContent';

export default function PortalGuide() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-xl font-semibold text-primary-900">Guide</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Everything you can do in your portal, explained.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-primary-900 uppercase tracking-wide mb-4">What you can do</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {GUIDE_SECTIONS.map((section) => (
            <div key={section.key} className="bg-white rounded-xl border border-zinc-200 p-5">
              <div className="text-2xl mb-2">{section.icon}</div>
              <h3 className="text-sm font-semibold text-primary-900 mb-1">{section.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-primary-900 uppercase tracking-wide mb-4">Frequently asked questions</h2>
        <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100">
          {FAQS.map((faq) => (
            <div key={faq.q} className="p-5">
              <h3 className="text-sm font-medium text-primary-900 mb-1">{faq.q}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}