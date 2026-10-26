import { asset } from "./asset";

/**
 * Creator profile pictures, as written by `scripts/refresh-creators.mjs`.
 *
 * The file names carry a hash that changes when a creator uploads a new
 * picture, so this manifest is what keeps the row from showing yesterday's
 * face: the deploy workflow re-reads it before every build, and on a schedule
 * of its own. A browser cannot look it up directly — IMVU sends no CORS
 * header, so its profile pages are unreadable from here — which is why the
 * lookup happens at build time and lands in this one small file.
 */

/** One row of public/creators.json. */
type PictureRow = { id?: string; image?: string };

let cached: { token: string; pictures: Promise<Map<string, string>> } | null =
  null;

/**
 * id → profile-picture URL, shared by every avatar on the page.
 *
 * `token` is the caller's cache-buster. It rolls over every few minutes, so a
 * page left open asks for the manifest again and picks up a picture the last
 * deploy published — GitHub Pages caches files for ten minutes, which would
 * otherwise be the floor on how fresh a reload could be.
 *
 * An unreadable manifest yields an empty map, so the avatars simply fall back
 * to the render IMVU serves by id; the next rollover tries again.
 */
export function loadCreatorPictures(token = ""): Promise<Map<string, string>> {
  if (cached?.token === token) return cached.pictures;

  const url =
    asset("creators.json") + (token ? `?v=${encodeURIComponent(token)}` : "");
  const pictures = fetch(url)
    .then((response) => (response.ok ? response.json() : []))
    .then((rows: unknown) => {
      const found = new Map<string, string>();
      if (Array.isArray(rows)) {
        for (const row of rows as PictureRow[]) {
          const id = String(row?.id ?? "").trim();
          const image = String(row?.image ?? "").trim();
          if (id && /^https:\/\//i.test(image)) found.set(id, image);
        }
      }
      return found;
    })
    .catch(() => new Map<string, string>()); // offline or unreadable

  cached = { token, pictures };
  return pictures;
}
