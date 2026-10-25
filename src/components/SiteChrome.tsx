import { NotificationSegment } from "./NotificationSegment";
import { SOCIALS } from "@/lib/links";

export function SiteHeader() {
  return (
    <header className="border-b border-white/10">
      {/* The row wraps instead of pushing the links past the right edge on a
          narrow phone, where the larger type steps are already applied. */}
      {/* No label — the row is the studio's channels, right-aligned, so it
          needs no heading of its own. */}
      <div className="mx-auto flex min-h-14 w-full max-w-5xl flex-wrap items-center justify-end gap-x-4 gap-y-1 px-6 py-2 short:min-h-12">
        <nav
          aria-label="socials"
          className="flex flex-wrap items-center justify-end gap-x-2 text-[9px] tracking-[0.1em] @sm:text-[11px] @sm:tracking-[0.18em]"
        >
          {/* Each channel sits inside its own brackets — [name] — so the
              row reads as a list of links without a separator between.
              The whole unit bumps left when its link is hovered: shifting
              only the name would slide it out from under its own brackets. */}
          {SOCIALS.map((social) => (
            <span
              key={social.full}
              className="inline-flex items-center whitespace-nowrap transition-transform duration-150 has-[a:hover]:-translate-x-1"
            >
              <span aria-hidden="true" className="text-neutral-600">
                [
              </span>
              {social.href ? (
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.full}
                  title={social.full}
                  className="text-neutral-300 transition-colors duration-150 hover:bg-xr-red hover:text-[#0a0a0a]"
                >
                  {social.label}
                </a>
              ) : (
                // No invite yet — dulled and unclickable so it reads as
                // inactive until its href is filled in.
                <span
                  aria-disabled="true"
                  title={`${social.full} — coming soon`}
                  className="cursor-default select-none text-neutral-600"
                >
                  {social.label}
                </span>
              )}
              <span aria-hidden="true" className="text-neutral-600">
                ]
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Pop-down notice — types, deletes and retypes under the header row */}
      <NotificationSegment />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2.5 px-6 py-7 text-center short:py-5 shorter:py-3">
        <p className="text-[9px] tracking-[0.18em] text-xr-red @sm:text-[11px] @sm:tracking-[0.28em]">
          ALL THEFT WILL RESULT IN DMCA CONSEQUENCES
        </p>
        <p className="text-[9px] tracking-[0.24em] text-neutral-500 @sm:text-[10px] @sm:tracking-[0.3em]">
          © 2026 ALL RIGHTS RESERVED
        </p>
      </div>
    </footer>
  );
}
