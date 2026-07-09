/*
 * ActivationLivePage — NewCo Activations live-sync playback for Cascade University.
 *
 * Architecture: step rail + sub-agent narration panel + single code panel
 * (routes both SQL and JSON code_targets through it) + Play/Pause/Speed
 * controls. Sibling to WizardLivePage.tsx, but plays back a reverse-ETL
 * sync run instead of a dbt build, and lands on a Destination Confirmation
 * payoff table instead of the dbt-wizard "See the outcome" hop.
 *
 * Content is local TS consts (ACTIVATION_SCENARIO / ACTIVATION_AGENTS /
 * ACTIVATION_SCRIPT / ACTIVATION_RECORDS) — no fetch, no public/data JSON.
 *
 * Vertical scenario: the moment gold.fct_retention_signals crosses a newly-
 * flagged retention_risk_score >= 80 (dfw_count_term >= 2, a 7-day LMS
 * engagement drop past 40%, and a missed advising touch) for a student who
 * doesn't already have an open case, Activations pushes the case straight
 * into EAB Navigate360 — the tool advisors are already staring at.
 *
 * Aesthetic: dark terminal surface (ivy green), matching wizard-live.
 * Autoscroll uses direct scrollTop assignment — NOT scrollIntoView.
 */

import React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AgentAvatar from '../components/AgentAvatar';
import type {
  ActivationAgent,
  ActivationEvent,
  ActivationScenario,
  ActivationRecord,
  ActivationAgentId,
} from '../components/activationTypes';

// Timing constants — scale by speed control.
const NARR_TYPE_MS = 14;
const CODE_TYPE_MS = 4;
const POST_NARR_DELAY_MS = 550;
const POST_CODE_DELAY_MS = 350;
const SPEEDS = [1, 2, 4] as const;

interface RevealState {
  cursor: number;
  narrTyped: number;
  codeTyped: number;
  codeSoFar: string;
  sideEffects: string[];
}

const INITIAL: RevealState = {
  cursor: 0,
  narrTyped: 0,
  codeTyped: 0,
  codeSoFar: '',
  sideEffects: [],
};

const STEP_DEFS = [
  { label: 'Segment Definition',       who: 'Segment', tools: 'gold query',       insight: '1 student matched'   },
  { label: 'Field Mapping',            who: 'Mapper',  tools: 'schema map',       insight: '5 fields mapped'     },
  { label: 'Sync Preview',             who: 'Mapper',  tools: 'diff preview',     insight: '1 insert · 5 unchanged' },
  { label: 'API Push',                 who: 'Sync',    tools: 'REST push',        insight: '1 record sent'       },
  { label: 'Destination Confirmation', who: 'Sync',    tools: 'destination read', insight: '1 landed · 0 errors' },
];

// Agent accent colors — distinct from the dbt-wizard palette, teal-forward
// to tie back to the Activations accent (#0e7490) used across ArchitecturePage.
const AGENT_STEP_COLOR: Record<string, string> = {
  segment: '#0e7490',
  mapper:  '#7c3aed',
  sync:    '#b45309',
  system:  '#78716c',
};

// ─── Local content (no fetch — see file header) ────────────────────────────

const ACTIVATION_AGENTS: ActivationAgent[] = [
  {
    id: 'segment',
    name: 'Segment',
    code: 'SEG',
    color: AGENT_STEP_COLOR.segment,
    role: 'Watches gold.fct_retention_signals for a newly-crossed risk threshold',
    tools: ['gold query', 'change detection'],
  },
  {
    id: 'mapper',
    name: 'Mapper',
    code: 'MAP',
    color: AGENT_STEP_COLOR.mapper,
    role: 'Maps gold columns onto EAB Navigate360 Student Case fields',
    tools: ['schema map', 'diff preview'],
  },
  {
    id: 'sync',
    name: 'Sync',
    code: 'SYN',
    color: AGENT_STEP_COLOR.sync,
    role: 'Pushes the mapped payload into Navigate360 and confirms it landed',
    tools: ['REST push', 'destination read'],
  },
];

const ACTIVATION_SCENARIO: ActivationScenario = {
  company: 'Cascade University',
  request_id: 'ACT-2026-0709-RET-014',
  requested_by: 'Retention Risk Monitor',
  requested_at: '2026-07-09T07:32:00-04:00',
  timezone_label: 'ET',
  question: 'Get this student in front of an advisor before the slide costs a whole term — not next Monday’s CSV.',
  source_model: 'gold.fct_retention_signals',
  destination_system: 'EAB Navigate360',
  destination_object: 'Student Case',
  sync_mode: 'insert',
  record_count: 6,
  build_room_seconds: 38,
};

const ACTIVATION_SCRIPT: ActivationEvent[] = [
  {
    from: 'segment',
    step: 1,
    step_label: 'Segment Definition',
    body: "Watching gold.fct_retention_signals for one condition: retention_risk_score crossing 80 — driven by dfw_count_term at 2 or more, a 7-day LMS engagement drop past 40%, and a missed scheduled advising touch — on a student whose advising_case_status isn't already open. Student STU-40217 just crossed that threshold for the first time this term.",
    side_effect: 'gold.fct_retention_signals · threshold crossed · STU-40217',
    code_target: 'sql',
    code_append:
      "select\n  s.student_id,\n  s.advisor_id,\n  r.retention_risk_score,\n  d.dfw_count_term,\n  r.last_lms_login_at,\n  r.advising_case_status\nfrom gold.dim_students s\njoin gold.fct_retention_signals r using (student_id)\njoin gold.fct_dfw_risk d using (student_id)\nwhere r.retention_risk_score >= 80\n  and d.dfw_count_term >= 2\n  and r.lms_engagement_drop_7d >= 0.40\n  and r.missed_advising_touch = true\n  and r.advising_case_status != 'open'\n  and r.risk_crossed_at >= dateadd('minute', -5, current_timestamp());",
  },
  {
    from: 'mapper',
    step: 2,
    step_label: 'Field Mapping',
    body: "Field Mapping translates the governed gold columns straight into EAB Navigate360's case schema — the same tool advisors are already staring at every day, no CSV export, no analyst re-keying it in on Monday.",
    side_effect: 'mapping · 5 fields → Student Case',
    code_target: 'json',
    code_append: JSON.stringify(
      {
        source_model: 'gold.fct_retention_signals',
        destination: 'EAB Navigate360 · Student Case',
        sync_mode: 'insert',
        field_map: {
          'dim_students.student_id': 'external_student_id',
          'fct_retention_signals.retention_risk_score': 'risk_score',
          'fct_dfw_risk.dfw_count_term': 'flag_count',
          'dim_students.advisor_id': 'assigned_staff_id',
          'fct_retention_signals.last_lms_login_at': 'last_activity_date',
        },
      },
      null,
      2,
    ),
  },
  {
    from: 'mapper',
    step: 3,
    step_label: 'Sync Preview',
    body: 'Sync Preview diffs against Navigate360 before anything pushes: 1 new case to insert, 5 already-open advising cases unchanged — so no advisor gets a duplicate alert for a student they’re already working.',
    side_effect: 'diff · 1 insert · 5 unchanged',
    code_target: 'json',
    code_append: JSON.stringify({ matched_rows: 6, to_insert: 1, unchanged: 5, to_update: 0 }, null, 2),
  },
  {
    from: 'sync',
    step: 4,
    step_label: 'API Push',
    body: 'API Push sends the payload straight into Navigate360 and assigns it to the student’s advisor of record — no export, no re-key, no Monday-morning CSV, no analyst in the loop.',
    side_effect: 'POST /v2/cases · EAB Navigate360 · 202 accepted',
    code_target: 'json',
    code_append: JSON.stringify(
      {
        external_student_id: 'STU-40217',
        risk_score: 84,
        flag_count: 2,
        assigned_staff_id: 'ADV-1142',
        last_activity_date: '2026-07-02',
      },
      null,
      2,
    ),
  },
  {
    from: 'sync',
    step: 5,
    step_label: 'Destination Confirmation',
    body: 'Destination Confirmation: the case landed in Navigate360 in under a minute. Across the 1,204 students already flagged in gold.fct_retention_signals, that’s the difference between a 9-day median time-to-contact and under 15 minutes — 48-hour contact completion climbing from 41% to 92%, worth roughly $1.1M in preserved tuition this term.',
    side_effect: 'Navigate360 · case created · 0 errors',
  },
];

const ACTIVATION_RECORDS: ActivationRecord[] = [
  { key: 'STU-40217', fields: { 'Risk Score': 84, 'Flag Count': 2, 'Assigned Staff': 'ADV-1142', 'Last Activity': '2026-07-02' }, status: 'created' },
  { key: 'STU-40188', fields: { 'Risk Score': 91, 'Flag Count': 3, 'Assigned Staff': 'ADV-1098', 'Last Activity': '2026-06-30' }, status: 'skipped' },
  { key: 'STU-40092', fields: { 'Risk Score': 82, 'Flag Count': 2, 'Assigned Staff': 'ADV-1142', 'Last Activity': '2026-07-01' }, status: 'skipped' },
  { key: 'STU-39984', fields: { 'Risk Score': 88, 'Flag Count': 2, 'Assigned Staff': 'ADV-1206', 'Last Activity': '2026-06-29' }, status: 'skipped' },
  { key: 'STU-39871', fields: { 'Risk Score': 80, 'Flag Count': 2, 'Assigned Staff': 'ADV-1098', 'Last Activity': '2026-06-28' }, status: 'skipped' },
  { key: 'STU-39795', fields: { 'Risk Score': 95, 'Flag Count': 3, 'Assigned Staff': 'ADV-1206', 'Last Activity': '2026-06-27' }, status: 'skipped' },
];

// ─── Destination confirmation payoff table ─────────────────────────────────

function DestinationConfirmationTable({ scenario, records }: { scenario: ActivationScenario; records: ActivationRecord[] }) {
  const cols = Object.keys(records[0]?.fields ?? {});
  return (
    <div className="mt-4 clinical-card overflow-hidden" style={{ borderLeft: '4px solid #0e7490' }}>
      <header className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--hairline)' }}>
        <div>
          <div className="eyebrow" style={{ fontSize: 11, color: '#0e7490' }}>Landed in {scenario.destination_system}</div>
          <div className="font-mono text-[12px] text-[var(--ink-muted)] mt-0.5">{scenario.destination_object} · {scenario.sync_mode}</div>
        </div>
        <span className="font-mono text-[12px]" style={{ color: '#0e7490' }}>
          {records.filter(r => r.status !== 'skipped').length} of {records.length} shown
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-[var(--hairline)]" style={{ background: 'var(--paper-deep,#f1efe2)' }}>
            <tr>
              <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-soft)]">Student ID</th>
              {cols.map(c => (
                <th key={c} className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-soft)]">{c}</th>
              ))}
              <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-soft)]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--hairline-soft,#ece8d6)]">
            {records.map(r => (
              <tr key={r.key}>
                <td className="px-4 py-2 font-mono text-[12px] text-[var(--ink-strong)]">{r.key}</td>
                {cols.map(c => <td key={c} className="px-4 py-2 text-[12px] text-[var(--ink)]">{r.fields[c]}</td>)}
                <td className="px-4 py-2 text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: r.status === 'skipped' ? '#b45309' : '#16a34a' }}>
                    {r.status === 'skipped' ? '● unchanged' : `● ${r.status}`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ActivationLivePage() {
  const [events] = useState<ActivationEvent[]>(ACTIVATION_SCRIPT);
  const scenario = ACTIVATION_SCENARIO;
  const agents = ACTIVATION_AGENTS;
  const records = ACTIVATION_RECORDS;

  const [state, setState]       = useState<RevealState>(INITIAL);
  const [playing, setPlaying]   = useState(true);
  const [speed, setSpeed]       = useState<typeof SPEEDS[number]>(1);
  const [complete, setComplete] = useState(false);

  const narrPanelRef = useRef<HTMLDivElement | null>(null);
  const codePanelRef = useRef<HTMLPreElement | null>(null);
  const narrBottomRef = useRef<HTMLDivElement | null>(null);
  const codeBottomRef  = useRef<HTMLDivElement | null>(null);

  const agentById = useMemo(() => {
    const m: Record<string, ActivationAgent> = {};
    for (const a of agents) m[a.id] = a;
    return m;
  }, [agents]);

  const currentEvent: ActivationEvent | undefined = events[state.cursor];
  const totalSteps = useMemo(() => {
    if (events.length === 0) return 5;
    return Math.max(...events.map(e => e.step));
  }, [events]);

  // Phase machine: type narration → type code (if any) → advance
  useEffect(() => {
    if (!playing || !currentEvent) {
      if (events.length > 0 && state.cursor >= events.length && !complete) {
        setComplete(true);
      }
      return;
    }
    // Phase 1: type narration
    if (state.narrTyped < currentEvent.body.length) {
      const id = setTimeout(() => {
        setState(s => ({ ...s, narrTyped: s.narrTyped + 1 }));
      }, Math.max(2, Math.floor(NARR_TYPE_MS / speed)));
      return () => clearTimeout(id);
    }
    // Phase 2: type code if any
    const code = currentEvent.code_append ?? '';
    if (code.length > 0 && state.codeTyped < code.length) {
      const id = setTimeout(() => {
        setState(s => {
          const nextTyped = s.codeTyped + 1;
          const charsToAdd = code.slice(s.codeTyped, nextTyped);
          return { ...s, codeTyped: nextTyped, codeSoFar: s.codeSoFar + charsToAdd };
        });
      }, Math.max(1, Math.floor(CODE_TYPE_MS / speed)));
      return () => clearTimeout(id);
    }
    // Phase 3: commit side effect + advance cursor (reset code panel for next artifact)
    const postDelay = code.length > 0 ? POST_CODE_DELAY_MS : POST_NARR_DELAY_MS;
    const id = setTimeout(() => {
      setState(s => {
        const next: RevealState = { ...s, cursor: s.cursor + 1, narrTyped: 0, codeTyped: 0, codeSoFar: '' };
        if (currentEvent.side_effect) {
          next.sideEffects = [currentEvent.side_effect, ...s.sideEffects].slice(0, 8);
        }
        return next;
      });
    }, Math.max(80, Math.floor(postDelay / speed)));
    return () => clearTimeout(id);
  }, [playing, speed, currentEvent, state.narrTyped, state.codeTyped, state.cursor, events.length, complete]);

  // Autoscroll panels by setting scrollTop directly — never scroll the window.
  useEffect(() => {
    const el = narrPanelRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.cursor, state.narrTyped]);
  useEffect(() => {
    const el = codePanelRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.codeSoFar]);

  const reset = () => { setState(INITIAL); setComplete(false); setPlaying(true); };
  const cycleSpeed = () => { const i = SPEEDS.indexOf(speed); setSpeed(SPEEDS[(i + 1) % SPEEDS.length]); };

  const currentStep      = currentEvent?.step ?? totalSteps;
  const currentStepLabel = currentEvent?.step_label ?? 'Destination Confirmation';
  const activeAgentId: ActivationAgentId | undefined =
    currentEvent && state.narrTyped < currentEvent.body.length ? currentEvent.from : undefined;

  const visibleNarr = events.slice(0, Math.min(state.cursor + 1, events.length)).map((e, idx) => {
    const isCurrent = idx === state.cursor;
    const body = isCurrent ? e.body.slice(0, state.narrTyped) : e.body;
    return { e, body, isCurrent };
  });

  const codeLabel = currentEvent?.code_target === 'sql'
    ? 'models/gold/fct_retention_signals.sql'
    : 'activation_mapping.json';
  const codeBadge = currentEvent?.code_target === 'sql' ? 'Segment authoring' : 'Mapper / Sync authoring';

  return (
    <div className="activation-terminal mx-auto max-w-[1640px] px-4 py-4 sm:px-6 lg:px-8">

      {/* ── Control bar ── */}
      <div
        className="mb-3 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-20 z-20"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--hairline)',
          borderLeft: '4px solid #0e7490',
          borderRadius: '0.25rem',
          boxShadow: '0 2px 8px rgba(20,83,45,0.08)',
        }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="status-pill"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: 12, padding: '4px 10px', fontWeight: 700,
              background: 'rgba(14,116,144,0.10)', color: '#0e7490', border: '1px solid rgba(14,116,144,0.35)',
            }}
          >
            <span
              style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: 999,
                background: '#0e7490',
                animation: complete ? 'none' : 'signal-pulse 1.8s ease-in-out infinite',
              }}
            />
            {complete ? 'Sync Complete' : 'Sync Active'}
          </span>
          <span className="eyebrow" style={{ fontSize: 12 }}>{scenario.request_id}</span>
          <span className="font-mono" style={{ color: 'var(--ink-muted)', fontSize: 13 }}>
            Step{' '}
            <span style={{ color: '#0e7490', fontWeight: 700 }}>{currentStep}/{totalSteps}</span>
            <span className="mx-2" style={{ color: 'var(--ink-soft)' }}>·</span>
            <span style={{ color: 'var(--ink)' }}>{currentStepLabel}</span>
          </span>
          <div
            aria-hidden
            style={{
              width: 160, height: 6, borderRadius: 999,
              background: 'var(--paper-deep)', overflow: 'hidden',
              border: '1px solid var(--hairline)',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, Math.max(0, Math.round(((complete ? events.length : state.cursor) / Math.max(1, events.length)) * 100)))}%`,
                height: '100%',
                background: complete ? 'var(--good)' : '#0e7490',
                transition: 'width 220ms ease, background 200ms ease',
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-sm font-semibold border transition-colors"
            style={{ background: 'var(--paper-deep)', borderColor: 'var(--hairline)', color: 'var(--ink)', padding: '7px 14px', fontSize: 13 }}
            onClick={() => setPlaying(p => !p)}
            disabled={complete}
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-sm font-semibold border transition-colors"
            style={{ background: 'var(--paper-deep)', borderColor: 'var(--hairline)', color: 'var(--ink)', padding: '7px 14px', fontSize: 13 }}
            onClick={cycleSpeed}
          >
            {speed}x
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-sm font-semibold border transition-colors"
            style={{ background: 'var(--paper-deep)', borderColor: 'var(--hairline)', color: 'var(--ink)', padding: '7px 14px', fontSize: 13 }}
            onClick={reset}
          >
            Restart
          </button>
          <Link
            to="/architecture"
            className="inline-flex items-center gap-1.5 rounded-sm font-semibold border transition-colors"
            style={{ background: 'var(--paper-deep)', borderColor: 'var(--hairline)', color: 'var(--ink)', padding: '7px 14px', fontSize: 13 }}
          >
            Back
          </Link>
        </div>
      </div>

      {/* ── Question + destination (compact single row) ── */}
      <div
        className="mb-3 px-4 py-2.5 clinical-card border-l-4 flex items-center gap-5 flex-wrap"
        style={{ borderLeftColor: '#0e7490' }}
      >
        <div className="min-w-0 flex-shrink" style={{ flex: '1 1 460px' }}>
          <div className="eyebrow" style={{ fontSize: 10, marginBottom: 2, color: '#0e7490' }}>
            Advising Ops · {scenario.timezone_label} · {scenario.requested_by}
          </div>
          <p
            className="font-serif font-medium text-[var(--ink-strong)] leading-snug truncate"
            style={{ fontSize: 16 }}
            title={scenario.question}
          >
            "{scenario.question}"
          </p>
        </div>
        <div className="font-mono text-[var(--ink-muted)] shrink-0" style={{ fontSize: 11 }}>
          Destination: <span style={{ color: '#0e7490', fontWeight: 700 }}>{scenario.destination_system} · {scenario.destination_object}</span>
        </div>
      </div>

      {/* ── Step rail (compact single-line, 5 steps) ── */}
      <div className="mb-3 grid gap-1.5" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
        {STEP_DEFS.map((s, idx) => {
          const num    = idx + 1;
          const done   = currentStep > num || (currentStep === num && complete);
          const active = currentStep === num && !complete;
          const accentColor = active
            ? '#0e7490'
            : done
            ? 'var(--good)'
            : 'var(--hairline)';
          return (
            <div
              key={s.label}
              className="clinical-card px-2.5 py-2 flex flex-col gap-0.5"
              style={{
                borderLeft: `4px solid ${accentColor}`,
                background: active
                  ? 'rgba(14,116,144,0.06)'
                  : done
                  ? 'rgba(21,128,61,0.06)'
                  : 'var(--paper-deep)',
              }}
              title={`${s.who} · ${s.tools}`}
            >
              <div
                className="font-mono font-bold flex items-center gap-1.5"
                style={{
                  fontSize: 10, letterSpacing: '0.04em',
                  color: active ? '#0e7490' : done ? 'var(--good)' : 'var(--ink-soft)',
                }}
              >
                <span>STEP {String(num).padStart(2, '0')}</span>
                <span style={{ opacity: 0.6 }}>·</span>
                <span>{done ? 'DONE' : active ? 'NOW' : 'WAIT'}</span>
              </div>
              <div className="font-semibold text-[var(--ink-strong)] truncate" style={{ fontSize: 13, lineHeight: 1.15 }}>
                {s.label}
              </div>
              <div
                className="font-mono truncate"
                style={{
                  fontSize: 10, lineHeight: 1.25,
                  color: active ? '#0e7490' : done ? 'var(--good)' : 'var(--ink-soft)',
                  opacity: done || active ? 0.95 : 0.55,
                }}
                title={s.insight}
              >
                {s.insight}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.25fr)' }}
      >

        {/* ── LEFT: Sub-agent narration ── */}
        <section
          className="clinical-card flex flex-col lg:!h-[calc(100dvh-440px)]"
          style={{ minHeight: 'max(60vh, 300px)' }}
        >
          <header
            className="px-5 py-3 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--hairline)' }}
          >
            <div>
              <div className="eyebrow" style={{ fontSize: 11 }}>Sub-agent narration</div>
              <div className="font-mono mt-0.5 text-[var(--ink-muted)]" style={{ fontSize: 12 }}>
                {scenario.company} · NewCo Activations live sync
              </div>
            </div>
            <div className="flex items-center gap-2">
              {agents.map(a => (
                <AgentAvatar key={a.id} agent={a} active={activeAgentId === a.id} size={36} />
              ))}
            </div>
          </header>

          <div
            ref={narrPanelRef}
            className="px-5 py-4 overflow-y-auto flex-1"
            style={{ background: 'var(--paper)', overscrollBehavior: 'contain', fontSize: 14, lineHeight: 1.55 }}
          >
            {visibleNarr.map((m, idx) => {
              const a     = agentById[m.e.from];
              const color = a?.color ?? AGENT_STEP_COLOR[m.e.from] ?? '#0e7490';
              const isTyping = m.isCurrent && playing && state.narrTyped < m.e.body.length;
              return (
                <div
                  key={idx}
                  data-wizard-card="narr"
                  style={{
                    borderLeft: `3px solid ${color}`,
                    paddingLeft: 12,
                    borderTopRightRadius: 4,
                    borderBottomRightRadius: 4,
                    marginBottom: 10,
                    border: `1px solid var(--hairline-soft)`,
                    borderLeftColor: color,
                    borderLeftWidth: 3,
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, padding: '12px 14px 12px 0' }}>
                    <div style={{ paddingTop: 2, flexShrink: 0 }}>
                      <AgentAvatar agent={a} active={isTyping} size={40} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span
                          className="font-mono font-semibold"
                          style={{ color, fontSize: 13, letterSpacing: '0.02em' }}
                        >
                          {a?.name ?? m.e.from}
                        </span>
                        <span
                          className="status-pill"
                          style={{
                            fontSize: 10, padding: '2px 7px', fontWeight: 700,
                            background: 'rgba(14,116,144,0.10)', color: '#0e7490',
                            border: '1px solid rgba(14,116,144,0.35)',
                          }}
                        >
                          STEP {m.e.step}
                        </span>
                        <span className="font-mono text-[var(--ink-soft)]" style={{ fontSize: 11 }}>
                          {m.e.step_label}
                        </span>
                      </div>
                      <div
                        className={isTyping ? 'wizard-chat-bubble wizard-chat-cursor' : 'wizard-chat-bubble'}
                        style={{ color: 'var(--ink)', fontSize: 14.5, lineHeight: 1.55 }}
                      >
                        {m.body}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={narrBottomRef} />
          </div>
        </section>

        {/* ── RIGHT: Single code panel — routes sql + json code_targets ── */}
        <section className="flex flex-col gap-3 lg:!h-[calc(100dvh-440px)]" style={{ minHeight: 'max(60vh, 300px)' }}>
          <div className="clinical-card flex flex-col flex-1">
            <header
              className="px-5 py-3 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--hairline)' }}
            >
              <div className="flex items-center gap-3 flex-wrap min-w-0">
                <div className="eyebrow font-mono" style={{ fontSize: 11, letterSpacing: '0.02em' }}>
                  {codeLabel}
                </div>
                <span
                  className="layer-chip"
                  style={{
                    color: '#0e7490', background: 'rgba(14,116,144,0.07)',
                    border: '1px solid rgba(14,116,144,0.3)',
                    fontSize: 10, padding: '3px 8px', fontWeight: 700, whiteSpace: 'nowrap',
                  }}
                >
                  {codeBadge}
                </span>
              </div>
              <span className="font-mono text-[var(--ink-soft)]" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                {state.codeSoFar.length.toLocaleString()} chars
              </span>
            </header>
            <pre
              ref={codePanelRef}
              className="flex-1"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 14, lineHeight: 1.6,
                background: '#0b1829', color: '#e8edf8',
                border: 'none', margin: 0, padding: '1.25rem',
                overflowX: 'auto', overflowY: 'auto',
                whiteSpace: 'pre', tabSize: 2,
                overscrollBehavior: 'contain',
                borderBottomLeftRadius: '0.25rem',
                borderBottomRightRadius: '0.25rem',
              }}
            >
              {state.codeSoFar.length === 0 ? (
                <span style={{ color: '#5a7099' }}>{'-- waiting for the next artifact...'}</span>
              ) : currentEvent?.code_target === 'sql' ? (
                <SyntaxSql
                  text={state.codeSoFar}
                  cursor={state.codeTyped > 0 && state.codeTyped < (currentEvent.code_append?.length ?? 0)}
                />
              ) : (
                <SyntaxJson
                  text={state.codeSoFar}
                  cursor={
                    currentEvent?.code_target === 'json' &&
                    state.codeTyped > 0 &&
                    state.codeTyped < (currentEvent.code_append?.length ?? 0)
                  }
                />
              )}
              <div ref={codeBottomRef} />
            </pre>
          </div>
        </section>
      </div>

      {/* ── Full-width tool side effects ticker (compact) ── */}
      <div className="clinical-card mt-3 px-3 py-2 flex items-center gap-3">
        <div className="eyebrow shrink-0" style={{ fontSize: 10 }}>sync events</div>
        {state.sideEffects.length === 0 ? (
          <div className="font-mono text-[var(--ink-soft)]" style={{ fontSize: 11.5 }}>Awaiting first sync event...</div>
        ) : (
          <ul className="flex items-center gap-x-4 gap-y-1 flex-wrap min-w-0">
            {state.sideEffects.slice(0, 4).map((s, i) => (
              <li
                key={`${s}-${i}`}
                className="flex items-center gap-1.5 font-mono text-[var(--ink)] truncate"
                style={{ fontSize: 11.5, maxWidth: '36ch' }}
                title={s}
              >
                <span
                  style={{
                    display: 'inline-block', width: 7, height: 7, borderRadius: 999, flexShrink: 0,
                    background: i === 0 ? '#0e7490' : 'var(--ink-soft)',
                    animation: i === 0 ? 'signal-pulse 1.8s ease-in-out infinite' : 'none',
                  }}
                />
                <span className="truncate">{s}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Sync complete: destination confirmation payoff ── */}
      {complete && (
        <div
          className="mt-6 clinical-card p-5"
          style={{
            borderLeft: '5px solid var(--good)',
            background: 'rgba(21,128,61,0.06)',
          }}
        >
          <div className="flex items-baseline justify-between flex-wrap gap-3 mb-1">
            <div className="flex items-baseline gap-3 flex-wrap">
              <div
                className="status-pill shrink-0"
                style={{
                  display: 'inline-flex', fontSize: 12, padding: '4px 10px', fontWeight: 700,
                  background: 'rgba(21,128,61,0.12)', color: 'var(--good)',
                  border: '1px solid rgba(21,128,61,0.35)',
                }}
              >
                Sync Complete
              </div>
              <span className="eyebrow" style={{ fontSize: 11 }}>{scenario.request_id} · {scenario.company}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-[var(--ink-muted)]" style={{ fontSize: 12 }}>
                <strong style={{ color: 'var(--good)' }}>{scenario.build_room_seconds}s</strong> gold-to-case · not 9 days
              </span>
              <Link
                to="/architecture"
                className="inline-flex items-center gap-2 rounded-sm font-semibold transition-colors"
                style={{
                  background: 'var(--ivy-deep)', color: '#fff',
                  padding: '10px 18px', fontSize: 13,
                }}
              >
                Back to architecture
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
          <DestinationConfirmationTable scenario={scenario} records={records} />
        </div>
      )}

      {/* Inline styles for activation-specific primitives */}
      <style>{`
        @keyframes signal-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.28; }
        }

        /* ── Terminal aesthetic ── */
        .activation-terminal {
          --t-bg:       #0a1a0e;
          --t-surface:  #0f2214;
          --t-elev:     #142d1a;
          --t-line:     #1f4529;
          --t-line-soft:#152d1b;
          --t-text:     #e6f0e8;
          --t-text-dim: #b6cfb9;
          --t-text-soft:#7a9b7e;
          --t-accent:   #2dd4bf;
          --t-accent-2: #fbd98f;
          --t-ok:       #86efac;
          --t-warn:     #fb923c;
          background: var(--t-bg);
          color: var(--t-text);
          font-family: "JetBrains Mono", ui-monospace, monospace;
          border-radius: 10px;
          border: 1px solid var(--t-line);
          padding-top: 28px;
          position: relative;
          margin-top: 4px;
          margin-bottom: 12px;
          box-shadow: 0 18px 40px -22px rgba(0, 0, 0, 0.55);
        }
        /* Window chrome — traffic lights + filename */
        .activation-terminal::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 28px;
          background: linear-gradient(180deg, #0d2213, #0a1a0e);
          border-bottom: 1px solid var(--t-line);
          border-top-left-radius: 9px;
          border-top-right-radius: 9px;
        }
        .activation-terminal::after {
          content: 'cascade-university/activations-live · NewCo Activations';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 28px;
          display: flex;
          align-items: center;
          font-size: 11.5px;
          font-family: "JetBrains Mono", monospace;
          background:
            radial-gradient(circle at 14px 14px, #ff5f57 5px, transparent 5.5px),
            radial-gradient(circle at 30px 14px, #febc2e 5px, transparent 5.5px),
            radial-gradient(circle at 46px 14px, #28c940 5px, transparent 5.5px);
          color: var(--t-text-dim);
          text-indent: 64px;
          letter-spacing: 0.02em;
          pointer-events: none;
        }
        .activation-terminal > * { position: relative; z-index: 1; }

        /* Override the light card base inside the terminal */
        .activation-terminal .clinical-card {
          background: var(--t-surface) !important;
          border-color: var(--t-line) !important;
          color: var(--t-text);
          box-shadow: none;
        }
        .activation-terminal .clinical-card header,
        .activation-terminal .clinical-card > .border-b {
          border-color: var(--t-line) !important;
          background: var(--t-elev);
        }
        /* Inner narration scroll surface */
        .activation-terminal .clinical-card > div[style*="background: var(--paper)"] {
          background: var(--t-bg) !important;
        }
        /* Narration chat cards */
        .activation-terminal [data-wizard-card="narr"] {
          background: var(--t-elev) !important;
          border-color: var(--t-line-soft) !important;
          color: var(--t-text) !important;
        }
        .activation-terminal [data-wizard-card="narr"] .wizard-chat-bubble {
          color: var(--t-text) !important;
        }
        .activation-terminal [data-wizard-card="narr"] .font-mono {
          color: var(--t-text-dim) !important;
        }
        /* Generic text recolor */
        .activation-terminal h1,
        .activation-terminal h2,
        .activation-terminal h3,
        .activation-terminal p,
        .activation-terminal span,
        .activation-terminal div,
        .activation-terminal li {
          color: inherit;
        }
        .activation-terminal .text-\\[var\\(--ink\\)\\],
        .activation-terminal [style*="color: var(--ink)"] { color: var(--t-text) !important; }
        .activation-terminal .text-\\[var\\(--ink-strong\\)\\],
        .activation-terminal [style*="color: var(--ink-strong)"] { color: var(--t-text) !important; }
        .activation-terminal .text-\\[var\\(--ink-muted\\)\\],
        .activation-terminal [style*="color: var(--ink-muted)"] { color: var(--t-text-dim) !important; }
        .activation-terminal .text-\\[var\\(--ink-soft\\)\\],
        .activation-terminal [style*="color: var(--ink-soft)"] { color: var(--t-text-soft) !important; }
        .activation-terminal [style*="color: #0e7490"] { color: var(--t-accent) !important; }

        /* Status pills: dim on dark */
        .activation-terminal .status-pill,
        .activation-terminal .layer-chip {
          background: rgba(45,212,191,0.12) !important;
          border-color: rgba(45,212,191,0.35) !important;
          color: var(--t-accent) !important;
        }
        /* Buttons on dark */
        .activation-terminal button,
        .activation-terminal a[class*="rounded-sm"] {
          background: var(--t-elev) !important;
          color: var(--t-text) !important;
          border-color: var(--t-line) !important;
        }
        .activation-terminal button:hover,
        .activation-terminal a[class*="rounded-sm"]:hover {
          background: var(--t-line) !important;
          border-color: var(--t-accent) !important;
        }
        /* Eyebrow */
        .activation-terminal .eyebrow {
          color: var(--t-accent) !important;
          opacity: 0.85;
        }
        /* Step rail active/done tiles */
        .activation-terminal .clinical-card[style*="rgba(14,116,144"] {
          background: rgba(45,212,191,0.10) !important;
        }
        .activation-terminal .clinical-card[style*="rgba(21,128,61"] {
          background: rgba(134,239,172,0.10) !important;
        }
        .activation-terminal .clinical-card[style*="var(--paper-deep)"] {
          background: var(--t-surface) !important;
        }
        /* Code panels */
        .activation-terminal pre {
          background: var(--t-bg) !important;
          border-top: 1px solid var(--t-line);
          color: #d6e3f6 !important;
        }
        /* Question banner */
        .activation-terminal .clinical-card.border-l-4 {
          border-left-color: var(--t-accent) !important;
        }
        /* Progress bar background */
        .activation-terminal div[style*="background: var(--paper-deep)"] {
          background: var(--t-elev) !important;
          border-color: var(--t-line) !important;
        }
        /* Avatar chip */
        .activation-terminal .wizard-agent-avatar {
          background: rgba(10,26,14,0.6) !important;
          border-color: rgba(120,180,130,0.35) !important;
        }
        .activation-terminal .wizard-agent-avatar[data-active="true"] {
          background: var(--t-bg) !important;
        }
        .wizard-chat-bubble {
          font-family: "JetBrains Mono", monospace;
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
          color: var(--ink);
        }
        .activation-terminal .wizard-chat-bubble {
          color: var(--t-text) !important;
        }
        .wizard-chat-cursor::after {
          content: '▌';
          display: inline-block;
          margin-left: 2px;
          color: #0e7490;
          animation: cursor-blink 0.9s steps(2, start) infinite;
        }
        .activation-terminal .wizard-chat-cursor::after {
          color: var(--t-accent) !important;
        }
        @keyframes cursor-blink {
          to { visibility: hidden; }
        }
        .wizard-code-cursor::after {
          content: '▌';
          color: #0e7490;
          animation: cursor-blink 0.9s steps(2, start) infinite;
        }
        .wtok-kw    { color: #79b8ff; font-weight: 600; }
        .wtok-str   { color: #4ade80; }
        .wtok-com   { color: #7a8fa8; font-style: italic; }
        .wtok-num   { color: #f59e0b; }
        .wtok-jinja { color: #e879b8; font-weight: 600; }
        .wtok-key   { color: #79b8ff; font-weight: 600; }
      `}</style>
    </div>
  );
}

// ─── Syntax highlighting (regex-based, dark panel) ───────────────────────────

const SQL_KEYWORDS = new Set([
  'with', 'as', 'select', 'from', 'where', 'and', 'or', 'on', 'left', 'right',
  'inner', 'outer', 'join', 'group', 'by', 'order', 'desc', 'asc', 'when', 'then',
  'else', 'end', 'case', 'true', 'false', 'null', 'distinct', 'nullif', 'count',
  'sum', 'max', 'min', 'avg', 'dateadd', 'current_date', 'current_timestamp', 'is', 'not', 'over',
  'partition', 'round', 'coalesce', 'date_trunc', 'using',
]);

function SyntaxSql({ text, cursor }: { text: string; cursor: boolean }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, li) => (
        <span key={li}>{tokenizeSqlLine(line)}{li < lines.length - 1 && '\n'}</span>
      ))}
      {cursor && <span className="wizard-code-cursor" />}
    </>
  );
}

function tokenizeSqlLine(line: string): React.ReactNode[] {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('--')) {
    return [<span key="c" className="wtok-com">{line}</span>];
  }
  const parts: React.ReactNode[] = [];
  const re = /(\{\{[^}]*\}\})|('[^']*')|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_][a-zA-Z0-9_]*\b)|(\s+)|([^\s'\w{]+)/g;
  let m: RegExpExecArray | null;
  let idx = 0;
  let key = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > idx) parts.push(line.slice(idx, m.index));
    if (m[1]) {
      parts.push(<span key={key++} className="wtok-jinja">{m[1]}</span>);
    } else if (m[2]) {
      parts.push(<span key={key++} className="wtok-str">{m[2]}</span>);
    } else if (m[3]) {
      parts.push(<span key={key++} className="wtok-num">{m[3]}</span>);
    } else if (m[4]) {
      const word = m[4];
      if (SQL_KEYWORDS.has(word.toLowerCase())) {
        parts.push(<span key={key++} className="wtok-kw">{word}</span>);
      } else {
        parts.push(word);
      }
    } else if (m[5]) {
      parts.push(m[5]);
    } else {
      parts.push(m[6] ?? '');
    }
    idx = re.lastIndex;
  }
  if (idx < line.length) parts.push(line.slice(idx));
  return parts;
}

// Lightweight JSON/REST-payload highlighter — same regex-driven approach as
// tokenizeSqlLine. Handles quoted keys (before a colon), string values,
// numbers/booleans/null, and leaves everything else (braces, the REST
// request line) as plain text.
function SyntaxJson({ text, cursor }: { text: string; cursor: boolean }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>{tokenizeJsonLine(line)}{i < lines.length - 1 && '\n'}</span>
      ))}
      {cursor && <span className="wizard-code-cursor" />}
    </>
  );
}

function tokenizeJsonLine(line: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /("(?:[^"\\]|\\.)*")(\s*:)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\b\d+(?:\.\d+)?\b)/g;
  let m: RegExpExecArray | null;
  let idx = 0;
  let key = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > idx) parts.push(line.slice(idx, m.index));
    if (m[1]) {
      const isKey = Boolean(m[2]);
      parts.push(<span key={key++} className={isKey ? 'wtok-key' : 'wtok-str'}>{m[1]}</span>);
      if (m[2]) parts.push(m[2]);
    } else if (m[3]) {
      parts.push(<span key={key++} className="wtok-kw">{m[3]}</span>);
    } else if (m[4]) {
      parts.push(<span key={key++} className="wtok-num">{m[4]}</span>);
    }
    idx = re.lastIndex;
  }
  if (idx < line.length) parts.push(line.slice(idx));
  return parts;
}
