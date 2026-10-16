/* ────────────────────────────────────────────────────────────────────
   Convex deployment wiring, read once per build.

   VITE_CONVEX_URL is injected by the platform, and by .env.local when the
   sandbox runs `npx convex dev`. It is *absent* in a fresh clone, in a
   static build and on a host with no backend wired up — and that used to
   matter, because `new ConvexReactClient(undefined)` throws while the
   module loads, which took the whole storefront down to a blank page.

   The landing page, the mark, the countdown and the built-in catalog have
   no backend dependency at all, so they must render either way: the check
   below keeps the client, the provider and the live feed off the page
   whenever there is no deployment to talk to.
   ──────────────────────────────────────────────────────────────────── */

export const convexUrl =
  (import.meta.env.VITE_CONVEX_URL as string | undefined)?.trim() ?? "";

/** True when this build has a Convex deployment to talk to. */
export const hasConvex = convexUrl !== "";
