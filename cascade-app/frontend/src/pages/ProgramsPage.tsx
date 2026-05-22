import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  setPrograms,
  clusterColor,
  CLUSTER_LABEL,
  type Program,
} from '../lib/related';
import { api, formatPercent } from '../api/queries';

const SCHOOLS = ['All', 'Engineering', 'Arts and Sciences', 'Business', 'Nursing', 'Education'];
const DEGREES = ['All', 'BS', 'BA', 'MS', 'MBA'];

export default function ProgramsPage() {
  const [programs, setPrograms_] = useState<Program[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filterSchool, setFilterSchool] = useState('All');
  const [filterDegree, setFilterDegree] = useState('All');
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.getPrograms().then((data: { programs: Program[] }) => {
      setPrograms(data.programs);
      setPrograms_(data.programs);
      setLoaded(true);
    }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return programs.filter(p => {
      if (filterSchool !== 'All' && p.school !== filterSchool) return false;
      if (filterDegree !== 'All' && p.degree !== filterDegree) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!p.name.toLowerCase().includes(q) &&
            !p.description.toLowerCase().includes(q) &&
            !p.discipline_cluster.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [programs, filterSchool, filterDegree, query]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-8 border-b border-[var(--hairline)] pb-6">
        <div className="eyebrow mb-1">Academic Catalog, Cascade University</div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-5xl font-semibold text-[var(--ink-strong)] tracking-tight">
              Academic Programs
            </h1>
            <p className="mt-3 text-[var(--ink-muted)] font-body-serif text-lg max-w-3xl">
              {loaded ? programs.length : '—'} programs across five schools and colleges.
              Click any program to see related majors scored by discipline, school, degree level,
              and persistence profile.
            </p>
          </div>
          <Link
            to="/related"
            className="mono text-[9px] uppercase tracking-[0.25em] text-[var(--bronze)] border border-[var(--bronze)]/40 px-3 py-2 hover:bg-[var(--bronze)] hover:text-white transition-colors rounded-sm whitespace-nowrap"
          >
            Program similarity network →
          </Link>
        </div>
      </header>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search programs…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="border border-[var(--hairline)] rounded-sm px-3 py-1.5 text-sm bg-white text-[var(--ink)] placeholder-[var(--ink-soft)] focus:outline-none focus:border-[var(--bronze)] w-56"
        />
        <select
          value={filterSchool}
          onChange={e => setFilterSchool(e.target.value)}
          className="border border-[var(--hairline)] rounded-sm px-2 py-1.5 text-sm bg-white text-[var(--ink)] focus:outline-none focus:border-[var(--bronze)]"
        >
          {SCHOOLS.map(s => <option key={s} value={s}>{s === 'All' ? 'All schools' : s}</option>)}
        </select>
        <select
          value={filterDegree}
          onChange={e => setFilterDegree(e.target.value)}
          className="border border-[var(--hairline)] rounded-sm px-2 py-1.5 text-sm bg-white text-[var(--ink)] focus:outline-none focus:border-[var(--bronze)]"
        >
          {DEGREES.map(d => <option key={d} value={d}>{d === 'All' ? 'All degrees' : d}</option>)}
        </select>
        {(filterSchool !== 'All' || filterDegree !== 'All' || query) && (
          <button
            onClick={() => { setFilterSchool('All'); setFilterDegree('All'); setQuery(''); }}
            className="text-xs text-[var(--ink-soft)] hover:text-[var(--garnet)] transition-colors"
          >
            Clear filters
          </button>
        )}
        <span className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-soft)] ml-auto">
          {filtered.length} programs
        </span>
      </div>

      {!loaded && <div className="research-card h-64 animate-pulse" />}

      {/* Grid */}
      {loaded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => {
            const accent = clusterColor(p.discipline_cluster);
            const clusterLabel = CLUSTER_LABEL[p.discipline_cluster] ?? p.discipline_cluster;
            return (
              <Link
                key={p.id}
                to={`/programs/${p.id}`}
                className="research-card p-5 hover:border-[var(--bronze)] transition-colors flex flex-col"
                style={{ borderTop: `3px solid ${accent}` }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: accent }} />
                  <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--ink-soft)] font-semibold truncate">
                    {p.school}
                  </span>
                </div>
                <h2 className="font-serif text-lg font-semibold text-[var(--ink-strong)] leading-tight flex-1">
                  {p.name}
                </h2>
                <p className="mt-2 text-xs text-[var(--ink-muted)] leading-relaxed line-clamp-2">
                  {p.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[9px] border border-[var(--hairline)] px-1.5 py-0.5 rounded-sm text-[var(--ink-soft)]">
                    {p.degree}
                  </span>
                  <span
                    className="text-[9px] border px-1.5 py-0.5 rounded-sm"
                    style={{ borderColor: `${accent}40`, color: accent, background: `${accent}10` }}
                  >
                    {clusterLabel}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--ink-soft)]">
                  <div>
                    <span className="font-semibold text-[var(--ink-strong)] tabular">
                      {p.enrollment.toLocaleString()}
                    </span>{' '}enrolled
                  </div>
                  <div>
                    Retention{' '}
                    <span className="font-semibold text-[var(--ink-strong)] tabular">
                      {formatPercent(p.retention_pct)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {loaded && filtered.length === 0 && (
        <p className="text-sm text-[var(--ink-muted)] mt-8">No programs match those filters.</p>
      )}
    </div>
  );
}
