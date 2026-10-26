/* ────────────────────────────────────────────────────────────────────
   Live creator avatars.

   Three sources, tried in this order:

   1. The creator's profile picture (public/creators.json) — their own
      upload, so it animates when theirs is a GIF and is sharper than the
      render IMVU serves by id. `scripts/refresh-creators.mjs` keeps the
      manifest current at build time (the deploy workflow refreshes it and
      rebuilds every six hours); the picture's file name carries a hash, so a
      new upload is a new URL and the old one can never linger. The manifest
      is re-read on the same rollover as the token below, so a page left open
      picks up whatever the last deploy published.
   2. `image_avatar.php?cid=…` — IMVU's render of that member, always a
      static 80×110 JPEG. Its URL never changes and IMVU tells browsers to
      keep it for six hours (`cache-control: max-age=21600, must-revalidate`),
      so it is requested with a `v` token that rolls over every few minutes
      and again whenever the tab is shown, focused or back online. That keeps
      a long-open page from sitting on a stale face.
   3. The copy in public/creators — only for when IMVU cannot be reached at
      all, and the next refresh tries the live pictures again, so a failure
      never leaves the row pinned to the snapshot.

   Each candidate is preloaded and swapped in only once it decodes, so a
   refresh never blanks the frame.
   ──────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadCreatorPictures } from "@/lib/creatorPictures";
import type { Creator } from "@/lib/links";

/** How often an open page re-checks the manifest and the picture by id. */
const REFRESH_MS = 5 * 60_000;

/** Rollover token for both of those URLs — it changes on its own, never random. */
function useAvatarToken() {
  const [now, setNow] = useState(() => Date.now());
  const [forced, setForced] = useState(0);

  useEffect(() => {
    // A hidden tab costs nobody anything if it stops asking; becoming
    // visible again forces the check instead, so it catches up at once.
    const tick = () => {
      if (!document.hidden) setNow(Date.now());
    };
    const check = () => {
      setNow(Date.now());
      setForced((count) => count + 1);
    };

    const timer = window.setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
    };
  }, []);

  return `${Math.floor(now / REFRESH_MS)}-${forced}`;
}

/**
 * A creator's avatar. Muted until the chip is hovered or focused — the
 * parent's `group` drives that.
 */
export function CreatorAvatar({ creator }: { creator: Creator }) {
  const token = useAvatarToken();
  const [picture, setPicture] = useState("");

  // The manifest is shared by the whole row, so this is one request per
  // rollover, and only the URL for this creator is kept in state. A manifest
  // that has no entry for them (or could not be read) leaves the picture
  // already in use alone rather than dropping back to the blurry render.
  useEffect(() => {
    let cancelled = false;
    void loadCreatorPictures(token).then((pictures) => {
      const url = pictures.get(creator.id);
      if (!cancelled && url) setPicture(url);
    });
    return () => {
      cancelled = true;
    };
  }, [creator.id, token]);

  const sources = useMemo(() => {
    const live =
      creator.image + (creator.image.includes("?") ? "&" : "?") + `v=${token}`;
    return picture
      ? [picture, live, creator.fallback]
      : [live, creator.fallback];
  }, [picture, creator.image, creator.fallback, token]);

  // Sources that failed, so the next one down takes over. A rolled-over
  // token is a URL that has not failed yet, so it is retried on its own.
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const candidate = sources.find((url) => !failed.has(url));
  const [shown, setShown] = useState(sources[0]);

  const markFailed = useCallback(
    (url: string) => {
      setFailed((previous) => {
        const next = new Set(previous).add(url);
        // One broken picture must not accumulate failures forever.
        for (const stale of next) {
          if (!sources.includes(stale)) next.delete(stale);
        }
        return next;
      });
    },
    [sources],
  );

  // Preload the next source and swap it in only once it has decoded, so a
  // refresh never blanks the frame.
  useEffect(() => {
    if (!candidate || candidate === shown) return;
    let cancelled = false;
    const probe = new Image();
    probe.referrerPolicy = "no-referrer";
    probe.onload = () => {
      if (!cancelled) setShown(candidate);
    };
    probe.onerror = () => {
      if (!cancelled) markFailed(candidate);
    };
    probe.src = candidate;
    return () => {
      cancelled = true;
    };
  }, [candidate, shown, markFailed]);

  return (
    <img
      src={shown}
      alt=""
      width={52}
      height={72}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => markFailed(shown)}
      // Every source failed — nothing worth showing, but the chip keeps its
      // shape rather than collapsing around a gap.
      style={candidate ? undefined : { visibility: "hidden" }}
      className="block h-[clamp(44px,7.5vh,84px)] w-[clamp(32px,5.4vh,60px)] shrink-0 object-cover grayscale transition-[filter] duration-300 group-hover:grayscale-0 group-focus-visible:grayscale-0"
    />
  );
}
