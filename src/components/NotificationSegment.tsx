import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { asset } from "@/lib/asset";

/** Where the notice lives — edited without touching any code. */
const DOC_URL = asset("notification.txt");
/** Used only when the document can't be read — keep in sync with it. */
const FALLBACK_TEXT = "Discord server is in development.";
/** Milliseconds per tick of the typewriter — one character typed per tick. */
const TYPE_MS = 55;
/** Pause on the finished line before it starts deleting — 30 seconds. */
const HOLD_TICKS = Math.round(30_000 / TYPE_MS);
/** Characters erased per tick — deleting runs about twice as fast. */
const ERASE_STEP = 2;
/** Pause (~0.4s) on the empty line before retyping. */
const EMPTY_TICKS = 8;

/**
 * The header's pop-down notice: reads its message from a plain text
 * document (public/notification.txt) and types it out one character at
 * a time, terminal-style, with a blinking cursor — then deletes the
 * line and types it again in an endless loop. Styled to match the
 * header strip — same mono small caps, red accent and dividers — and
 * dismissible for the session (it reappears on reload with a fresh
 * type-out).
 */
export function NotificationSegment() {
  const [text, setText] = useState(FALLBACK_TEXT);
  const [typed, setTyped] = useState("");
  const [open, setOpen] = useState(true);
  const reduceMotion = useReducedMotion() ?? false;

  // Read the notice off the document; the built-in line stands in when
  // it's missing or empty.
  useEffect(() => {
    let cancelled = false;
    void fetch(DOC_URL)
      .then((res) => (res.ok ? res.text() : ""))
      .then((raw) => {
        const doc = raw.trim();
        if (!cancelled && doc) setText(doc);
      })
      .catch(() => {
        // Unreadable — keep the built-in line.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Typewriter loop: type the line out, hold, delete it, then retype —
  // forever. Reduced-motion readers skip the animation; the line below
  // shows the full text directly instead of the animated state.
  useEffect(() => {
    if (!text || reduceMotion) return;
    let len = 0;
    let phase: "typing" | "holding" | "erasing" | "waiting" = "typing";
    let wait = 0;
    const id = window.setInterval(() => {
      if (phase === "typing") {
        len += 1;
        setTyped(text.slice(0, len));
        if (len >= text.length) {
          phase = "holding";
          wait = HOLD_TICKS;
        }
      } else if (phase === "holding") {
        wait -= 1;
        if (wait <= 0) phase = "erasing";
      } else if (phase === "erasing") {
        len = Math.max(0, len - ERASE_STEP);
        setTyped(text.slice(0, len));
        if (len <= 0) {
          phase = "waiting";
          wait = EMPTY_TICKS;
        }
      } else {
        wait -= 1;
        if (wait <= 0) phase = "typing";
      }
    }, TYPE_MS);
    return () => window.clearInterval(id);
  }, [text, reduceMotion]);

  const lineRef = useRef<HTMLParagraphElement>(null);
  const fullRef = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState(1);

  // The notice is always a single line: the finished sentence is measured
  // against the row and scaled down when the row is narrower than it, so the
  // whole notice stays visible instead of wrapping or ellipsing its end off.
  // The invisible full-text copy is what gets measured — never the scaled
  // line — so the reading cannot shrink itself in a loop.
  useLayoutEffect(() => {
    const line = lineRef.current;
    const full = fullRef.current;
    if (!line || !full) return;
    const measure = () => {
      const available = line.clientWidth;
      const natural = full.offsetWidth;
      setFit(natural > available && available > 0 ? available / natural : 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(line);
    observer.observe(full);
    return () => observer.disconnect();
  }, [text]);

  const shown = reduceMotion ? text : typed;

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="notice"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="overflow-hidden border-t border-white/10 bg-white/[0.02]"
          role="status"
          aria-live="polite"
        >
          <div className="flex w-full items-center justify-center gap-[clamp(0.375rem,1.2vmin,0.75rem)] px-[clamp(0.75rem,3vw,3rem)] py-[clamp(0.375rem,1.2vh,0.75rem)]">
            <span className="flex shrink-0 items-center gap-1.5 text-[clamp(9px,1.05vmin,12px)] uppercase tracking-[0.25em] text-xr-red">
              <span
                className="blink-dot h-1.5 w-1.5 rounded-full bg-xr-red"
                aria-hidden="true"
              />
              notice
            </span>
            {/* One line, never two: the row keeps the sentence whole and
                shrinks it when a phone is too narrow for it (see the
                measurement above), so no word is ever cut off. */}
            <p
              ref={lineRef}
              style={
                fit < 1
                  ? {
                      transform: `scale(${fit})`,
                      transformOrigin: "left center",
                    }
                  : undefined
              }
              className="relative min-w-0 overflow-hidden whitespace-nowrap text-[clamp(10px,1.1vmin,14px)] tracking-[0.08em] text-neutral-400"
            >
              {/* Full line for screen readers; the typing is visual only. */}
              <span className="sr-only">{text}</span>
              {/* The finished sentence, invisible, holds the full width the
                  typed line grows into, so the row stays put while it types
                  and the line never re-centres itself mid-sentence. */}
              <span
                ref={fullRef}
                aria-hidden="true"
                className="invisible inline-block"
              >
                {text}
                <span>▌</span>
              </span>
              <span aria-hidden="true" className="absolute inset-0">
                {shown}
                <span className="animate-pulse text-neutral-200">▌</span>
              </span>
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="dismiss notification"
              className="shrink-0 text-[13px] leading-none text-neutral-600 transition-colors hover:text-neutral-300"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
