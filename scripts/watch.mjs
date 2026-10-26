/**
 * Keeps everything the storefront publishes on its own up to date, from a
 * terminal.
 *
 * Two things on the site come from IMVU and change without anyone editing the
 * repository: the shop snapshot behind the product tiles, and the creators'
 * profile pictures. Each already has a script that re-reads it; this runs them
 * all, and when an output actually changed it commits just those files and
 * pushes — which is the deploy. Nothing is committed when nothing changed, so
 * a quiet night leaves no empty commits behind.
 *
 *   npm run watch                    every 30 minutes, commit + push
 *   npm run watch -- --interval 5     every 5 minutes
 *   npm run watch -- --once           one pass, then exit
 *   npm run watch -- --no-push        commit, but keep it local
 *   npm run watch -- --dry-run        refresh only, touch no git state
 *
 * Another auto-updating source is one entry in REFRESHERS: the script that
 * refreshes it, and the files it writes. Anything listed there is refreshed,
 * committed and pushed the same way — no other change needed.
 *
 * It only runs while the terminal is open. To keep it going without a window,
 * run it under cron or launchd, or rely on the workflow's own schedule — both
 * do the same work in the same place.
 */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * Every source that updates itself: `script` is run from the repo root and
 * `outputs` are the files it writes. Add a source here and the watcher picks
 * it up — refresh it, notice the change, publish it.
 */
const REFRESHERS = [
  {
    label: "products",
    script: "scripts/refresh-products.mjs",
    outputs: ["public/products.json"],
  },
  {
    label: "creator pictures",
    script: "scripts/refresh-creators.mjs",
    outputs: ["public/creators.json"],
  },
];

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
const allOutputs = REFRESHERS.flatMap(({ outputs }) => outputs);

/** Which source writes this file — for naming it in the commit message. */
const labelFor = (path) =>
  REFRESHERS.find(({ outputs }) => outputs.includes(path))?.label ??
  path; /** A file's bytes and their sha256 — `bytes` is null when it is not there. */
async function snapshot(path) {
  const bytes = await readFile(path).catch(() => null);
  return {
    bytes,
    hash: bytes ? createHash("sha256").update(bytes).digest("hex") : "",
  };
}

/** Runs a command, echoing its output; resolves when it finishes. */
async function exec(command, argv) {
  const { stdout, stderr } = await run(command, argv, { encoding: "utf8" });
  for (const line of `${stdout}${stderr}`.split("\n")) {
    if (line.trim()) console.log(`           ${line}`);
  }
  return stdout;
}

/** One refresh of every source, publishing only what actually moved. */
async function pass() {
  const before = new Map();
  for (const path of allOutputs) before.set(path, await snapshot(path));

  for (const { label, script } of REFRESHERS) {
    log(`refreshing ${label}`);
    try {
      await exec(process.execPath, [script]);
    } catch (error) {
      // A source that cannot be read leaves its file alone; the next pass
      // tries again, and the others still go ahead.
      log(
        `${label}: refresh failed — its files stay as they are (${error.code ?? "error"})`,
      );
    }
  }

  const changed = [];
  for (const path of allOutputs) {
    const after = await snapshot(path);
    if (after.hash !== before.get(path).hash) changed.push(path);
  }
  if (changed.length === 0) {
    log("nothing changed");
    return;
  }
  log(`changed: ${changed.join(", ")}`);

  if (dryRun) {
    // Put the files back exactly as they were, so a dry run really is one.
    for (const path of changed) {
      const original = before.get(path).bytes;
      if (original) await writeFile(path, original);
      else await rm(path, { force: true });
    }
    log("--dry-run: reported only, files left untouched");
    return;
  }

  const labels = [...new Set(changed.map(labelFor))].join(", ");
  const message = `Refresh ${labels} (${stamp()} UTC)`;
  try {
    const untracked = [];
    for (const path of changed) {
      const tracked = await exec("git", ["ls-files", "--error-unmatch", path])
        .then(() => true)
        .catch(() => false);
      if (!tracked) untracked.push(path);
    }
    if (untracked.length > 0) await exec("git", ["add", "--", ...untracked]);
    await exec("git", ["commit", "-m", message, "--", ...changed]);
    log(`committed ${changed.join(", ")}`);
  } catch (error) {
    // A locked index, a missing identity, a tree that is not a repo: keep
    // watching rather than dying, and say what happened.
    log(`commit failed — the changes stay on disk (${error.code ?? "error"})`);
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
    // The commit is safe locally; the next change will push both.
    log(
      `push failed (${error.code ?? "error"}) — run \`git push\` when it is back`,
    );
  }
}

log(
  `watching ${REFRESHERS.map(({ label }) => label).join(", ")} every ` +
    `${minutes} minute${minutes === 1 ? "" : "s"}` +
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
