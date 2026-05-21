import { useEffect, useState } from 'react';
import { api, formatBytes, formatNumber } from '../api/queries';

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState<any>(null);
  const [iceberg, setIceberg] = useState<any>(null);
  const [simEnabled, setSimEnabled] = useState(true);

  useEffect(() => {
    api.getPipeline().then((p) => { setPipeline(p); setSimEnabled(p?.failure_simulator?.enabled ?? false); }).catch(() => {});
    api.getIceberg().then(setIceberg).catch(() => {});
  }, []);

  if (!pipeline) return <div className="mx-auto max-w-7xl px-4 py-12"><div className="research-card h-64 animate-pulse" /></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8 border-b border-[var(--hairline)] pb-6">
        <div className="eyebrow mb-1">Operations</div>
        <h1 className="font-serif text-5xl font-semibold text-[var(--ink-strong)] tracking-tight">Pipeline observability</h1>
        <p className="mt-3 text-[var(--ink-muted)] font-body-serif text-lg max-w-3xl">
          Seven connectors, three dbt layers, one lake. Pulled directly from the lineage label "Fivetran" in the
          governance catalog.
        </p>
      </header>

      {/* Connectors */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-4 border-b border-[var(--hairline)] pb-2">Connectors</h2>
        <div className="research-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--paper-deep)] text-left">
              <tr><Th>Source</Th><Th>Type</Th><Th>Status</Th><Th>Rows / 24h</Th><Th>Lag (sec)</Th><Th>Last sync</Th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--hairline-soft)]">
              {pipeline.connectors.map((c: any) => (
                <tr key={c.name} className="hover:bg-[var(--paper-deep)]/40">
                  <td className="px-4 py-3 font-serif text-base font-semibold text-[var(--ink-strong)]">{c.name}</td>
                  <td className="px-4 py-3 text-[var(--ink-muted)] text-xs">{c.type}</td>
                  <td className="px-4 py-3">
                    <span className={`status-pill ${c.status === 'healthy' ? 'good' : c.status === 'warning' ? 'amber' : 'garnet'}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 tabular">{formatNumber(c.rows_24h)}</td>
                  <td className="px-4 py-3 tabular">{formatNumber(c.lag_seconds)}</td>
                  <td className="px-4 py-3 text-xs text-[var(--ink-soft)] mono">{new Date(c.last_sync).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Layers */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-4 border-b border-[var(--hairline)] pb-2">dbt layers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pipeline.layers.map((l: any) => (
            <div key={l.layer} className="research-card p-5">
              <span className={`layer-chip ${l.layer}`}>{l.layer}</span>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Stat label="Tables"  value={formatNumber(l.tables)} />
                <Stat label="Models"  value={formatNumber(l.models)} />
                <Stat label="Rows"    value={formatNumber(l.rows)} />
                <Stat label="Bytes"   value={formatBytes(l.bytes)} />
              </div>
              <p className="text-xs text-[var(--ink-muted)] mt-3 leading-relaxed">{l.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Last 24h runs */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-4 border-b border-[var(--hairline)] pb-2">Last 24 hours of dbt runs</h2>
        <div className="research-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--paper-deep)] text-left">
              <tr><Th>Model</Th><Th>Status</Th><Th>Rows</Th><Th>Duration</Th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--hairline-soft)]">
              {pipeline.dbt_runs_last_24h.map((r: any) => (
                <tr key={r.model}>
                  <td className="px-4 py-3 mono text-[var(--ink-strong)]">{r.model}</td>
                  <td className="px-4 py-3"><span className={`status-pill ${r.status === 'pass' ? 'good' : 'garnet'}`}>{r.status}</span></td>
                  <td className="px-4 py-3 tabular">{formatNumber(r.rows)}</td>
                  <td className="px-4 py-3 tabular">{r.duration_s}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Failure simulator */}
      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-4 border-b border-[var(--hairline)] pb-2">Failure simulator</h2>
        <div className="research-card p-6" style={{ borderColor: simEnabled ? 'var(--amber)' : 'var(--hairline)', borderLeftWidth: 4 }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[280px]">
              <span className={`status-pill ${simEnabled ? 'amber' : 'neutral'}`}>{simEnabled ? 'Active scenario' : 'Disabled'}</span>
              <h3 className="font-serif text-xl font-semibold text-[var(--ink-strong)] mt-2">{pipeline.failure_simulator.scenario}</h3>
              <p className="text-sm text-[var(--ink-muted)] mt-2"><strong>Impact:</strong> {pipeline.failure_simulator.impact}</p>
              <p className="text-sm text-[var(--ink-muted)] mt-1"><strong>Auto-remediation:</strong> {pipeline.failure_simulator.auto_remediation}</p>
            </div>
            <button
              onClick={() => setSimEnabled((s) => !s)}
              className="rounded-sm border border-[var(--bronze)] text-[var(--bronze)] font-semibold text-xs uppercase tracking-wider px-4 py-2 hover:bg-[var(--bronze-bg)]"
            >
              {simEnabled ? 'Acknowledge' : 'Re-enable'}
            </button>
          </div>
        </div>
      </section>

      {/* Iceberg tables */}
      {iceberg && (
        <section className="mb-12">
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-4 border-b border-[var(--hairline)] pb-2">Iceberg tables, lake catalog</h2>
          <p className="text-sm text-[var(--ink-muted)] mb-4 font-body-serif">
            Lake at <span className="mono">{iceberg.lake_location}</span>, catalog {iceberg.catalog}, default warehouse {iceberg.warehouse}.
          </p>
          <div className="research-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[var(--paper-deep)] text-left">
                <tr><Th>Schema</Th><Th>Table</Th><Th>Rows</Th><Th>Bytes</Th><Th>Partition</Th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--hairline-soft)]">
                {iceberg.tables.map((t: any) => (
                  <tr key={`${t.schema}.${t.table}`} className="hover:bg-[var(--paper-deep)]/40">
                    <td className="px-4 py-2"><span className={`layer-chip ${t.schema === 'gold' ? 'gold' : t.schema === 'silver' ? 'silver' : 'bronze'}`}>{t.schema}</span></td>
                    <td className="px-4 py-2 mono text-[var(--ink-strong)]">{t.table}</td>
                    <td className="px-4 py-2 tabular">{formatNumber(t.rows)}</td>
                    <td className="px-4 py-2 tabular">{formatBytes(t.bytes)}</td>
                    <td className="px-4 py-2 mono text-[var(--ink-soft)]">{t.partition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">{label}</div>
      <div className="font-serif text-lg font-semibold text-[var(--ink-strong)] tabular">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold border-b border-[var(--hairline)]">{children}</th>;
}
