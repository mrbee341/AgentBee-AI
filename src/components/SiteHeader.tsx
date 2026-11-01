import { ArrowUpRight, Terminal } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'How it works', href: '#how-it-works' },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-line bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-10">
          <a href="#" className="flex items-center gap-2 text-lg font-bold tracking-tight text-paper">
            <Terminal className="h-5 w-5 text-phosphor" strokeWidth={2.25} aria-hidden="true" />
            <span>
              Agent<span className="text-phosphor">Bee</span>
            </span>
          </a>
          <nav className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-paper-muted transition-colors duration-200 hover:text-paper"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <a
          href="#"
          className="group inline-flex items-center gap-2 rounded-md border border-phosphor/50 px-4 py-2 text-sm text-phosphor transition-all duration-200 hover:border-phosphor hover:bg-phosphor/10"
        >
          Open in Telegram
          <ArrowUpRight
            className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </a>
      </div>
    </header>
  );
}
