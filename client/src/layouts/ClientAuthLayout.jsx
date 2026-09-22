import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function ClientAuthLayout() {
  return (
    <div className="min-h-screen bg-[#f7f7f5] relative overflow-x-hidden flex flex-col justify-between items-center py-8 sm:py-12 px-4 sm:px-6 selection:bg-primary-900 selection:text-white">
      {/* Ambient background glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary-900/[0.03] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary-900/[0.03] blur-3xl"
      />

      <div className="w-full max-w-md my-auto flex flex-col items-center">
        {/* Brand Header */}
        <div className="mb-7 sm:mb-8 text-center">
          <div className="mb-3.5 inline-flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center transition-transform hover:scale-105 duration-300">
            <img
              src="https://res.cloudinary.com/dvsrgdyi7/image/upload/v1784621259/rudhram-logo.png"
              alt="Rudhram logo"
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-primary-900">
            Client Portal
          </h1>
          <p className="text-zinc-500 text-sm sm:text-base mt-1 font-normal">
            Track your projects, deliverables &amp; invoices in real-time.
          </p>
        </div>

        {/* Elevated Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full rounded-[2rem] border border-zinc-200/80 bg-white p-7 sm:p-9 shadow-[0_24px_80px_-42px_rgba(0,0,0,0.35)] relative"
        >
          <Outlet />
        </motion.div>
      </div>

      {/* Footer support */}
      <footer className="mt-8 text-center text-xs text-zinc-400">
        <p>
          Need client support?{' '}
          <a
            href="mailto:clients@rudhramenterprises.com"
            className="text-primary-900 font-medium hover:underline transition-colors"
          >
            clients@rudhramenterprises.com
          </a>
        </p>
      </footer>
    </div>
  );
}