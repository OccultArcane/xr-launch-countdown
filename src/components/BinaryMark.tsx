import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

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

type Edges = { l: number; t: number; r: number; b: number };

const EDGE_TOLERANCE = 12;

/**
 * Peels uniform edges off an image — empty paper margins, screenshot frames,
 * and both at once — stopping as soon as real artwork appears. Returns null
 * when the whole image is flat colour.
 */
function trimUniformEdges(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): Edges | null {
  const limit = Math.floor(Math.min(w, h) * 0.45);
  const same = (i: number, j: number) =>
    Math.abs(data[i] - data[j]) <= EDGE_TOLERANCE &&
    Math.abs(data[i + 1] - data[j + 1]) <= EDGE_TOLERANCE &&
    Math.abs(data[i + 2] - data[j + 2]) <= EDGE_TOLERANCE &&
    Math.abs(data[i + 3] - data[j + 3]) <= EDGE_TOLERANCE;

  const columnUniform = (x: number, y0: number, y1: number) => {
    const start = (y0 * w + x) * 4;
    for (let y = y0 + 1; y < y1; y += 2) {
      if (!same(start, (y * w + x) * 4)) return false;
    }
    return true;
  };
  const rowUniform = (y: number, x0: number, x1: number) => {
    const start = (y * w + x0) * 4;
    for (let x = x0 + 1; x < x1; x += 2) {
      if (!same(start, (y * w + x) * 4)) return false;
    }
    return true;
  };

  let l = 0;
  while (l < limit && columnUniform(l, 0, h)) l++;
  let r = 0;
  while (r < limit && columnUniform(w - 1 - r, 0, h)) r++;
  let t = 0;
  while (t < limit && rowUniform(t, l, w - r)) t++;
  let b = 0;
  while (b < limit && rowUniform(h - 1 - b, l, w - r)) b++;

  if (w - l - r < 8 || h - t - b < 8) return null;
  return { l, t, r, b };
}

/** Most frequent colour in a region — the paper the artwork sits on. */
function dominantColor(
  data: Uint8ClampedArray,
  w: number,
  left: number,
  top: number,
  rw: number,
  rh: number,
): [number, number, number] {
  const counts = new Int32Array(512);
  let best = 0;
  for (let y = top; y < top + rh; y += 3) {
    for (let x = left; x < left + rw; x += 3) {
      const i = (y * w + x) * 4;
      const key =
        ((data[i] >> 5) << 6) | ((data[i + 1] >> 5) << 3) | (data[i + 2] >> 5);
      counts[key] += 1;
      if (counts[key] > counts[best]) best = key;
    }
  }
  const level = (shift: number) => ((best >> shift) & 7) * 32 + 16;
  return [
    Math.min(255, level(6)),
    Math.min(255, level(3)),
    Math.min(255, level(0)),
  ];
}

type BinaryMarkProps = {
  /** Text the mark spells. Used when no image is supplied or it fails. */
  text?: string;
  /** Font file the text mask is drawn in, e.g. "/gorewild.ttf". */
  fontSrc?: string;
  /** Logo image used as the mask (transparent PNG or shape on flat bg). */
  imageSrc?: string;
  /** Tried when `imageSrc` is missing or fails to load. */
  fallbackImageSrc?: string;
};

let maskFontName: string | null = null;

/** Loads a custom display font once so the text mask can be drawn in it. */
const loadMaskFont = async (url: string): Promise<string | null> => {
  if (maskFontName) return maskFontName;
  try {
    const face = new FontFace("XrMaskFont", `url("${url}")`);
    await face.load();
    document.fonts.add(face);
    maskFontName = "XrMaskFont";
  } catch {
    maskFontName = null; // retry on the next rebuild in case it appears later
  }
  return maskFontName;
};

/**
 * The mark drawn as a grid of 0s and 1s confined strictly to the logo
 * silhouette: digits flicker, flip and occasionally flash red, all kept
 * inside the masked shape.
 */
export function BinaryMark({
  text = "xr",
  fontSrc,
  imageSrc,
  fallbackImageSrc,
}: BinaryMarkProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

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
    let glitchUntil = 0;
    let nextGlitch = 0;
    const TORN_BAND = 26;
    const tornBands = new Map<number, number>();

    const newCanvas = (w: number, h: number) => {
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      return off;
    };

    const rasterizeText = (family: string = FONT_FAMILY): Mask => {
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
      octx.font = `700 ${fontSize}px ${family}`;
      const metrics = octx.measureText(text);
      const maxWidth = width * 0.85;
      if (metrics.width > maxWidth && metrics.width > 0) {
        fontSize *= maxWidth / metrics.width;
        octx.font = `700 ${fontSize}px ${family}`;
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

      // Peel uniform edges first: paper margins and screenshot frames both
      // strip away until the artwork itself starts.
      const edges = trimUniformEdges(src, sw, sh);
      if (!edges) return null; // flat colour — fall back to text
      const rl = edges.l;
      const rt = edges.t;
      const rw = sw - edges.l - edges.r;
      const rh = sh - edges.t - edges.b;

      // The dominant colour in the artwork region is the paper it sits on.
      const bg = dominantColor(src, sw, rl, rt, rw, rh);

      // Artwork with real holes is masked by alpha; solid pieces (e.g. black
      // letters on a white tile) are masked by standing out from the paper.
      let opaque = 0;
      let sampled = 0;
      for (let y = rt; y < rt + rh; y += 4) {
        for (let x = rl; x < rl + rw; x += 4) {
          sampled += 1;
          if (src[(y * sw + x) * 4 + 3] >= 128) opaque += 1;
        }
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
        return d > 0.07;
      };

      // Find the content's bounding box so empty margins are cropped away.
      let minX = sw;
      let minY = sh;
      let maxX = -1;
      let maxY = -1;
      for (let y = rt; y < rt + rh; y++) {
        const row = y * sw;
        for (let x = rl; x < rl + rw; x++) {
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
      let family: string | null = null;
      if (!mask && fontSrc) {
        family = await loadMaskFont(fontSrc);
        if (id !== buildId) return;
        if (family) mask = rasterizeText(family);
      }
      if (!mask && fallbackImageSrc) {
        mask = await rasterizeImage(fallbackImageSrc);
        if (id !== buildId) return;
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
          // Smooth threshold: paper stays out, dimmer gloss stays in.
          total += Math.min(1, Math.max(0, (d - 0.07) / 0.15)) * a;
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

      // Periodic glitch burst: torn bands, chromatic split, scrambled digits.
      let glitching = false;
      if (!reduceMotion) {
        if (nextGlitch === 0) nextGlitch = nowMs + 2500 + Math.random() * 5000;
        if (nowMs >= glitchUntil && nowMs >= nextGlitch) {
          glitchUntil = nowMs + 260 + Math.random() * 340;
          nextGlitch = nowMs + 3500 + Math.random() * 5500;
          tornBands.clear();
          const bandCount = Math.ceil(height / TORN_BAND);
          for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
            const band = Math.floor(Math.random() * bandCount);
            tornBands.set(
              band,
              (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 14),
            );
          }
        }
        glitching = nowMs < glitchUntil;
      }

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

        if (glitching) {
          const tear = tornBands.get(Math.floor(y / TORN_BAND));
          if (tear) x += tear;
          if (Math.random() < 0.06) {
            c.ch = c.ch === "0" ? "1" : "0";
            c.flipAt = nowMs + 400 + Math.random() * 900;
          }
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

        if (glitching) {
          // Chromatic split: red and cyan ghosts either side of the digit.
          const ghost = Math.min(1, alpha * 0.85).toFixed(3);
          ctx.fillStyle = `rgba(248,72,72,${ghost})`;
          ctx.fillText(c.ch, x - 2.5, y);
          ctx.fillStyle = `rgba(72,220,248,${ghost})`;
          ctx.fillText(c.ch, x + 2.5, y);
          if (Math.random() < 0.06) continue; // core dropouts mid-burst
        }

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
  }, [text, fontSrc, imageSrc, fallbackImageSrc]);

  // 3D parallax: the stage leans toward the pointer and settles on leave.
  const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -py * 9, y: px * 11 });
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full"
      aria-hidden="true"
      onPointerMove={handleMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <div
        className="h-full w-full transition-transform duration-200 ease-out will-change-transform"
        style={{
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        }}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>
    </div>
  );
}
