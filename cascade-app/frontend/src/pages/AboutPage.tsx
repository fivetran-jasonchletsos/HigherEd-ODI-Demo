export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Canonical ODI Story block (copied verbatim from the FinServ demo). */}
      <section className="research-card p-6 mb-10" style={{ borderColor: 'var(--bronze)' }}>
        <div className="eyebrow mb-2" style={{ color: 'var(--bronze)' }}>The ODI Story</div>
        <h2 className="font-serif text-3xl font-semibold tracking-tight text-[var(--ink-strong)]">
          Data infrastructure for agents you trust.
        </h2>
        <p className="mt-3 text-[var(--ink-muted)] leading-relaxed font-body-serif text-lg">
          <em>"MDS was optimized for humans. ODI is designed for a future with humans and
          production agents at scale."</em> This demo is one instance of that architecture:
          Fivetran's 750+ connectors and Managed Data Lake Service (MDLS) land data into open
          table formats; dbt transformations build the governed semantic layer; multiple compute
          engines and AI agents read the same gold tables.
        </p>
        <a
          href="https://fivetran-jasonchletsos.github.io/Fivetran-Demo-Repository/story/"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
          style={{ color: 'var(--bronze)' }}
        >
          Read the full ODI Story →
        </a>
      </section>

      <header className="mb-8">
        <div className="eyebrow mb-1">About this demo</div>
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-[var(--ink-strong)]">About Cascade University</h1>
        <p className="mt-3 text-[var(--ink-muted)] leading-relaxed font-body-serif text-lg">
          Cascade University is a fictional private research institution in the Pacific Northwest:
          24,000 students (18K undergraduate, 6K graduate), R1 research classification, $1.4B operating
          budget, $2.8B endowment, 220,000 living alumni. It is a reference build for how a modern
          university CIO and VP of Enrollment Management can run their institution on Fivetran's
          Open Data Infrastructure rather than a fragmented stack of nightly warehouse extracts.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] border-b border-[var(--hairline)] pb-2 mb-4">What this demo shows</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PILLARS.map((p) => (
            <div key={p.title} className="research-card p-5">
              <div className="layer-chip gold inline-flex mb-3">{p.tag}</div>
              <h3 className="font-serif text-xl font-semibold text-[var(--ink-strong)]">{p.title}</h3>
              <p className="mt-1 text-sm text-[var(--ink-muted)] leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] border-b border-[var(--hairline)] pb-2 mb-4">Audience</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="research-card p-5">
            <div className="eyebrow mb-2">Persona 01</div>
            <h3 className="font-serif text-xl font-semibold text-[var(--ink-strong)]">Chief Information Officer</h3>
            <p className="mt-2 text-sm text-[var(--ink-muted)] leading-relaxed">
              Owns the integration architecture across Banner, Workday, Salesforce, Canvas, Slate, and Cayuse. Cares about
              warehouse cost, federal compliance reporting, agent governance, and not being held hostage to a single vendor's
              egress fees.
            </p>
          </div>
          <div className="research-card p-5">
            <div className="eyebrow mb-2">Persona 02</div>
            <h3 className="font-serif text-xl font-semibold text-[var(--ink-strong)]">VP of Enrollment Management</h3>
            <p className="mt-2 text-sm text-[var(--ink-muted)] leading-relaxed">
              Owns the application funnel, yield, melt, and discount-rate. Needs joined data from Slate, Banner, Salesforce,
              and Workday Financials in the same view, scored by an agent that suggests the next 412 admits to call.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] border-b border-[var(--hairline)] pb-2 mb-4">ODI vs traditional warehouse</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="research-card p-5">
            <div className="eyebrow mb-2">Traditional warehouse</div>
            <h3 className="font-serif text-xl font-semibold text-[var(--ink-strong)]">Warehouse-centric</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--ink-muted)]">
              <li>• Single proprietary warehouse owns storage and compute</li>
              <li>• Federal reports, agents, and researchers each pay egress</li>
              <li>• Compute engine choice locked to vendor roadmap</li>
              <li>• Customer pays for storage twice (lake + warehouse)</li>
              <li>• Schema evolution is vendor-managed</li>
            </ul>
          </div>
          <div className="research-card p-5" style={{ borderColor: 'var(--bronze)' }}>
            <div className="eyebrow mb-2" style={{ color: 'var(--bronze)' }}>Open Data Infrastructure</div>
            <h3 className="font-serif text-xl font-semibold text-[var(--ink-strong)]">Open lake-centric</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--ink)]">
              <li>• University owns the storage layer (S3 + Iceberg)</li>
              <li>• Any compute engine, Snowflake, Athena, Trino, Spark, DuckDB</li>
              <li>• Catalog is open (Snowflake Polaris, AWS Glue)</li>
              <li>• Pay once for storage, swap compute as workloads evolve</li>
              <li>• Schema evolution is in the Iceberg spec, vendor-neutral</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-sm bg-[var(--paper-deep)] border border-[var(--hairline)] p-5 text-sm text-[var(--ink)]">
        <div className="eyebrow mb-2" style={{ color: 'var(--amber)' }}>Disclaimer</div>
        <p className="text-[var(--ink-muted)] leading-relaxed">
          <strong className="text-[var(--ink-strong)]">All data shown is synthetic.</strong>{' '}
          Cascade University is a fictional institution presented for ODI architecture demonstration only.
          No portion of this site represents an actual student, employee, donor, or research project.
        </p>
      </section>
    </div>
  );
}

const PILLARS = [
  {
    tag: 'Pillar 1',
    title: 'University-owned storage',
    body: "All ingested data lands in Cascade's S3 bucket as Apache Iceberg tables. Fivetran writes, Cascade reads with any compute engine.",
  },
  {
    tag: 'Pillar 2',
    title: 'Open table format',
    body: 'Iceberg v2 provides ACID transactions, schema evolution, time-travel queries, and partition evolution. No vendor lock-in on table layout.',
  },
  {
    tag: 'Pillar 3',
    title: 'Any compute engine',
    body: 'Snowflake reads the same files dbt writes. Add Athena, Trino, DuckDB, or Spark without re-ingesting a single row.',
  },
];
