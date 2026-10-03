import { Fragment } from "react";

const HEADER_LINKS = [
  { label: "chokinglotus", href: "#" },
  { label: "Numen", href: "#" },
  { label: "G59", href: "#" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex min-h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
        <span className="whitespace-nowrap text-[10px] tracking-[0.06em] text-neutral-200 sm:text-sm sm:tracking-[0.35em]">
          Supported Creators
        </span>
        <nav
          aria-label="links"
          className="flex flex-wrap items-center justify-end gap-x-2 text-[9px] tracking-[0.1em] sm:text-[11px] sm:tracking-[0.18em]"
        >
          {HEADER_LINKS.map((link, index) => (
            <Fragment key={link.label}>
              {index > 0 && (
                <span aria-hidden="true" className="text-neutral-600">
                  /
                </span>
              )}
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="glitch-hover text-neutral-300 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            </Fragment>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2.5 px-6 py-7 text-center">
        <p className="text-[9px] tracking-[0.18em] text-xr-red sm:text-[11px] sm:tracking-[0.28em]">
          ALL THEFT WILL RESULT IN DMCA CONSEQUENCES
        </p>
        <p className="text-[9px] tracking-[0.24em] text-neutral-500 sm:text-[10px] sm:tracking-[0.3em]">
          © 2026 ALL RIGHTS RESERVED
        </p>
      </div>
    </footer>
  );
}
