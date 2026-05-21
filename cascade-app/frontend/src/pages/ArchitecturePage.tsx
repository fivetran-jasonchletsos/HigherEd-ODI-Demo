export default function ArchitecturePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 border-b border-[var(--hairline)] pb-6">
        <div className="eyebrow mb-1">ODI Reference Architecture</div>
        <h1 className="font-serif text-5xl font-semibold text-[var(--ink-strong)] tracking-tight">
          Six systems of record, one open lake
        </h1>
        <p className="mt-3 text-[var(--ink-muted)] font-body-serif text-lg max-w-3xl">
          Cascade University runs on six systems of record, none of which will ever merge.
          Open Data Infrastructure replaces the nightly ETL stitching with a single lake.
        </p>
      </header>

      {/* Architecture flow */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-6 border-b border-[var(--hairline)] pb-2">The flow</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {FLOW.map((f) => (
            <div key={f.label} className="research-card p-5">
              <div className="text-[10px] mono font-bold text-[var(--bronze)] tracking-wider">{f.tag}</div>
              <h3 className="font-serif text-xl font-semibold text-[var(--ink-strong)] mt-1">{f.label}</h3>
              <div className="mt-2 text-xs text-[var(--ink-muted)] leading-relaxed">{f.body}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {f.chips.map((c) => <span key={c.text} className={`layer-chip ${c.kind}`}>{c.text}</span>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sources */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-4 border-b border-[var(--hairline)] pb-2">Sources of record</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SOURCES.map((s) => (
            <article key={s.name} className="research-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="layer-chip bronze">Source</span>
                <span className="text-xs uppercase tracking-wider text-[var(--ink-soft)] font-semibold">{s.kind}</span>
              </div>
              <h3 className="font-serif text-xl font-semibold text-[var(--ink-strong)]">{s.name}</h3>
              <p className="mt-2 text-sm text-[var(--ink-muted)] leading-relaxed">{s.note}</p>
              <div className="mt-3 text-[11px] text-[var(--ink-soft)]">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Provides:</span> {s.provides}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* dbt layers */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-4 border-b border-[var(--hairline)] pb-2">dbt transformation layers</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {LAYERS.map((l) => (
            <div key={l.layer} className="research-card p-5">
              <span className={`layer-chip ${l.chip}`}>{l.layer}</span>
              <h3 className="font-serif text-lg font-semibold text-[var(--ink-strong)] mt-3">{l.title}</h3>
              <p className="mt-2 text-xs text-[var(--ink-muted)] leading-relaxed">{l.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stack */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-4 border-b border-[var(--hairline)] pb-2">Tech stack</h2>
        <div className="research-card p-5">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {STACK.map((s) => (
              <li key={s.name} className="flex items-start gap-3">
                <div className="layer-chip silver shrink-0 mt-0.5">{s.layer}</div>
                <div className="min-w-0">
                  <div className="font-serif font-semibold text-[var(--ink-strong)]">{s.name}</div>
                  <div className="text-xs text-[var(--ink-muted)]">{s.note}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

const FLOW = [
  { tag: '01', label: 'Sources',   body: 'Banner SIS, Workday HCM + Financials, Salesforce Ed Cloud, Canvas, Slate, Cayuse RIS.', chips: [{ text: '6 systems', kind: 'bronze' as const }] },
  { tag: '02', label: 'Ingest',    body: 'Fivetran lands each source into bronze Iceberg tables on S3, governed by Snowflake Polaris catalog.',           chips: [{ text: 'fivetran', kind: 'bronze' as const }, { text: 'iceberg', kind: 'bronze' as const }] },
  { tag: '03', label: 'Conform',   body: 'dbt builds silver, one canonical student, course, gift, grant, employee.',  chips: [{ text: 'dbt', kind: 'silver' as const }] },
  { tag: '04', label: 'Serve',     body: 'Gold marts power CIO and VP dashboards through Snowflake, Athena, Trino, anything that speaks Iceberg.', chips: [{ text: 'gold', kind: 'gold' as const }] },
  { tag: '05', label: 'Reason',    body: 'Cortex agents read gold for yield prediction, advising outreach, donor scoring.',     chips: [{ text: 'cortex', kind: 'gold' as const }] },
];

const SOURCES = [
  { name: 'Banner SIS, Ellucian',       kind: 'System of record', note: 'Authoritative student demographics, enrollment, grades, holds.',                          provides: 'Student master, enrollment terms, course catalog, grades, financial aid awards' },
  { name: 'Workday HCM + Financials',   kind: 'System of record', note: 'Faculty and staff appointments, GL actuals, position management, sponsored project ledgers.', provides: 'Employee master, GL actuals, fund accounting, budget vs. actual' },
  { name: 'Salesforce Education Cloud', kind: 'System of record', note: 'Advancement (donors, gifts, planned giving) and enrollment (applicant journey supplement).',  provides: 'Donor contacts, gifts, opportunities, alumni interactions' },
  { name: 'Canvas LMS',                 kind: 'Behavioral signal', note: 'Course performance, assignment submissions, page-view engagement, early-alert signals.',   provides: 'Assignment submissions, grade events, LMS engagement events, faculty referrals' },
  { name: 'Slate',                      kind: 'Admissions CRM',    note: 'Inquiry, application, recruitment communication, event attendance.',                       provides: 'Application funnel, admit yield events, recruitment touches' },
  { name: 'Cayuse Research IS',         kind: 'Grants management', note: 'Proposal submission, award tracking, sponsor agreements, compliance.',                     provides: 'Proposals, awards, F&A recovery, sponsor mix, PI portfolio' },
];

const LAYERS = [
  { layer: 'bronze',  chip: 'bronze' as const, title: 'Raw landing',      note: 'Append-only Iceberg, exactly as Fivetran delivered. No transformation, full history.' },
  { layer: 'silver',  chip: 'silver' as const, title: 'Conformed entities', note: 'One student_id, one course_id, one fund_id across all six sources. Slowly-changing dimensions.' },
  { layer: 'gold',    chip: 'gold'   as const, title: 'Business marts',   note: 'Yield prediction, at-risk roster, grant pipeline, donor capacity, operating budget actuals.' },
  { layer: 'agent',   chip: 'gold'   as const, title: 'Agent surface',    note: 'Snowflake Cortex semantic model, governed, every metric defined once, reused everywhere.' },
];

const STACK = [
  { layer: 'Ingest',    name: 'Fivetran',                       note: 'Pre-built connectors for Banner, Workday, Salesforce, Canvas, Slate, custom SDK for Cayuse.' },
  { layer: 'Storage',   name: 'Amazon S3',                      note: 'cascade-odi-lake bucket holds bronze, silver, gold prefixes.' },
  { layer: 'Format',    name: 'Apache Iceberg v2',              note: 'Parquet files, ZSTD-compressed. Time-travel, schema evolution, ACID.' },
  { layer: 'Catalog',   name: 'Snowflake Polaris + AWS Glue',   note: 'Open catalog, externally readable by any Iceberg-compatible engine.' },
  { layer: 'Transform', name: 'dbt',                            note: '142 models, bronze, silver, gold layers, tested in CI.' },
  { layer: 'Compute',   name: 'Snowflake',                      note: 'Native + Iceberg external tables. Cortex agents read gold directly.' },
  { layer: 'Frontend',  name: 'React 19 + Vite + Tailwind v4',  note: 'Static SPA on GitHub Pages, reads JSON snapshot.' },
  { layer: 'Agents',    name: 'Snowflake Cortex',               note: 'Claude Opus 4.7 used for yield prediction, advising outreach, donor capacity scoring.' },
];
