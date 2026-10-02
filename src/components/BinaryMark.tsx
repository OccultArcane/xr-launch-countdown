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
  redAt: number;
  redDur: number;
};

type Mask = {
  data: Uint8ClampedArray;
  /** True when the mask is defined by alpha (text or a transparent PNG). */
  transparent: boolean;
  /** Corner colour used as the background for opaque images. */
  bg: [number, number, number];
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

type BinaryMarkProps = {
  /** Text the mark spells. Ignored when `imageSrc` loads successfully. */
  text?: string;
  /** Optional logo image used as the mask (transparent PNG works best). */
  imageSrc?: string;
};

/**
 * The mark drawn as a grid of 0s and 1s: digits inside the mask flicker,
 * flip and jitter in place, while a sparse ambient field drifts behind.
 */
export function BinaryMark({ text = "xr", imageSrc }: BinaryMarkProps) {
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
    let buildId = 0;
    let resizeTimer: number | undefined;

    const makeCanvas = () => {
      const off = document.createElement("canvas");
      off.width = width;
      off.height = height;
      return off;
    };

    const rasterizeText = (): Mask => {
      const off = makeCanvas();
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx)
        return {
          data: new Uint8ClampedArray(4),
          transparent: true,
          bg: [0, 0, 0],
        };

      octx.fillStyle = "#fff";
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      let fontSize = Math.min(height * 1.02, width * 0.55);
      octx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
      const metrics = octx.measureText(text);
      const maxWidth = width * 0.72;
      if (metrics.width > maxWidth && metrics.width > 0) {
        fontSize *= maxWidth / metrics.width;
        octx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
      }
      octx.fillText(text, width / 2, height / 2);
      return {
        data: octx.getImageData(0, 0, width, height).data,
        transparent: true,
        bg: [0, 0, 0],
      };
    };

    const rasterizeImage = async (src: string): Promise<Mask | null> => {
      const img = await new Promise<HTMLImageElement | null>((resolve) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => resolve(null);
        el.src = src;
      });
      if (!img || !img.naturalWidth || !img.naturalHeight) return null;

      const off = makeCanvas();
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return null;

      const scale = Math.min(
        (width * 0.72) / img.naturalWidth,
        (height * 0.88) / img.naturalHeight,
      );
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      octx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);

      const data = octx.getImageData(0, 0, width, height).data;
      // Images with real transparency are masked by alpha alone; fully
      // opaque images are masked by whatever stands out from the
      // corner colour (e.g. a white glyph on a solid tile).
      let opaque = 0;
      let sampled = 0;
      for (let i = 3; i < data.length; i += 16) {
        sampled += 1;
        if (data[i] >= 128) opaque += 1;
      }
      const transparent = sampled === 0 || opaque / sampled < 0.95;
      return { data, transparent, bg: [data[0], data[1], data[2]] };
    };

    const build = async () => {
      const id = ++buildId;
      const rect = wrap.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      let mask: Mask | null = null;
      if (imageSrc) {
        mask = await rasterizeImage(imageSrc);
        if (id !== buildId) return; // a newer rebuild superseded this one
      }
      if (!mask) mask = rasterizeText();

      const coverage = (px: number, py: number) => {
        const i = (py * width + px) * 4;
        const a = mask!.data[i + 3] / 255;
        if (a <= 0) return 0;
        if (mask!.transparent) return a;
        const d =
          Math.max(
            Math.abs(mask!.data[i] - mask!.bg[0]),
            Math.abs(mask!.data[i + 1] - mask!.bg[1]),
            Math.abs(mask!.data[i + 2] - mask!.bg[2]),
          ) / 255;
        return Math.min(1, d * 1.5) * a;
      };

      cell = width < 560 ? 8 : width < 900 ? 10 : 11;
      const next: Cell[] = [];
      const now = performance.now();

      for (let gy = cell / 2; gy < height; gy += cell) {
        for (let gx = cell / 2; gx < width; gx += cell) {
          const px = Math.min(width - 1, Math.floor(gx));
          const py = Math.min(height - 1, Math.floor(gy));
          const cov = coverage(px, py);

          let alpha = 0;
          if (cov > 0.55) {
            alpha = 0.5 + Math.random() * 0.5;
          } else if (cov > 0.1) {
            // Ragged mask edges: partially filled cells, dimmer.
            if (Math.random() < 0.55) alpha = 0.1 + Math.random() * 0.28;
          } else if (Math.random() < 0.05) {
            // Sparse ambient field.
            alpha = 0.035 + Math.random() * 0.075;
          }
          if (alpha <= 0) continue;

          const anchored = cov > 0.1;
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
            redAt: reduceMotion ? 0 : now + Math.random() * 25000,
            redDur: 400 + Math.random() * 500,
          });
        }
      }

      // Ambient digits first, mark on top.
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

        // Every so often a single digit flashes red, then fades back.
        let red = false;
        if (c.redAt !== 0) {
          if (nowMs >= c.redAt + c.redDur) {
            c.redAt = nowMs + 15000 + Math.random() * 35000;
          } else {
            red = nowMs >= c.redAt;
          }
        }

        if (alpha < 0.015) continue;
        if (red) {
          ctx.fillStyle = `rgba(248,72,72,${Math.min(1, alpha * 1.3).toFixed(3)})`;
        } else {
          ctx.fillStyle = styleFor(alpha);
        }
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
  }, [text, imageSrc]);

  return (
    <div ref={wrapRef} className="relative h-full w-full" aria-hidden="true">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
