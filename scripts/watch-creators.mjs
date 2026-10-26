/**
 * Keeps the creators row current from a terminal, without waiting for the
 * scheduled GitHub run.
 *
 * `npm run watch-creators` refreshes public/creators.json on an interval, and
 * when a creator's picture has actually changed it commits that file and
 * pushes — which is the deploy. Nothing is committed when nothing changed, so
 * a quiet night leaves no empty commits behind.
 *
 *   npm run watch-creators                  every 30 minutes, commit + push
 *   npm run watch-creators -- --interval 5   every 5 minutes
 *   npm run watch-creators -- --once         one pass, then exit
 *   npm run watch-creators -- --no-push      commit, but keep it local
 *   npm run watch-creators -- --dry-run      refresh only, touch no git state
 *
 * It only runs while the terminal is open. To keep it going without a window,
 * run it under cron or launchd, or rely on the workflow's own schedule — both
 * do the same work in the same place.
 */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const run = promisify(execFile);
const MANIFEST = "public/creators.json";
const REFRESH = "scripts/refresh-creators.mjs";

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const value = (flag, fallback) => {
  const at = args.indexOf(flag);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};

const once = has("--once");
const dryRun = has("--dry-run");
const push = !has("--no-push") && !dryRun;
const minutes = Number(value("--interval", "30"));

if (!Number.isFinite(minutes) || minutes <= 0) {
  console.error(
    `--interval needs a positive number of minutes, got "${value("--interval", "")}"`,
  );
  process.exit(1);
}

const stamp = () => new Date().toISOString().replace("T", " ").slice(0, 19);
const log = (message) => console.log(`[${stamp()}] ${message}`);

/** sha256 of the manifest, or "" when there is no file yet. */
async function fingerprint() {
  try {
    return createHash("sha256")
      .update(await readFile(MANIFEST))
      .digest("hex");
  } catch {
    return "";
  }
}

/** Runs a command, echoing its output; resolves when it finishes. */
async function exec(command, argv) {
  const { stdout, stderr } = await run(command, argv, { encoding: "utf8" });
  for (const line of `${stdout}${stderr}`.split("\n")) {
    if (line.trim()) console.log(`           ${line}`);
  }
  return stdout;
}

/** One refresh pass, publishing only when the pictures actually moved. */
async function pass() {
  const before = await fingerprint();
  try {
    await exec(process.execPath, [REFRESH]);
  } catch (error) {
    // The script exits non-zero when it could not read anyone: the manifest
    // is untouched, so there is nothing to publish and the next pass retries.
    log(`refresh failed — nothing published (${error.code ?? "error"})`);
    return;
  }
  const after = await fingerprint();
  if (after === before) {
    log("pictures unchanged");
    return;
  }
  log("picture changed in public/creators.json");

  if (dryRun) {
    log("--dry-run: leaving the change uncommitted");
    return;
  }

  const message = `Refresh creator pictures (${stamp()} UTC)`;
  try {
    const tracked = await exec("git", ["ls-files", "--error-unmatch", MANIFEST])
      .then(() => true)
      .catch(() => false);
    if (!tracked) await exec("git", ["add", "--", MANIFEST]);
    await exec("git", ["commit", "-m", message, "--", MANIFEST]);
    log(`committed ${MANIFEST}`);
  } catch (error) {
    // A locked index, a missing identity, a tree that is not a repo: keep
    // watching rather than dying, and say what happened.
    log(
      `commit failed — the change stays in ${MANIFEST} (${error.code ?? "error"})`,
    );
    return;
  }

  if (!push) {
    log("--no-push: left the commit local");
    return;
  }
  try {
    await exec("git", ["push"]);
    log("pushed — the deploy workflow picks it up from here");
  } catch (error) {
    // The commit is safe locally; the next changed picture will push both.
    log(
      `push failed (${error.code ?? "error"}) — run \`git push\` when it is back`,
    );
  }
}

log(
  `watching creator pictures every ${minutes} minute${minutes === 1 ? "" : "s"}` +
    `${push ? ", publishing changes" : ""}${dryRun ? " (dry run)" : ""}`,
);

// Ctrl-C ends the loop between passes rather than mid-commit.
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
  log("stopping after this pass");
});

do {
  await pass();
  if (!once && !stopping) {
    log(`next check in ${minutes} minute${minutes === 1 ? "" : "s"}`);
    await new Promise((resolve) => setTimeout(resolve, minutes * 60_000));
  }
} while (!once && !stopping);

log("done");
