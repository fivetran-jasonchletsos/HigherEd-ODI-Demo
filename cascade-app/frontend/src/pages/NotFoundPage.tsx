import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8 text-center">
      <div className="eyebrow mb-4">Catalog</div>
      <h1 className="font-serif text-6xl font-semibold text-[var(--ink-strong)] tracking-tight">404, page not found</h1>
      <p className="mt-4 text-[var(--ink-muted)] font-body-serif text-lg">
        The page you requested is not in the Cascade University ODI catalog.
      </p>
      <Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-sm font-semibold text-sm text-white px-5 py-3 hover:opacity-90" style={{ background: 'var(--bronze)' }}>
        Return to home
      </Link>
    </div>
  );
}
