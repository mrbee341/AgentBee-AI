import { Terminal } from 'lucide-react';

const FOOTER_LINKS = [
  { label: 'Status', href: '#' },
  { label: 'Terms', href: '#' },
  { label: 'Privacy', href: '#' },
  { label: 'X (Twitter)', href: '#' },
  { label: 'Discord', href: '#' },
];

export default function SiteFooter() {
  return (
    <footer className="py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <a href="#" className="flex items-center gap-2 text-base font-bold tracking-tight text-paper">
          <Terminal className="h-4 w-4 text-phosphor" strokeWidth={2.25} aria-hidden="true" />
          <span>
            Agent<span className="text-phosphor">Bee</span>
          </span>
        </a>
        <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-paper-muted transition-colors duration-200 hover:text-phosphor"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <p className="text-xs text-paper-muted">&copy; {new Date().getFullYear()} AgentBee</p>
      </div>
    </footer>
  );
}
