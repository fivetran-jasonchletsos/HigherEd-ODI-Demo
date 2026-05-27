import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { api, getSnapshotTime, subscribeSource, type DataSource } from '../api/queries';

// Two-cluster nav mirrors Clarity / Verity / Altavest:
//   1. Persona links (Home + industry pages, flat)
//   2. dbt-Wizard ▾ — narrative dropdown (Overview / Scenario / Live / Outcome)
//   3. ODI ▾ — plumbing dropdown (Architecture / Pipeline / About)
type NavEntry =
  | { kind: 'link'; to: string; label: string }
  | { kind: 'group'; label: string; rootTo: string; matchPrefixes: string[]; children: { to: string; label: string }[] };

const NAV: NavEntry[] = [
  { kind: 'link', to: '/',            label: 'Home' },
  { kind: 'link', to: '/enrollment',  label: 'Enrollment' },
  { kind: 'link', to: '/success',     label: 'Student Success' },
  { kind: 'link', to: '/research',    label: 'Research' },
  { kind: 'link', to: '/programs',    label: 'Programs' },
  { kind: 'link', to: '/related',     label: 'Program Network' },
  { kind: 'link', to: '/policy',      label: 'Why Higher Ed' },
  {
    kind: 'group',
    label: 'dbt-Wizard',
    rootTo: '/dbt-wizard',
    matchPrefixes: ['/dbt-wizard'],
    children: [
      { to: '/dbt-wizard',          label: 'Overview' },
      { to: '/dbt-wizard/scenario', label: 'Scenario' },
      { to: '/dbt-wizard/live',     label: 'Live build' },
      { to: '/dbt-wizard/outcome',  label: 'Outcome' },
    ],
  },
  {
    kind: 'group',
    label: 'ODI',
    rootTo: '/architecture',
    matchPrefixes: ['/architecture', '/pipeline', '/about'],
    children: [
      { to: '/architecture', label: 'Architecture' },
      { to: '/pipeline',     label: 'Pipeline' },
      { to: '/about',        label: 'About' },
    ],
  },
];

const NAV_FLAT: { to: string; label: string }[] = NAV.flatMap((e) =>
  e.kind === 'link' ? [{ to: e.to, label: e.label }] : e.children,
);

// ─── NavEntryEl — renders a link or a dropdown group (dark-theme variant) ───
function NavEntryEl({ entry, pathname }: { entry: NavEntry; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => { setOpen(false); }, [pathname]);

  if (entry.kind === 'link') {
    return (
      <NavLink
        to={entry.to}
        end={entry.to === '/'}
        className={({ isActive }) =>
          `relative px-2.5 py-2 font-medium tracking-tight transition-colors text-[13px] whitespace-nowrap ${
            isActive ? 'text-[#fbd98f]' : 'text-white/80 hover:text-white'
          }`
        }
      >
        {({ isActive }) => (
          <>
            {entry.label}
            {isActive && (
              <span className="absolute left-2.5 right-2.5 -bottom-[1px] h-[2px]" style={{ background: 'var(--bronze-bright)' }} />
            )}
          </>
        )}
      </NavLink>
    );
  }

  const isActive = entry.matchPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`relative px-2.5 py-2 font-medium tracking-tight transition-colors text-[13px] whitespace-nowrap inline-flex items-center gap-1 ${
          isActive ? 'text-[#fbd98f]' : 'text-white/80 hover:text-white'
        }`}
      >
        {entry.label}
        <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M2 4 L5 7 L8 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {isActive && (
          <span className="absolute left-2.5 right-5 -bottom-[1px] h-[2px]" style={{ background: 'var(--bronze-bright)' }} />
        )}
      </button>
      {open && (
        <span role="menu" className="absolute left-0 top-full mt-1 min-w-[200px] rounded-sm border border-white/15 bg-[var(--ivy-deep)] shadow-xl overflow-hidden z-50">
          {entry.children.map((c) => (
            <NavLink
              key={c.to}
              to={c.to}
              end={c.to === '/'}
              className={({ isActive: ia }) =>
                `block px-4 py-2.5 text-[13px] font-medium transition-colors ${
                  ia
                    ? 'bg-white/10 text-[#fbd98f]'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {c.label}
            </NavLink>
          ))}
        </span>
      )}
    </span>
  );
}

const DEMOS = [
  { key: 'tax-assessment',  name: 'Allegheny County Tax', industry: 'Public sector, property assessment',    url: 'https://fivetran-jasonchletsos.github.io/tax-assessment-databricks-demo/', accent: '#dc2626' },
  { key: 'healthcare',      name: 'Epic Clarity',         industry: 'Healthcare, clinical analytics',        url: 'https://fivetran-jasonchletsos.github.io/Healthcare-EPIC-Snowflake-Demo/', accent: '#0d9488' },
  { key: 'finserv',         name: 'Meridian Capital',     industry: 'Financial services, wealth and banking',url: 'https://fivetran-jasonchletsos.github.io/FinServ-ODI-Demo/', accent: '#1d4ed8' },
  { key: 'insurance',       name: 'Atlas Risk',           industry: 'Insurance, policies and claims',        url: 'https://fivetran-jasonchletsos.github.io/Insurance-ODI-Demo/', accent: '#0369a1' },
  { key: 'media',           name: 'Lighthouse Media',     industry: 'Media, audience intelligence',          url: 'https://fivetran-jasonchletsos.github.io/Media-ODI-Demo/', accent: '#7c3aed' },
  { key: 'retail',          name: 'Storefront Analytics', industry: 'Retail and e-commerce',                  url: 'https://fivetran-jasonchletsos.github.io/RetailEcom-ODI-Demo/', accent: '#ea580c' },
  { key: 'techsaas',        name: 'SaaS Pulse',           industry: 'Tech, SaaS analytics',                  url: 'https://fivetran-jasonchletsos.github.io/TechSaaS-ODI-Demo/', accent: '#059669' },
  { key: 'supplychain',     name: 'Manifest',             industry: 'Supply chain, logistics',                url: 'https://fivetran-jasonchletsos.github.io/SupplyChain-ODI-Demo/', accent: '#0891b2' },
  { key: 'lifesci',         name: 'Cohort',               industry: 'Life sciences, clinical research',      url: 'https://fivetran-jasonchletsos.github.io/LifeSci-ODI-Demo/', accent: '#be185d' },
  { key: 'highered',        name: 'Cascade University',   industry: 'Higher education, R1 research',         url: 'https://fivetran-jasonchletsos.github.io/HigherEd-ODI-Demo/', accent: '#14532d' },
  { key: 'mission-control', name: 'Mission Control',      industry: 'Admin, governance and observability',   url: 'https://fivetran-jasonchletsos.github.io/ODI-Mission-Control/', accent: '#22d3ee' },
];
const CURRENT_DEMO = 'highered';

export default function Layout() {
  const [source, setSource] = useState<DataSource>('demo');
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const unsub = subscribeSource(setSource);
    api.getSummary().finally(() => setSnapshotAt(getSnapshotTime())).catch(() => {});
    return () => { unsub(); };
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div className="min-h-full flex flex-col bg-[var(--paper)]">
      <div className="institutional-rail" />

      <header className="bg-[var(--ivy-deep)] text-white sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-20 items-center justify-between gap-2 sm:gap-6">
            <Link to="/" className="flex items-center gap-3 shrink-0 min-w-0 group">
              <div className="h-10 w-10 rounded-sm flex items-center justify-center" style={{ background: 'var(--bronze)' }}>
                <CascadeMark className="h-6 w-6 text-[var(--cream)]" />
              </div>
              <div className="leading-tight min-w-0">
                <div className="font-serif font-semibold text-xl sm:text-2xl tracking-tight truncate">
                  Cascade University
                </div>
                <div className="mt-0.5 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.18em] text-[#fbd98f]">
                  Office of Institutional Intelligence
                </div>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-0.5 text-sm">
              {NAV.map((entry) => (
                <NavEntryEl key={entry.kind === 'link' ? entry.to : entry.label} entry={entry} pathname={location.pathname} />
              ))}
            </nav>

            <div className="flex items-center gap-1 sm:gap-2">
              <DemoSwitcher source={source} />
              <button
                type="button"
                onClick={() => setMobileOpen((o) => !o)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-sm text-white/80 hover:bg-white/10"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  {mobileOpen ? <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /> : <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />}
                </svg>
              </button>
            </div>
          </div>

          {mobileOpen && (
            <div className="lg:hidden pb-4 border-t border-white/10 pt-3 space-y-3">
              <nav className="grid grid-cols-2 gap-1 text-sm">
                {NAV_FLAT.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-sm text-center font-medium border ${
                        isActive
                          ? 'bg-[var(--bronze)] text-white border-[var(--bronze)]'
                          : 'border-white/15 text-white/80 hover:bg-white/10'
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--hairline)] bg-[var(--ivy-deep)] text-white/80 mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-sm flex items-center justify-center" style={{ background: 'var(--bronze)' }}>
                <CascadeMark className="h-4 w-4 text-[var(--cream)]" />
              </div>
              <div className="font-serif font-semibold text-white">Cascade University</div>
            </div>
            <p className="leading-relaxed text-white/60">
              An institutional intelligence portal built on Fivetran Open Data Infrastructure.
              Synthetic data, presented for ODI architecture demonstration only.
            </p>
          </div>
          <div>
            <div className="eyebrow-light mb-2">Data Pipeline</div>
            <p className="leading-relaxed text-white/70">
              Banner SIS, Workday, Salesforce Education Cloud, Canvas, Slate, Cayuse → Fivetran →
              Iceberg on S3 → dbt → Great Expectations → Snowflake / Athena / Trino → Cortex.
              dbt Wizard authors gold tables on demand.
            </p>
          </div>
          <div>
            <div className="eyebrow-light mb-2">Open Standards</div>
            <p className="leading-relaxed text-white/70">
              Apache Iceberg, Snowflake Polaris catalog, AWS Glue, ANSI SQL, dbt semantic layer.
              Any compute engine, no lock-in.
            </p>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 text-[11px] text-white/50 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <span>© 2026 Cascade University ODI Demo, Fivetran Open Data Infrastructure</span>
              <a
                href={`${(import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')}/Cascade-University-3min-Demo-Runbook.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border border-[var(--bronze)]/40 text-[#fbd98f]/80 hover:text-[#fbd98f] hover:border-[var(--bronze)]/70 transition-colors"
              >
                3-min runbook
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M2 6h8M6 2l4 4-4 4" />
                </svg>
              </a>
            </div>
            <div>Snapshot {snapshotAt ? new Date(snapshotAt).toLocaleString() : '—'}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DemoSwitcher({ source }: { source: DataSource }) {
  const live = source === 'live';
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider border transition-colors ${
          live
            ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30 hover:bg-emerald-500/25'
            : 'bg-[var(--bronze)]/25 text-[#fbd98f] border-[var(--bronze)]/40 hover:bg-[var(--bronze)]/35'
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-emerald-300' : 'bg-[#fbd98f]'} animate-pulse`} />
        {live ? 'Snowflake, live' : 'Snapshot'}
        <svg viewBox="0 0 24 24" className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-[280px] rounded-sm border border-[var(--hairline)] bg-white shadow-xl z-40 overflow-hidden"
        >
          <div className="px-3 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)] border-b border-[var(--hairline)]">
            Switch demo
          </div>
          <div className="py-1 max-h-[420px] overflow-y-auto">
            {DEMOS.map((d) => {
              const current = d.key === CURRENT_DEMO;
              const inner = (
                <div className="flex items-center gap-2.5 px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.accent }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[var(--ink-strong)] truncate">{d.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{d.industry}</div>
                  </div>
                  {current && (
                    <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 border border-slate-200">
                      Current
                    </span>
                  )}
                </div>
              );
              return current ? (
                <div key={d.key} className="opacity-60 cursor-default">{inner}</div>
              ) : (
                <a
                  key={d.key}
                  href={d.url}
                  className="block hover:bg-slate-50 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  {inner}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Cascade mountain mark, used in header and footer.
function CascadeMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M2 19 L8 9 L11 13 L15 6 L22 19 Z" />
      <path d="M8 9 L10 12 L7 12 Z M15 6 L17.5 10 L13 10 Z" fill="#14532d" />
    </svg>
  );
}
