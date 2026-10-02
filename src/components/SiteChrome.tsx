import { Fragment } from "react";
import { SITE } from "@/lib/store";

const SOCIALS = [
  { name: "Instagram", domain: "instagram.com" },
  { name: "Pinterest", domain: "pinterest.com" },
  { name: "X", domain: "x.com" },
  { name: "YouTube", domain: "youtube.com" },
  { name: "GitHub", domain: "github.com" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex min-h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
        <span className="whitespace-nowrap text-[10px] lowercase tracking-[0.06em] text-neutral-200 sm:text-sm sm:tracking-[0.35em]">
          supported creators
        </span>
        <nav
          aria-label="social links"
          className="flex flex-wrap items-center justify-end gap-x-2 text-[9px] lowercase tracking-[0.1em] sm:text-[11px] sm:tracking-[0.18em]"
        >
          {SOCIALS.map((social, index) => (
            <Fragment key={social.domain}>
              {index > 0 && (
                <span aria-hidden="true" className="text-neutral-600">
                  /
                </span>
              )}
              <a
                href={`https://${social.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="glitch-hover text-neutral-300 transition-colors hover:text-white"
              >
                {social.name.toLowerCase()}
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
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6 text-[10px] uppercase tracking-[0.3em] text-neutral-500">
        <span>© 2026 {SITE.name}</span>
        <span>all rights reserved</span>
      </div>
    </footer>
  );
}
