import { Search, Code2, Wallet, type LucideIcon } from 'lucide-react';

type Capability = {
  title: string;
  icon: LucideIcon;
  summary: string;
  tools: string[];
};

const CAPABILITIES: Capability[] = [
  {
    title: 'Research',
    icon: Search,
    summary:
      'Live web research with cited sources. Every claim links back to the page it came from, and the findings land as a report you can read in chat or download.',
    tools: ['web_search', 'fetch_url', 'make_chart'],
  },
  {
    title: 'Code',
    icon: Code2,
    summary:
      'Writes, runs, tests and debugs Python in an isolated workspace. You get the working file back, along with the output it produced.',
    tools: ['run_python', 'run_shell', 'write_file'],
  },
  {
    title: 'On-chain',
    icon: Wallet,
    summary:
      'Reads balances and previews swaps with simulated results. Nothing executes until you approve the exact preview card.',
    tools: ['balances', 'swap_preview', 'tx_status'],
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Ask in Telegram',
    body: 'Message AgentBee the way you would a colleague. Research, code, files and background watches all start from the same chat.',
  },
  {
    number: '02',
    title: 'Watch the run log',
    body: 'Each tool call streams into the thread with its arguments, timing and result. You see what it touched while it works.',
  },
  {
    number: '03',
    title: 'Approve what matters',
    body: 'Spends, sends and writes stop at an approval card with a five-minute expiry. Approve, edit or reject, and it remembers what you chose.',
  },
];

export function CapabilitiesSection() {
  return (
    <section id="capabilities" className="scroll-mt-20 border-b border-ink-line py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-phosphor-dim">Core capabilities</p>
          <h2 className="mt-4 text-3xl font-bold leading-[1.2] tracking-tight text-paper sm:text-4xl">
            Research, code, on-chain.
          </h2>
          <p className="mt-4 text-base leading-normal text-paper-muted">
            Three jobs done properly, each with a receipt you can check.
          </p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-ink-line bg-ink-line md:grid-cols-3">
          {CAPABILITIES.map(({ title, icon: Icon, summary, tools }) => (
            <article
              key={title}
              className="group flex flex-col bg-ink-raised p-8 transition-colors duration-300 hover:bg-ink-panel"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-ink-line-strong text-phosphor transition-colors duration-300 group-hover:border-phosphor/50">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-semibold text-paper">{title}</h3>
              </div>
              <p className="mt-5 flex-1 text-sm leading-normal text-paper-muted">{summary}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {tools.map((tool) => (
                  <li
                    key={tool}
                    className="rounded border border-ink-line-strong px-2 py-1 text-xs text-paper-muted"
                  >
                    {tool}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-b border-ink-line py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 md:grid-cols-[1fr_2fr] md:gap-16">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-phosphor-dim">How it works</p>
            <h2 className="mt-4 text-3xl font-bold leading-[1.2] tracking-tight text-paper sm:text-4xl">
              Trust comes from the trail.
            </h2>
            <p className="mt-4 text-base leading-normal text-paper-muted">
              Nothing is hidden behind a summary. The log, the sources and the approvals stay in the chat.
            </p>
          </div>
          <ol className="divide-y divide-ink-line border-y border-ink-line">
            {STEPS.map((step) => (
              <li key={step.number} className="flex gap-6 py-7">
                <span className="pt-1 text-sm text-phosphor">{step.number}</span>
                <div>
                  <h3 className="text-base font-semibold text-paper">{step.title}</h3>
                  <p className="mt-2 text-sm leading-normal text-paper-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
