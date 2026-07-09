// Cascade University — Open Data Infrastructure architecture page.
//
// Ported from Clarity Health's ArchitecturePage to give Cascade the
// same medallion / multi-engine surface. Higher-ed flavoured: Banner
// SIS (SQL Server CDC) + research grants (Oracle) + LMS activity
// stream + IPEDS federal reporting feed. Snowflake is the primary
// engine; Athena/DuckDB/Trino/Spark stay listed as open-lake reads.
//
// Iceberg table list is inlined (no extra API endpoint) so the page
// renders cleanly even when connectors are paused.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AliveMedallion, type SourceNode, type EngineNode, type ConsumerRole } from '../components/AliveMedallion';
import ProductStageRail from '../components/ProductStageRail';

const HED_SOURCES: SourceNode[] = [
  { id: 'sis',    label: 'SIS / Banner',       sub: 'SQL Server log-CDC',     logo: 'sqlserver', freshness: '49s lag',  status: 'healthy', pipelineUrl: 'https://fivetran.com/dashboard/connectors/tarmac_abounded' },
  { id: 'grants', label: 'Research Grants',    sub: 'Oracle Binary Log Reader',         logo: 'oracle',    freshness: '3 min lag', status: 'healthy', pipelineUrl: 'https://fivetran.com/dashboard/connectors/sinking_gala' },
  { id: 'lms',    label: 'LMS Activity',       sub: 'Real-time event stream',  logo: 'hl7',       freshness: 'live',      status: 'healthy', streaming: true },
  { id: 'ipeds',  label: 'IPEDS Reporting',    sub: 'Annual federal feed',     logo: 'cms',       freshness: '60d lag',  status: 'healthy' },
];

const HED_ENGINES: EngineNode[] = [
  { name: 'Snowflake', active: true,  logo: 'snowflake' },
  { name: 'Athena',                   logo: 'athena' },
  { name: 'DuckDB',                   logo: 'duckdb' },
  { name: 'Trino',                    logo: 'trino' },
  { name: 'Spark',                    logo: 'spark' },
];

const HED_ROLES: ConsumerRole[] = [
  { label: 'Enrollment',      sub: 'pipeline & yield' },
  { label: 'Student Success', sub: 'retention & DFW' },
  { label: 'Research Admin',  sub: 'grants & IRB' },
  { label: 'Compliance',      sub: 'FERPA & IPEDS' },
];

// ─── Types (local) ──────────────────────────────────────────────────────────

interface IcebergTable {
  database: 'bronze' | 'silver' | 'gold';
  table: string;
  source_system: string;
  rows: number;
  bytes: number;
  schema_columns: number;
  partitions: string[];
  last_updated_at: string;
}

interface QueryEngine {
  name: 'Snowflake' | 'Athena' | 'DuckDB' | 'Trino' | 'Spark';
  status: 'active' | 'available' | 'demo';
  description: string;
  sample_query: string;
}

const TABLES: IcebergTable[] = [
  { database: 'bronze', table: 'bronze.banner__student',           source_system: 'sql_server · Banner SIS',   rows: 48_220,    bytes: 84_400_000,    schema_columns: 118, partitions: ['ingest_date'],         last_updated_at: '2026-05-24T07:14:00Z' },
  { database: 'bronze', table: 'bronze.banner__enrollment',        source_system: 'sql_server · Banner SIS',   rows: 1_842_000, bytes: 612_000_000,   schema_columns: 64,  partitions: ['ingest_date'],         last_updated_at: '2026-05-24T07:14:00Z' },
  { database: 'bronze', table: 'bronze.banner__grade_event',       source_system: 'sql_server · Banner SIS',   rows: 9_410_220, bytes: 2_140_000_000, schema_columns: 22,  partitions: ['term'],                last_updated_at: '2026-05-24T07:14:00Z' },
  { database: 'bronze', table: 'bronze.banner__course_section',    source_system: 'sql_server · Banner SIS',   rows: 18_440,    bytes: 24_400_000,    schema_columns: 48,  partitions: ['term'],                last_updated_at: '2026-05-24T07:14:00Z' },
  { database: 'bronze', table: 'bronze.banner__financial_aid',     source_system: 'sql_server · Banner SIS',   rows: 142_220,   bytes: 84_800_000,    schema_columns: 56,  partitions: ['aid_year'],            last_updated_at: '2026-05-24T07:14:00Z' },
  { database: 'bronze', table: 'bronze.grants__proposal',          source_system: 'oracle · Cayuse RIS',       rows: 6_220,     bytes: 14_800_000,    schema_columns: 72,  partitions: ['fiscal_year'],         last_updated_at: '2026-05-24T07:11:00Z' },
  { database: 'bronze', table: 'bronze.grants__award',             source_system: 'oracle · Cayuse RIS',       rows: 3_840,     bytes: 9_400_000,     schema_columns: 88,  partitions: ['fiscal_year'],         last_updated_at: '2026-05-24T07:11:00Z' },
  { database: 'bronze', table: 'bronze.lms__activity_event',       source_system: 'http · Canvas LMS stream',  rows: 21_840_000,bytes: 4_810_000_000, schema_columns: 18,  partitions: ['ingest_date'],         last_updated_at: '2026-05-24T07:12:00Z' },
  { database: 'bronze', table: 'bronze.ipeds__institution_feed',   source_system: 'http · NCES IPEDS',         rows: 8_420,     bytes: 18_400_000,    schema_columns: 64,  partitions: [],                       last_updated_at: '2026-05-23T03:00:00Z' },

  { database: 'silver', table: 'silver.int_student_term_spine',    source_system: 'dbt · merged',              rows: 184_220,   bytes: 110_000_000,   schema_columns: 52,  partitions: ['term'],                last_updated_at: '2026-05-24T07:18:00Z' },
  { database: 'silver', table: 'silver.int_course_enrollment',     source_system: 'dbt · merged',              rows: 1_842_000, bytes: 480_000_000,   schema_columns: 38,  partitions: ['term'],                last_updated_at: '2026-05-24T07:18:00Z' },
  { database: 'silver', table: 'silver.int_lms_engagement',        source_system: 'dbt · merged',              rows: 21_840_000,bytes: 3_120_000_000, schema_columns: 22,  partitions: ['week_starting'],       last_updated_at: '2026-05-24T07:18:00Z' },
  { database: 'silver', table: 'silver.int_aid_packaging',         source_system: 'dbt · merged',              rows: 142_220,   bytes: 72_000_000,    schema_columns: 36,  partitions: ['aid_year'],            last_updated_at: '2026-05-24T07:18:00Z' },
  { database: 'silver', table: 'silver.int_grant_portfolio',       source_system: 'dbt · merged',              rows: 6_220,     bytes: 22_000_000,    schema_columns: 48,  partitions: ['fiscal_year'],         last_updated_at: '2026-05-24T07:18:00Z' },

  { database: 'gold',   table: 'gold.dim_students',                source_system: 'dbt mart',                  rows: 48_220,    bytes: 38_000_000,    schema_columns: 42,  partitions: [],                       last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.dim_programs',                source_system: 'dbt mart',                  rows: 184,       bytes: 240_000,       schema_columns: 18,  partitions: [],                       last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.dim_faculty',                 source_system: 'dbt mart',                  rows: 2_840,     bytes: 4_800_000,     schema_columns: 26,  partitions: [],                       last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.fct_term_enrollment',         source_system: 'dbt mart',                  rows: 184_220,   bytes: 84_000_000,    schema_columns: 32,  partitions: ['term'],                last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.fct_retention_signals',       source_system: 'dbt mart',                  rows: 184_220,   bytes: 92_000_000,    schema_columns: 38,  partitions: ['term'],                last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.fct_dfw_risk',                source_system: 'dbt mart',                  rows: 1_842_000, bytes: 312_000_000,   schema_columns: 28,  partitions: ['term'],                last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.fct_admissions_yield',        source_system: 'dbt mart',                  rows: 88_420,    bytes: 42_000_000,    schema_columns: 34,  partitions: ['cycle'],               last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.fct_grant_pipeline',          source_system: 'dbt mart',                  rows: 6_220,     bytes: 18_400_000,    schema_columns: 31,  partitions: ['fiscal_year'],         last_updated_at: '2026-05-24T07:22:00Z' },
];

const ENGINES: QueryEngine[] = [
  {
    name: 'Snowflake',
    status: 'active',
    description: 'Primary engine for the Cascade gold layer. Reads Iceberg externals through Polaris catalog; auto-suspends between queries. Where the front end, the cost-estimator, and the dbt-wizard run-time agents all land.',
    sample_query: `SELECT
  s.student_id, s.cohort_year, s.program,
  r.retention_score, r.last_seen_at,
  d.dfw_count_term, d.credit_load_term
FROM gold.dim_students            s
JOIN gold.fct_retention_signals   r USING (student_id)
JOIN gold.fct_dfw_risk            d USING (student_id)
WHERE r.cohort_status = 'first-time-full-time'
  AND d.dfw_count_term >= 2
ORDER BY d.dfw_count_term DESC
LIMIT 50;`,
  },
  {
    name: 'Athena',
    status: 'available',
    description: 'Serverless reads against the same Iceberg gold tables via Glue. Useful for IPEDS/compliance reporting that doesn\'t need to pay for warehouse time.',
    sample_query: `SELECT program, COUNT(*) AS enrolled_fall_2026
FROM gold.fct_term_enrollment
WHERE term = '2026FA'
GROUP BY program
ORDER BY enrolled_fall_2026 DESC;`,
  },
  {
    name: 'DuckDB',
    status: 'available',
    description: 'Engineer\'s laptop. Same Iceberg tables, queried directly from S3 with the iceberg extension. Tiny ad-hoc joins without spinning up anything.',
    sample_query: `INSTALL iceberg;
LOAD iceberg;

SELECT *
FROM iceberg_scan('s3://cascade-odi-lake/gold/fct_dfw_risk/')
WHERE term = '2026SP'
  AND credit_load_term < 12
LIMIT 100;`,
  },
  {
    name: 'Trino',
    status: 'available',
    description: 'Federated engine that joins the lake to other relational sources (state higher-ed systems, system-office data warehouses) without copying data first.',
    sample_query: `SELECT p.program, AVG(r.retention_score) AS avg_retention
FROM iceberg.gold.fct_retention_signals r
JOIN postgres.system_office.program_outcomes p
  ON p.program_code = r.program
WHERE r.cohort_year >= 2022
GROUP BY p.program;`,
  },
  {
    name: 'Spark',
    status: 'available',
    description: 'Distributed compute for ML training and large cohort joins. Reads the same Iceberg tables via the spark-iceberg runtime.',
    sample_query: `df = spark.read.format("iceberg")\\
  .load("gold.fct_retention_signals")
df.groupBy("cohort_year", "program")\\
  .agg({"retention_score": "avg"})\\
  .show()`,
  },
];

const ENGINE_COLORS: Record<QueryEngine['name'], string> = {
  Snowflake: '#29b5e8',
  Athena:    '#b8975c',
  DuckDB:    '#14532d',
  Trino:     '#166534',
  Spark:     '#b45309',
};

// ─── Number formatters ──────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatBytes(b: number): string {
  if (b >= 1_000_000_000) return `${(b / 1_000_000_000).toFixed(2)} GB`;
  if (b >= 1_000_000)     return `${(b / 1_000_000).toFixed(1)} MB`;
  if (b >= 1_000)         return `${(b / 1_000).toFixed(1)} KB`;
  return `${b} B`;
}

// =============================================================================
// Page
// =============================================================================

export default function ArchitecturePage() {
  const [activeEngine, setActiveEngine] = useState<QueryEngine>(ENGINES[0]);

  const byLayer = (l: 'bronze' | 'silver' | 'gold') => TABLES.filter((t) => t.database === l);
  const layerStats = (l: 'bronze' | 'silver' | 'gold') => {
    const t = byLayer(l);
    return { tables: t.length, rows: t.reduce((s, r) => s + r.rows, 0), bytes: t.reduce((s, r) => s + r.bytes, 0) };
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 border-b border-[var(--hairline)] pb-6">
        <div className="eyebrow mb-1">Open Data Infrastructure</div>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--ink-strong)]">
          One lake. Every engine. The whole student story.
        </h1>
        <p className="mt-3 text-[var(--ink-muted)] max-w-3xl leading-relaxed">
          Cascade University treats <em>storage</em>, <em>catalog</em>, and <em>compute</em> as three
          independently swappable layers. Iceberg is the storage spec. Glue is the catalog.
          Snowflake, Athena, DuckDB, Trino, and Spark can all read the same tables &mdash; no copy,
          no extract, no proprietary format between Banner and the registrar.
        </p>
      </header>

      <ThroughputHero />

      <section className="clinical-card p-6 sm:p-8 mb-8" style={cardStyle}>
        <div className="eyebrow mb-1">Data Flow</div>
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-6">
          From Banner SIS + four open sources to one governed gold layer
        </h2>

        <ProductStageRail accent="#0e7490" />

        <AliveMedallion
          sources={HED_SOURCES}
          bronze={{ ...layerStats('bronze'), trend: [180, 195, 210, 222, 240, 255, 270] }}
          silver={{ ...layerStats('silver'), trend: [120, 130, 142, 155, 168, 180, 192] }}
          gold={{   ...layerStats('gold'),   trend: [80, 88, 95, 104, 112, 124, 138] }}
          engines={HED_ENGINES}
          roles={HED_ROLES}
          accent="#b45309"
          enginesCaption="All five read the same data — no copies, no rebuilds per tool."
        />

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[var(--ink-muted)]">
          <LayerDetail layer="bronze" stats={layerStats('bronze')} desc="Raw rows landed by Fivetran. 1:1 with source. CDC kept current within five minutes." />
          <LayerDetail layer="silver" stats={layerStats('silver')} desc="Conformed dims and facts. Cleaned, deduped, joined to a student + term spine." />
          <LayerDetail layer="gold"   stats={layerStats('gold')}   desc="Business-ready marts + the dbt semantic layer. What every dashboard and advisor surface reads." />
        </div>
      </section>

      <SchemaEvolutionTicker />
      <CostPanel />
      <FailureRecoveryPanel />
      <DataContractsPanel />
      <LineagePanel />

      <section className="clinical-card overflow-hidden mb-8" style={cardStyle}>
        <header className="clinical-card-header" style={cardHeaderStyle}>
          <div className="eyebrow">Compute is a choice</div>
          <h2 className="font-serif text-xl font-semibold text-[var(--ink-strong)] mt-0.5">
            Same Iceberg tables. Five engines. One query at a time.
          </h2>
          <p className="text-sm text-[var(--ink-muted)] mt-1">
            Pick a query engine &mdash; the SQL barely changes, but the operational, cost, and
            governance profile shifts dramatically. That choice belongs to the institution, not the vendor.
          </p>
        </header>

        <div className="px-5 pt-4 flex flex-wrap gap-2">
          {ENGINES.map((e) => (
            <button
              key={e.name}
              onClick={() => setActiveEngine(e)}
              className="px-3 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider border transition-all"
              style={
                activeEngine.name === e.name
                  ? { background: ENGINE_COLORS[e.name], borderColor: ENGINE_COLORS[e.name], color: '#ffffff' }
                  : { background: '#ffffff', color: 'var(--ink-muted)', borderColor: 'var(--hairline)' }
              }
            >
              {e.name}
              {e.status === 'active' && <span className="ml-1.5 text-[9px] opacity-80">● ACTIVE</span>}
              {e.status === 'demo'   && <span className="ml-1.5 text-[9px] opacity-60">DEMO</span>}
            </button>
          ))}
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2">
            <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-2">Query</div>
            <pre className="rounded-sm p-4 text-[11.5px] leading-relaxed overflow-x-auto font-mono" style={{ background: '#14532d', color: 'var(--paper,#fefaf3)' }}>
              <code>{activeEngine.sample_query}</code>
            </pre>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-2">Why this engine</div>
            <p className="text-sm text-[var(--ink)] leading-relaxed">{activeEngine.description}</p>
            <div className="mt-4 pt-4 border-t border-[var(--hairline-soft,#e8e4d8)]">
              <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">Status</div>
              <div className="text-sm font-semibold" style={{ color: activeEngine.status === 'active' ? '#16a34a' : '#6b7280' }}>
                {activeEngine.status === 'active' ? '● Primary engine — powers this site' : 'Compatible and ready to wire in'}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="clinical-card overflow-hidden mb-8" style={cardStyle}>
        <header className="clinical-card-header" style={cardHeaderStyle}>
          <div className="eyebrow">Iceberg Catalog</div>
          <h2 className="font-serif text-xl font-semibold text-[var(--ink-strong)] mt-0.5">
            Every table on the lake, registered in AWS Glue
          </h2>
          <p className="text-sm text-[var(--ink-muted)] mt-1">
            Open metadata. Every engine reads the same schema, the same partition layout, the same
            row counts &mdash; without anyone owning the "source of truth" exclusively.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <thead className="border-b border-[var(--hairline)]" style={{ background: 'var(--paper-deep,#f4efe2)' }}>
              <tr>
                <Th>Layer</Th>
                <Th>Table</Th>
                <Th>Source</Th>
                <Th align="right">Rows</Th>
                <Th align="right">Size</Th>
                <Th align="right">Columns</Th>
                <Th>Partitions</Th>
                <Th align="right">Updated</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hairline-soft,#e8e4d8)]">
              {TABLES.map((t) => (
                <tr key={`${t.database}.${t.table}`} className="hover:bg-[var(--paper-deep,#f4efe2)] cursor-default">
                  <td className="px-4 py-2.5"><LayerChip layer={t.database} /></td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-[var(--ink-strong)]">{t.table}</td>
                  <td className="px-4 py-2.5 text-xs text-[var(--ink-muted)] font-mono">{t.source_system}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[var(--ink-strong)]">{formatNumber(t.rows)}</td>
                  <td className="px-4 py-2.5 text-right text-[var(--ink)]">{formatBytes(t.bytes)}</td>
                  <td className="px-4 py-2.5 text-right text-[var(--ink-muted)]">{t.schema_columns}</td>
                  <td className="px-4 py-2.5 text-xs text-[var(--ink-muted)] font-mono">
                    {t.partitions.length ? t.partitions.join(', ') : <span className="text-[var(--ink-soft)]">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-[var(--ink-muted)] font-mono">
                    {new Date(t.last_updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="clinical-card overflow-hidden mb-8" style={cardStyle}>
        <header className="clinical-card-header flex items-start justify-between gap-4" style={cardHeaderStyle}>
          <div>
            <div className="eyebrow" style={{ color: '#FF694A' }}>Data Quality · dbt Labs</div>
            <h2 className="font-serif text-xl font-semibold text-[var(--ink-strong)] mt-0.5">
              Every table tested. Every run. Same lake.
            </h2>
            <p className="text-sm text-[var(--ink-muted)] mt-1">
              Tests defined in dbt Labs run on every build, against the same Iceberg tables every
              engine reads. Failures block promotion to the next layer &mdash; bad data never
              reaches the registrar. Paired with the Great Expectations checkpoints below: GX runs
              suite-based expectations against raw landings; dbt enforces SQL-native contracts
              across bronze, silver, and gold.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shrink-0" style={{ background: '#FF694A' }}>
            dbt Labs
          </div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--hairline-soft,#e8e4d8)]">
          {[
            { layer: 'bronze' as const, tests: 24, passing: 24, monitors: ['freshness', 'volume', 'schema drift'],                                       color: '#b45309' },
            { layer: 'silver' as const, tests: 62, passing: 61, monitors: ['nulls', 'uniqueness', 'referential', 'accepted values'],                     color: '#6b7280' },
            { layer: 'gold'   as const, tests: 44, passing: 44, monitors: ['FERPA-redacted PII', 'cohort cardinality', 'IPEDS reconciliation'],          color: '#b8975c' },
          ].map((q) => {
            const ok = q.passing === q.tests;
            return (
              <div key={q.layer} className="p-5">
                <div className="flex items-center justify-between">
                  <LayerChip layer={q.layer} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: ok ? '#16a34a' : '#dc2626' }}>
                    {ok ? '● all passing' : `● ${q.tests - q.passing} warn`}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <div className="font-serif text-3xl font-semibold text-[var(--ink-strong)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {q.passing}<span className="text-[var(--ink-soft)]">/{q.tests}</span>
                  </div>
                  <div className="text-xs text-[var(--ink-muted)]">tests · last run 12m ago</div>
                </div>
                <ul className="mt-3 space-y-1.5 text-xs text-[var(--ink-muted)]">
                  {q.monitors.map((m) => (
                    <li key={m} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: q.color }} />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="px-5 py-3 border-t border-[var(--hairline-soft,#e8e4d8)] flex items-center justify-between text-[11px] text-[var(--ink-soft)]" style={{ background: 'var(--paper-deep,#f4efe2)' }}>
          <span className="font-mono">130 tests · 129 passing · 1 warn · 0 errors</span>
          <span className="uppercase tracking-wider font-semibold">dbt build · merged into Fivetran</span>
        </div>
      </section>

      {/* ── Activations — NewCo native reverse-ETL, right after Transformations ── */}
      <ActivationsPanel />

      <GreatExpectationsPanel />

      <BeforeAfterPanel />
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

const cardStyle = {
  background: '#ffffff',
  border: '1px solid var(--hairline, #d9d3c4)',
  borderRadius: '4px',
};

const cardHeaderStyle = {
  padding: '20px',
  borderBottom: '1px solid var(--hairline-soft, #e8e4d8)',
};

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-soft)] ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

function LayerChip({ layer }: { layer: 'bronze' | 'silver' | 'gold' }) {
  const styles: Record<typeof layer, { bg: string; fg: string; border: string }> = {
    bronze: { bg: '#fef3c7', fg: '#92400e', border: '#b45309' },
    silver: { bg: '#f3f4f6', fg: '#374151', border: '#6b7280' },
    gold:   { bg: '#faf3e1', fg: '#7a5e2d', border: '#b8975c' },
  };
  const s = styles[layer];
  return (
    <span className="inline-block text-[9px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-sm border"
          style={{ background: s.bg, color: s.fg, borderColor: s.border }}>
      {layer}
    </span>
  );
}

function LayerDetail({ layer, stats, desc }: { layer: 'bronze' | 'silver' | 'gold'; stats: { tables: number; rows: number; bytes: number }; desc: string }) {
  return (
    <div className="border border-[var(--hairline,#d9d3c4)] rounded-sm p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <LayerChip layer={layer} />
        <span className="text-[10px] text-[var(--ink-soft)] font-mono">{stats.tables} table{stats.tables === 1 ? '' : 's'}</span>
      </div>
      <div className="text-sm font-bold text-[var(--ink-strong)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatNumber(stats.rows)} rows · {formatBytes(stats.bytes)}
      </div>
      <div className="text-[11px] text-[var(--ink-muted)] mt-1 leading-snug">{desc}</div>
    </div>
  );
}

// =============================================================================
// ThroughputHero
// =============================================================================
function ThroughputHero() {
  const [rowsToday, setRowsToday] = useState(2_184_017);
  useEffect(() => {
    const id = setInterval(() => setRowsToday((n) => n + 6 + Math.floor(Math.random() * 9)), 600);
    return () => clearInterval(id);
  }, []);
  const trend = [1.8, 1.9, 2.0, 2.05, 2.1, 2.14, 2.18];
  return (
    <section className="mb-8 grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-3 sm:gap-4">
      <div className="clinical-card p-5 sm:p-6 relative overflow-hidden" style={cardStyle}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 100% 0%, rgba(180,83,9,0.12), transparent 60%)' }} />
        <div className="relative">
          <div className="eyebrow" style={{ color: '#b45309' }}>● Live</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)] font-semibold">
            Rows in motion today
          </div>
          <div className="mt-2 font-serif font-semibold leading-none text-[var(--ink-strong)]"
               style={{ fontSize: 44, fontVariantNumeric: 'tabular-nums' }}>
            {rowsToday.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-[var(--ink-muted)]">across 4 sources · 23 Iceberg tables · CDC + streaming</div>
        </div>
      </div>
      <Kpi label="CDC freshness · p50" value="49s" sub="SQL Server source" />
      <Kpi label="Bronze → Gold lag · p99" value="6 min" sub="Within 10-min SLO" />
      <Kpi label="Connector uptime · 90d" value="99.97%" sub={<Sparklike values={trend} />} />
    </section>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: React.ReactNode }) {
  return (
    <div className="clinical-card p-4 sm:p-5" style={cardStyle}>
      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)] font-semibold">{label}</div>
      <div className="mt-1.5 font-serif font-semibold leading-none text-[var(--ink-strong)]"
           style={{ fontSize: 30, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div className="mt-2 text-xs text-[var(--ink-muted)]">{sub}</div>
    </div>
  );
}

function Sparklike({ values }: { values: number[] }) {
  const max = Math.max(...values), min = Math.min(...values);
  const rng = max - min || 1;
  const w = 80, h = 18;
  const stepX = w / (values.length - 1);
  const pts = values.map((v, i) => `${(i * stepX).toFixed(1)},${(h - ((v - min) / rng) * h).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke="#b45309" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// =============================================================================
// SchemaEvolutionTicker
// =============================================================================
const EVO_EVENTS = [
  { ts: '2026-05-24 06:14', op: 'ADD COLUMN first_gen_indicator',  table: 'bronze.banner__student',        ms: 38, models: 4 },
  { ts: '2026-05-23 22:01', op: 'RENAME COLUMN dob_str → dob',     table: 'bronze.banner__student',        ms: 22, models: 6 },
  { ts: '2026-05-22 14:47', op: 'WIDEN INT → BIGINT award_amount', table: 'silver.int_aid_packaging',      ms: 41, models: 2 },
  { ts: '2026-05-21 09:30', op: 'ADD COLUMN pell_eligible',         table: 'gold.dim_students',             ms: 19, models: 8 },
  { ts: '2026-05-20 18:09', op: 'DROP COLUMN deprecated_term_code', table: 'bronze.banner__enrollment',     ms: 28, models: 3 },
];
function SchemaEvolutionTicker() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((n) => (n + 1) % EVO_EVENTS.length), 4200);
    return () => clearInterval(id);
  }, []);
  const e = EVO_EVENTS[idx];
  return (
    <section className="mb-8 clinical-card p-5 overflow-hidden relative" style={{ ...cardStyle, background: 'linear-gradient(90deg, #fff 0%, #f8fafc 100%)' }}>
      <div className="absolute top-0 right-0 bottom-0 w-1.5" style={{ background: 'linear-gradient(180deg, #5fb3a1, #14532d)' }} />
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="eyebrow" style={{ color: '#14532d' }}>Iceberg · Schema evolution</div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm" style={{ color: '#0d9488', background: '#ecfeff', border: '1px solid #99f6e4' }}>
            ● Live feed
          </span>
        </div>
        <div className="font-mono text-[10px] text-[var(--ink-soft)]">last 5 schema changes</div>
      </div>
      <div className="mt-3 flex items-center gap-3 flex-wrap" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <span className="font-mono text-[11px] text-[var(--ink-soft)]">{e.ts}</span>
        <span className="font-mono text-[13px] font-semibold text-[var(--ink-strong)]">{e.op}</span>
        <span className="font-mono text-[12px] text-[var(--ink-muted)]">on {e.table}</span>
      </div>
      <div className="mt-2 flex items-center gap-4 text-[12px] text-[var(--ink-muted)] flex-wrap">
        <span><strong className="text-[var(--ink-strong)]">{e.ms} ms</strong> · metadata-only operation</span>
        <span>•</span>
        <span>0 data rewritten · 0 downtime</span>
        <span>•</span>
        <span><strong className="text-[var(--ink-strong)]">{e.models}</strong> downstream dbt models auto-revalidated</span>
      </div>
      <div className="mt-3 text-[11px] text-[var(--ink-soft)] leading-relaxed">
        Apache Iceberg treats schema changes as table metadata, not file rewrites. The Modern Data Stack equivalent —
        an Oracle <code className="font-mono">ALTER TABLE ADD COLUMN</code> on a 1.8 M-row Banner table — locks the
        table for ~6 minutes during the rewrite. Same change in Iceberg: <strong>milliseconds, no lock</strong>.
      </div>
    </section>
  );
}

// =============================================================================
// CostPanel
// =============================================================================
function CostPanel() {
  return (
    <section className="mb-8 clinical-card overflow-hidden" style={cardStyle}>
      <header className="clinical-card-header" style={cardHeaderStyle}>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <div className="eyebrow" style={{ color: '#b45309' }}>FinOps</div>
            <h2 className="font-serif text-xl font-semibold text-[var(--ink-strong)] mt-0.5">
              What this costs to run, every day
            </h2>
            <p className="text-sm text-[var(--ink-muted)] mt-1 max-w-3xl">
              Storage and compute billed separately. Storage is essentially free at this scale; compute scales
              with workload because Snowflake warehouses auto-suspend when no one is reading.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shrink-0" style={{ background: '#14532d' }}>
            −68% vs legacy
          </div>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--hairline-soft,#e8e4d8)]">
        <CostTile label="Storage · per day"   value="$0.62"  sub="1.8 TB across bronze/silver/gold · S3 Standard-IA"  color="#16a34a" />
        <CostTile label="Compute · per day"   value="$3.41"  sub="Snowflake XS auto-suspend · dbt cloud · Athena ad-hoc" color="#14532d" />
        <CostTile label="Per-1k rows landed"  value="$0.0009" sub="All-in CDC + transform + serve"                    color="#166534" />
        <CostTile label="Equivalent MDS"      value="$12.60" sub="Internal benchmark · same data, warehouse-resident" color="#dc2626" />
      </div>
      <div className="px-5 py-3 border-t border-[var(--hairline-soft,#e8e4d8)] flex items-center justify-between text-[11px] text-[var(--ink-soft)] bg-[var(--paper-deep,#f4efe2)]">
        <span>Compute curve: 70% of spend is the 8 AM–10 AM registrar reporting window. Idle hours bill at zero.</span>
        <span className="uppercase tracking-wider font-semibold">Cost-attribution: per-warehouse + per-dbt-model</span>
      </div>
    </section>
  );
}

function CostTile({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="p-5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)] font-semibold">{label}</div>
      <div className="mt-2 font-serif font-semibold leading-none" style={{ fontSize: 30, color, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div className="mt-2 text-xs text-[var(--ink-muted)] leading-snug">{sub}</div>
    </div>
  );
}

// =============================================================================
// FailureRecoveryPanel
// =============================================================================
function FailureRecoveryPanel() {
  return (
    <section className="mb-8 clinical-card overflow-hidden" style={cardStyle}>
      <header className="clinical-card-header" style={cardHeaderStyle}>
        <div className="eyebrow" style={{ color: '#b45309' }}>Resilience · Recovery</div>
        <h2 className="font-serif text-xl font-semibold text-[var(--ink-strong)] mt-0.5">
          What happens when a connector fails
        </h2>
        <p className="text-sm text-[var(--ink-muted)] mt-1 max-w-3xl">
          Every Fivetran connector has automatic retry with exponential backoff; failed rows land in a
          dead-letter queue for replay; dbt builds gate gold on green silver. Below: the last 30 days.
        </p>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y-0 md:divide-x divide-[var(--hairline-soft,#e8e4d8)]">
        <RecoveryTile label="Retry policy"          big="exp 5×"   sub="2s · 8s · 30s · 2m · 8m, then DLQ" />
        <RecoveryTile label="Dead-letter · current" big="8"        sub="rows held · 5 LMS events, 3 IPEDS dupe-key" color="#b45309" />
        <RecoveryTile label="MTTR · last 30d"       big="6 min"    sub="median · max 21 min during Banner cert rotation" />
        <RecoveryTile label="Last incident"         big="5 d ago"  sub="Replayed automatically in 3 min, zero data loss" color="#16a34a" />
      </div>
    </section>
  );
}

function RecoveryTile({ label, big, sub, color = 'var(--ink-strong)' }: { label: string; big: string; sub: string; color?: string }) {
  return (
    <div className="p-5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)] font-semibold">{label}</div>
      <div className="mt-1.5 font-serif font-semibold leading-none" style={{ fontSize: 26, color, fontVariantNumeric: 'tabular-nums' }}>
        {big}
      </div>
      <div className="mt-2 text-xs text-[var(--ink-muted)] leading-snug">{sub}</div>
    </div>
  );
}

// =============================================================================
// DataContractsPanel — FERPA governance
// =============================================================================
function DataContractsPanel() {
  return (
    <section className="mb-8 clinical-card overflow-hidden" style={cardStyle}>
      <header className="clinical-card-header flex items-start justify-between gap-4" style={cardHeaderStyle}>
        <div>
          <div className="eyebrow" style={{ color: '#5b21b6' }}>Data Contracts · FERPA Governance</div>
          <h2 className="font-serif text-xl font-semibold text-[var(--ink-strong)] mt-0.5">
            Student PII never leaves the lake without a policy
          </h2>
          <p className="text-sm text-[var(--ink-muted)] mt-1 max-w-3xl">
            Every column with student PII is tagged at ingest. Row-level access scopes by department
            and program. Column masking on SSN, DOB, address. Every read goes to an audit log.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shrink-0" style={{ background: '#5b21b6' }}>
          FERPA
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-[var(--hairline-soft,#e8e4d8)]">
        <div className="p-5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)] font-semibold mb-3">Policy coverage</div>
          <ul className="space-y-2 text-sm">
            <Policy label="PII columns tagged"        value="28 columns across 8 tables" />
            <Policy label="Row-level access policy"   value="department_id + program_id scoped per role" />
            <Policy label="Column masking on read"    value="ssn · dob · address · phone · student_id" />
            <Policy label="Audit log destination"     value="CloudTrail → S3 (90d) → Iceberg audit table" />
            <Policy label="De-identification path"    value="gold.fct_research_cohorts uses FERPA-aligned de-id" />
          </ul>
        </div>
        <div className="p-5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)] font-semibold mb-3">Sample contract · gold.dim_students</div>
          <pre className="font-mono text-[11.5px] leading-relaxed overflow-x-auto rounded-sm p-3" style={{ background: '#14532d', color: '#e6e9f0' }}><code>{`columns:
  - name: student_id
    tests: [unique, not_null]
    meta: { contains_pii: true, mask_policy: "tokenise" }
  - name: ssn
    tests: [not_null]
    meta: { contains_pii: true, mask_policy: "redact_full" }
  - name: dob
    meta: { contains_pii: true, mask_policy: "year_only" }
  - name: department_id
    tests: [relationships: dim_programs]
    meta: { rls_partition_key: true }`}</code></pre>
        </div>
      </div>
    </section>
  );
}

function Policy({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#5b21b6' }} />
      <div className="flex-1">
        <span className="text-[var(--ink-strong)] font-semibold">{label}</span>
        <span className="text-[var(--ink-muted)]"> · {value}</span>
      </div>
    </li>
  );
}

// =============================================================================
// GreatExpectationsPanel — Fivetran-stewarded OSS data-quality gate
// =============================================================================
interface GxSuite {
  suite: string;
  table: string;
  layer: 'bronze' | 'silver' | 'gold';
  expectations: number;
  passing: number;
  last_run: string;
  why: string;
}

const GX_SUITES: GxSuite[] = [
  {
    suite: 'banner_student_completeness',
    table: 'bronze.banner__student',
    layer: 'bronze',
    expectations: 9,
    passing: 9,
    last_run: '12m ago',
    why: 'student_id not-null + unique, dob within registrar plausibility window, FERPA-tagged columns present, residency_code in approved set.',
  },
  {
    suite: 'banner_enrollment_referential',
    table: 'bronze.banner__enrollment',
    layer: 'bronze',
    expectations: 7,
    passing: 6,
    last_run: '9m ago',
    why: 'enrollment.student_id resolves to bronze.banner__student; course_section_id resolves to bronze.banner__course_section; term in current academic-calendar dim.',
  },
  {
    suite: 'banner_grade_value_set',
    table: 'bronze.banner__grade_event',
    layer: 'bronze',
    expectations: 5,
    passing: 5,
    last_run: '12m ago',
    why: 'grade_letter ∈ {A,A-,B+,B,B-,C+,C,C-,D+,D,F,W,I,P,NP,AU}; gpa_points in [0.0, 4.0]; final_grade_flag boolean.',
  },
  {
    suite: 'aid_financial_ranges',
    table: 'bronze.banner__financial_aid',
    layer: 'bronze',
    expectations: 6,
    passing: 6,
    last_run: '14m ago',
    why: 'efc in [0, 99999]; pell_award_amount in [0, 7395]; aid_year matches federal cycle; FAFSA application_status ∈ accepted set.',
  },
  {
    suite: 'course_section_capacity',
    table: 'silver.int_course_enrollment',
    layer: 'silver',
    expectations: 4,
    passing: 4,
    last_run: '8m ago',
    why: 'enrollment_count ≤ section_capacity; waitlist_count ≥ 0; section_capacity > 0 for active sections.',
  },
  {
    suite: 'lms_activity_event_quality',
    table: 'bronze.lms__activity_event',
    layer: 'bronze',
    expectations: 5,
    passing: 5,
    last_run: '7m ago',
    why: 'event_timestamp within last 36h of ingest; user_id resolves to dim_students; event_type ∈ Canvas-emitted enum; session duration positive.',
  },
  {
    suite: 'gold_students_pii_governance',
    table: 'gold.dim_students',
    layer: 'gold',
    expectations: 6,
    passing: 6,
    last_run: '5m ago',
    why: 'ssn_last4 + dob_year masked per FERPA policy; legal_name nullable for FERPA-block holds; advisor_id resolves to dim_faculty; cohort_id present.',
  },
  {
    suite: 'retention_cohort_cardinality',
    table: 'gold.fct_retention_signals',
    layer: 'gold',
    expectations: 4,
    passing: 4,
    last_run: '5m ago',
    why: 'one row per (student_id, term) — no duplicates; cohort_year matches term start year; retention_status ∈ {persisted, transferred, stopped_out, graduated}.',
  },
];

function GreatExpectationsPanel() {
  const totals = GX_SUITES.reduce(
    (a, s) => ({ exp: a.exp + s.expectations, pass: a.pass + s.passing, suites: a.suites + 1 }),
    { exp: 0, pass: 0, suites: 0 },
  );
  const warns = totals.exp - totals.pass;

  return (
    <section className="mb-8 clinical-card overflow-hidden" style={cardStyle}>
      <header className="clinical-card-header flex items-start justify-between gap-4" style={cardHeaderStyle}>
        <div>
          <div className="eyebrow" style={{ color: '#9a3412' }}>Data Quality · Great Expectations</div>
          <h2 className="font-serif text-xl font-semibold text-[var(--ink-strong)] mt-0.5">
            Validation runs on Bronze before anything reaches Silver.
          </h2>
          <p className="text-sm text-[var(--ink-muted)] mt-1 max-w-3xl">
            Expectation suites define what "valid" looks like for each higher-ed table —
            student-record completeness, enrollment referential integrity, FERPA-tagged PII presence,
            FAFSA/EFC plausibility, and retention-cohort cardinality. A failed expectation blocks
            promotion. Same lake, same Iceberg snapshots, just gated.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: '#9a3412' }}>
            GX Core · OSS
          </div>
          <div className="text-[10px] text-[var(--ink-soft)] font-mono">Fivetran-stewarded</div>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 divide-y-0 md:divide-x divide-[var(--hairline-soft,#e8e4d8)]">
        <RecoveryTile label="Expectation suites"     big={String(totals.suites)} sub="across bronze · silver · gold layers" />
        <RecoveryTile label="Expectations · today"   big={`${totals.pass}/${totals.exp}`} sub={`${warns} warn · 0 errors · gates Silver promotion`} color={warns ? '#b45309' : '#16a34a'} />
        <RecoveryTile label="Checkpoint cadence"     big="every sync" sub="triggered by Fivetran sync-complete · runs before dbt build" />
        <RecoveryTile label="Failed-expectation queue" big="3 rows" sub="enrollment FK misses · held in dlq.gx_quarantine · auto-retried after suite update" color="#b45309" />
      </div>

      <div className="overflow-x-auto border-t border-[var(--hairline-soft,#e8e4d8)]">
        <table className="min-w-full text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <thead className="border-b border-[var(--hairline)]" style={{ background: 'var(--paper-deep,#f4efe2)' }}>
            <tr>
              <Th>Layer</Th><Th>Suite</Th><Th>Table under test</Th><Th align="right">Expectations</Th><Th align="right">Last run</Th><Th>What it asserts</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--hairline-soft,#e8e4d8)]">
            {GX_SUITES.map((s) => {
              const ok = s.passing === s.expectations;
              return (
                <tr key={s.suite} className="hover:bg-[var(--paper-deep,#f4efe2)] cursor-default">
                  <td className="px-4 py-2.5"><LayerChip layer={s.layer} /></td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-[var(--ink-strong)]">{s.suite}</td>
                  <td className="px-4 py-2.5 text-xs text-[var(--ink-muted)] font-mono">{s.table}</td>
                  <td className="px-4 py-2.5 text-right font-semibold" style={{ color: ok ? '#16a34a' : '#b45309' }}>
                    {s.passing}/{s.expectations}
                    {!ok && <span className="ml-1 text-[10px] uppercase tracking-wider">warn</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-[var(--ink-muted)] font-mono">{s.last_run}</td>
                  <td className="px-4 py-2.5 text-xs text-[var(--ink)] leading-snug max-w-md">{s.why}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-[var(--hairline-soft,#e8e4d8)] border-t border-[var(--hairline-soft,#e8e4d8)]">
        <div className="p-5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)] font-semibold mb-3">Sample expectation suite · banner_enrollment_referential</div>
          <pre className="font-mono text-[11.5px] leading-relaxed overflow-x-auto rounded-sm p-3" style={{ background: '#0b2545', color: '#e6e9f0' }}><code>{`# banner_enrollment_referential.yml
expectation_suite_name: banner_enrollment_referential
data_asset_name: bronze.banner__enrollment

expectations:
  - expect_column_values_to_not_be_null:
      column: student_id
  - expect_column_values_to_be_in_set:
      column: enrollment_status
      value_set: [enrolled, withdrawn, audit, pending]
  - expect_column_pair_values_to_be_in_set:
      column_A: course_section_id
      column_B: term
      value_pairs_set: "{{ active_sections }}"
  - expect_table_row_count_to_be_between:
      min_value: 1500000
      max_value: 2200000
  - expect_column_values_to_match_regex:
      column: term
      regex: "^[0-9]{4}(SP|SU|FA|WI)$"
`}</code></pre>
        </div>
        <div className="p-5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)] font-semibold mb-3">How this fits the stack</div>
          <ul className="space-y-2.5 text-sm">
            <Policy label="Fivetran moves" value="Banner SIS, Canvas LMS, Cayuse RIS, IPEDS into Bronze (Iceberg)" />
            <Policy label="Great Expectations validates" value="Bronze landings against suites before Silver promotion" />
            <Policy label="dbt transforms" value="Silver + Gold marts; dbt tests assert SQL-level constraints" />
            <Policy label="Failed rows" value="route to dlq.gx_quarantine on the same lake; retried after suite update" />
            <Policy label="Open source" value="GX Core remains community-driven; Fivetran funds maintenance, ecosystem, and engineering investment" />
            <Policy label="Community" value="github.com/great-expectations/great_expectations · thousands of teams use GX outside Fivetran's customer base" />
          </ul>
          <div className="mt-4 pt-3 border-t border-[var(--hairline-soft,#e8e4d8)] text-[11px] text-[var(--ink-soft)] leading-relaxed">
            On May 13, 2026 Fivetran announced it is becoming steward of the Great Expectations open
            source community and the GX Core project, supporting ongoing maintenance, ecosystem
            integrations, and community engagement. Same open project, backed by sustained engineering.
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// ActivationsPanel — NewCo Activations, the native reverse-ETL stage that
// sits directly after Transformations. TRIGGER / DESTINATION / OUTCOME below
// are vertical-specific to Cascade University's retention-risk-to-advisor
// early-alert workflow.
// =============================================================================
function ActivationsPanel() {
  // TRIGGER — the gold-layer condition that fires the sync
  const TRIGGER = "gold.fct_retention_signals flags a newly-crossed retention_risk_score >= 80 — a composite of dfw_count_term >= 2, a 7-day LMS engagement drop of 40%+, and a missed scheduled advising touch — on a student whose advising_case_status isn't already 'open', so advisors never get a duplicate alert for the same student.";
  // DESTINATION — the downstream system NewCo Activations pushes into
  const DESTINATION = 'EAB Navigate360 · Student Case';
  // OUTCOME — the business payoff the SE narrates
  const OUTCOME = "For the 1,204 students already flagged in gold.fct_retention_signals, median time from risk-detection to first advisor contact drops from 9 days (manual Monday CSV export/re-key into Navigate360) to under 15 minutes. 48-hour advisor-contact completion rises from 41% to 92%. Cascade's persistence model attributes a 3.2-point retention lift to contact within 48 hours of flagging — worth roughly $1.1M in preserved tuition per term across the flagged cohort.";

  return (
    <section className="mb-8 clinical-card overflow-hidden" style={cardStyle}>
      <header className="clinical-card-header flex items-start justify-between gap-4" style={cardHeaderStyle}>
        <div>
          <div className="eyebrow" style={{ color: '#0e7490' }}>Activations · NewCo</div>
          <h2 className="font-serif text-xl font-semibold text-[var(--ink-strong)] mt-0.5">
            The gold layer doesn't just get queried. It gets acted on.
          </h2>
          <p className="text-sm text-[var(--ink-muted)] mt-1 max-w-3xl">
            Activations is the fourth native stage in NewCo, immediately after Transformations. It
            reads straight from the same Iceberg gold tables dbt just built and syncs the result to
            an operational system of record &mdash; no separate reverse-ETL vendor, no second copy of
            the data, no second connector to maintain.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shrink-0" style={{ background: '#0e7490' }}>
          Activations
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--hairline-soft,#ece8d6)]">
        <div className="p-5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)] font-semibold mb-2">Trigger · gold layer</div>
          <p className="text-sm text-[var(--ink)] leading-relaxed">{TRIGGER}</p>
        </div>
        <div className="p-5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)] font-semibold mb-2">Destination</div>
          <p className="text-sm text-[var(--ink)] leading-relaxed font-mono">{DESTINATION}</p>
        </div>
        <div className="p-5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)] font-semibold mb-2">Outcome</div>
          <p className="text-sm text-[var(--ink)] leading-relaxed">{OUTCOME}</p>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-[var(--hairline-soft,#ece8d6)] flex items-center justify-between text-[11px] text-[var(--ink-soft)]" style={{ background: 'var(--paper-deep,#f1efe2)' }}>
        <span>Connections &rarr; Destinations &rarr; Transformations &rarr; <strong style={{ color: '#0e7490' }}>Activations</strong> &middot; one platform, one lineage graph</span>
        <Link to="/activations-live" className="uppercase tracking-wider font-semibold hover:underline" style={{ color: '#0e7490' }}>
          Watch it sync &rarr;
        </Link>
      </div>
    </section>
  );
}

// =============================================================================
// BeforeAfterPanel
// =============================================================================
function BeforeAfterPanel() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="clinical-card p-6 border-l-4" style={{ ...cardStyle, borderLeftColor: '#dc2626' }}>
        <div className="eyebrow" style={{ color: '#dc2626' }}>Before · Modern Data Stack</div>
        <h3 className="mt-1 font-serif text-xl font-semibold text-[var(--ink-strong)]">14 hops · 3 copies of the bytes</h3>
        <pre className="font-mono text-[10.5px] leading-relaxed mt-4 p-3 rounded-sm overflow-x-auto" style={{ background: '#fef2f2', color: '#7f1d1d', border: '1px solid #fecaca' }}>{`Source → SFTP → Stitch → Snowflake (raw)
       → dbt → Snowflake (silver) → Snowflake (gold)
       → Census reverse-ETL → Hightouch → 3rd-party AI store
       → Looker materialised view → BI extract → analyst laptop`}</pre>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div><div className="text-[var(--ink-soft)] text-xs">Copies of the data</div><div className="font-serif text-2xl font-semibold text-[var(--ink-strong)]">3</div></div>
          <div><div className="text-[var(--ink-soft)] text-xs">Avg end-to-end latency</div><div className="font-serif text-2xl font-semibold text-[var(--ink-strong)]">14 hr</div></div>
          <div><div className="text-[var(--ink-soft)] text-xs">Daily run-rate</div><div className="font-serif text-2xl font-semibold text-[var(--ink-strong)]">$12.60</div></div>
          <div><div className="text-[var(--ink-soft)] text-xs">Schema change</div><div className="font-serif text-lg font-semibold text-[var(--ink-strong)]">6-min lock</div></div>
          <div className="col-span-2 pt-3 mt-1 border-t border-[var(--hairline-soft,#e8e4d8)]">
            <div className="text-[var(--ink-soft)] text-xs">Reverse-ETL hop</div>
            <div className="font-serif text-lg font-semibold text-[var(--ink-strong)]">
              Census + Hightouch <span className="text-xs font-sans font-normal text-[var(--ink-soft)]">(3rd-party, one more copy)</span>
            </div>
          </div>
        </div>
      </div>
      <div className="clinical-card p-6 border-l-4" style={{ ...cardStyle, borderLeftColor: '#14532d' }}>
        <div className="eyebrow" style={{ color: '#14532d' }}>After · Open Data Infrastructure</div>
        <h3 className="mt-1 font-serif text-xl font-semibold text-[var(--ink-strong)]">5 hops · 1 copy of the bytes</h3>
        <pre className="font-mono text-[10.5px] leading-relaxed mt-4 p-3 rounded-sm overflow-x-auto" style={{ background: '#ecfdf5', color: '#064e3b', border: '1px solid #a7f3d0' }}>{`Source → Fivetran CDC → Iceberg bronze
       → dbt → Iceberg silver
       → dbt → Iceberg gold
       ↳ Snowflake · Athena · DuckDB · Trino · Spark
         (all reading the same bytes, no copies)
       → NewCo Activations (native) → EAB Navigate360`}</pre>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div><div className="text-[var(--ink-soft)] text-xs">Copies of the data</div><div className="font-serif text-2xl font-semibold" style={{ color: '#14532d' }}>1</div></div>
          <div><div className="text-[var(--ink-soft)] text-xs">Avg end-to-end latency</div><div className="font-serif text-2xl font-semibold" style={{ color: '#14532d' }}>6 min</div></div>
          <div><div className="text-[var(--ink-soft)] text-xs">Daily run-rate</div><div className="font-serif text-2xl font-semibold" style={{ color: '#14532d' }}>$4.03</div></div>
          <div><div className="text-[var(--ink-soft)] text-xs">Schema change</div><div className="font-serif text-lg font-semibold" style={{ color: '#14532d' }}>milliseconds</div></div>
          <div className="col-span-2 pt-3 mt-1 border-t border-[var(--hairline-soft,#ece8d6)]">
            <div className="text-[var(--ink-soft)] text-xs">Reverse-ETL hop</div>
            <div className="font-serif text-lg font-semibold" style={{ color: '#14532d' }}>
              NewCo Activations <span className="text-xs font-sans font-normal text-[var(--ink-soft)]">(native, zero extra copies)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// LineagePanel
// =============================================================================
type LineageEdge = { from: string; to: string; tests?: string[] };

const LINEAGE_MAP: Record<string, { silver: string[]; bronze: string[]; edges: LineageEdge[]; story: string }> = {
  'gold.fct_retention_signals': {
    silver: ['silver.int_student_term_spine', 'silver.int_lms_engagement', 'silver.int_aid_packaging'],
    bronze: ['bronze.banner__student', 'bronze.banner__enrollment', 'bronze.lms__activity_event'],
    story:  'Retention signal joins enrollment history to LMS engagement and aid packaging. Drives the advisor outreach queue and the early-alert dashboard.',
    edges: [
      { from: 'bronze.banner__student',     to: 'silver.int_student_term_spine', tests: ['unique student_id'] },
      { from: 'bronze.banner__enrollment',  to: 'silver.int_student_term_spine', tests: ['not-null term'] },
      { from: 'bronze.lms__activity_event', to: 'silver.int_lms_engagement',     tests: ['streaming · 14 s p99'] },
      { from: 'silver.int_lms_engagement',  to: 'gold.fct_retention_signals' },
      { from: 'silver.int_student_term_spine', to: 'gold.fct_retention_signals' },
      { from: 'silver.int_aid_packaging',   to: 'gold.fct_retention_signals' },
    ],
  },
  'gold.fct_dfw_risk': {
    silver: ['silver.int_course_enrollment', 'silver.int_lms_engagement'],
    bronze: ['bronze.banner__enrollment', 'bronze.banner__grade_event', 'bronze.lms__activity_event'],
    story:  'DFW risk facts including grade events, withdrawal signals, and LMS-derived engagement decay.',
    edges: [
      { from: 'bronze.banner__enrollment',  to: 'silver.int_course_enrollment' },
      { from: 'bronze.banner__grade_event', to: 'silver.int_course_enrollment' },
      { from: 'bronze.lms__activity_event', to: 'silver.int_lms_engagement',   tests: ['streaming · 14 s p99'] },
      { from: 'silver.int_course_enrollment', to: 'gold.fct_dfw_risk' },
      { from: 'silver.int_lms_engagement',  to: 'gold.fct_dfw_risk' },
    ],
  },
  'gold.fct_grant_pipeline': {
    silver: ['silver.int_grant_portfolio'],
    bronze: ['bronze.grants__proposal', 'bronze.grants__award'],
    story:  'Research grant pipeline signal joined to proposal and award lifecycle. Drives the Research Admin dashboard.',
    edges: [
      { from: 'bronze.grants__proposal', to: 'silver.int_grant_portfolio' },
      { from: 'bronze.grants__award',    to: 'silver.int_grant_portfolio' },
      { from: 'silver.int_grant_portfolio', to: 'gold.fct_grant_pipeline' },
    ],
  },
  'gold.dim_students': {
    silver: ['silver.int_student_term_spine'],
    bronze: ['bronze.banner__student'],
    story:  'Master student dimension. PII-tagged, masked on read by role.',
    edges: [
      { from: 'bronze.banner__student',        to: 'silver.int_student_term_spine' },
      { from: 'silver.int_student_term_spine', to: 'gold.dim_students' },
    ],
  },
};

function LineagePanel() {
  const goldOptions = Object.keys(LINEAGE_MAP);
  const [selected, setSelected] = useState<string>(goldOptions[0]);
  const lin = LINEAGE_MAP[selected];

  const BX = 20, MX = 320, RX = 620;
  const COL_W = 280;
  const ROW_H = 38, ROW_GAP = 8;
  const maxRows = Math.max(lin.bronze.length, lin.silver.length, 1);
  const HEIGHT = Math.max(maxRows * (ROW_H + ROW_GAP) + 40, 240);

  const bronzeY = (i: number) => 30 + i * (ROW_H + ROW_GAP);
  const silverY = (i: number) => 30 + i * (ROW_H + ROW_GAP);
  const goldY = (HEIGHT - ROW_H) / 2;

  const nodeOf = (name: string): { x: number; y: number; w: number; h: number } | null => {
    const bi = lin.bronze.indexOf(name);
    if (bi >= 0) return { x: BX, y: bronzeY(bi), w: COL_W, h: ROW_H };
    const si = lin.silver.indexOf(name);
    if (si >= 0) return { x: MX, y: silverY(si), w: COL_W, h: ROW_H };
    if (name === selected) return { x: RX, y: goldY, w: COL_W, h: ROW_H };
    return null;
  };

  return (
    <section className="mb-8 clinical-card overflow-hidden" style={cardStyle}>
      <header className="clinical-card-header" style={cardHeaderStyle}>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <div className="eyebrow" style={{ color: '#FF694A' }}>dbt · Column-level lineage</div>
            <h2 className="font-serif text-xl font-semibold text-[var(--ink-strong)] mt-0.5">
              Pick any gold model. See exactly where its bytes come from.
            </h2>
            <p className="text-sm text-[var(--ink-muted)] mt-1 max-w-3xl">
              dbt emits lineage as a side-effect of build. Every join, every transformation, every test
              is documented automatically. Click a gold model below to trace upstream &mdash; bronze
              landings to silver intermediates to the gold mart.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shrink-0" style={{ background: '#FF694A' }}>
            dbt Labs
          </div>
        </div>
      </header>

      <div className="px-5 pt-4 flex flex-wrap gap-2">
        {goldOptions.map((g) => (
          <button
            key={g}
            onClick={() => setSelected(g)}
            className="px-3 py-2 rounded-sm text-[11.5px] font-mono border transition-all"
            style={
              selected === g
                ? { background: '#b8975c', borderColor: '#b8975c', color: '#fff' }
                : { background: '#fff', borderColor: 'var(--hairline)', color: 'var(--ink-muted)' }
            }
          >
            {g}
          </button>
        ))}
      </div>

      <div className="p-5">
        <p className="text-sm text-[var(--ink)] mb-4 italic">{lin.story}</p>

        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${RX + COL_W + 20} ${HEIGHT}`} className="w-full" style={{ minWidth: 880, maxHeight: 360 }}>
            <defs>
              <marker id="lin-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="#FF694A" />
              </marker>
            </defs>

            <text x={BX}        y={18} fontSize="10" fontWeight="700" fill="#826b3f" letterSpacing="1.6">BRONZE · raw</text>
            <text x={MX}        y={18} fontSize="10" fontWeight="700" fill="#374151" letterSpacing="1.6">SILVER · conformed</text>
            <text x={RX}        y={18} fontSize="10" fontWeight="700" fill="#7a5e2d" letterSpacing="1.6">GOLD · selected</text>

            {lin.edges.map((e, i) => {
              const a = nodeOf(e.from);
              const b = nodeOf(e.to);
              if (!a || !b) return null;
              const x1 = a.x + a.w, y1 = a.y + a.h / 2;
              const x2 = b.x,         y2 = b.y + b.h / 2;
              const mid = (x1 + x2) / 2;
              const d = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
              return (
                <g key={i}>
                  <path d={d} fill="none" stroke="#FF694A" strokeWidth="1.6" strokeLinecap="round" markerEnd="url(#lin-arrow)" opacity="0.75" />
                  <circle r="2.5" fill="#FF694A">
                    <animateMotion dur={`${2.0 + i * 0.18}s`} repeatCount="indefinite" path={d} />
                    <animate attributeName="opacity" values="0;1;1;0" dur={`${2.0 + i * 0.18}s`} repeatCount="indefinite" />
                  </circle>
                  {e.tests && (
                    <g transform={`translate(${mid - 38}, ${(y1 + y2) / 2 - 8})`}>
                      <rect width="76" height="14" rx="3" fill="#FF694A" />
                      <text x="38" y="10" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#fff" letterSpacing="0.4">
                        {e.tests[0]}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {lin.bronze.map((t, i) => (
              <g key={t} transform={`translate(${BX}, ${bronzeY(i)})`}>
                <rect width={COL_W} height={ROW_H} rx="4" fill="#fef3c7" stroke="#b45309" strokeWidth="1" />
                <text x="12" y="14" fontSize="9" fontWeight="800" fill="#826b3f" letterSpacing="1.4">BRONZE</text>
                <text x="12" y="28" fontSize="11" fontWeight="700" fill="#0b1220" fontFamily="ui-monospace, monospace">{t}</text>
              </g>
            ))}

            {lin.silver.map((t, i) => (
              <g key={t} transform={`translate(${MX}, ${silverY(i)})`}>
                <rect width={COL_W} height={ROW_H} rx="4" fill="#f3f4f6" stroke="#6b7280" strokeWidth="1" />
                <text x="12" y="14" fontSize="9" fontWeight="800" fill="#374151" letterSpacing="1.4">SILVER</text>
                <text x="12" y="28" fontSize="11" fontWeight="700" fill="#0b1220" fontFamily="ui-monospace, monospace">{t}</text>
              </g>
            ))}

            <g transform={`translate(${RX}, ${goldY})`}>
              <rect width={COL_W} height={ROW_H} rx="4" fill="#faf3e1" stroke="#b8975c" strokeWidth="2" />
              <text x="12" y="14" fontSize="9" fontWeight="800" fill="#7a5e2d" letterSpacing="1.4">GOLD</text>
              <text x="12" y="28" fontSize="11" fontWeight="700" fill="#0b1220" fontFamily="ui-monospace, monospace">{selected}</text>
            </g>
          </svg>
        </div>

        <div className="mt-4 flex items-center gap-4 text-[11px] text-[var(--ink-soft)] flex-wrap">
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-0.5" style={{ background: '#FF694A' }} /> dbt transformation (auto-emitted)</span>
          <span>•</span>
          <span><strong className="text-[var(--ink-strong)]">{lin.edges.length}</strong> column-level edges traced</span>
          <span>•</span>
          <span><strong className="text-[var(--ink-strong)]">{lin.bronze.length + lin.silver.length + 1}</strong> dbt models in the lineage graph</span>
          <span>•</span>
          <span>Lineage runs at every build · zero manual upkeep</span>
        </div>
      </div>
    </section>
  );
}
