/* ────────────────────────────────────────────────────────────────────
   Shelf tags for the catalog.

   The feed carries IMVU's own breadcrumb — "Floor & Wall Decor", "Hair
   Accessories", "New & Featured" — which is too long for the tag in the
   tile's corner and splits one shelf across many spellings. Each item is
   folded into the handful of shelves the storefront actually shows, so
   every poster reads `decor`, every wig `hair`, and so on. A breadcrumb
   that matches nothing is shown as it arrived rather than forced into a
   shelf it does not belong to.
   ──────────────────────────────────────────────────────────────────── */

 /** Shelves, in the order they are tried when a breadcrumb matches several. */
 const SHELVES: [shelf: string, pattern: RegExp][] = [
   ["hair", /\\bhair\\b/],
   ["clothing", /\\b(cloth|outfit|shirt|top|dress|skirt|pants|jeans|short|jacket|coat|hoodie|sweater|uniform|lingerie|underwear|swim|shoe|boot|sneaker|heel)\\w*/],
   ["accessories", /\\b(accessor|jewel|necklace|ring|bracelet|earring|piercing|hat|cap|bag|purse|glass|belt|watch|scarf|glove|mask|nail)\\w*/],
   ["male accessories", /\\b(male|men'?s|man)\\w*/],
   ["makeup", /\\b(make ?up|cosmetic|lip|lash|brow|eyeliner|eyeshadow|blush|foundation)\\w*/],
   ["tattoos", /\\btattoo\\w*/],
   ["poses", /\\b(pose|animat|gesture|dance|emote)\\w*/],
   ["rooms", /\\b(room|club|venue|space|backdrop|scene)\\w*/],
   ["furniture", /\\b(furniture|chair|sofa|couch|bed|table|shelf|desk|cabinet|drawer)\\w*/],
   ["decor", /\\b(decor|floor|wall|poster|print|rug|carpet|lamp|light|mirror|frame|art|window|door)\\w*/],
   ["effects", /\\b(effect|fx|particle|aura|glow|magic)\\w*/],
   ["pets", /\\bpet\\w*/],
   ["vehicles", /\\b(vehicle|car|bike|motor|truck)\\w*/],
   ["avatars", /\\b(avatar|skin|body|face|shape)\\w*/],
 ];

 /**
  * The shelf an item belongs on, from the breadcrumb the feed reported.
  * Empty breadcrumbs return an empty tag so a tile without a category keeps
  * its corner blank rather than claiming "other".
  */
 export function categoryGroup(breadcrumb: string): string {
   const value = breadcrumb.trim().toLowerCase();
   if (!value) return "";
   for (const [shelf, pattern] of SHELVES) {
     if (pattern.test(value)) return shelf;
   }
   // Nothing recognised: keep the end of the path — the item's own level —
   // rather than the whole "home > ..." trail in a tag that has one line.
   return value.split(">").pop()?.trim() || value;
}