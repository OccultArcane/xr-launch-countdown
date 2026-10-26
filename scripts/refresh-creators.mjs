/**
 * Refreshes the creators row's profile pictures from IMVU.
 *
 * Writes public/creators.json — one entry per supported creator, holding the
 * URL of whatever picture they have on their profile right now. Those are the
 * members' own uploads, so they can be animated GIFs and are sharper than the
 * 80×110 render `image_avatar.php` answers with; the file name changes when
 * they upload a new one, which is why it is read from their profile page
 * rather than built from their id (see src/lib/imvuProfile.ts).
 *
 * The deploy workflow runs this before the build and again on a schedule, so
 * the row follows the creators without anyone re-running anything by hand.
 * `npm run refresh-creators` does the same locally; commit the result.
 *
 * A creator whose page cannot be read keeps the picture already in the file,
 * so a bad minute at IMVU never blanks a face. The listing parse is the app's
 * own (src/lib/imvuProfile.ts) — type-stripped with esbuild, which Vite
 * already ships, and imported — so there is exactly one implementation of it.
 */
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const manifest = new URL("public/creators.json", root);
/** IMVU refuses default bot agents. */
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

let transform;
try {
  ({ transform } = await import("esbuild"));
} catch {
  console.error(
    "esbuild is missing — run `npm install` first (it ships with Vite).",
  );
  process.exit(1);
}

const parserSource = await readFile(
  new URL("src/lib/imvuProfile.ts", root),
  "utf8",
);
const { code } = await transform(parserSource, { loader: "ts", format: "esm" });
const { imvuProfileUrl, parseProfilePicture } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);

/**
 * Creators declared in the CREATORS block of src/lib/links.ts. `label` is the
 * creator's IMVU username — the handle their profile lives at — which is what
 * the profile page is fetched by.
 */
async function readCreators() {
  const source = await readFile(new URL("src/lib/links.ts", root), "utf8");
  const block = source.match(/const CREATORS[^=]*=\s*\[([\s\S]*?)\n\];/)?.[1];
  if (!block) {
    throw new Error(
      "could not find the CREATORS list in src/lib/links.ts — the shape it is parsed in changed",
    );
  }
  const creators = [
    ...block.matchAll(/label:\s*"([^"]+)",\s*id:\s*"(\d+)"/g),
  ].map(([, label, id]) => ({ label, id }));
  if (creators.length === 0) {
    throw new Error(
      "the CREATORS list in src/lib/links.ts parsed to zero creators — keep each entry as `{ label, id, avatar }`",
    );
  }
  return creators;
}

const get = (url) => fetch(url, { headers: { "user-agent": UA } });

/** The picture URL on a creator's profile page, "" when it cannot be read. */
async function readPicture(label) {
  const url = imvuProfileUrl(label);
  const page = await get(url);
  if (!page.ok) throw new Error(`profile page answered HTTP ${page.status}`);
  const picture = parseProfilePicture(await page.text());
  if (!picture) throw new Error("no og:image on the profile page");
  // Never publish a URL that does not resolve to an actual picture.
  const image = await get(picture);
  const type = image.headers.get("content-type") ?? "";
  if (!image.ok || !type.startsWith("image/")) {
    throw new Error(`picture answered HTTP ${image.status} (${type})`);
  }
  const bytes = Number(image.headers.get("content-length") ?? 0);
  if (bytes > 0 && bytes < 1024)
    throw new Error("picture is suspiciously small");
  return picture;
}

/** Entries already in the file — kept whenever a refresh fails. */
async function readExisting() {
  try {
    const rows = JSON.parse(await readFile(manifest, "utf8"));
    return new Map(
      (Array.isArray(rows) ? rows : []).map((row) => [
        String(row?.id ?? ""),
        String(row?.image ?? ""),
      ]),
    );
  } catch {
    return new Map(); // no manifest yet, or unreadable — start clean
  }
}

const creators = await readCreators();
const previous = await readExisting();
const items = [];
let refreshed = 0;

for (const { label, id } of creators) {
  const kept = previous.get(id) ?? "";
  try {
    const image = await readPicture(label);
    items.push({ id, image });
    refreshed += 1;
    const changed = image !== kept;
    console.log(
      `  ok    ${label.padEnd(14)} ${changed ? "updated" : "unchanged"}  ${image}`,
    );
  } catch (error) {
    items.push({ id, image: kept });
    console.warn(
      `  warn  ${label.padEnd(14)} ${error.message}` +
        (kept ? " — keeping the picture already in the file" : " — no picture"),
    );
  }
}

// Nothing read at all means IMVU's pages or their markup moved under us. The
// pictures already in the file stay (a stale face beats a blank one), but this
// exits non-zero so the run says so, instead of reporting success over a
// manifest that has quietly stopped following the creators.
if (refreshed === 0) {
  const kept = items.filter((item) => item.image).length;
  console.error(
    kept > 0
      ? `\nno creator picture could be read this run — keeping the ${kept} already in public/creators.json. IMVU's profile pages may have changed shape.`
      : "\nno creator picture could be read and there is nothing to keep — leaving public/creators.json alone",
  );
  process.exit(1);
}

await writeFile(manifest, `${JSON.stringify(items, null, 2)}\n`);
console.log(
  `wrote public/creators.json — ${refreshed} of ${items.length} read now, ` +
    `${items.length - refreshed} kept from the previous file`,
);
