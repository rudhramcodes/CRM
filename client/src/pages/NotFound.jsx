import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
      <div className="text-center">
        <h1 className="font-heading text-7xl font-bold text-primary-900">404</h1>
        <p className="text-zinc-600 mt-4">Page not found</p>
        <p className="text-zinc-400 text-sm mt-1">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          to="/dashboard"
          className="inline-block mt-6 px-5 py-2.5 bg-primary-900 text-white rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
