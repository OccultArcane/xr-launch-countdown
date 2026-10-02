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

function FaviconLink({
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
      className="group flex h-6 w-6 items-center justify-center rounded-[4px] opacity-75 outline-none transition-opacity hover:opacity-100 focus-visible:ring-1 focus-visible:ring-white/50"
    >
      {failed ? (
        <span className="flex h-6 w-6 items-center justify-center rounded-[4px] border border-white/15 text-[8px] tracking-tight text-neutral-400 transition-colors group-hover:border-white/40 group-hover:text-neutral-100">
          {abbr}
        </span>
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-white/90 transition-colors group-hover:bg-white">
          <img
            src={icon}
            alt=""
            width={14}
            height={14}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-3.5 w-3.5 grayscale transition group-hover:grayscale-0"
          />
        </span>
      )}
    </a>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
        <Link
          to="/"
          className="text-sm lowercase tracking-[0.4em] text-neutral-200 outline-none transition-colors hover:text-white focus-visible:ring-1 focus-visible:ring-white/50"
        >
          {SITE.name}
        </Link>
        <nav aria-label="social links" className="flex items-center gap-2.5">
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
