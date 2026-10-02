import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "xr:launch-date";
const DEFAULT_TARGET = "2027-01-01T00:00";

function isValidDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

function readStoredTarget(): string {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isValidDate(stored)) return stored;
  } catch {
    // localStorage unavailable — fall through to the default target.
  }
  return DEFAULT_TARGET;
}

const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");

/**
 * Counts down to a launch date the visitor can set themselves.
 * The chosen target is kept in localStorage so it survives reloads.
 */
export function Countdown() {
  const [target, setTarget] = useState<string>(readStoredTarget);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const targetTime = useMemo(() => {
    const time = new Date(target).getTime();
    return Number.isNaN(time) ? null : time;
  }, [target]);

  const remaining = targetTime !== null ? Math.max(0, targetTime - now) : 0;
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const launched = targetTime !== null && remaining <= 0;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (!value || !isValidDate(value)) return;
    setTarget(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Ignore storage failures — the countdown still runs for this session.
    }
  };

  const units: Array<[string, number]> = [
    ["days", days],
    ["hours", hours],
    ["minutes", minutes],
    ["seconds", seconds],
  ];

  return (
    <section
      aria-label="launch countdown"
      className="w-full max-w-3xl scroll-m-24"
    >
      <p className="mb-5 text-[10px] uppercase tracking-[0.35em] text-neutral-500">
        {launched ? "launched" : "launch countdown"}
      </p>

      <div className="grid grid-cols-4 border-y border-white/10">
        {units.map(([label, value], index) => (
          <div
            key={label}
            className={
              "px-2 py-6 text-center sm:py-7 " +
              (index > 0 ? "border-l border-white/10" : "")
            }
          >
            <div className="text-3xl leading-none tabular-nums text-neutral-100 sm:text-5xl">
              {pad(value)}
            </div>
            <div className="mt-3 text-[8px] uppercase tracking-[0.2em] text-neutral-500 sm:text-[9px] sm:tracking-[0.3em]">
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <label
          htmlFor="launch-date"
          className="text-[10px] uppercase tracking-[0.35em] text-neutral-500"
        >
          countdown target
        </label>
        <input
          id="launch-date"
          type="datetime-local"
          value={target}
          onChange={handleChange}
          style={{ colorScheme: "dark" }}
          className="border border-white/15 bg-transparent px-3 py-2 font-mono text-xs tracking-wide text-neutral-200 outline-none transition-colors hover:border-white/30 focus:border-white/60"
        />
      </div>
    </section>
  );
}
