import { useEffect, useState } from 'react';
import { api, formatCurrencyShort, formatNumber, formatPercent } from '../api/queries';

export default function ResearchPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.getResearch().then(setData).catch(() => {}); }, []);
  if (!data) return <div className="mx-auto max-w-7xl px-4 py-12"><div className="research-card h-64 animate-pulse" /></div>;

  const g = data.grants;
  const maxAgency = Math.max(...data.by_agency.map((a: any) => a.awards_usd));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8 border-b border-[var(--hairline)] pb-6">
        <div className="eyebrow mb-1">Office of Research, {data.fiscal_year}</div>
        <h1 className="font-serif text-5xl font-semibold text-[var(--ink-strong)] tracking-tight">$312.7M in awards, $71.4M in F&A</h1>
        <p className="mt-3 text-[var(--ink-muted)] font-body-serif text-lg max-w-3xl">
          Proposal-to-award flow tracked from Cayuse, joined to Workday for personnel,
          surfaced as a single dashboard for the VP for Research.
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <KPI label="Awards YTD" value={formatCurrencyShort(g.awards_ytd_usd)} sub={`${formatNumber(g.awards_ytd_count)} awards`} tone="good" />
        <KPI label="Proposals submitted" value={formatNumber(g.proposals_submitted_ytd)} sub={`${formatNumber(g.proposals_pending)} pending`} />
        <KPI label="Success rate" value={formatPercent(g.success_rate_pct)} sub="awards / decisions" />
        <KPI label="F&A recovery" value={formatCurrencyShort(g.fa_recovery_ytd_usd)} sub={`${formatPercent(g.fa_recovery_rate_pct)} rate`} tone="good" />
      </section>

      {/* Critical deadlines callout */}
      <section className="mb-12">
        <div className="research-card p-6 flex items-start gap-4" style={{ borderColor: 'var(--garnet)', borderLeftWidth: 4 }}>
          <span className="status-pill garnet shrink-0">Action this week</span>
          <div>
            <h3 className="font-serif text-xl font-semibold text-[var(--ink-strong)]">
              {g.due_friday_critical} federal proposals due Friday, {g.deadlines_this_week} total deadlines this week
            </h3>
            <p className="text-sm text-[var(--ink-muted)] mt-1">
              NIH R01 renewal, NSF CAREER, DOE Early Career. Surface pulled from Cayuse on a five-minute Fivetran sync.
            </p>
          </div>
        </div>
      </section>

      {/* By agency */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-4 border-b border-[var(--hairline)] pb-2">Awards by federal agency</h2>
        <div className="research-card p-6 space-y-3">
          {data.by_agency.map((a: any) => (
            <div key={a.agency} className="grid grid-cols-12 items-center gap-3">
              <div className="col-span-3 font-serif text-lg font-semibold text-[var(--ink-strong)]">{a.agency}</div>
              <div className="col-span-5 h-6 bg-[var(--paper-deep)] rounded-sm overflow-hidden">
                <div className="h-full" style={{ width: `${(a.awards_usd / maxAgency) * 100}%`, background: 'var(--ivy)' }} />
              </div>
              <div className="col-span-2 text-right">
                <div className="font-serif text-lg font-semibold text-[var(--ink-strong)] tabular">{formatCurrencyShort(a.awards_usd)}</div>
              </div>
              <div className="col-span-1 text-right tabular text-sm">{formatPercent(a.success_pct)}</div>
              <div className="col-span-1 text-right tabular text-sm text-[var(--ink-soft)]">{formatCurrencyShort(a.avg_award_usd)}</div>
            </div>
          ))}
          <div className="grid grid-cols-12 gap-3 pt-3 border-t border-[var(--hairline)] text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
            <div className="col-span-3">Agency</div>
            <div className="col-span-5">Awards YTD</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-1 text-right">Success</div>
            <div className="col-span-1 text-right">Avg award</div>
          </div>
        </div>
      </section>

      {/* Top PIs */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-4 border-b border-[var(--hairline)] pb-2">Top principal investigators</h2>
        <div className="research-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--paper-deep)] text-left">
              <tr><Th>Rank</Th><Th>PI</Th><Th>Department</Th><Th>Awards YTD</Th><Th>Proposals</Th><Th>Active</Th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--hairline-soft)]">
              {data.top_pis.map((p: any, i: number) => (
                <tr key={p.pi} className="hover:bg-[var(--paper-deep)]/40">
                  <td className="px-4 py-3 mono text-[var(--ink-soft)]">{String(i+1).padStart(2,'0')}</td>
                  <td className="px-4 py-3 font-serif text-base font-semibold text-[var(--ink-strong)]">{p.pi}</td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">{p.department}</td>
                  <td className="px-4 py-3 tabular font-semibold">{formatCurrencyShort(p.awards_usd)}</td>
                  <td className="px-4 py-3 tabular">{p.proposals}</td>
                  <td className="px-4 py-3 tabular">{p.active_grants}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KPI({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' }) {
  const color = tone === 'good' ? 'var(--good)' : 'var(--ink-strong)';
  return (
    <div className="research-card px-5 py-4">
      <div className="text-[10.5px] font-semibold text-[var(--ink-soft)] uppercase tracking-[0.08em]">{label}</div>
      <div className="mt-1 font-serif text-3xl font-semibold leading-none tabular" style={{ color }}>{value}</div>
      {sub && <div className="mt-1.5 text-[11px] text-[var(--ink-soft)]">{sub}</div>}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold border-b border-[var(--hairline)]">{children}</th>;
}
