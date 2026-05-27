// ============================================================
// API helpers, read the gold layer built from the
// Snowflake + Iceberg gold layer.
// ============================================================

export type DataSource = 'live' | 'demo';

let lastSource: DataSource = 'demo';
let snapshotGeneratedAt: string | null = null;
const listeners = new Set<(s: DataSource) => void>();

export function subscribeSource(fn: (s: DataSource) => void): () => void {
  listeners.add(fn);
  fn(lastSource);
  return () => { listeners.delete(fn); };
}

export function getSnapshotTime(): string | null { return snapshotGeneratedAt; }

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return (await res.json()) as T;
}

const cache = new Map<string, Promise<unknown>>();

function load<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(path, fetchJson<T>(path).then((data: any) => {
      if (data?.generated_at) snapshotGeneratedAt = data.generated_at;
      return data;
    }));
  }
  return cache.get(path) as Promise<T>;
}

// Typed accessors (records are intentionally loose, pages defend their own shapes).
export const api = {
  getSummary:     () => load<any>('/data/summary.json'),
  getEnrollment:  () => load<any>('/data/enrollment.json'),
  getSuccess:     () => load<any>('/data/student_success.json'),
  getResearch:    () => load<any>('/data/research.json'),
  getAdvancement: () => load<any>('/data/advancement.json'),
  getFinance:     () => load<any>('/data/finance.json'),
  getExperience:  () => load<any>('/data/experience.json'),
  getPipeline:    () => load<any>('/data/pipeline.json'),
  getIceberg:     () => load<any>('/data/iceberg.json'),
  getPrograms:    () => load<any>('/data/programs.json'),
};

// ---- formatters --------------------------------------------------

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US').format(n);
}

export function formatCurrencyShort(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(abs >= 100_000_000_000 ? 0 : 1)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(abs >= 100_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

export function formatBytes(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1024 ** 4) return `${(n / 1024 ** 4).toFixed(2)} TB`;
  if (abs >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (abs >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (abs >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

export function formatPercent(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

export function formatSignedPercent(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
}
