/* ────────────────────────────────────────────────────────────────────
   xr storefront — navigation links

   The header shows the studio's social channels; the row under the
   countdown credits the creators the studio backs. Edit either list here
   and both the header and the landing page pick the change up.
   ──────────────────────────────────────────────────────────────────── */

import { asset } from "./asset";

/**
 * Social channels — full URLs, each rendered inside its own brackets
 * ([label]) so the row needs no separator between entries. `label` is the
 * short form shown in the header, `full` the readable name kept for the
 * link's tooltip and accessible name. An empty href renders the entry
 * dimmed as inactive (Discord: drop its invite in when the server exists
 * and it goes live).
 */
export const SOCIALS = [
  {
    label: "Pin",
    full: "Pinterest",
    href: "https://www.pinterest.com/xrimvu",
  },
  {
    label: "IG",
    full: "Instagram",
    href: "https://www.instagram.com/xr.imvu/",
  },
  { label: "Disc", full: "Discord", href: "" },
];

/**
 * Live avatar of an IMVU creator (their "manufacturer" id). IMVU serves the
 * current picture here and asks browsers to revalidate every six hours, so
 * the row follows a creator's new avatar with no rebuild and no snapshot to
 * refresh by hand.
 */
export const creatorAvatarUrl = (manufacturersId: string) =>
  `https://www.imvu.com/catalog/image_avatar.php?cid=${manufacturersId}`;

/**
 * The creators the studio backs, as their IMVU manufacturer id — the one
 * value that identifies them in both their shop link and their avatar — plus
 * the file in public/creators that stands in while IMVU is unreachable.
 *
 * `scripts/check-creators.mjs` reads this list straight out of the source and
 * fails the build when an avatar stops resolving, so keep each entry on one
 * line in this shape (`label`, `id`, `avatar`); the shop link, live avatar
 * and fallback are derived below.
 */
const CREATORS: Array<{ label: string; id: string; avatar: string }> = [
  { label: "chokinglotus", id: "272737258", avatar: "chokinglotus.jpg" },
  { label: "Numen", id: "179356122", avatar: "numen.jpg" },
  { label: "G59", id: "119374898", avatar: "g59.jpg" },
];

/** Supported creators, each linked to their IMVU shop by manufacturers id. */
export const SUPPORTED_CREATORS = CREATORS.map((creator) => ({
  label: creator.label,
  id: creator.id,
  href: `https://www.imvu.com/shop/web_search.php?manufacturers_id=${creator.id}`,
  image: creatorAvatarUrl(creator.id),
  fallback: asset(`creators/${creator.avatar}`),
}));

/** One entry of that row, as the landing page and its avatar render it. */
export type Creator = (typeof SUPPORTED_CREATORS)[number];
