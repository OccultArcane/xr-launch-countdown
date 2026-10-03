import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DEFAULT_ANNOUNCEMENT, type Announcement } from "@/lib/store";

/**
 * The header's pop-down notification: slides out from underneath the
 * header row with the latest announcement — a live Discord post when the
 * bot feed is configured (src/convex/notifications.ts), the built-in
 * store notice otherwise. Dismissible for the session (it reappears on
 * reload).
 */
export function NotificationBar() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(
    DEFAULT_ANNOUNCEMENT,
  );
  const [open, setOpen] = useState(true);
  const runLatest = useAction(api.notifications.latest);

  useEffect(() => {
    let cancelled = false;
    void runLatest()
      .then((latest) => {
        if (!cancelled && latest) setAnnouncement(latest);
      })
      .catch(() => {
        // Feed unavailable — the built-in notice stays put.
      });
    return () => {
      cancelled = true;
    };
  }, [runLatest]);

  return (
    <AnimatePresence initial={false}>
      {open && announcement && (
        <motion.div
          key="announcement"
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
              {announcement.source === "discord" ? "announcement" : "notice"}
            </span>
            <p className="min-w-0 flex-1 truncate text-[10px] tracking-[0.08em] text-neutral-400 sm:text-[11px]">
              {announcement.text}
              {announcement.url && (
                <a
                  href={announcement.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glitch-hover ml-2 whitespace-nowrap text-neutral-200 transition-colors hover:text-white"
                >
                  read →
                </a>
              )}
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
