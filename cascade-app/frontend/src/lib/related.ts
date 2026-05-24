// Related-programs similarity engine.
//
// Computes a top-K nearest-neighbor list for every academic program using
// feature-vector overlap across discipline cluster, school/college, degree
// level, enrollment-size band, and persistence/retention tier.
//
// Mirrors what an embedding pipeline would produce in production —
// the similarity runs locally so the static site ships the constellation
// without a runtime API call.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Program = {
  id: string;
  name: string;
  degree: string;
  school: string;
  cip: string;
  discipline_cluster: string;
  enrollment: number;
  enrollment_band: string;
  retention_pct: number;
  persistence_tier: string;
  description: string;
};

export type ProgramsData = {
  generated_at: string;
  programs: Program[];
};

export type RelatedProgram = {
  id: string;
  program: Program;
  score: number;      // 0..1
  why: string;        // human-readable reason
};

// ---------------------------------------------------------------------------
// Weights — discipline cluster + school highest, then degree level, then
// persistence profile. Enrollment band is a light tiebreaker.
// ---------------------------------------------------------------------------
const W_DISCIPLINE = 2.0;   // same CIP discipline cluster: strongest signal
const W_SCHOOL     = 1.4;   // same school / college
const W_DEGREE     = 0.8;   // same degree level (BS, BA, MS, MBA, …)
const W_PERSIST    = 0.6;   // same persistence/retention tier
const W_ENROLL     = 0.3;   // same enrollment-size band
const W_CIP2       = 0.5;   // same two-digit CIP prefix (broad field overlap)

const MAX_WEIGHT = W_DISCIPLINE + W_SCHOOL + W_DEGREE + W_PERSIST + W_ENROLL + W_CIP2;
const K = 8;

// ---------------------------------------------------------------------------
// CIP two-digit prefix (broad field)
// ---------------------------------------------------------------------------
function cip2(cip: string): string {
  return cip.split('.')[0] ?? '';
}

// ---------------------------------------------------------------------------
// Pairwise similarity score
// ---------------------------------------------------------------------------
function pairScore(a: Program, b: Program): number {
  let raw = 0;
  if (a.discipline_cluster === b.discipline_cluster) raw += W_DISCIPLINE;
  if (a.school === b.school)                          raw += W_SCHOOL;
  if (a.degree === b.degree)                          raw += W_DEGREE;
  if (a.persistence_tier === b.persistence_tier)      raw += W_PERSIST;
  if (a.enrollment_band === b.enrollment_band)        raw += W_ENROLL;
  if (cip2(a.cip) === cip2(b.cip))                    raw += W_CIP2;
  return raw / MAX_WEIGHT;
}

// ---------------------------------------------------------------------------
// "Why related" label generator
// ---------------------------------------------------------------------------
function whyCopy(a: Program, b: Program): string {
  if (a.discipline_cluster === b.discipline_cluster) {
    const label = CLUSTER_LABEL[a.discipline_cluster] ?? a.discipline_cluster;
    return `Same discipline — ${label}`;
  }
  if (a.school === b.school) {
    return `Both in ${a.school}`;
  }
  if (cip2(a.cip) === cip2(b.cip)) {
    const label = CIP2_LABEL[cip2(a.cip)] ?? `CIP ${cip2(a.cip)}`;
    return `Related field — ${label}`;
  }
  if (a.degree === b.degree) {
    return `Same degree level (${a.degree})`;
  }
  if (a.persistence_tier === b.persistence_tier) {
    return `Similar persistence profile`;
  }
  return `Complementary programs`;
}

// ---------------------------------------------------------------------------
// Label maps
// ---------------------------------------------------------------------------
export const CLUSTER_LABEL: Record<string, string> = {
  computing:          'Computing',
  engineering:        'Engineering',
  mathematics:        'Mathematics',
  physical_sciences:  'Physical Sciences',
  life_sciences:      'Life Sciences',
  social_sciences:    'Social Sciences',
  behavioral_sciences:'Behavioral Sciences',
  humanities:         'Humanities',
  business:           'Business',
  health_sciences:    'Health Sciences',
  education:          'Education',
  natural_sciences:   'Natural Sciences',
};

export const CIP2_LABEL: Record<string, string> = {
  '11': 'Computer and Information Sciences',
  '14': 'Engineering',
  '27': 'Mathematics and Statistics',
  '40': 'Physical Sciences',
  '26': 'Biological Sciences',
  '45': 'Social Sciences',
  '42': 'Psychology',
  '23': 'English Language and Literature',
  '54': 'History',
  '38': 'Philosophy and Religious Studies',
  '52': 'Business',
  '51': 'Health Professions',
  '13': 'Education',
  '03': 'Natural Resources and Conservation',
  '09': 'Communication',
};

// ---------------------------------------------------------------------------
// Top-K neighbor cache
// ---------------------------------------------------------------------------
let _cache: Map<string, RelatedProgram[]> | null = null;
let _programs: Program[] | null = null;

export function setPrograms(programs: Program[]): void {
  _programs = programs;
  _cache = null; // invalidate on reload
}

function build(): Map<string, RelatedProgram[]> {
  const programs = _programs ?? [];
  const result = new Map<string, RelatedProgram[]>();

  for (let i = 0; i < programs.length; i++) {
    const a = programs[i];
    const scored: Array<RelatedProgram> = [];

    for (let j = 0; j < programs.length; j++) {
      if (i === j) continue;
      const b = programs[j];
      const s = pairScore(a, b);
      if (s <= 0) continue;
      scored.push({
        id: b.id,
        program: b,
        score: s,
        why: whyCopy(a, b),
      });
    }

    scored.sort((x, y) => y.score - x.score);
    result.set(a.id, scored.slice(0, K));
  }

  return result;
}

export function relatedFor(id: string): RelatedProgram[] {
  if (!_cache) _cache = build();
  return _cache.get(id) ?? [];
}

// Returns every program as graph-ready nodes + undirected edges (union of all
// per-program top-K lists).
export type GraphNode = {
  id: string;
  label: string;
  cluster: string;
  school: string;
  degree: string;
  enrollment: number;
  persistence_tier: string;
};

export type GraphEdge = {
  source: string;
  target: string;
  score: number;
};

export function buildGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const programs = _programs ?? [];
  const nodes: GraphNode[] = programs.map((p) => ({
    id: p.id,
    label: p.name,
    cluster: p.discipline_cluster,
    school: p.school,
    degree: p.degree,
    enrollment: p.enrollment,
    persistence_tier: p.persistence_tier,
  }));

  const seen = new Set<string>();
  const edges: GraphEdge[] = [];

  if (!_cache) _cache = build();

  for (const [id, neighbors] of _cache.entries()) {
    for (const nb of neighbors) {
      const key = [id, nb.id].sort().join(':::');
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ source: id, target: nb.id, score: nb.score });
    }
  }

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Cluster-to-color mapping (distinct palette, no neons)
// ---------------------------------------------------------------------------
export function clusterColor(cluster: string): string {
  const palette: Record<string, string> = {
    computing:          '#1d4ed8', // deep blue
    engineering:        '#0369a1', // slate blue
    mathematics:        '#6d28d9', // violet
    physical_sciences:  '#0891b2', // teal
    life_sciences:      '#15803d', // ivy green
    social_sciences:    '#b45309', // bronze
    behavioral_sciences:'#92400e', // dark bronze
    humanities:         '#7c3aed', // purple
    business:           '#1e40af', // navy
    health_sciences:    '#be185d', // crimson
    education:          '#d97706', // amber
    natural_sciences:   '#166534', // deep green
  };
  return palette[cluster] ?? '#6b7280';
}
