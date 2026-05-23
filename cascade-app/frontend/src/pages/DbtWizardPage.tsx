/*
 * DbtWizardPage — Hub page for the dbt-wizard demo at Cascade University.
 *
 * Route: /dbt-wizard
 *
 * Shows the scenario framing (Provost's question), the pipeline flow,
 * sub-agent hub, model registry, and CTAs to enter the scenario or live build.
 *
 * Ported from Healthcare-EPIC-Snowflake-Demo/OdiDbtWizardPage.tsx
 */

import { Link } from 'react-router-dom';

const C = {
  ivy:    '#166534',
  bronze: '#92400e',
  rose:   '#be185d',
  violet: '#7c3aed',
  dbt:    '#FF694A',
  snow:   '#29B5E8',
  ft:     '#0073EA',
  ice:    '#7C3AED',
};

const PIPELINE_STAGES = [
  { key: 'src',  layer: 'Sources',        vendor: 'Banner SIS / Canvas',      stat: 'Oracle CDC + REST · 7 connectors', color: '#78716c',  icon: 'B' },
  { key: 'ft',   layer: 'Ingestion',      vendor: 'Fivetran',                  stat: '750+ connectors · Iceberg',        color: C.ft,       icon: 'F' },
  { key: 'ice',  layer: 'Open Lake',      vendor: 'Iceberg on S3',             stat: 'ACID · open · multi-engine',       color: C.ice,      icon: 'I' },
  { key: 'dbt',  layer: 'Build-time AI',  vendor: 'dbt Labs + dbt-wizard',     stat: '4 sub-agents · 90s/model',         color: C.dbt,      icon: 'W' },
  { key: 'snow', layer: 'Compute',        vendor: 'Snowflake',                 stat: 'External Iceberg · XS WH',         color: C.snow,     icon: 'S' },
];

const SPOKES = [
  { code: 'EX', name: 'Explorer',     tools: 'status · search',       blurb: 'Maps what exists',     color: C.ivy,    angle: -135 },
  { code: 'SM', name: 'Summary',      tools: 'describe · lineage',    blurb: 'Documents the schema', color: C.violet, angle: -45  },
  { code: 'WK', name: 'Worker',       tools: 'warehouse · dbt_show',  blurb: 'Authors the SQL',      color: C.rose,   angle:  45  },
  { code: 'VR', name: 'Verification', tools: 'test · docs',            blurb: 'Tests and tags',       color: C.bronze, angle:  135 },
];

const REGISTRY_GROUPS = [
  { layer: 'bronze', color: C.ft,     total: 7,  sample: ['stg_banner__student', 'stg_banner__enrollment', 'stg_canvas__course_activity', 'stg_workday__employee', 'stg_slate__applicant'] },
  { layer: 'silver', color: '#94a3b8', total: 4,  sample: ['int_student_term_enrollment', 'int_student_academic_record', 'int_student_profile', 'int_course_section'] },
  { layer: 'gold',   color: C.ivy,    total: 11, sample: ['fct_enrollment_funnel', 'fct_retention_cohort', 'fct_research_awards', 'dim_students', 'dim_courses'] },
];

export default function DbtWizardPage() {
  const hubSize = 460;
  const cx = hubSize / 2;
  const cy = hubSize / 2;
  const r  = hubSize * 0.30;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

      {/* Header */}
      <header className="mb-10 pb-6 border-b border-[var(--hairline)]">
        <div className="eyebrow mb-3">dbt-wizard · Institutional Intelligence</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div>
            <h1 className="font-serif text-5xl font-semibold leading-[1.05] tracking-tight text-[var(--ink-strong)]">
              A gold table that doesn't exist yet.
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-[var(--ink-muted)] max-w-2xl">
              The Provost asks why first-year STEM retention dropped 3.8 points for first-gen students
              in the College of Engineering while liberal-arts held. No{' '}
              <span className="font-mono text-sm">gold.fct_retention_by_school_persona_term</span> exists
              to answer it. The Board of Trustees meets in 22 hours. Manual ETA: 3 to 5 days.
            </p>
            <p className="mt-3 text-base leading-relaxed text-[var(--ink-muted)] max-w-2xl">
              dbt-wizard's four sub-agents surface the upstream silver tables, author the SQL,
              write the schema contract, materialize to Iceberg, and hand the Provost a production
              asset in 90 seconds. The answer: MATH 220 Wednesday-evening sections conflict with
              campus work shifts. Reschedule the section, not the curriculum.
            </p>
            <div
              className="mt-5 rounded-lg border border-[var(--hairline)] p-4"
              style={{ borderLeft: '4px solid var(--garnet)', background: 'rgba(190,18,60,0.03)' }}
            >
              <div className="eyebrow mb-1 text-[var(--garnet)]">At stake</div>
              <div className="font-serif text-2xl font-semibold text-[var(--garnet)]">$6M tuition revenue exposure / cohort</div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/dbt-wizard/scenario"
                className="inline-flex items-center gap-2 rounded-md text-white font-semibold px-6 py-3 hover:opacity-95 transition-opacity"
                style={{ background: 'var(--ivy-deep)' }}
              >
                Read the scenario
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                to="/dbt-wizard/live"
                className="inline-flex items-center gap-2 rounded-md font-semibold px-6 py-3 hover:opacity-90 transition-opacity border"
                style={{ color: 'var(--ivy-deep)', borderColor: 'var(--ivy)', background: 'rgba(22,101,52,0.06)' }}
              >
                Jump to live build
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Live build thumbnail */}
          <div>
            <LiveBuildThumbnail />
          </div>
        </div>
      </header>

      {/* Pipeline flow */}
      <section className="mb-10">
        <div className="eyebrow mb-3">How it connects</div>
        <div className="grid grid-cols-1 md:grid-cols-9 gap-2 items-stretch">
          {PIPELINE_STAGES.map((stage, i) => (
            <PipelineFragment key={stage.key} stage={stage} isLast={i === PIPELINE_STAGES.length - 1} idx={i} />
          ))}
        </div>
      </section>

      {/* Sub-agent hub + model registry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

        {/* Hub */}
        <div className="research-card p-5">
          <div className="eyebrow mb-2">Four sub-agents · one loop</div>
          <h3 className="font-serif text-lg font-semibold mb-3 text-[var(--ink-strong)]">
            dbt-wizard authors a model the way an analytics engineer would
          </h3>
          <svg viewBox={`0 0 ${hubSize} ${hubSize}`} className="w-full h-auto" role="img" aria-label="dbt-wizard sub-agent wheel">
            {[1, 0.7, 0.4].map((rel) => (
              <circle key={rel} cx={cx} cy={cy} r={r * rel}
                      fill="none" stroke="rgba(20,83,45,0.12)" strokeWidth="1" />
            ))}
            {SPOKES.map((s) => {
              const rad = (s.angle * Math.PI) / 180;
              const x = cx + Math.cos(rad) * r;
              const y = cy + Math.sin(rad) * r;
              return (
                <g key={s.code}>
                  <line x1={cx} y1={cy} x2={x} y2={y}
                        stroke={`${s.color}55`} strokeWidth="1.5" />
                  <circle cx={x} cy={y} r={26}
                          fill={`${s.color}1a`}
                          stroke={s.color} strokeWidth="2" />
                  <text x={x} y={y + 4} textAnchor="middle"
                        fill={s.color}
                        style={{ fontSize: 13, fontWeight: 800, fontFamily: '"JetBrains Mono", monospace' }}>
                    {s.code}
                  </text>
                </g>
              );
            })}
            <circle cx={cx} cy={cy} r="56"
                    fill={`${C.dbt}1a`}
                    stroke={C.dbt} strokeWidth="2" />
            <text x={cx} y={cy - 4} textAnchor="middle"
                  fill={C.dbt}
                  style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', fontFamily: '"JetBrains Mono", monospace' }}>
              DBT-WIZARD
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle"
                  fill="#78716c"
                  style={{ fontSize: 9.5, letterSpacing: '0.18em' }}>
              BUILD-TIME AI
            </text>
            {SPOKES.map((s) => {
              const rad = (s.angle * Math.PI) / 180;
              const lx = cx + Math.cos(rad) * (r + 70);
              const ly = cy + Math.sin(rad) * (r + 50);
              const anchor =
                Math.abs(Math.cos(rad)) < 0.2 ? 'middle' :
                Math.cos(rad) > 0 ? 'start' : 'end';
              return (
                <g key={s.name}>
                  <text x={lx} y={ly - 8} textAnchor={anchor}
                        fill={s.color}
                        style={{ fontSize: 13, fontWeight: 700 }}>
                    {s.name}
                  </text>
                  <text x={lx} y={ly + 6} textAnchor={anchor}
                        fill="#1c1917"
                        style={{ fontSize: 11 }}>
                    {s.blurb}
                  </text>
                  <text x={lx} y={ly + 20} textAnchor={anchor}
                        fill="#78716c"
                        style={{ fontSize: 10, letterSpacing: '0.06em', fontFamily: '"JetBrains Mono", monospace' }}>
                    {s.tools}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Model registry */}
        <div className="research-card p-5">
          <div className="eyebrow mb-2">Model registry · 23 total after build</div>
          <h3 className="font-serif text-lg font-semibold mb-3 text-[var(--ink-strong)]">
            Where the new model lands
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {REGISTRY_GROUPS.map(g => (
              <div key={g.layer} className="research-card p-3" style={{ borderTop: `3px solid ${g.color}` }}>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-mono uppercase tracking-[0.16em]" style={{ fontSize: 10, color: g.color, fontWeight: 700 }}>
                    {g.layer}
                  </span>
                  <span className="font-mono" style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
                    {g.total} models
                  </span>
                </div>
                <ul className="space-y-1">
                  {g.sample.map(m => (
                    <li key={m} className="font-mono truncate" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
                      {m}
                    </li>
                  ))}
                  {g.layer === 'gold' ? (
                    <li
                      className="font-mono truncate"
                      style={{
                        fontSize: 11, color: C.dbt, fontWeight: 700,
                        animation: 'regNewIn 1.6s ease-out 1',
                        background: `linear-gradient(90deg, ${C.dbt}26 0%, ${C.dbt}00 100%)`,
                        padding: '2px 4px', borderRadius: 2,
                      }}
                    >
                      + fct_retention_by_school_persona_term
                    </li>
                  ) : null}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
            Every column-level test, lineage edge, and ownership tag travels with the new model.
            Downstream consumers — IR dashboard, Board briefing feed, IPEDS submission — pick it up on next read.
          </p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        className="rounded-lg border border-[var(--hairline)] p-8"
        style={{ borderLeft: '5px solid var(--ivy)', background: 'rgba(22,101,52,0.03)' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8">
            <div className="eyebrow mb-2">Ready to run it</div>
            <h3 className="font-serif text-3xl font-semibold leading-tight text-[var(--ink-strong)]">
              90 seconds from Provost question to production gold table.
            </h3>
            <p className="mt-3 text-base text-[var(--ink-muted)] leading-relaxed">
              Start at the scenario page to see the full framing — the gap, the upstream models,
              the Board of Trustees deadline. Then step into the live build to watch four sub-agents
              write, test, and materialize the model in real time.
            </p>
          </div>
          <div className="md:col-span-4 flex flex-col gap-3">
            <Link
              to="/dbt-wizard/scenario"
              className="inline-flex items-center justify-center gap-2 rounded-md text-white font-semibold px-6 py-3 hover:opacity-95 transition-opacity"
              style={{ background: 'var(--ivy-deep)' }}
            >
              Start the scenario
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              to="/dbt-wizard/outcome"
              className="inline-flex items-center justify-center gap-2 rounded-md font-semibold px-6 py-3 hover:opacity-90 transition-opacity border"
              style={{ color: 'var(--ivy-deep)', borderColor: 'var(--ivy)', background: 'rgba(22,101,52,0.06)' }}
            >
              See the outcome
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes regNewIn {
          0%   { transform: translateX(-8px); opacity: 0; }
          100% { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function PipelineFragment({ stage, isLast, idx }: { stage: typeof PIPELINE_STAGES[0]; isLast: boolean; idx: number }) {
  return (
    <>
      <div className="md:col-span-1">
        <div
          className="research-card p-3 flex flex-col gap-2 h-full hover:-translate-y-0.5 transition-transform"
          style={{ borderTop: `3px solid ${stage.color}` }}
        >
          <div className="flex items-center gap-2">
            <div
              className="shrink-0 rounded flex items-center justify-center font-mono font-bold"
              style={{ width: 30, height: 30, color: stage.color, background: `${stage.color}1a`, border: `1px solid ${stage.color}44`, fontSize: 12 }}
            >
              {stage.icon}
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{stage.layer}</div>
              <div className="font-serif font-semibold text-[12px] leading-tight truncate text-[var(--ink-strong)]">{stage.vendor}</div>
            </div>
          </div>
          <div className="font-mono text-[10px] leading-snug text-[var(--ink-muted)] mt-auto">{stage.stat}</div>
        </div>
      </div>
      {!isLast && (
        <div className="md:col-span-1 hidden md:flex items-center justify-center" aria-hidden>
          <div className="relative w-full h-7 flex items-center">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px"
              style={{ background: `linear-gradient(90deg, ${C.ivy}00, ${C.ivy}77, ${C.ivy}00)` }} />
            <span
              className="wiz-particle absolute top-1/2 -translate-y-1/2"
              style={{
                display: 'block', width: 6, height: 6, borderRadius: 9999, left: 0,
                background: `linear-gradient(180deg, #86efac 0%, ${C.ivy} 100%)`,
                boxShadow: `0 0 8px ${C.ivy}cc`,
                animation: `wizParticle 2.6s ease-in-out infinite`,
                animationDelay: `${idx * 0.45}s`,
              }}
            />
          </div>
        </div>
      )}
      <style>{`
        @keyframes wizParticle {
          0%   { left: 0;    opacity: 0; }
          12%  {              opacity: 1; }
          88%  {              opacity: 1; }
          100% { left: calc(100% - 6px); opacity: 0; }
        }
      `}</style>
    </>
  );
}

import { useEffect, useRef, useState } from 'react';

const FRAMES = [
  { agent: 'EXPLORER',     color: C.ivy,    line1: 'dbt search "retention first-gen STEM"', line2: 'found 4 silver candidates' },
  { agent: 'WORKER',       color: C.rose,   line1: 'authoring fct_retention_by_school_….sql', line2: 'dbt_show ran on XS warehouse' },
  { agent: 'VERIFICATION', color: C.bronze, line1: 'dbt test --select +new',                   line2: '9 tests passed · materialized' },
];

function LiveBuildThumbnail() {
  const [i, setI] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    timer.current = window.setInterval(() => {
      setI((x) => (x + 1) % FRAMES.length);
    }, 2200);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const f = FRAMES[i];
  return (
    <div
      aria-hidden
      style={{
        background: '#0a1a0e',
        border: `1px solid ${C.ivy}55`,
        borderRadius: 6,
        padding: '14px 16px',
        fontFamily: '"JetBrains Mono", monospace',
        color: '#e6f0e8',
        minHeight: 92,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: 999,
            background: f.color, animation: 'signal-pulse 1.6s ease-in-out infinite',
          }}
        />
        <span style={{ color: f.color, fontWeight: 700, fontSize: 11, letterSpacing: '0.16em' }}>{f.agent}</span>
        <span style={{ color: '#5a7a5e', fontSize: 11, marginLeft: 'auto' }}>
          {i + 1}/{FRAMES.length}
        </span>
      </div>
      <div style={{ fontSize: 13, color: '#9cb3a2' }}>$ {f.line1}</div>
      <div style={{ fontSize: 13, color: '#cbe0d3', marginTop: 2 }}>&#x21B3; {f.line2}</div>
      <style>{`
        @keyframes signal-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.28; }
        }
      `}</style>
    </div>
  );
}
