import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/** Where the notice lives — edited without touching any code. */
const DOC_URL = "/notification.txt";
/** Used only when the document can't be read — keep in sync with it. */
const FALLBACK_TEXT = "Discord server is in devolpment";
/** Milliseconds per character in the typewriter reveal. */
const TYPE_MS = 55;

/**
 * The header's pop-down notice: reads its message from a plain text
 * document (public/notification.txt) and types it out one character at
 * a time, terminal-style, with a blinking cursor. Styled to match the
 * header strip — same mono small caps, red accent and dividers — and
 * dismissible for the session (it reappears on reload).
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

  // Typewriter reveal: one character every TYPE_MS. Reduced-motion
  // readers skip the animation — the line below shows the full text
  // directly instead of the animated state.
  useEffect(() => {
    if (!text || reduceMotion) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, TYPE_MS);
    return () => window.clearInterval(id);
  }, [text, reduceMotion]);

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
          <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-6 py-2.5">
            <span className="flex shrink-0 items-center gap-1.5 text-[9px] uppercase tracking-[0.25em] text-xr-red sm:text-[10px]">
              <span
                className="blink-dot h-1.5 w-1.5 rounded-full bg-xr-red"
                aria-hidden="true"
              />
              notice
            </span>
            <p className="min-w-0 flex-1 truncate text-[10px] tracking-[0.08em] text-neutral-400 sm:text-[11px]">
              {/* Full line for screen readers; the typing is visual only. */}
              <span className="sr-only">{text}</span>
              <span aria-hidden="true">{shown}</span>
              <span
                aria-hidden="true"
                className="animate-pulse text-neutral-200"
              >
                ▌
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
