/**
 * Builds the storefront for GitHub Pages.
 *
 * Project Pages serve each repository from https://<user>.github.io/<repo>/,
 * so the build has to be told that sub-path — otherwise every asset, font and
 * feed request resolves against the domain root and 404s. `npm run build`
 * still produces a root-relative build for any other host.
 *
 * Pages also has no SPA rewrite, so unknown paths get Pages' own 404 page
 * unless we hand it the app shell: the copy below boots the router from a deep
 * link such as /<repo>/products/76161696.
 *
 * The creator avatars are checked first: the landing page loads them live
 * from IMVU, so an id that stopped resolving would ship a dead photo. A
 * failure here stops the build (and so the deploy) before anything is
 * written.
 */
import { cp, writeFile } from "node:fs/promises";
import { build } from "vite";
import { verifyCreatorAvatars } from "./check-creators.mjs";

const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base = process.env.PAGES_BASE ?? (repo ? `/${repo}/` : "/");

const { results, broken } = await verifyCreatorAvatars();
if (broken.length > 0) {
  console.error(
    `\n${broken.length} of ${results.length} creator avatars did not resolve — build stopped so the deploy cannot ship a dead photo.`,
  );
  process.exit(1);
}

await build({ base });

await cp("dist/index.html", "dist/404.html");
// Pages runs Jekyll unless it is told not to.
await writeFile("dist/.nojekyll", "");

console.log(`built for ${base} — deep links fall back to dist/404.html`);
