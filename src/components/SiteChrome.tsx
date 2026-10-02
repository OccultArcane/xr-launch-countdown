import { Link } from "react-router";
import { useState } from "react";
import { SITE } from "@/lib/store";

const SOCIALS = [
  { name: "Instagram", abbr: "IG", domain: "instagram.com" },
  { name: "Pinterest", abbr: "PIN", domain: "pinterest.com" },
  { name: "X", abbr: "X", domain: "x.com" },
  { name: "YouTube", abbr: "YT", domain: "youtube.com" },
  { name: "GitHub", abbr: "GH", domain: "github.com" },
];

export function FaviconLink({
  name,
  abbr,
  domain,
}: {
  name: string;
  abbr: string;
  domain: string;
}) {
  const [failed, setFailed] = useState(false);
  const href = `https://${domain}`;
  const icon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={name}
      aria-label={name}
      className="group flex h-8 w-8 items-center justify-center rounded-[6px] bg-white opacity-90 shadow-[0_1px_3px_rgba(0,0,0,0.45)] outline-none transition hover:opacity-100 focus-visible:ring-1 focus-visible:ring-white/50"
    >
      {failed ? (
        <span className="text-[9px] tracking-tight text-neutral-700">
          {abbr}
        </span>
      ) : (
        <img
          src={icon}
          alt=""
          width={20}
          height={20}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-5 w-5 object-contain grayscale transition group-hover:grayscale-0"
        />
      )}
    </a>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex min-h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
        <Link
          to="/"
          className="whitespace-nowrap text-[10px] lowercase tracking-[0.06em] text-neutral-200 outline-none transition-colors hover:text-white focus-visible:ring-1 focus-visible:ring-white/50 sm:text-sm sm:tracking-[0.35em]"
        >
          supported creators
        </Link>
        <nav
          aria-label="social links"
          className="flex items-center gap-2 sm:gap-2.5"
        >
          {SOCIALS.map((social) => (
            <FaviconLink key={social.domain} {...social} />
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
