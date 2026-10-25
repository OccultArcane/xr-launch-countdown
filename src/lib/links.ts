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
  { label: "disc", full: "Discord", href: "" },
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
 * Supported creators, each linked to their IMVU shop by manufacturers id.
 * `image` is the creator's live avatar (see creatorAvatarUrl); `fallback` is
 * a copy in public/creators used only when IMVU cannot be reached, so the
 * row still shows a face offline.
 */
export const SUPPORTED_CREATORS = [
  {
    label: "chokinglotus",
    id: "272737258",
    href: "https://www.imvu.com/shop/web_search.php?manufacturers_id=272737258",
    image: creatorAvatarUrl("272737258"),
    fallback: asset("creators/chokinglotus.jpg"),
  },
  {
    label: "Numen",
    id: "179356122",
    href: "https://www.imvu.com/shop/web_search.php?manufacturers_id=179356122",
    image: creatorAvatarUrl("179356122"),
    fallback: asset("creators/numen.jpg"),
  },
  {
    label: "G59",
    id: "119374898",
    href: "https://www.imvu.com/shop/web_search.php?manufacturers_id=119374898",
    image: creatorAvatarUrl("119374898"),
    fallback: asset("creators/g59.jpg"),
  },
];
