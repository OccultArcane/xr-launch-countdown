import { useState } from "react";
import { motion } from "framer-motion";
import { BinaryMark } from "@/components/BinaryMark";
import { Countdown } from "@/components/Countdown";

const SOCIALS = [
  { name: "Instagram", abbr: "IG", domain: "instagram.com" },
  { name: "Pinterest", abbr: "PIN", domain: "pinterest.com" },
  { name: "X", abbr: "X", domain: "x.com" },
  { name: "YouTube", abbr: "YT", domain: "youtube.com" },
  { name: "GitHub", abbr: "GH", domain: "github.com" },
];

const SUPPORT_LINKS = [
  { label: "support", href: "mailto:support@xr.studio" },
  { label: "contact", href: "mailto:hello@xr.studio" },
  { label: "status", href: "#" },
  { label: "docs", href: "#" },
  { label: "faq", href: "#" },
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

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] font-mono text-neutral-100 selection:bg-neutral-100 selection:text-[#0a0a0a]">
      {/* Header — wordmark left, social favicons right */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
          <span className="text-sm lowercase tracking-[0.4em] text-neutral-200">
            xr
          </span>
          <nav
            aria-label="social links"
            className="flex items-center gap-2.5"
          >
            {SOCIALS.map((social) => (
              <FaviconLink key={social.domain} {...social} />
            ))}
          </nav>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-14">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-14 sm:gap-16">
          <h1 className="sr-only">xr</h1>

          {/* The mark: 0s and 1s assembling the xr wordmark */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-[clamp(240px,42vh,440px)] w-full"
          >
            <BinaryMark />
          </motion.div>

          {/* Countdown to launch, with an editable target date */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="w-full max-w-3xl"
          >
            <Countdown />
          </motion.div>

          {/* Support links */}
          <motion.nav
            aria-label="support"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12"
          >
            {SUPPORT_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[13px] tracking-[0.12em] text-neutral-300 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                {link.label}
              </a>
            ))}
          </motion.nav>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6 text-[10px] uppercase tracking-[0.3em] text-neutral-500">
          <span>© 2026 xr</span>
          <span>all rights reserved</span>
        </div>
      </footer>
    </div>
  );
}
