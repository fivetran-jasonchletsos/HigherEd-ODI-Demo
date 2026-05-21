import { useEffect, useState } from 'react';
import { api, formatCurrencyShort, formatNumber, formatPercent } from '../api/queries';

export default function EnrollmentPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.getEnrollment().then(setData).catch(() => {}); }, []);
  if (!data) return <Loading />;

  const f = data.funnel;
  const funnel = [
    { stage: 'Applications received',  count: f.applications_received,  pct: 100 },
    { stage: 'Applications completed', count: f.applications_completed, pct: (f.applications_completed/f.applications_received)*100 },
    { stage: 'Admitted',               count: f.admitted,               pct: (f.admitted/f.applications_received)*100 },
    { stage: 'Deposits',               count: f.deposits,               pct: (f.deposits/f.applications_received)*100 },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8 border-b border-[var(--hairline)] pb-6">
        <div className="eyebrow mb-1">Enrollment Management, {data.cycle}</div>
        <h1 className="font-serif text-5xl font-semibold text-[var(--ink-strong)] tracking-tight">Yield, melt, and the 412-student window</h1>
        <p className="mt-3 text-[var(--ink-muted)] leading-relaxed font-body-serif text-lg max-w-3xl">
          Deposits are tracking {f.deposit_to_enroll_gap} below target with melt up {(f.melt_rate_pct - f.melt_rate_prior_pct).toFixed(1)} points
          year-over-year. The yield prediction agent has identified a recoverable cohort.
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <KPI label="Yield rate" value={formatPercent(f.yield_rate_pct)} sub={`Target ${formatPercent(f.yield_target_pct)}`} tone="garnet" />
        <KPI label="Melt rate" value={formatPercent(f.melt_rate_pct)} sub={`Prior ${formatPercent(f.melt_rate_prior_pct)}`} tone="garnet" />
        <KPI label="Deposits" value={formatNumber(f.deposits)} sub={`Target ${formatNumber(f.target_deposits)}`} tone="amber" />
        <KPI label="Admit rate" value={formatPercent(f.admit_rate_pct)} sub={`${formatNumber(f.admitted)} admitted`} tone="neutral" />
      </section>

      {/* Funnel */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-4 border-b border-[var(--hairline)] pb-2">Application funnel</h2>
        <div className="research-card p-6 space-y-3">
          {funnel.map((row, i) => (
            <div key={row.stage} className="grid grid-cols-12 items-center gap-4">
              <div className="col-span-4 text-sm font-semibold text-[var(--ink)]">{row.stage}</div>
              <div className="col-span-6 h-7 bg-[var(--paper-deep)] rounded-sm overflow-hidden relative">
                <div
                  className="h-full"
                  style={{
                    width: `${row.pct}%`,
                    background: i === funnel.length-1 ? 'var(--bronze)' : 'var(--ivy)',
                  }}
                />
              </div>
              <div className="col-span-2 text-right">
                <div className="font-serif text-lg font-semibold text-[var(--ink-strong)] tabular">{formatNumber(row.count)}</div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)]">{row.pct.toFixed(1)}%</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* By college */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-4 border-b border-[var(--hairline)] pb-2">Yield by college</h2>
        <div className="research-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--paper-deep)] text-left">
              <tr>
                <Th>College</Th><Th>Applications</Th><Th>Admitted</Th><Th>Deposits</Th><Th>Yield</Th><Th>Target</Th><Th>Median aid</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hairline-soft)]">
              {data.by_college.map((c: any) => {
                const variance = c.yield_pct - c.yield_target_pct;
                return (
                  <tr key={c.college} className="hover:bg-[var(--paper-deep)]/40">
                    <td className="px-4 py-3 font-semibold font-serif text-[var(--ink-strong)] text-base">{c.college}</td>
                    <td className="px-4 py-3 tabular">{formatNumber(c.applications)}</td>
                    <td className="px-4 py-3 tabular">{formatNumber(c.admitted)}</td>
                    <td className="px-4 py-3 tabular font-semibold">{formatNumber(c.deposits)}</td>
                    <td className="px-4 py-3 tabular">{formatPercent(c.yield_pct)}</td>
                    <td className="px-4 py-3 tabular text-[var(--ink-soft)]">{formatPercent(c.yield_target_pct)}</td>
                    <td className="px-4 py-3 tabular">
                      <span style={{ color: variance >= 0 ? 'var(--good)' : 'var(--garnet)' }}>
                        {formatCurrencyShort(c.median_aid_award)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Geographic */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-4 border-b border-[var(--hairline)] pb-2">Deposit mix, geography</h2>
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
          {data.geographic_mix.map((g: any) => (
            <div key={g.region} className="research-card p-4">
              <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">{g.region}</div>
              <div className="font-serif text-2xl font-semibold text-[var(--ink-strong)] tabular mt-1">{formatNumber(g.deposits)}</div>
              <div className="text-xs text-[var(--ink-muted)] mt-1">{g.pct.toFixed(1)}%</div>
              <div className="h-1.5 bg-[var(--paper-deep)] rounded-sm mt-2 overflow-hidden">
                <div className="h-full" style={{ width: `${g.pct*2}%`, background: 'var(--bronze)' }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Agent */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-4 border-b border-[var(--hairline)] pb-2">Yield Prediction Agent</h2>
        <div className="research-card p-6" style={{ borderColor: 'var(--bronze)', borderTopWidth: 3 }}>
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-0 max-w-3xl">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="status-pill bronze">{data.agent_recommendation.name}</span>
                <span className="mono text-xs text-[var(--ink-soft)]">{data.agent_recommendation.model}</span>
              </div>
              <h3 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mt-2">
                "Contact these 412 admits within 14 days, expected lift +96 deposits."
              </h3>
              <p className="mt-3 text-[var(--ink-muted)] leading-relaxed font-body-serif text-lg">
                {data.agent_recommendation.summary}
              </p>
              <p className="mt-3 text-xs text-[var(--ink-soft)]">
                Reads from <span className="mono">gold.fct_yield_prediction</span>, scored against five-cycle baseline, refreshed every six hours.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-[260px]">
              <Metric label="Outreach queue" value={formatNumber(data.agent_recommendation.outreach_queue)} />
              <Metric label="Expected lift" value={`+${formatNumber(data.agent_recommendation.expected_lift_deposits)}`} sub="deposits" tone="good" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function KPI({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good'|'garnet'|'amber'|'neutral' }) {
  const color = tone === 'good' ? 'var(--good)' : tone === 'garnet' ? 'var(--garnet)' : tone === 'amber' ? 'var(--amber)' : 'var(--ink-strong)';
  return (
    <div className="research-card px-5 py-4">
      <div className="text-[10.5px] font-semibold text-[var(--ink-soft)] uppercase tracking-[0.08em]">{label}</div>
      <div className="mt-1 font-serif text-3xl font-semibold leading-none tabular" style={{ color }}>{value}</div>
      {sub && <div className="mt-1.5 text-[11px] text-[var(--ink-soft)]">{sub}</div>}
    </div>
  );
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' }) {
  const color = tone === 'good' ? 'var(--good)' : 'var(--ink-strong)';
  return (
    <div className="px-4 py-3 bg-[var(--paper-deep)] rounded-sm">
      <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">{label}</div>
      <div className="font-serif text-2xl font-semibold tabular mt-1" style={{ color }}>{value}</div>
      {sub && <div className="text-[10px] text-[var(--ink-soft)]">{sub}</div>}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold border-b border-[var(--hairline)]">{children}</th>;
}

function Loading() {
  return <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><div className="research-card h-64 animate-pulse" /></div>;
}
