import { ArrowRight, Check } from 'lucide-react';
import TelegramDemo from '@/components/TelegramDemo';

const PROOF_POINTS = ['Every tool call logged', 'Approval before any spend', 'Memory you can inspect'];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-ink-line">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(94,232,154,0.10),transparent_60%)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-20 md:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-ink-line-strong bg-ink-raised px-3 py-1 text-xs text-paper-muted animate-fade-up">
            <span className="h-1.5 w-1.5 rounded-full bg-phosphor animate-pulse-dot" aria-hidden="true" />
            Telegram-native AI agent
          </p>
          <h1 className="animate-fade-up text-4xl font-bold leading-[1.2] tracking-tight text-paper sm:text-5xl md:text-6xl">
            The agent that shows its receipts.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl animate-fade-up text-base leading-normal text-paper-muted [animation-delay:80ms] sm:text-lg">
            AgentBee lives in your Telegram chat. It researches, writes and runs code, and handles on-chain
            actions. It logs every step and asks before it spends a cent.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 animate-fade-up [animation-delay:160ms] sm:flex-row">
            <a
              href="#"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-phosphor px-6 py-3 text-sm font-medium text-phosphor-ink shadow-lg shadow-phosphor/10 transition-all duration-200 hover:bg-phosphor/90 hover:shadow-phosphor/20 sm:w-auto"
            >
              Get started on Telegram
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex w-full items-center justify-center rounded-md border border-ink-line-strong px-6 py-3 text-sm text-paper transition-colors duration-200 hover:border-paper-muted sm:w-auto"
            >
              See how it works
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-paper-muted">
            {PROOF_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-phosphor" strokeWidth={3} aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto mt-16 max-w-3xl animate-fade-up [animation-delay:240ms]">
          <TelegramDemo />
        </div>
      </div>
    </section>
  );
}
