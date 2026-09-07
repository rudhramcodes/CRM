import { Outlet } from 'react-router-dom';

export default function FreelancerPortalLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f7f5]">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center sm:mb-10">
          <div className="mb-6 inline-flex h-32 w-32 items-center justify-center sm:h-40 sm:w-40">
            <img
              src="https://res.cloudinary.com/dvsrgdyi7/image/upload/v1784621259/rudhram-logo.png"
              alt="Rudhram logo"
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="font-heading text-3xl font-semibold text-primary-900">
            Freelancer Portal
          </h1>
          <p className="text-zinc-500 text-base mt-2">
            Join our network of skilled freelancers. Fill in your details below.
          </p>
        </div>
        <div className="rounded-[2rem] border border-zinc-200/80 bg-white p-0 shadow-[0_24px_80px_-42px_rgba(0,0,0,0.35)]">
          <Outlet />
        </div>
        <p className="mt-6 text-center text-sm text-zinc-500">
          Questions? Contact us at <a href="mailto:freelancers@rudhramenterprises.com" className="text-primary-900 hover:underline">freelancers@rudhramenterprises.com</a>
        </p>
      </div>
    </div>
  );
}
