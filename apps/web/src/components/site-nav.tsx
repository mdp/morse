import { HelpCircle, type LucideIcon, Radio, Swords } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import ThemeSwitcher from './theme-switcher';

const GITHUB_URL = 'https://github.com/mdp/morse';

// lucide-react dropped its brand icons, so the GitHub mark is inlined.
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
    </svg>
  );
}

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

// Primary destinations — shown in the desktop header AND the mobile bottom bar.
// GitHub is intentionally excluded (external link, not a site section): it
// lives in the header on desktop and the footer on mobile only.
const NAV_ITEMS: NavItem[] = [
  { to: '/decode', label: 'Decode', icon: Radio },
  { to: '/beat-the-bot', label: 'Beat the Bot', icon: Swords },
  { to: '/faq', label: 'FAQ', icon: HelpCircle },
];

/**
 * Top header — shown on every page, all viewports. Wordmark (→ home) left;
 * desktop nav links + GitHub + theme right. On mobile the link row is hidden
 * (the bottom bar carries it); wordmark, GitHub, and theme remain up top.
 */
export function SiteHeader() {
  return (
    <header className="mb-5">
      <div className="flex items-center justify-between gap-3 py-1">
        <NavLink
          to="/"
          className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label="Morse — home"
        >
          <img
            src={`${import.meta.env.BASE_URL}logo.webp`}
            alt=""
            className="h-4 w-auto"
          />
          <span className="font-mono font-bold text-foreground text-xl tracking-tight">
            MORSE
          </span>
        </NavLink>

        <div className="flex items-center gap-1">
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                    isActive
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="View source on GitHub"
            title="View source on GitHub"
            className="inline-flex items-center justify-center size-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <GithubIcon className="size-4" />
          </a>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}

/**
 * Bottom tab bar — mobile only (hidden at `sm`). Fixed to the viewport bottom,
 * full-bleed (outside the centered content column). Shows on every page,
 * including the landing page. The content wrapper reserves bottom padding so
 * nothing hides behind it (see main.tsx).
 */
export function MobileTabBar() {
  return (
    <nav
      className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="flex items-stretch justify-around">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors outline-none',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
