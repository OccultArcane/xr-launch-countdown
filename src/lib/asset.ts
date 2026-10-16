/* ────────────────────────────────────────────────────────────────────
   Public-asset URLs that survive being hosted under a sub-path.

   Vite exposes the build's base as import.meta.env.BASE_URL: "/" in dev and
   at a domain root, but "/<repo>/" when the storefront is served from
   https://<user>.github.io/<repo>/. A hard-coded "/logo.svg" resolves to the
   domain root and 404s there, so every file in public/ goes through here.
   ──────────────────────────────────────────────────────────────────── */

/** Absolute URL for a file in `public/`, resolved against the build base. */
export const asset = (path: string) => {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}${path.replace(/^\/+/, "")}`;
};
