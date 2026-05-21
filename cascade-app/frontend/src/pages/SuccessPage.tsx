import { useEffect, useState } from 'react';
import { api, formatNumber, formatPercent } from '../api/queries';
import Sparkline from '../components/Sparkline';

export default function SuccessPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.getSuccess().then(setData).catch(() => {}); }, []);
  if (!data) return <div className="mx-auto max-w-7xl px-4 py-12"><div className="research-card h-64 animate-pulse" /></div>;

  const r = data.retention;
  const retentionTrend = r.trend_first_to_second_5yr.map((y: any) => y.pct);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8 border-b border-[var(--hairline)] pb-6">
        <div className="eyebrow mb-1">Office of Student Success</div>
        <h1 className="font-serif text-5xl font-semibold text-[var(--ink-strong)] tracking-tight">1,204 students need an advisor this week</h1>
        <p className="mt-3 text-[var(--ink-muted)] font-body-serif text-lg max-w-3xl">
          Early-alert signals from Banner grades, Canvas engagement, and faculty referrals,
          joined on the lake, scored nightly, surfaced to advisors before the next class meeting.
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <KPI label="First-to-second year" value={formatPercent(r.first_to_second_year_pct)} sub={`Target ${formatPercent(r.first_to_second_year_target_pct)}`} />
        <KPI label="Four-year graduation" value={formatPercent(r.four_year_graduation_pct)} />
        <KPI label="Six-year graduation" value={formatPercent(r.six_year_graduation_pct)} />
        <KPI label="Pell-eligible retention" value={formatPercent(r.pell_eligible_retention_pct)} sub="gap, 3.0 pts" tone="amber" />
      </section>

      {/* Retention trend */}
      <section className="mb-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="research-card p-6 lg:col-span-2">
          <div className="eyebrow mb-2">Retention, five-year trend</div>
          <h3 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-4">First-to-second year, undergraduate cohort</h3>
          <div className="h-40 mb-4">
            <Sparkline values={retentionTrend} width={700} height={160} stroke="var(--ivy-deep)" fill="var(--ivy-deep)" strokeWidth={2.5} className="w-full h-full" />
          </div>
          <div className="grid grid-cols-5 gap-2 text-center">
            {r.trend_first_to_second_5yr.map((y: any) => (
              <div key={y.year} className="border-t border-[var(--hairline-soft)] pt-2">
                <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)]">{y.year}</div>
                <div className="font-serif text-xl font-semibold text-[var(--ink-strong)] tabular">{formatPercent(y.pct)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="research-card p-6">
          <div className="eyebrow mb-2">Subgroup retention</div>
          <div className="space-y-3">
            <Row label="Transfer" value={formatPercent(r.transfer_retention_pct)} />
            <Row label="Underrepresented" value={formatPercent(r.underrepresented_retention_pct)} />
            <Row label="Pell-eligible" value={formatPercent(r.pell_eligible_retention_pct)} />
          </div>
        </div>
      </section>

      {/* DFW */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-4 border-b border-[var(--hairline)] pb-2">DFW rates, intro courses</h2>
        <p className="text-sm text-[var(--ink-muted)] mb-4 font-body-serif">D, F, or withdrawal rate by introductory section, trended over three terms. Driver of first-year attrition.</p>
        <div className="research-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--paper-deep)] text-left">
              <tr><Th>Course</Th><Th>Enrolled</Th><Th>DFW Rate</Th><Th>Trend</Th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--hairline-soft)]">
              {data.dfw_rates.map((c: any) => (
                <tr key={c.course} className="hover:bg-[var(--paper-deep)]/40">
                  <td className="px-4 py-3 font-semibold font-serif text-[var(--ink-strong)] text-base">{c.course}</td>
                  <td className="px-4 py-3 tabular">{formatNumber(c.enrolled)}</td>
                  <td className="px-4 py-3 tabular">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 bg-[var(--paper-deep)] rounded-sm overflow-hidden">
                        <div className="h-full" style={{ width: `${c.dfw_pct*2.5}%`, background: c.dfw_pct > 25 ? 'var(--garnet)' : c.dfw_pct > 18 ? 'var(--amber)' : 'var(--ivy)' }} />
                      </div>
                      <span className="font-semibold">{formatPercent(c.dfw_pct)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`status-pill ${c.trend === 'up' ? 'garnet' : c.trend === 'down' ? 'good' : 'neutral'}`}>{c.trend}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* At-risk */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-4 border-b border-[var(--hairline)] pb-2">At-risk roster</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {data.at_risk.by_risk_tier.map((t: any) => {
            const tone = t.tier.toLowerCase().startsWith('critical') ? 'garnet' : t.tier === 'High' ? 'amber' : 'neutral';
            return (
              <div key={t.tier} className="research-card p-5">
                <span className={`status-pill ${tone}`}>{t.tier}</span>
                <div className="font-serif text-5xl font-semibold text-[var(--ink-strong)] tabular mt-3">{formatNumber(t.count)}</div>
                <div className="text-xs text-[var(--ink-soft)] mt-1">students</div>
              </div>
            );
          })}
        </div>
        <div className="research-card p-6">
          <div className="eyebrow mb-3">Top drivers</div>
          <div className="space-y-3">
            {data.at_risk.by_driver.map((d: any) => (
              <div key={d.driver} className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-7 text-sm">{d.driver}</div>
                <div className="col-span-4 h-2 bg-[var(--paper-deep)] rounded-sm overflow-hidden">
                  <div className="h-full" style={{ width: `${(d.count/482)*100}%`, background: 'var(--bronze)' }} />
                </div>
                <div className="col-span-1 text-right font-semibold tabular text-sm">{formatNumber(d.count)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-4 border-b border-[var(--hairline)] pb-2">Advising Outreach Agent</h2>
        <div className="research-card p-6" style={{ borderColor: 'var(--bronze)', borderTopWidth: 3 }}>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="status-pill bronze">{data.agent_recommendation.name}</span>
            <span className="mono text-xs text-[var(--ink-soft)]">{data.agent_recommendation.model}</span>
          </div>
          <h3 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mt-2">
            "184 students, contact this week. Expected persistence lift +18.4%."
          </h3>
          <p className="mt-3 text-[var(--ink-muted)] leading-relaxed font-body-serif text-lg max-w-4xl">
            {data.agent_recommendation.summary}
          </p>
          <p className="mt-3 text-xs text-[var(--ink-soft)]">
            Reads from <span className="mono">gold.fct_at_risk_students</span>, joined to Canvas engagement
            and faculty early-alert signals, refreshed every six hours.
          </p>
        </div>
      </section>
    </div>
  );
}

function KPI({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good'|'amber'|'garnet' }) {
  const color = tone === 'good' ? 'var(--good)' : tone === 'amber' ? 'var(--amber)' : tone === 'garnet' ? 'var(--garnet)' : 'var(--ink-strong)';
  return (
    <div className="research-card px-5 py-4">
      <div className="text-[10.5px] font-semibold text-[var(--ink-soft)] uppercase tracking-[0.08em]">{label}</div>
      <div className="mt-1 font-serif text-3xl font-semibold leading-none tabular" style={{ color }}>{value}</div>
      {sub && <div className="mt-1.5 text-[11px] text-[var(--ink-soft)]">{sub}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--hairline-soft)] last:border-0 pb-2">
      <div className="text-sm text-[var(--ink-muted)]">{label}</div>
      <div className="font-serif font-semibold text-[var(--ink-strong)] tabular">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold border-b border-[var(--hairline)]">{children}</th>;
}
