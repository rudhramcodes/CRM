import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-primary-900 rounded-xl mb-5">
            <span className="text-white font-heading font-bold text-lg">R</span>
          </div>
          <h1 className="font-heading text-2xl font-semibold text-primary-900">
            Rudhram CRM
          </h1>
          <p className="text-zinc-500 text-sm mt-1.5">
            Manage your business, grow your revenue.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
