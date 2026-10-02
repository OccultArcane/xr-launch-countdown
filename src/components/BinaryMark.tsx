import { useEffect, useRef } from "react";

type Cell = {
  x: number;
  y: number;
  ch: string;
  alpha: number;
  phase: number;
  amp: number;
  speed: number;
  flipAt: number;
  drift: number;
  inside: boolean;
};

const FONT_FAMILY =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

const ALPHA_STEPS = 24;
const STYLES: string[] = Array.from(
  { length: ALPHA_STEPS + 1 },
  (_, i) => `rgba(240,240,240,${(i / ALPHA_STEPS).toFixed(3)})`,
);

function styleFor(alpha: number) {
  const step = Math.round(alpha * ALPHA_STEPS);
  return STYLES[Math.max(0, Math.min(ALPHA_STEPS, step))];
}

/**
 * The "xr" wordmark drawn as a grid of 0s and 1s. Digits inside the glyph
 * flicker, flip and jitter in place; a sparse ambient field drifts behind them.
 */
export function BinaryMark() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let cells: Cell[] = [];
    let width = 0;
    let height = 0;
    let cell = 11;
    let raf = 0;
    let resizeTimer: number | undefined;

    const build = () => {
      const rect = wrap.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Rasterize the wordmark once and sample its alpha channel as a mask.
      const off = document.createElement("canvas");
      off.width = width;
      off.height = height;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;

      octx.fillStyle = "#fff";
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      let fontSize = Math.min(height * 1.02, width * 0.55);
      octx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
      const metrics = octx.measureText("xr");
      const maxWidth = width * 0.72;
      if (metrics.width > maxWidth && metrics.width > 0) {
        fontSize *= maxWidth / metrics.width;
        octx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
      }
      octx.fillText("xr", width / 2, height / 2);
      const mask = octx.getImageData(0, 0, width, height).data;

      cell = width < 560 ? 8 : width < 900 ? 10 : 11;
      const next: Cell[] = [];
      const now = performance.now();

      for (let gy = cell / 2; gy < height; gy += cell) {
        for (let gx = cell / 2; gx < width; gx += cell) {
          const px = Math.min(width - 1, Math.floor(gx));
          const py = Math.min(height - 1, Math.floor(gy));
          const coverage = mask[(py * width + px) * 4 + 3] / 255;

          let alpha = 0;
          let inside = false;
          if (coverage > 0.55) {
            inside = true;
            alpha = 0.5 + Math.random() * 0.5;
          } else if (coverage > 0.1) {
            // Ragged glyph edges: partially filled cells, dimmer.
            if (Math.random() < 0.55) alpha = 0.1 + Math.random() * 0.28;
          } else if (Math.random() < 0.05) {
            // Sparse ambient field.
            alpha = 0.035 + Math.random() * 0.075;
          }
          if (alpha <= 0) continue;

          const anchored = coverage > 0.1;
          next.push({
            x: gx,
            y: gy,
            ch: Math.random() < 0.5 ? "0" : "1",
            alpha,
            phase: Math.random() * Math.PI * 2,
            amp: anchored ? 0.5 + Math.random() * 1.3 : 1 + Math.random() * 3,
            speed: 0.35 + Math.random() * 1.1,
            flipAt: reduceMotion ? 0 : now + 500 + Math.random() * 4000,
            drift: anchored ? 0 : 3 + Math.random() * 9,
            inside,
          });
        }
      }

      // Ambient digits first, wordmark on top.
      next.sort((a, b) => Number(a.drift === 0) - Number(b.drift === 0));
      cells = next;

      if (reduceMotion) draw(performance.now());
    };

    const draw = (nowMs: number) => {
      const t = nowMs / 1000;
      ctx.clearRect(0, 0, width, height);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `500 ${cell * 0.95}px ${FONT_FAMILY}`;

      for (const c of cells) {
        if (c.flipAt !== 0 && nowMs > c.flipAt) {
          c.ch = c.ch === "0" ? "1" : "0";
          c.flipAt = nowMs + 700 + Math.random() * 4200;
        }

        let x = c.x;
        let y: number;
        let alpha = c.alpha;

        if (reduceMotion) {
          y = c.y;
        } else if (c.drift > 0) {
          y = ((c.y + t * c.drift + 30) % (height + 60)) - 30;
          x += Math.sin(t * c.speed + c.phase) * c.amp;
        } else {
          y = c.y + Math.cos(t * c.speed * 0.85 + c.phase) * c.amp;
          x += Math.sin(t * c.speed + c.phase) * c.amp;
          alpha *= 0.72 + 0.28 * Math.sin(t * 1.7 + c.phase * 3);
        }

        if (alpha < 0.015) continue;
        ctx.fillStyle = styleFor(alpha);
        ctx.fillText(c.ch, x, y);
      }
    };

    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };

    build();
    if (!reduceMotion) raf = requestAnimationFrame(loop);

    const observer = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(build, 120);
    });
    observer.observe(wrap);

    return () => {
      observer.disconnect();
      window.clearTimeout(resizeTimer);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative h-full w-full" aria-hidden="true">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
