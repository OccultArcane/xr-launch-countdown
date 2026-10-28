/**
 * Puts the storefront watcher on this machine's own scheduler, so the product
 * snapshot and the creators' pictures keep refreshing with no terminal open.
 *
 *   npm run schedule                      install and enable, every 30 minutes
 *   npm run schedule -- --interval 5      every 5 minutes
 *   npm run schedule -- --status          installed? when does it next run?
 *   npm run schedule -- --uninstall       take the schedule back off
 *   npm run schedule -- --dry-run         print what would be written and run
 *   npm run schedule -- --scheduler cron  force one: systemd, launchd or cron
 *   npm run schedule -- --linger          systemd: also run with no session
 *
 * `scripts/watch.mjs` already does one pass and exits (`--once`); what is
 * missing is something to call it again half an hour later. Every OS has that
 * already — launchd on macOS, a systemd user timer on Linux, cron as the
 * fallback — but each fails in its own way when configured by hand, so this
 * writes the configuration the platform actually wants.
 *
 * Two details it gets right that a copy-paste of the README does not: the
 * paths are this clone's real ones (no `%h`, no `/path/to`), and the node
 * binary baked in is the one running this script (`process.execPath`) — a
 * scheduled job gets no shell profile, so `node` from nvm or volta is
 * invisible to it and `npm run watch` would not even be found.
 */
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);

/** The repository root — this file lives in `<root>/scripts/`. */
export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SYSTEMD_DIR = join(homedir(), ".config", "systemd", "user");
const SERVICE_PATH = join(SYSTEMD_DIR, "xr-watch.service");
const TIMER_PATH = join(SYSTEMD_DIR, "xr-watch.timer");
const LABEL = "com.xr-launch-countdown.watch";
const PLIST_PATH = join(homedir(), "Library", "LaunchAgents", `${LABEL}.plist`);
const PLIST_LOG = join(homedir(), "Library", "Logs", "xr-watch.log");
const CRON_LOG = join(homedir(), "xr-watch.log");
/** Written above the crontab entry so a re-install can find its own line. */
const CRON_MARKER = "# xr-launch-countdown watcher (npm run schedule)";

const GENERATED =
  "Written by scripts/install-schedule.mjs — re-run `npm run schedule` to " +
  "change it, or `--uninstall` to remove it.";
/** An XML comment cannot contain `--`, so the plist gets its own wording. */
const GENERATED_XML =
  "Written by scripts/install-schedule.mjs. Re-run npm run schedule to " +
  "change it, or add the uninstall flag to remove it.";

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const value = (flag, fallback) => {
  const at = args.indexOf(flag);
  return at >= 0 && args[at + 1] && !args[at + 1].startsWith("--")
    ? args[at + 1]
    : fallback;
};

const dryRun = has("--dry-run");
const say = (message) => console.log(message);
const step = (message) => console.log(`  ${message}`);

// Piping this into `head` closes stdout early; leave quietly rather than
// throwing EPIPE out of the middle of a console.log.
process.stdout.on("error", (error) => {
  if (error.code === "EPIPE") process.exit(0);
  throw error;
});

/** POSIX single-quoting, so a path with a space survives a shell. */
const quote = (text) => `'${String(text).replace(/'/g, `'\\''`)}'`;
/** The same value inside XML text. */
const xml = (text) =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Runs a command and reports it; never throws, so callers can fall back. */
async function sh(command, argv, options = {}) {
  try {
    const { stdout, stderr } = await run(command, argv, {
      encoding: "utf8",
      ...options,
    });
    return { ok: true, out: `${stdout}${stderr}`.trim() };
  } catch (error) {
    const out = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim();
    return { ok: false, code: error.code, out: out || error.message };
  }
}

/** Runs a command as part of the install, or prints it under --dry-run. */
async function act(command, argv, options) {
  if (dryRun) {
    step(`would run: ${command} ${argv.join(" ")}`);
    return { ok: true, out: "" };
  }
  const result = await sh(command, argv, options);
  step(
    result.ok
      ? `${command} ${argv.join(" ")}`
      : `${command} ${argv.join(" ")} — failed: ${result.out || result.code}`,
  );
  return result;
}

/** Writes a file (creating its directory), or prints it under --dry-run. */
async function writeText(path, text) {
  if (dryRun) {
    step(`would write ${path}:`);
    for (const line of text.trimEnd().split("\n")) console.log(`    │ ${line}`);
    return;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text);
  step(`wrote ${path}`);
}

/** Deletes a file, or says it would under --dry-run. */
async function removeFile(path) {
  if (dryRun) {
    step(`would remove ${path}`);
    return;
  }
  await rm(path, { force: true });
  step(`removed ${path}`);
}

/** Feeds stdin to a command — the only way to replace a crontab. */
function feed(command, argv, input) {
  return new Promise((done) => {
    const child = execFile(
      command,
      argv,
      { encoding: "utf8" },
      (error, stdout, stderr) => {
        done({
          ok: !error,
          out: `${stdout ?? ""}${stderr ?? ""}`.trim() || error?.message || "",
        });
      },
    );
    child.stdin?.end(input);
  });
}

/* ── Renderers ─────────────────────────────────────────────────────────
   The systemd units are rendered from `deploy/systemd/` so the directives
   have one home; launchd and cron have nothing to render from, so they are
   written here. Each takes explicit values so the CLI — and a test — can
   produce the file without touching the machine. */

/** The clock schedule for an interval, or "" when it has no clean one. */
function onTheClock(minutes) {
  // 60 has to be `hourly`: the minute field stops at 59, so `*:0/60` is not
  // a valid expression and systemd rejects the unit outright.
  if (minutes === 60) return "OnCalendar=hourly";
  return minutes < 60 && 60 % minutes === 0 ? `OnCalendar=*:0/${minutes}` : "";
}

export async function renderSystemd({
  repo = REPO,
  node = process.execPath,
  minutes = 30,
} = {}) {
  // Drop the template's how-to-install notes: this copy is generated, and
  // stale instructions in ~/.config only mislead.
  const directives = (text) => text.slice(text.indexOf("[Unit]"));
  const read = (name) =>
    readFile(join(REPO, "deploy", "systemd", name), "utf8");
  const exec = /[\s"']/.test(node) ? `"${node}"` : node;

  const service =
    `# ${GENERATED}\n\n` +
    directives(await read("xr-watch.service"))
      .replaceAll("%h/xr-launch-countdown", repo)
      .replace("ExecStart=/usr/bin/env node ", `ExecStart=${exec} `);

  // An interval the clock cannot express (45, 90) counts from boot instead:
  // a pass two minutes in, then every interval after the last one.
  const clock = onTheClock(minutes);
  const schedule = clock
    ? `${clock}\nPersistent=true`
    : `OnBootSec=2min\nOnUnitActiveSec=${minutes}min`;

  const timer =
    `# ${GENERATED}\n\n` +
    directives(await read("xr-watch.timer")).replace(
      /^OnCalendar=\*:0\/30\nPersistent=true$/m,
      schedule,
    );

  return { service, timer };
}

export async function renderPlist({
  repo = REPO,
  node = process.execPath,
  minutes = 30,
} = {}) {
  // Rendered from `deploy/launchd/` the same way the systemd units come from
  // `deploy/systemd/`, so each key has one home. The template's own install
  // notes are dropped: this copy is generated, and stale notes mislead.
  const template = await readFile(
    join(REPO, "deploy", "launchd", `${LABEL}.plist`),
    "utf8",
  );

  // launchd runs no shell profile either, so the work goes through bash -lc
  // with absolute paths; `exec` leaves launchd's PID on node, not on bash.
  const command = `cd ${quote(repo)} && exec ${quote(node)} scripts/watch.mjs --once`;

  const plist = template
    .replace(/(<string>)cd [^<]*(<\/string>)/, `$1${xml(command)}$2`)
    .replaceAll("/Users/YOU/xr-launch-countdown", xml(repo))
    .replaceAll("/Users/YOU/Library/Logs/xr-watch.log", xml(PLIST_LOG))
    .replace("<integer>1800</integer>", `<integer>${minutes * 60}</integer>`);

  const head = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">`,
    `<!-- ${GENERATED_XML} -->`,
  ].join("\n");

  return `${head}\n${plist.slice(plist.indexOf("<plist"))}`;
}

export function renderCronLine({
  repo = REPO,
  node = process.execPath,
  minutes = 30,
} = {}) {
  // Five time fields, then a shell line: absolute cd and node, output to a
  // log cron can write, and `--once` because cron is the loop.
  const when =
    minutes < 60 ? `*/${minutes} * * * *` : `0 */${minutes / 60} * * *`;
  return (
    `${CRON_MARKER}\n` +
    `${when} cd ${quote(repo)} && exec ${quote(node)} scripts/watch.mjs --once ` +
    `>> ${quote(CRON_LOG)} 2>&1`
  );
}

/* ── Detection ───────────────────────────────────────────────────────── */

/** Which scheduler this machine actually has, and why. */
export async function detectScheduler() {
  if (process.platform === "darwin") {
    return { name: "launchd", why: "macOS runs launchd for every user agent" };
  }
  if (process.platform === "win32") {
    return {
      name: "",
      why:
        "Windows is not covered — make a Task Scheduler job that runs " +
        `"${join(REPO, "scripts", "watch.mjs")}" --once every 30 minutes`,
    };
  }
  if (process.platform !== "linux") {
    return {
      name: "",
      why: `${process.platform} is not covered — see the README`,
    };
  }
  // `show-environment` is the cheapest probe that needs a live user manager:
  // a Linux box without one (a container, or cron-only) still has systemctl,
  // but enabling a unit there would fail later instead of here.
  const user = await sh("systemctl", ["--user", "show-environment"]);
  if (user.ok) {
    return { name: "systemd", why: "a systemd user instance answered" };
  }
  const cron = await sh("/bin/sh", ["-c", "command -v crontab"]);
  if (cron.ok) {
    return {
      name: "cron",
      why: `no systemd user instance (${user.out.split("\n")[0]})`,
    };
  }
  return {
    name: "",
    why:
      "neither a systemd user instance nor crontab is available — install one " +
      "(e.g. `sudo apt install cron`) or run `npm run watch` in a terminal",
  };
}

/** The forced scheduler, or what the machine has. */
async function chosen() {
  const detected = await detectScheduler();
  const forced = value("--scheduler", "");
  if (!forced) return detected;
  const known = ["systemd", "launchd", "cron"];
  if (!known.includes(forced)) {
    throw new Error(`--scheduler takes ${known.join(", ")}, not "${forced}"`);
  }
  return { name: forced, why: "forced with --scheduler" };
}

/* ── Install / inspect / remove ──────────────────────────────────────── */

async function installSystemd({ minutes }) {
  const { service, timer } = await renderSystemd({ minutes });
  await writeText(SERVICE_PATH, service);
  await writeText(TIMER_PATH, timer);
  await act("systemctl", ["--user", "daemon-reload"]);
  await act("systemctl", ["--user", "enable", "--now", "xr-watch.timer"]);

  if (has("--linger")) {
    const user = process.env.USER ?? process.env.LOGNAME ?? "";
    if (!(await act("loginctl", ["enable-linger", user])).ok) {
      step(`retry with: sudo loginctl enable-linger ${user}`);
    }
  } else {
    step(
      "note: a user timer stops at logout — `npm run schedule -- --linger` " +
        "keeps it running with no session",
    );
  }
}

async function installLaunchd({ minutes }) {
  await writeText(PLIST_PATH, await renderPlist({ minutes }));
  const domain = `gui/${process.getuid?.() ?? ""}`;
  // Re-installing over a loaded agent is refused, so unload first; a failed
  // bootout just means it was not loaded.
  if (!dryRun) await sh("launchctl", ["bootout", `${domain}/${LABEL}`]);
  const loaded = await act("launchctl", ["bootstrap", domain, PLIST_PATH]);
  if (!loaded.ok && !dryRun) {
    // Some images only ship the older verbs.
    await act("launchctl", ["load", "-w", PLIST_PATH]);
  }
}

async function installCron({ minutes }) {
  // `*/45 * * * *` is not every 45 minutes — it is :00 and :45 — so cron can
  // only carry an interval that steps evenly through the hour.
  if (60 % minutes !== 0) {
    throw new Error(
      `cron cannot run every ${minutes} minutes — it steps evenly through the ` +
        "hour, so use one of 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60",
    );
  }
  const entry = renderCronLine({ minutes });
  const existing = await sh("crontab", ["-l"]);
  const kept = (existing.ok ? existing.out : "")
    .split("\n")
    .filter(
      (line) =>
        line.trim() &&
        !line.includes(CRON_MARKER) &&
        !line.includes("xr-watch.mjs"),
    );

  if (dryRun) {
    step("would replace the crontab with:");
    for (const line of [...kept, entry]) console.log(`    │ ${line}`);
    return;
  }
  const result = await feed(
    "crontab",
    ["-"],
    `${[...kept, entry].join("\n")}\n`,
  );
  if (!result.ok) throw new Error(`could not write the crontab: ${result.out}`);
  step("installed the crontab entry");
  step(`passes are logged to ${CRON_LOG}`);
}

async function uninstallSystemd() {
  await sh("systemctl", ["--user", "disable", "--now", "xr-watch.timer"]);
  await removeFile(SERVICE_PATH);
  await removeFile(TIMER_PATH);
  await act("systemctl", ["--user", "daemon-reload"]);
}

async function uninstallLaunchd() {
  if (!dryRun) {
    await sh("launchctl", [
      "bootout",
      `gui/${process.getuid?.() ?? ""}/${LABEL}`,
    ]);
  }
  await removeFile(PLIST_PATH);
}

async function uninstallCron() {
  const existing = await sh("crontab", ["-l"]);
  if (!existing.ok) {
    step("no crontab to edit");
    return;
  }
  const kept = existing.out
    .split("\n")
    .filter(
      (line) =>
        line.trim() &&
        !line.includes(CRON_MARKER) &&
        !line.includes("xr-watch.mjs"),
    );
  if (dryRun) {
    step(`would leave ${kept.length} other crontab line(s) untouched`);
    return;
  }
  const result = await feed("crontab", ["-"], `${kept.join("\n")}\n`);
  if (!result.ok) throw new Error(`could not write the crontab: ${result.out}`);
  step("removed the watcher's crontab entry");
}

async function status(scheduler) {
  if (scheduler === "systemd") {
    const listed = await sh("systemctl", [
      "--user",
      "list-timers",
      "xr-watch.timer",
      "--no-pager",
    ]);
    step(listed.ok ? listed.out : `not installed — ${listed.out}`);
    step("last pass: journalctl --user -u xr-watch -n 40");
    const user = process.env.USER ?? process.env.LOGNAME ?? "";
    const linger = await sh("loginctl", [
      "show-user",
      user,
      "--property=Linger",
    ]);
    step(linger.ok ? linger.out : "linger: unknown (no logind)");
    return;
  }
  if (scheduler === "launchd") {
    const printed = await sh("launchctl", [
      "print",
      `gui/${process.getuid?.() ?? ""}/${LABEL}`,
    ]);
    step(
      printed.ok
        ? printed.out.split("\n").slice(0, 6).join("\n")
        : "not loaded",
    );
    step(`last pass: tail -n 20 ${PLIST_LOG}`);
    return;
  }
  const listed = await sh("crontab", ["-l"]);
  const mine = (listed.ok ? listed.out : "")
    .split("\n")
    .filter((line) => line.includes(CRON_MARKER));
  step(mine.length > 0 ? "installed in the crontab" : "no crontab entry");
  step(`last pass: tail -n 20 ${CRON_LOG}`);
}

/* ── CLI ─────────────────────────────────────────────────────────────── */

async function main() {
  const minutes = Number(value("--interval", "30"));
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new Error(
      `--interval needs a whole number of minutes, got "${value("--interval", "")}"`,
    );
  }

  const scheduler = await chosen();
  if (!scheduler.name) throw new Error(scheduler.why);

  const action = has("--status")
    ? "checking"
    : has("--uninstall")
      ? "removing"
      : "installing";
  say(`${action} the watcher on ${scheduler.name} (${scheduler.why})`);
  say(`  repository: ${REPO}`);
  say(`  node:       ${process.execPath}`);
  if (dryRun) say("  dry run — nothing is written, no command is run");

  if (has("--status")) {
    await status(scheduler.name);
    return;
  }
  if (has("--uninstall")) {
    if (scheduler.name === "systemd") await uninstallSystemd();
    if (scheduler.name === "launchd") await uninstallLaunchd();
    if (scheduler.name === "cron") await uninstallCron();
    return;
  }

  say(`  every:      ${minutes} minute${minutes === 1 ? "" : "s"}`);
  if (scheduler.name === "systemd") await installSystemd({ minutes });
  if (scheduler.name === "launchd") await installLaunchd({ minutes });
  if (scheduler.name === "cron") await installCron({ minutes });

  if (dryRun) say("\ndry run finished — re-run without --dry-run to apply it");
  else if (scheduler.name === "systemd") {
    say("\nnext run: systemctl --user list-timers xr-watch.timer");
  } else if (scheduler.name === "launchd") {
    say(`\nnext run: within ${minutes} minutes — tail -f ${PLIST_LOG}`);
  } else {
    say(`\nnext run: within ${minutes} minutes — tail -f ${CRON_LOG}`);
  }
}

// `npm run schedule`, or any direct run, is the CLI; importing the file is not.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
