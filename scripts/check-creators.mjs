/**
 * Fails the build when a supported creator's live avatar stops resolving.
 *
 * The landing page loads each creator's avatar straight from IMVU's
 * `image_avatar.php`, so a closed shop or a changed id would show up as a
 * dead picture for real visitors and nothing in the build would notice. This
 * checks every creator in `src/lib/links.ts` before the bundle is written:
 * a non-image response, or a request that never succeeds, stops the deploy.
 *
 * IMVU answers an unknown id with 200 and its generic "profile image"
 * placeholder rather than a 404, so a status check alone would pass a
 * creator that no longer exists — the response is hashed and compared
 * against that placeholder as well.
 *
 * The list is read out of the source as text rather than imported —
 * `links.ts` resolves its fallback paths from `import.meta.env` at import
 * time, which plain Node does not provide — so the parse is deliberately
 * narrow and says so when it stops matching.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const linksSource = new URL("../src/lib/links.ts", import.meta.url);
/** IMVU refuses default bot agents. */
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const ATTEMPTS = 3;
/**
 * sha256 of the image IMVU returns for any id that has no avatar
 * (`image_avatar.php?cid=999999999`, 3491 bytes, read 2026-10-25). Its ETag
 * is "jrc-26570004004d0b0c063df06aef0d497d"; if IMVU ever changes the
 * placeholder, refresh this from a request to an unused id.
 */
const PLACEHOLDER_SHA256 =
  "bbc4634c125e8ab3b3a77665b3b53b7e5ae20976a004dcf213fb1111a08fcc3d";

/** Creators declared in the CREATORS block: `{ label: "…", id: "…" }`. */
async function readCreators() {
  const source = await readFile(linksSource, "utf8");
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

/**
 * One avatar. A 200 carrying an image that is not IMVU's placeholder passes;
 * a 4xx or the placeholder is final (the id is gone, so a retry changes
 * nothing); a 5xx or a network error is retried before it counts.
 */
async function checkAvatar({ label, id }) {
  const url = `https://www.imvu.com/catalog/image_avatar.php?cid=${id}`;
  let detail = "no attempt made";

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, { headers: { "user-agent": UA } });
      const type = response.headers.get("content-type") ?? "no content-type";
      if (response.ok && type.startsWith("image/")) {
        const body = Buffer.from(await response.arrayBuffer());
        const digest = createHash("sha256").update(body).digest("hex");
        if (digest === PLACEHOLDER_SHA256) {
          return {
            label,
            id,
            url,
            ok: false,
            detail:
              "IMVU served its generic profile-image placeholder — the id has no creator behind it",
          };
        }
        return { label, id, url, ok: true, detail: `${response.status} ${type} ${body.length}b` };
      }
      detail = `HTTP ${response.status} (${type})`;
      if (response.status >= 400 && response.status < 500) break;
    } catch (error) {
      detail = `unreachable — ${error.message}`;
    }
    if (attempt < ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }
  }

  return { label, id, url, ok: false, detail };
}

/**
 * Checks every supported creator's avatar. Returns the results plus the ones
 * that failed; the caller decides how to fail (the build exits, the npm
 * script exits).
 */
export async function verifyCreatorAvatars() {
  const creators = await readCreators();
  const results = [];
  for (const creator of creators) {
    const result = await checkAvatar(creator);
    results.push(result);
    console.log(
      `  ${result.ok ? "ok  " : "FAIL"}  ${creator.label.padEnd(14)} ${result.detail}`,
    );
  }
  return { results, broken: results.filter((result) => !result.ok) };
}

// `npm run check-creators`, or any direct run, reports and exits non-zero.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { results, broken } = await verifyCreatorAvatars();
  if (broken.length > 0) {
    console.error(
      `\n${broken.length} of ${results.length} creator avatars did not resolve — the landing page would show a dead photo. Fix the id in src/lib/links.ts (or the shop behind it) and re-run.`,
    );
    process.exit(1);
  }
  console.log(`\nall ${results.length} creator avatars resolved`);
}
