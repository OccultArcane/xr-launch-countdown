/**
 * Reads a creator's profile picture off their IMVU profile page.
 *
 * `image_avatar.php?cid=…` only ever answers with a small static JPEG
 * (80×110) — a downscaled first frame of whatever the member uploaded, and
 * it ignores every size or format parameter. A creator whose picture is an
 * animated GIF therefore shows up there as one blurry still.
 *
 * The picture itself is published as the page's share image — IMVU sets
 * `og:image` (plus its width and height) on `imvu.com/next/av/<username>`,
 * pointing at the real upload, animation intact. That page answers for
 * private profiles too, where the classic homepage hides the picture.
 *
 * The file name carries a hash that changes whenever the member uploads a
 * new picture, so the URL cannot be derived from their id: it has to be read
 * from the page. `scripts/refresh-creators.mjs` does that at build time and
 * writes public/creators.json — a browser cannot, because IMVU sends no CORS
 * header on its pages, so a cross-origin fetch there could not read the HTML.
 */

/** A creator's IMVU profile page, where the share image lives. */
export const imvuProfileUrl = (username: string) =>
  `https://www.imvu.com/next/av/${encodeURIComponent(username)}`;

const decodeEntities = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

/**
 * The profile picture URL from a profile page's `og:image`, or "" when the
 * page carries none (or points somewhere other than IMVU's image host).
 */
export function parseProfilePicture(html: string): string {
  // Attribute order is not guaranteed, so read the meta tags as a set and
  // pick the one declaring itself the share image.
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!/property\s*=\s*["']og:image["']/i.test(tag)) continue;
    const content = tag.match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
    const url = content ? decodeEntities(content).trim() : "";
    if (!/^https:\/\/[\w.-]+\.imvu\.com\//i.test(url)) return "";
    if (!/\.(gif|jpe?g|png)(\?|$)/i.test(url)) return "";
    return url;
  }
  return "";
}
