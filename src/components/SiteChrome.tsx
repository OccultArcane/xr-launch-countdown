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

/**
 * Edge-detection filter: renders any favicon as a thin outline instead of a
 * solid image. Defined once in the header; referenced by every icon.
 */
function IconOutlineDefs() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute h-0 w-0 overflow-hidden"
    >
      <defs>
        <filter id="xr-icon-outline" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            result="gray"
            values="0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 1 0"
          />
          <feConvolveMatrix
            in="gray"
            order="3"
            divisor="1"
            preserveAlpha="true"
            kernelMatrix="0 -1 0 -1 4 -1 0 -1 0"
            result="edges"
          />
          <feColorMatrix
            in="edges"
            type="matrix"
            values="0 0 0 0 0.88 0 0 0 0 0.88 0 0 0 0 0.88 1 0 0 0 -0.12"
          />
        </filter>
      </defs>
    </svg>
  );
}

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
      className="glitch-hover group flex h-8 w-8 items-center justify-center rounded-[6px] border border-white/15 bg-white/[0.04] opacity-90 outline-none transition hover:border-white/40 hover:opacity-100 focus-visible:ring-1 focus-visible:ring-white/50"
    >
      {failed ? (
        <span className="text-[9px] tracking-tight text-neutral-400">
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
          style={{ filter: "url(#xr-icon-outline)" }}
          className="h-5 w-5 object-contain opacity-80 transition-opacity group-hover:opacity-100"
        />
      )}
    </a>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-white/10">
      <div className="relative mx-auto flex min-h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
        <IconOutlineDefs />
        <Link
          to="/"
          className="glitch-hover whitespace-nowrap text-[10px] lowercase tracking-[0.06em] text-neutral-200 outline-none transition-colors hover:text-white focus-visible:ring-1 focus-visible:ring-white/50 sm:text-sm sm:tracking-[0.35em]"
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
