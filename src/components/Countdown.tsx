import { useEffect, useMemo, useState } from "react";

/** The drop opens every Friday (5 = Friday, 0 = Sunday). */
const DROP_WEEKDAY = 5;
/** Local hour the drop opens. */
const DROP_HOUR = 0;

const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");

/**
 * Timestamp of the next upcoming drop: DROP_WEEKDAY at DROP_HOUR, local
 * time. Always strictly in the future, so the timer rolls straight over to
 * the next Friday the moment a drop opens.
 */
function nextDrop(now: number): number {
  const date = new Date(now);
  date.setHours(DROP_HOUR, 0, 0, 0);
  date.setDate(date.getDate() + ((DROP_WEEKDAY - date.getDay() + 7) % 7));
  if (date.getTime() <= now) date.setDate(date.getDate() + 7);
  return date.getTime();
}

/**
 * Counts down to the weekly drop, which lands every Friday at DROP_HOUR.
 * The target is derived from the clock, so it rolls over on its own.
 */
export function Countdown() {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const target = useMemo(() => nextDrop(now), [now]);
  const remaining = Math.max(0, target - now);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const dropDay = new Date(now).getDay() === DROP_WEEKDAY;

  const dropDate = new Date(target);
  const dateLabel = `${dropDate.getFullYear()}-${pad(dropDate.getMonth() + 1)}-${pad(dropDate.getDate())}`;

  const units: Array<[string, number]> = [
    ["days", days],
    ["hours", hours],
    ["minutes", minutes],
    ["seconds", seconds],
  ];

  return (
    <section aria-label="drop countdown" className="w-full max-w-3xl">
      <div className="mb-5 flex items-baseline justify-between text-[10px] uppercase tracking-[0.35em] short:mb-3 shorter:mb-2">
        <span className="text-xr-red">
          {dropDay ? "drop day" : "next drop"}
        </span>
        <span className="tabular-nums text-xr-red">{dateLabel}</span>
      </div>

      <div className="grid grid-cols-4 border-y border-white/10">
        {units.map(([label, value], index) => (
          <div
            key={label}
            className={
              "px-2 py-6 text-center @sm:py-7 short:py-4 shorter:py-3 " +
              (index > 0 ? "border-l border-white/10" : "")
            }
          >
            <div className="text-3xl leading-none tabular-nums text-neutral-100 @sm:text-5xl">
              {pad(value)}
            </div>
            <div className="mt-3 text-[8px] uppercase tracking-[0.2em] text-neutral-500 @sm:text-[9px] @sm:tracking-[0.3em]">
              {label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
