import { useEffect, useState, type ReactNode } from 'react';
import {
  Check,
  Clock,
  FileText,
  Mic,
  MoreVertical,
  PanelRight,
  Paperclip,
  Search,
  Smile,
  Terminal,
} from 'lucide-react';

type TimelineEntry =
  | { id: string; kind: 'user'; time: string; text: string }
  | { id: string; kind: 'tool'; time: string; call: string; status: string; ms: string; note?: string }
  | { id: string; kind: 'chart' }
  | { id: string; kind: 'agent'; time: string; text: string; file: string }
  | { id: string; kind: 'approval'; time: string };

const TIMELINE: TimelineEntry[] = [
  { id: 'cmd', kind: 'user', time: '14:02', text: '/research AI agent market size, 2024 to 2026. Cite every number.' },
  {
    id: 'search',
    kind: 'tool',
    time: '14:02',
    call: 'web_search(query="AI agent market size 2024-2026", sources=6)',
    status: 'Completed',
    ms: '0.8s',
    note: '6 sources fetched, 1 injected instruction stripped',
  },
  {
    id: 'analyze',
    kind: 'tool',
    time: '14:03',
    call: 'run_python(script="analyze_sources.py")',
    status: 'Success',
    ms: '1.2s',
    note: 'Parsed 6 sources into market_growth.csv',
  },
  { id: 'chart', kind: 'chart' },
  {
    id: 'report',
    kind: 'agent',
    time: '14:03',
    text: 'Report ready. Every figure links to its source. Chart and PDF attached.',
    file: 'agent_market_2026.pdf',
  },
  { id: 'swap-cmd', kind: 'user', time: '14:04', text: 'Swap 5 SOL to USDC at my usual slippage.' },
  {
    id: 'swap',
    kind: 'tool',
    time: '14:04',
    call: 'swap_preview(token_a="SOL", token_b="USDC", amount="5.0")',
    status: 'Awaiting approval',
    ms: '',
  },
  { id: 'approval', kind: 'approval', time: '14:04' },
];

const HOLD_MS = 5000;
const STEP_MS = 850;

export default function TelegramDemo() {
  const [reduceMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [shown, setShown] = useState(() => (reduceMotion ? TIMELINE.length : 0));

  useEffect(() => {
    if (reduceMotion) return;
    const delay = shown >= TIMELINE.length ? HOLD_MS : STEP_MS;
    const timer = window.setTimeout(() => {
      setShown((count) => (count >= TIMELINE.length ? 0 : count + 1));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [shown, reduceMotion]);

  const visible = TIMELINE.slice(0, shown);
  const isTyping = shown < TIMELINE.length;

  return (
    <div className="overflow-hidden rounded-xl border border-ink-line-strong bg-ink-raised shadow-2xl shadow-black/60">
      <div className="flex items-center justify-between border-b border-ink-line bg-ink-panel px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-phosphor/15 text-phosphor">
            <Terminal className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium text-paper">AgentBee</p>
            <p className="flex items-center gap-1.5 text-xs text-phosphor">
              <span className="h-1.5 w-1.5 rounded-full bg-phosphor animate-pulse-dot" aria-hidden="true" />
              agent online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-paper-muted">
          <Search className="h-4 w-4" aria-hidden="true" />
          <PanelRight className="h-4 w-4" aria-hidden="true" />
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>

      <div
        className="flex h-[440px] flex-col gap-4 overflow-hidden px-4 py-5 sm:px-6"
        role="log"
        aria-live="polite"
        aria-label="Example agent run log"
      >
        {visible.map((entry) => (
          <div key={entry.id} className="animate-fade-up">
            {renderEntry(entry)}
          </div>
        ))}
        {isTyping && (
          <span className="inline-block h-4 w-2 bg-phosphor animate-blink" aria-hidden="true" />
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-ink-line bg-ink-panel px-4 py-3 text-paper-muted">
        <Paperclip className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate text-sm text-paper-muted/70">Message AgentBee</span>
        <Smile className="h-4 w-4 shrink-0" aria-hidden="true" />
        <Mic className="h-4 w-4 shrink-0" aria-hidden="true" />
      </div>
    </div>
  );
}

function renderEntry(entry: TimelineEntry): ReactNode {
  switch (entry.kind) {
    case 'user':
      return (
        <div className="flex items-start gap-3">
          <span className="w-12 shrink-0 pt-0.5 text-xs text-paper-muted">{entry.time}</span>
          <p className="rounded-md border border-ink-line-strong bg-ink-panel px-3 py-2 text-sm text-paper">
            {entry.text}
          </p>
        </div>
      );
    case 'tool':
      return (
        <div className="flex items-start gap-3 text-xs sm:text-sm">
          <span className="w-12 shrink-0 pt-0.5 text-paper-muted">{entry.time}</span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-paper">
              <span className="text-phosphor-dim">tool</span>
              <span className="break-all">{entry.call}</span>
            </p>
            <p className="mt-1 flex items-center gap-2 border-l border-ink-line-strong pl-3 text-paper-muted">
              {entry.status === 'Awaiting approval' ? (
                <Clock className="h-3.5 w-3.5 text-amber" aria-hidden="true" />
              ) : (
                <Check className="h-3.5 w-3.5 text-phosphor" strokeWidth={3} aria-hidden="true" />
              )}
              <span className={entry.status === 'Awaiting approval' ? 'text-amber' : 'text-phosphor'}>
                {entry.status}
              </span>
              {entry.ms && <span>{entry.ms}</span>}
            </p>
            {entry.note && (
              <p className="mt-1 border-l border-ink-line-strong pl-3 text-paper-muted">{entry.note}</p>
            )}
          </div>
        </div>
      );
    case 'chart':
      return (
        <div className="ml-12 rounded-md border border-ink-line bg-ink-panel p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-paper-muted">
            <span>market_growth.csv</span>
            <span>USD bn, 2024-2026</span>
          </div>
          <svg viewBox="0 0 300 80" className="h-20 w-full" aria-hidden="true">
            <line x1="0" y1="79.5" x2="300" y2="79.5" className="stroke-ink-line-strong" strokeWidth="1" />
            <polyline
              pathLength={1}
              points="0,68 30,60 60,64 90,52 120,56 150,44 180,48 210,30 240,36 270,18 300,8"
              fill="none"
              className="animate-draw stroke-phosphor"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray="1"
            />
          </svg>
        </div>
      );
    case 'agent':
      return (
        <div className="flex items-start gap-3">
          <span className="w-12 shrink-0 pt-0.5 text-xs text-paper-muted">{entry.time}</span>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm leading-normal text-paper">{entry.text}</p>
            <div className="inline-flex items-center gap-2 rounded-md border border-ink-line-strong bg-ink-panel px-3 py-2 text-xs text-paper">
              <FileText className="h-4 w-4 text-phosphor" aria-hidden="true" />
              {entry.file}
            </div>
          </div>
        </div>
      );
    case 'approval':
      return (
        <div className="ml-12 rounded-md border border-amber/40 bg-ink-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-paper">Swap preview</p>
            <span className="text-xs text-amber">expires in 5:00</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <dt className="text-paper-muted">Pair</dt>
            <dd className="text-right text-paper">SOL to USDC</dd>
            <dt className="text-paper-muted">Amount</dt>
            <dd className="text-right text-paper">5.0 SOL</dd>
            <dt className="text-paper-muted">Slippage</dt>
            <dd className="text-right text-paper">0.5%</dd>
            <dt className="text-paper-muted">Price impact</dt>
            <dd className="text-right text-paper">0.04%</dd>
            <dt className="text-paper-muted">Cap remaining</dt>
            <dd className="text-right text-phosphor">$25.00 of $25.00</dd>
          </dl>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              className="rounded-md bg-phosphor px-3 py-2 font-medium text-phosphor-ink transition-colors duration-200 hover:bg-phosphor/85"
            >
              Approve
            </button>
            <button
              type="button"
              className="rounded-md border border-ink-line-strong px-3 py-2 text-paper transition-colors duration-200 hover:border-paper-muted"
            >
              Edit
            </button>
            <button
              type="button"
              className="rounded-md border border-ink-line-strong px-3 py-2 text-paper transition-colors duration-200 hover:border-paper-muted"
            >
              Reject
            </button>
          </div>
        </div>
      );
  }
}
