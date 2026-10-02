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
  redAt: number;
  redDur: number;
};

type Mask = {
  data: Uint8ClampedArray;
  /** True when coverage comes from alpha alone (transparent artwork). */
  transparent: boolean;
  /** Background colour sampled from the source, for opaque artwork. */
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
  /** Text the mark spells. Used when no image is supplied or it fails. */
  text?: string;
  /** Logo image used as the mask (transparent PNG or shape on flat bg). */
  imageSrc?: string;
};

/**
 * The mark drawn as a grid of 0s and 1s confined strictly to the logo
 * silhouette: digits flicker, flip and occasionally flash red, all kept
 * inside the masked shape.
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
    let cell = 15;
    let raf = 0;
    let buildId = 0;
    let resizeTimer: number | undefined;

    const newCanvas = (w: number, h: number) => {
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      return off;
    };

    const rasterizeText = (): Mask => {
      const off = newCanvas(width, height);
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
      let fontSize = Math.min(height * 1.1, width * 0.6);
      octx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
      const metrics = octx.measureText(text);
      const maxWidth = width * 0.85;
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

    const loadImage = (url: string) =>
      new Promise<HTMLImageElement | null>((resolve) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => resolve(null);
        el.src = url;
      });

    /**
     * Crops the artwork to its content, scales it up to fill the stage and
     * rasterizes it — so the digits only ever land inside the logo.
     */
    const rasterizeImage = async (url: string): Promise<Mask | null> => {
      const img = await loadImage(url);
      if (!img || !img.naturalWidth || !img.naturalHeight) return null;

      // Work at a sane resolution: downscale very large artwork.
      const fit = Math.min(
        1,
        1024 / Math.max(img.naturalWidth, img.naturalHeight),
      );
      const sw = Math.max(1, Math.round(img.naturalWidth * fit));
      const sh = Math.max(1, Math.round(img.naturalHeight * fit));

      const probe = newCanvas(sw, sh);
      const pctx = probe.getContext("2d", { willReadFrequently: true });
      if (!pctx) return null;
      pctx.drawImage(img, 0, 0, sw, sh);
      const src = pctx.getImageData(0, 0, sw, sh).data;

      // Background colour comes from the very first pixel (a corner).
      const bg: [number, number, number] = [src[0], src[1], src[2]];

      // Artwork with real holes is masked by alpha; solid pieces (e.g. black
      // letters on a white tile) are masked by standing out from the corner.
      let opaque = 0;
      let sampled = 0;
      for (let i = 3; i < src.length; i += 16) {
        sampled += 1;
        if (src[i] >= 128) opaque += 1;
      }
      const transparent = sampled === 0 || opaque / sampled < 0.95;

      const standsOut = (i: number) => {
        if (src[i + 3] < 128) return false;
        if (transparent) return true;
        const d =
          Math.max(
            Math.abs(src[i] - bg[0]),
            Math.abs(src[i + 1] - bg[1]),
            Math.abs(src[i + 2] - bg[2]),
          ) / 255;
        return d > 0.08;
      };

      // Find the content's bounding box so empty margins are cropped away.
      let minX = sw;
      let minY = sh;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < sh; y++) {
        const row = y * sw;
        for (let x = 0; x < sw; x++) {
          if (!standsOut((row + x) * 4)) continue;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      if (maxX < 0) return null; // nothing to mask — fall back to text

      // A hair of margin so edge digits are not clipped by the crop.
      const padX = Math.round((maxX - minX + 1) * 0.03) + 1;
      const padY = Math.round((maxY - minY + 1) * 0.03) + 1;
      const cx = Math.max(0, minX - padX);
      const cy = Math.max(0, minY - padY);
      const cw = Math.min(sw - cx, maxX + 1 + padX - cx);
      const chh = Math.min(sh - cy, maxY + 1 + padY - cy);

      const scale = Math.min((width * 0.9) / cw, (height * 0.92) / chh);
      const dw = Math.round(cw * scale);
      const dh = Math.round(chh * scale);
      const dx = Math.round((width - dw) / 2);
      const dy = Math.round((height - dh) / 2);

      const off = newCanvas(width, height);
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return null;
      // Draw straight from the source so the mask stays crisp.
      octx.drawImage(
        img,
        cx / fit,
        cy / fit,
        cw / fit,
        chh / fit,
        dx,
        dy,
        dw,
        dh,
      );

      return {
        data: octx.getImageData(0, 0, width, height).data,
        transparent,
        bg,
      };
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

      cell = width < 560 ? 12 : width < 900 ? 14 : 15;

      let mask: Mask | null = null;
      if (imageSrc) {
        mask = await rasterizeImage(imageSrc);
        if (id !== buildId) return; // a newer rebuild superseded this one
      }
      if (!mask) mask = rasterizeText();

      /** Coverage 0–1 at a point: what fraction of this spot is the mark. */
      const coverage = (px: number, py: number) => {
        // Average a few probes so the big digits track the silhouette closely.
        const r = Math.max(1, Math.floor(cell / 4));
        const probes = [
          [0, 0],
          [r, 0],
          [-r, 0],
          [0, r],
          [0, -r],
        ];
        let total = 0;
        for (const [ox, oy] of probes) {
          const x = Math.min(width - 1, Math.max(0, Math.floor(px + ox)));
          const y = Math.min(height - 1, Math.max(0, Math.floor(py + oy)));
          const i = (y * width + x) * 4;
          const a = mask!.data[i + 3] / 255;
          if (a <= 0) continue;
          if (mask!.transparent) {
            total += a;
            continue;
          }
          const d =
            Math.max(
              Math.abs(mask!.data[i] - mask!.bg[0]),
              Math.abs(mask!.data[i + 1] - mask!.bg[1]),
              Math.abs(mask!.data[i + 2] - mask!.bg[2]),
            ) / 255;
          // Smooth threshold: paper-white stays out, gloss highlights stay in.
          total += Math.min(1, Math.max(0, (d - 0.1) / 0.22)) * a;
        }
        return total / probes.length;
      };

      const next: Cell[] = [];
      const now = performance.now();

      for (let gy = cell / 2; gy < height; gy += cell) {
        for (let gx = cell / 2; gx < width; gx += cell) {
          const cov = coverage(gx, gy);

          let alpha = 0;
          if (cov >= 0.62) {
            alpha = 0.55 + Math.random() * 0.45;
          } else if (cov >= 0.42) {
            // Silhouette edge: dimmer digits keep the outline ragged, not leaky.
            alpha = 0.2 + Math.random() * 0.25;
          }
          // Nothing outside the mark — the shape stays fully masked.
          if (alpha <= 0) continue;

          next.push({
            x: gx,
            y: gy,
            ch: Math.random() < 0.5 ? "0" : "1",
            alpha,
            phase: Math.random() * Math.PI * 2,
            amp: 0.3 + Math.random() * 0.7,
            speed: 0.35 + Math.random() * 1.1,
            flipAt: reduceMotion ? 0 : now + 500 + Math.random() * 4000,
            redAt: reduceMotion ? 0 : now + Math.random() * 25000,
            redDur: 400 + Math.random() * 500,
          });
        }
      }

      cells = next;

      if (reduceMotion) draw(performance.now());
    };

    const draw = (nowMs: number) => {
      const t = nowMs / 1000;
      ctx.clearRect(0, 0, width, height);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `500 ${Math.round(cell * 1.15)}px ${FONT_FAMILY}`;

      for (const c of cells) {
        if (c.flipAt !== 0 && nowMs > c.flipAt) {
          c.ch = c.ch === "0" ? "1" : "0";
          c.flipAt = nowMs + 700 + Math.random() * 4200;
        }

        let x = c.x;
        let y = c.y;
        let alpha = c.alpha;

        if (!reduceMotion) {
          x += Math.sin(t * c.speed + c.phase) * c.amp;
          y += Math.cos(t * c.speed * 0.85 + c.phase) * c.amp;
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
