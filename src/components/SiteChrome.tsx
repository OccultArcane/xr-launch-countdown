import { useEffect, useState } from "react";
import { NotificationSegment } from "./NotificationSegment";
import { SOCIALS } from "@/lib/links";

/** Two digits, so the clock keeps one width as it counts. */
const pad = (value: number) => String(value).padStart(2, "0");

/**
 * The visitor's own clock, in the header's bracket style — `[ 20:42:07 ]`.
 * Built from the system clock rather than a locale format so the digits stay
 * the shape the monospace face was drawn for, and tabular so the readout
 * cannot jog sideways as the seconds turn.
 */
function LocalTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const clock =
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return (
    <time
      dateTime={now.toISOString()}
      className="inline-flex items-center text-[9px] tracking-[0.1em] tabular-nums text-neutral-300 @sm:text-[11px] @sm:tracking-[0.18em]"
    >
      <span aria-hidden="true" className="text-neutral-600">
        [
      </span>
      {clock}
      <span aria-hidden="true" className="text-neutral-600">
        ]
      </span>
    </time>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-white/10">
      {/* The row wraps instead of pushing the links past the right edge on a
          narrow phone, where the larger type steps are already applied. */}
      {/* No label — the row pairs the visitor's clock at the left edge with
          the studio's channels at the right, so the run needs no heading of
          its own. */}
      <div className="mx-auto flex min-h-14 w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-2 short:min-h-12">
        <LocalTime />
        <nav
          aria-label="socials"
          className="flex flex-wrap items-center justify-end gap-x-2 text-[9px] tracking-[0.1em] @sm:text-[11px] @sm:tracking-[0.18em]"
        >
          {/* Each channel sits inside its own brackets — [name] — so the
              row reads as a list of links without a separator between.
              The whole unit bumps left on hover: shifting only the name
              would slide it out from under its own brackets. The unit's box
              is what the pointer hovers and it stays put, with the bump on
              the row inside it — a moving hit area pulls its own border out
              from under the cursor, loses it, and catches it again. */}
          {SOCIALS.map((social) => (
            <span
              key={social.full}
              className="group inline-flex items-center whitespace-nowrap"
            >
              <span className="inline-flex items-center transition-transform duration-150 group-hover:-translate-x-1">
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
                    className="text-neutral-300 transition-colors duration-150 group-hover:bg-xr-red group-hover:text-[#0a0a0a]"
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
