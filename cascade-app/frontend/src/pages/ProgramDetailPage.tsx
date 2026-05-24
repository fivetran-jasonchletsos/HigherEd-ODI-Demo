import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  relatedFor,
  setPrograms,
  clusterColor,
  CLUSTER_LABEL,
  CIP2_LABEL,
  type Program,
  type RelatedProgram,
} from '../lib/related';
import { api, formatPercent } from '../api/queries';

export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [programs, setPrograms_] = useState<Program[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.getPrograms().then((data: { programs: Program[] }) => {
      setPrograms(data.programs);
      setPrograms_(data.programs);
      setLoaded(true);
    }).catch(() => {});
  }, []);

  if (!loaded) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="research-card h-64 animate-pulse" />
      </div>
    );
  }

  const program = programs.find(p => p.id === id);
  if (!program) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-[var(--ink-muted)]">Program not found.</p>
        <button
          onClick={() => navigate('/programs')}
          className="mt-4 text-sm text-[var(--bronze)] hover:underline"
        >
          Back to programs
        </button>
      </div>
    );
  }

  const related: RelatedProgram[] = relatedFor(program.id);
  const cip2 = program.cip.split('.')[0] ?? '';
  const fieldLabel = CIP2_LABEL[cip2] ?? `CIP ${cip2}`;
  const clusterLabel = CLUSTER_LABEL[program.discipline_cluster] ?? program.discipline_cluster;
  const accentColor = clusterColor(program.discipline_cluster);

  const persistenceColor =
    program.persistence_tier === 'high'   ? 'var(--good)'   :
    program.persistence_tier === 'low'    ? 'var(--garnet)' :
    'var(--amber)';

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-[11px] uppercase tracking-[0.22em] text-[var(--ink-soft)] flex items-center gap-2">
        <Link to="/programs" className="hover:text-[var(--bronze)] transition-colors">
          Programs
        </Link>
        <span>/</span>
        <span className="text-[var(--ink-muted)]">{program.name}</span>
      </nav>

      {/* Header */}
      <header className="mb-8 border-b border-[var(--hairline)] pb-6">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: accentColor }}
          />
          <div className="eyebrow">{program.school}</div>
        </div>
        <h1 className="font-serif text-5xl font-semibold text-[var(--ink-strong)] tracking-tight leading-tight">
          {program.name}
        </h1>
        <p className="mt-3 text-[var(--ink-muted)] font-body-serif text-lg max-w-3xl">
          {program.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="status-pill neutral">{program.degree}</span>
          <span
            className="status-pill"
            style={{ background: `${accentColor}18`, color: accentColor, borderColor: `${accentColor}40` }}
          >
            {clusterLabel}
          </span>
          <span className={`status-pill ${program.persistence_tier === 'high' ? 'good' : program.persistence_tier === 'low' ? 'garnet' : 'amber'}`}>
            {program.persistence_tier} persistence
          </span>
        </div>
      </header>

      {/* KPI row */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <KPI label="Enrollment" value={program.enrollment.toLocaleString()} sub={program.enrollment_band + ' band'} />
        <KPI label="Retention" value={formatPercent(program.retention_pct)} sub="first-to-second year" color={persistenceColor} />
        <KPI label="Field" value={fieldLabel} sub={`CIP ${program.cip}`} small />
        <KPI label="Degree level" value={program.degree} sub={program.school} />
      </section>

      <hr className="rule-ornament" />

      {/* Related Programs panel */}
      <section className="mb-12">
        <div className="mb-5 flex items-end justify-between border-b border-[var(--hairline)] pb-3">
          <div>
            <div className="eyebrow mb-1">Snowflake reading the gold layer, similarity scoring</div>
            <h2 className="font-serif text-3xl font-semibold text-[var(--ink-strong)] tracking-tight">
              Related programs
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)] font-body-serif">
              Top 8 nearest neighbors weighted by discipline cluster, school, degree level, and persistence profile.
            </p>
          </div>
          <Link
            to="/related"
            className="hidden sm:inline-block mono text-[9px] uppercase tracking-[0.25em] text-[var(--bronze)] border border-[var(--bronze)]/40 px-3 py-1.5 hover:bg-[var(--bronze)] hover:text-white transition-colors rounded-sm"
          >
            Full network map →
          </Link>
        </div>

        {related.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">No related programs found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {related.map((nb) => {
              const nbAccent = clusterColor(nb.program.discipline_cluster);
              const barWidth = Math.round(nb.score * 100);
              return (
                <Link
                  key={nb.id}
                  to={`/programs/${nb.id}`}
                  className="research-card p-4 hover:border-[var(--bronze)] transition-colors flex flex-col"
                  style={{ borderTop: `3px solid ${nbAccent}` }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="inline-block w-2 h-2 rounded-full flex-none"
                      style={{ background: nbAccent }}
                    />
                    <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--ink-soft)] font-semibold truncate">
                      {nb.program.school}
                    </span>
                  </div>
                  <h3 className="font-serif text-base font-semibold text-[var(--ink-strong)] leading-snug flex-1">
                    {nb.program.name}
                  </h3>
                  <p className="mt-1 text-[10px] text-[var(--ink-muted)] truncate">{nb.why}</p>
                  {/* Similarity bar */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[var(--paper-deep)] rounded-sm overflow-hidden">
                      <div
                        className="h-full rounded-sm"
                        style={{ width: `${barWidth}%`, background: nbAccent }}
                      />
                    </div>
                    <span className="mono text-[9px] text-[var(--ink-soft)] flex-none">{barWidth}%</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-[9px] border border-[var(--hairline)] px-1.5 py-0.5 rounded-sm text-[var(--ink-soft)]">
                      {nb.program.degree}
                    </span>
                    <span className="text-[9px] border border-[var(--hairline)] px-1.5 py-0.5 rounded-sm text-[var(--ink-soft)]">
                      {nb.program.enrollment_band} enroll
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Back / network links */}
      <div className="flex flex-wrap gap-4 text-sm">
        <button
          onClick={() => navigate(-1)}
          className="text-[var(--ink-muted)] hover:text-[var(--ink-strong)] transition-colors"
        >
          ← Back
        </button>
        <Link to="/related" className="text-[var(--bronze)] hover:underline">
          Explore the full program network →
        </Link>
      </div>
    </div>
  );
}

function KPI({
  label, value, sub, color, small,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  small?: boolean;
}) {
  return (
    <div className="research-card px-5 py-4">
      <div className="text-[10.5px] font-semibold text-[var(--ink-soft)] uppercase tracking-[0.08em]">{label}</div>
      <div
        className={`mt-1 font-serif font-semibold leading-tight tabular ${small ? 'text-xl' : 'text-3xl'}`}
        style={{ color: color ?? 'var(--ink-strong)' }}
      >
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[11px] text-[var(--ink-soft)]">{sub}</div>}
    </div>
  );
}
