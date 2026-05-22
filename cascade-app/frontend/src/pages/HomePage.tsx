import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatBytes, formatCurrencyShort, formatNumber, formatPercent } from '../api/queries';
import Sparkline from '../components/Sparkline';

export default function HomePage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [success, setSuccess] = useState<any>(null);
  const [research, setResearch] = useState<any>(null);

  useEffect(() => {
    api.getSummary().then(setSummary).catch(() => {});
    api.getEnrollment().then(setEnrollment).catch(() => {});
    api.getSuccess().then(setSuccess).catch(() => {});
    api.getResearch().then(setResearch).catch(() => {});
  }, []);

  const k = summary?.kpis;
  const lake = summary?.lake;
  const yoy = enrollment?.year_over_year ?? [];
  const yieldSpark = yoy.map((y: any) => y.yield_pct);
  const meltSpark = yoy.map((y: any) => y.melt_pct);
  const retentionSpark = (success?.retention?.trend_first_to_second_5yr ?? []).map((y: any) => y.pct);

  return (
    <>
      {/* Hero, ivy with bronze accent rule */}
      <section className="bg-[var(--ivy-deep)] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" aria-hidden style={{
          backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 28px, rgba(146,64,14,0.5) 28px 29px)',
        }} />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-7">
              <div className="eyebrow-light mb-4">Cascade University, Open Data Infrastructure</div>
              <h1 className="font-serif text-5xl sm:text-7xl font-semibold text-white leading-[0.95] tracking-tight">
                One transcript.<br />
                <span className="text-[#fbd98f] italic">Every system.</span><br />
                <span className="tracking-wider">Every agent.</span>
              </h1>
              <p className="mt-6 text-base sm:text-lg text-white/80 max-w-2xl leading-relaxed font-body-serif">
                Banner. Workday. Salesforce. Canvas. Slate. Cayuse. Six systems of record that the
                modern university tried to stitch together with nightly extracts and a fragile
                warehouse. ODI lands them once, in open Iceberg tables on a Snowflake-governed
                lake, and lets every dashboard, agent, and federal report read the same row.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/enrollment')}
                  className="inline-flex items-center gap-2 rounded-sm font-semibold text-sm text-white px-5 py-3 shadow-lg hover:opacity-95 transition-opacity"
                  style={{ background: 'var(--bronze)' }}
                >
                  Open the enrollment desk <span aria-hidden>→</span>
                </button>
                <button
                  onClick={() => navigate('/architecture')}
                  className="inline-flex items-center gap-2 rounded-sm font-semibold text-sm text-white bg-white/5 border border-white/20 px-5 py-3 hover:bg-white/10 transition-colors"
                >
                  See the ODI architecture <span aria-hidden>→</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-white text-[var(--ink)] rounded-sm border border-[var(--hairline)] shadow-xl overflow-hidden border-l-4" style={{ borderLeftColor: 'var(--ivy-deep)' }}>
                <div className="px-5 py-3 border-b border-[var(--hairline)] flex items-center justify-between bg-[var(--paper-deep)]">
                  <div className="eyebrow">Lake Snapshot</div>
                  <div className="text-[10px] font-semibold text-[var(--ink-soft)] uppercase tracking-wider">Snowflake, Iceberg</div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-y divide-[var(--hairline-soft)] tabular">
                  <Stat label="Students" value={k ? formatNumber(k.total_students) : '—'} hint="undergrad + grad" />
                  <Stat label="Faculty" value={k ? formatNumber(k.faculty_ft) : '—'} hint="full-time" />
                  <Stat
                    label="Retention"
                    value={k ? formatPercent(k.retention_first_to_second) : '—'}
                    hint="first to second year"
                    sparkValues={retentionSpark}
                    sparkStroke="var(--ivy)"
                  />
                  <Stat
                    label="R&D Expenditures"
                    value={k ? formatCurrencyShort(k.rd_expenditures_usd) : '—'}
                    hint="HERD survey eligible"
                  />
                  <Stat label="Six-year graduation" value={k ? formatPercent(k.six_year_graduation) : '—'} hint="federal IPEDS def." />
                  <Stat label="Alumni giving" value={k ? formatPercent(k.alumni_giving_rate_pct) : '—'} hint={`${formatNumber(k?.alumni_living ?? 0)} living`} />
                </div>
                <div className="px-5 py-3 border-t border-[var(--hairline)] flex items-center justify-between text-[11px] text-[var(--ink-soft)] bg-[var(--paper-deep)]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--good)] animate-pulse" />
                    {lake ? formatBytes(lake.s3_bytes) : '—'} in S3, {lake?.iceberg_table_count ?? '—'} Iceberg tables
                  </span>
                  <button onClick={() => navigate('/pipeline')} className="font-semibold hover:text-[var(--ink-strong)] uppercase tracking-wider">
                    Inspect →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three issues on the cabinet's desk this morning */}
      <section className="mx-auto max-w-7xl px-4 pt-12 pb-2 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between border-b border-[var(--hairline)] pb-3">
          <div>
            <div className="eyebrow mb-1">Cabinet Briefing</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink-strong)] tracking-tight">
              Three issues on the President's desk today
            </h2>
            <p className="text-sm text-[var(--ink-muted)] mt-1 font-body-serif">
              Surfaced from the gold layer at 06:14, refreshed every 15 minutes from Banner, Slate, Canvas, and Cayuse.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <IssueCard
            tone="garnet"
            tag="Enrollment, urgent"
            headline="Melt up 150 bps year-over-year"
            body={`Deposit-to-enroll melt is ${formatPercent(enrollment?.funnel?.melt_rate_pct)} vs. ${formatPercent(enrollment?.funnel?.melt_rate_prior_pct)} last cycle. Yield prediction agent flagged ${formatNumber(enrollment?.agent_recommendation?.outreach_queue)} admitted students with high recovery probability if contacted in 14 days.`}
            cta="Open enrollment desk"
            onClick={() => navigate('/enrollment')}
            spark={meltSpark}
            sparkColor="var(--garnet)"
          />
          <IssueCard
            tone="amber"
            tag="Student success, action this week"
            headline="1,204 students flagged for advising"
            body={`Advising outreach agent identified ${formatNumber(success?.at_risk?.total_flagged)} students with two or more early-alert signals, ${formatNumber(success?.at_risk?.newly_flagged_this_week)} newly flagged in the last seven days. CHEM 121 DFW rate above 28%.`}
            cta="Open student success"
            onClick={() => navigate('/success')}
          />
          <IssueCard
            tone="ivy"
            tag="Research, deadlines"
            headline="3 federal proposals due Friday"
            body={`${formatNumber(research?.grants?.deadlines_this_week)} deadlines this week, ${formatNumber(research?.grants?.due_friday_critical)} critical NIH and NSF submissions due Friday. F&A recovery rate ${formatPercent(research?.grants?.fa_recovery_rate_pct)}, ${formatCurrencyShort(research?.grants?.fa_recovery_ytd_usd)} YTD.`}
            cta="Open research"
            onClick={() => navigate('/research')}
          />
        </div>
      </section>

      {/* Yield trend pull-quote */}
      <section className="bg-[var(--paper)] border-y border-[var(--hairline)] mt-10">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <div className="eyebrow mb-2">The Question Behind The Question</div>
              <h2 className="font-serif text-4xl font-semibold text-[var(--ink-strong)] tracking-tight">
                Why is yield down 130 bps?
              </h2>
              <p className="mt-3 text-[var(--ink-muted)] leading-relaxed font-body-serif text-lg">
                Answering it used to mean a four-week project. Slate had the application
                signal. Banner had the deposit. Canvas had the orientation engagement. The
                financial aid system had the package. Each lived in its own warehouse with
                its own owner and its own definition of "student."
              </p>
              <p className="mt-4 text-[var(--ink-muted)] leading-relaxed font-body-serif text-lg">
                ODI joins them on the lake. One <span className="mono text-sm">student_id</span>{' '}
                surrogate spans Slate, Banner, Canvas, and Workday. Yield drops are decomposable in
                minutes, not weeks.
              </p>
            </div>
            <div className="lg:col-span-7">
              <div className="research-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="eyebrow">Yield rate, 5-year trend</div>
                  <span className="status-pill garnet">Below target</span>
                </div>
                <div className="h-44 mb-4">
                  <Sparkline values={yieldSpark.length ? yieldSpark : [0,0]} width={600} height={170} stroke="var(--ivy-deep)" fill="var(--ivy-deep)" strokeWidth={2.5} className="w-full h-full" />
                </div>
                <div className="grid grid-cols-5 gap-2 text-center">
                  {yoy.map((y: any) => (
                    <div key={y.cycle} className="border-t border-[var(--hairline-soft)] pt-2">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)]">{y.cycle.replace('Fall ','')}</div>
                      <div className="font-serif text-xl font-semibold text-[var(--ink-strong)] tabular">{y.yield_pct.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Provenance strip */}
      <section className="bg-white border-y border-[var(--hairline)]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <div className="eyebrow mb-2">Provenance</div>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink-strong)] tracking-tight">
              Six systems. One lake. Every chart traces back.
            </h2>
          </div>
          <ol className="grid grid-cols-1 md:grid-cols-5 gap-3 sm:gap-4">
            {[
              { tag: '01', label: 'Systems of record', desc: 'Banner SIS, Workday HCM + Financials, Salesforce Education Cloud, Canvas LMS, Slate, Cayuse RIS.', accent: 'bronze' as const },
              { tag: '02', label: 'Ingest',  desc: 'Fivetran lands every source into bronze Iceberg tables on S3, governed by Snowflake Polaris.', accent: 'bronze' as const },
              { tag: '03', label: 'Conform', desc: 'dbt builds silver conformed entities, one student, one course, one gift, one grant.',            accent: 'silver' as const },
              { tag: '04', label: 'Serve',   desc: 'gold marts power CIO, VP Enrollment, VP Research, and Advancement dashboards.',                  accent: 'gold' as const },
              { tag: '05', label: 'Reason',  desc: 'Snowflake Cortex agents read gold tables for yield prediction, advising outreach, donor scoring.', accent: 'gold' as const },
            ].map((s) => (
              <li key={s.tag} className="research-card p-4 hover:border-[var(--bronze)] transition-colors">
                <div className="text-[10px] font-mono font-bold text-[var(--bronze)] tracking-wider">{s.tag}</div>
                <div className="mt-1 font-serif text-lg font-semibold text-[var(--ink-strong)]">{s.label}</div>
                <p className="mt-2 text-xs text-[var(--ink-muted)] leading-relaxed">{s.desc}</p>
                <div className="mt-3"><span className={`layer-chip ${s.accent}`}>{s.accent}</span></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <hr className="rule-ornament" />

      <section className="bg-[var(--ivy-deep)] text-white border-t border-[var(--hairline)]">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 text-center">
          <div className="eyebrow-light mb-3">Design Principles</div>
          <p className="font-serif text-3xl sm:text-4xl text-white leading-snug italic">
            "Higher education's data is fragmented by org chart,<br />
            not by physics. <span className="text-[#fbd98f]">ODI fixes the org chart problem.</span>"
          </p>
          <p className="mt-6 text-sm text-white/70 max-w-2xl mx-auto font-body-serif">
            Cascade University chose ODI because Banner, Workday, Salesforce, Canvas, Slate, and Cayuse
            were never going to merge, and the AI agents the cabinet is being asked to deploy demand
            governed access to all six.
          </p>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, hint, sparkValues, sparkStroke }: { label: string; value: string; hint: string; sparkValues?: number[]; sparkStroke?: string }) {
  return (
    <div className="px-5 py-4">
      <div className="text-[10.5px] font-semibold text-[var(--ink-soft)] uppercase tracking-[0.08em]">{label}</div>
      <div className="mt-1 font-serif text-2xl font-semibold text-[var(--ink-strong)] leading-none tabular">{value}</div>
      {sparkValues && sparkValues.length >= 2 && (
        <div className="mt-1.5">
          <Sparkline values={sparkValues} width={100} height={18} stroke={sparkStroke ?? 'var(--bronze)'} fill="none" strokeWidth={1.25} />
        </div>
      )}
      <div className="mt-1 text-[11px] text-[var(--ink-soft)]">{hint}</div>
    </div>
  );
}

function IssueCard({
  tone, tag, headline, body, cta, onClick, spark, sparkColor,
}: { tone: 'garnet'|'amber'|'ivy'; tag: string; headline: string; body: string; cta: string; onClick: () => void; spark?: number[]; sparkColor?: string }) {
  const border = tone === 'garnet' ? 'var(--garnet)' : tone === 'amber' ? 'var(--amber)' : 'var(--ivy)';
  return (
    <button onClick={onClick} className="text-left research-card p-5 hover:border-[var(--bronze)] transition-colors flex flex-col" style={{ borderTop: `3px solid ${border}` }}>
      <span className={`status-pill ${tone} self-start mb-3`}>{tag}</span>
      <h3 className="font-serif text-xl font-semibold text-[var(--ink-strong)] leading-tight">{headline}</h3>
      <p className="mt-3 text-sm text-[var(--ink-muted)] leading-relaxed flex-1">{body}</p>
      {spark && spark.length > 1 && (
        <div className="mt-3"><Sparkline values={spark} width={240} height={28} stroke={sparkColor ?? border} fill={sparkColor ?? border} strokeWidth={1.5} className="w-full" /></div>
      )}
      <div className="mt-4 text-xs font-semibold text-[var(--bronze)] uppercase tracking-wider">{cta} →</div>
    </button>
  );
}
