import { Outlet } from 'react-router-dom';
import { getBrandTheme } from '../constants/brandThemes';

export default function ClientAuthLayout({ brand = 'aghori' }) {
  const theme = getBrandTheme(brand);

  return (
    <div data-brand={brand} className="min-h-screen bg-[#fafafa] flex">
      <div
        className="hidden lg:flex lg:w-[44%] flex-col justify-between p-10 text-white"
        style={{
          background: `linear-gradient(160deg, ${theme.primary} 0%, ${theme.accent1} 140%)`,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-white/15 backdrop-blur-sm">
            <span>{theme.logoEmoji}</span>
          </div>
          <span className="font-heading font-semibold text-lg">
            {theme.portalName}
          </span>
        </div>

        <div>
          <h1 className="font-heading text-3xl font-semibold leading-snug mb-3">
            Your projects,<br />your progress — in one place.
          </h1>
          <p className="text-white/70 text-sm leading-relaxed max-w-sm">
            {theme.tagline}
          </p>
        </div>

        <p className="text-white/50 text-xs">
          © {new Date().getFullYear()} {theme.portalName}. All rights reserved.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ backgroundColor: theme.primary }}
            >
              <span>{theme.logoEmoji}</span>
            </div>
            <span className="font-heading font-semibold text-lg text-primary-900">
              {theme.portalName}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-6 lg:p-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}