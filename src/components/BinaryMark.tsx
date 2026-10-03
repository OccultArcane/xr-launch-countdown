import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

/** One vertical stream of glyphs — a column's x's and r's scrolling down. */
type Column = {
  glyphs: string[];
  /** Rows the stream falls per second. */
  speed: number;
  phase: number;
  /** Red band: index window and timing that lights it as it flows down. */
  band: number;
  bandLen: number;
  redPhase: number;
  redPeriod: number;
  redOn: number;
};

type Cell = {
  x: number;
  y: number;
  /** The stream this cell samples its glyph from. */
  col: Column;
  /** Row index within that stream. */
  row: number;
  /** Glitch scramble: swap the streamed glyph. */
  flip: boolean;
  alpha: number;
  /** Bloom is fixed per cell so the glow never flickers. */
  glow: boolean;
  phase: number;
  amp: number;
  speed: number;
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

/** Silver ink for the digits — crisp white core with a cool bloom. */
const SILVER = "#f2f5fa";
/** Accent sparks and the glitch chromatic ghosts. */
const SPARK_RED = "#f84848";
const GHOST_CYAN = "#48dcf8";

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
    // Only peel lines that match the outer background — otherwise solid
    // shapes (a plain bar, a filled tile) would be trimmed away entirely.
    if (!same(start, 0)) return false;
    for (let y = y0 + 1; y < y1; y += 2) {
      if (!same(start, (y * w + x) * 4)) return false;
    }
    return true;
  };
  const rowUniform = (y: number, x0: number, x1: number) => {
    const start = (y * w + x0) * 4;
    if (!same(start, 0)) return false;
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
  /** Text the mark spells. Used when nothing above masks it. */
  text?: string;
  /**
   * Display font file the mask is drawn in, e.g. "/unifrakturcook-bold.ttf"
   * — tried first, so the wordmark in that typeface is the mask whenever
   * the file loads.
   */
  fontSrc?: string;
  /** Logo image used as the mask when no font mask loads. */
  imageSrc?: string;
  /** Tried when the font and `imageSrc` are missing or fail to load. */
  fallbackImageSrc?: string;
  /**
   * Optional line (e.g. the slogan) anchored just under the wordmark
   * inside the stage — it rides the same 3D parallax tilt as the mark,
   * while the digits stay canvas-only.
   */
  caption?: ReactNode;
};

let maskFontFace: FontFace | null = null;
let maskFontUrl: string | null = null;
let maskFontName: string | null = null;

/**
 * Loads the display font for the mask. The loaded face is tracked per URL
 * so switching fonts (e.g. a config edit under HMR) swaps the face instead
 * of silently reusing the previous one.
 */
const loadMaskFont = async (url: string): Promise<string | null> => {
  if (maskFontName && maskFontUrl === url) return maskFontName;
  try {
    if (maskFontFace) document.fonts.delete(maskFontFace);
    const face = new FontFace("XrMaskFont", `url("${url}")`);
    await face.load();
    document.fonts.add(face);
    maskFontFace = face;
    maskFontUrl = url;
    maskFontName = "XrMaskFont";
  } catch {
    maskFontFace = null;
    maskFontUrl = null;
    maskFontName = null; // retry on the next rebuild in case it appears later
  }
  return maskFontName;
};

/**
 * The blackletter "xr" mark built from tiny x's and r's: Matrix-style
 * streams fall downward through the silhouette — glyphs only, nothing
 * outside the mask — threaded by flowing red bands and sparks, plus glitch
 * bursts.
 */
export function BinaryMark({
  text = "xr",
  fontSrc,
  imageSrc,
  fallbackImageSrc,
  caption,
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
    let gridRows = 1;
    const sprites = new Map<string, HTMLCanvasElement>();
    const TORN_BAND = 26;
    const tornBands = new Map<number, number>();

    const newCanvas = (w: number, h: number) => {
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      return off;
    };

    /**
     * Glyphs are pre-rendered once — optionally with a baked silver glow —
     * and blitted per frame, so thousands of them stay cheap to draw.
     */
    const glyphSprite = (ch: string, color: string, glow: boolean) => {
      const key = `${ch}|${color}|${glow ? 1 : 0}`;
      const hit = sprites.get(key);
      if (hit) return hit;

      const fs = Math.round(cell * 1.15);
      const pad = glow ? Math.max(2, Math.round(cell * 0.9)) : 1;
      const size = fs + pad * 2;
      const spr = newCanvas(size, size);
      const sctx = spr.getContext("2d");
      if (sctx) {
        sctx.font = `500 ${fs}px ${FONT_FAMILY}`;
        sctx.textAlign = "center";
        sctx.textBaseline = "middle";
        sctx.fillStyle = color;
        if (glow) {
          sctx.shadowColor = color;
          sctx.shadowBlur = cell * 0.9;
        }
        sctx.fillText(ch, size / 2, size / 2);
        if (glow) sctx.fillText(ch, size / 2, size / 2); // lift the core
      }
      sprites.set(key, spr);
      return spr;
    };

    /**
     * Rasterizes the wordmark sized to fill the stage: real ink extents
     * are measured and the font scaled so the letters span most of the
     * box on both axes — slim margins on the top and sides, with the
     * remaining slack pooled at the bottom where the slogan sits.
     */
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

      // Ink extents scale linearly with the font size, so one probe at a
      // round size yields the scale factors for both axes.
      const probe = 200;
      octx.font = `700 ${probe}px ${family}`;
      const probeMetrics = octx.measureText(text);
      const probeInkH =
        probeMetrics.actualBoundingBoxAscent +
        probeMetrics.actualBoundingBoxDescent;
      const probeInkW =
        probeMetrics.actualBoundingBoxLeft +
        probeMetrics.actualBoundingBoxRight;

      let fontSize = probe;
      if (probeInkH > 0 && probeInkW > 0) {
        // Fill the stage: 80% of the height (6% headroom on top, the rest
        // of the slack left under the letters for the caption) and 90% of
        // the width — whichever constraint fits first.
        fontSize *= Math.min(
          (height * 0.8) / probeInkH,
          (width * 0.9) / probeInkW,
        );
      } else {
        // No ink metrics (older engine): fall back to advance-width fit.
        fontSize = Math.min(height * 1.1, width * 0.6);
        octx.font = `700 ${fontSize}px ${family}`;
        const advance = octx.measureText(text).width;
        if (advance > width * 0.85 && advance > 0) {
          fontSize *= (width * 0.85) / advance;
        }
      }

      octx.font = `700 ${fontSize}px ${family}`;
      const metrics = octx.measureText(text);
      const asc = metrics.actualBoundingBoxAscent;
      const desc = metrics.actualBoundingBoxDescent;
      const left = metrics.actualBoundingBoxLeft;
      const right = metrics.actualBoundingBoxRight;
      const inkH = asc + desc;
      const inkW = left + right;

      if (inkH > 0 && inkW > 0) {
        // Centre the *ink box* (not the em box) inside its band so the
        // letters sit exactly where the eye expects them.
        octx.textBaseline = "alphabetic";
        const baselineY = height * 0.06 + inkH / 2 + (asc - desc) / 2;
        const anchorX = width / 2 - (right - left) / 2;
        octx.fillText(text, anchorX, baselineY);
      } else {
        octx.textBaseline = "middle";
        octx.fillText(text, width / 2, height / 2);
      }
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
      // Judged across the whole file, because the trimmed region of a solid
      // mark is solid by definition.
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
      const padX = Math.round((maxX - minX + 1) * 0.015) + 1;
      const padY = Math.round((maxY - minY + 1) * 0.015) + 1;
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

      // Tiny glyphs on a tight grid: thousands of them build the monogram.
      cell = width < 560 ? 6 : width < 900 ? 7 : 8;
      sprites.clear();

      // Font mask wins: the wordmark set in the configured display font
      // (UnifrakturCook) is the silhouette whenever its file is present.
      let mask: Mask | null = null;
      if (fontSrc) {
        const family = await loadMaskFont(fontSrc);
        if (id !== buildId) return; // a newer rebuild superseded this one
        if (family) mask = rasterizeText(family);
      }
      if (!mask && imageSrc) {
        mask = await rasterizeImage(imageSrc);
        if (id !== buildId) return;
      }
      if (!mask && fallbackImageSrc) {
        mask = await rasterizeImage(fallbackImageSrc);
        if (id !== buildId) return;
      }
      if (!mask) mask = rasterizeText();

      /** Coverage 0–1 at a point: what fraction of this spot is the mark. */
      const coverage = (px: number, py: number) => {
        // Average a few probes so the big glyphs track the silhouette closely.
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

      gridRows = Math.max(1, Math.ceil(height / cell));

      // One glyph stream per column: x's and r's fall downward and
      // periodically spell repeating xr / rx motifs through the shape.
      const makeColumn = (): Column => {
        const glyphs: string[] = Array.from({ length: gridRows }, () =>
          Math.random() < 0.5 ? "x" : "r",
        );
        let pos = Math.floor(Math.random() * 8);
        while (pos + 8 <= gridRows) {
          const motif = Math.random() < 0.5 ? "xrxrxrxr" : "rxrxrxrx";
          for (let k = 0; k < 8; k++) glyphs[pos + k] = motif[k];
          pos += 10 + Math.floor(Math.random() * 14);
        }
        return {
          glyphs,
          speed: 4 + Math.random() * 7,
          phase: Math.random() * 32,
          band: Math.floor(Math.random() * gridRows),
          bandLen: 6 + Math.floor(Math.random() * 9),
          redPhase: Math.random() * 48,
          redPeriod: 22 + Math.random() * 26,
          redOn: 4 + Math.random() * 4,
        };
      };

      const next: Cell[] = [];
      const columns = new Map<number, Column>();
      const now = performance.now();

      for (let gy = cell / 2, row = 0; gy < height; gy += cell, row++) {
        for (let gx = cell / 2; gx < width; gx += cell) {
          const cov = coverage(gx, gy);

          let alpha = 0;
          if (cov >= 0.55) {
            alpha = 0.6 + Math.random() * 0.4;
          } else if (cov >= 0.28) {
            // Edge cells are kept so the glyphs hug the outline closely.
            alpha = 0.3 + Math.random() * 0.3;
          }
          // Nothing outside the mask — only the logo shows x's and r's.
          if (alpha <= 0) continue;

          let col = columns.get(gx);
          if (!col) {
            col = makeColumn();
            columns.set(gx, col);
          }

          next.push({
            x: gx,
            y: gy,
            col,
            row,
            flip: false,
            alpha,
            glow: alpha >= 0.8,
            phase: Math.random() * Math.PI * 2,
            amp: 0.2 + Math.random() * 0.5,
            speed: 0.35 + Math.random() * 1.1,
            redAt: reduceMotion ? 0 : now + 4000 + Math.random() * 16000,
            redDur: 600 + Math.random() * 600,
          });
        }
      }

      cells = next;

      if (reduceMotion) draw(performance.now());
    };

    const draw = (nowMs: number) => {
      const t = nowMs / 1000;
      ctx.clearRect(0, 0, width, height);

      /** Blit a pre-rendered glyph — far cheaper than filling text per frame. */
      const ink = (
        ch: string,
        x: number,
        y: number,
        alpha: number,
        glow: boolean,
        color: string = SILVER,
      ) => {
        const spr = glyphSprite(ch, color, glow);
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.drawImage(spr, x - spr.width / 2, y - spr.height / 2);
      };

      // Periodic glitch burst: torn bands, chromatic split, scrambled glyphs.
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
        // Sample this cell's glyph from its column's falling stream.
        const off = Math.floor(t * c.col.speed + c.col.phase);
        const idx = (((c.row - off) % gridRows) + gridRows) % gridRows;
        let ch = c.col.glyphs[idx];
        if (c.flip) ch = ch === "x" ? "r" : "x";

        // Red flows through the streams: a band of the column lights up and
        // rides the falling glyphs down through the letterforms.
        const streamRed =
          (t + c.col.redPhase) % c.col.redPeriod < c.col.redOn &&
          (((idx - c.col.band) % gridRows) + gridRows) % gridRows <
            c.col.bandLen;

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
          if (Math.random() < 0.06) c.flip = !c.flip;
        }

        // Sparks ride on top of the bands: quick individual flashes.
        let red = streamRed;
        if (c.redAt !== 0) {
          if (nowMs >= c.redAt + c.redDur) {
            c.redAt = nowMs + 15000 + Math.random() * 30000;
          } else if (nowMs >= c.redAt) {
            red = true;
          }
        }

        if (alpha < 0.015) continue;

        if (glitching) {
          // Chromatic split: red and cyan ghosts either side of the glyph.
          const ghost = Math.min(1, alpha * 0.85);
          ink(ch, x - 2.5, y, ghost, false, SPARK_RED);
          ink(ch, x + 2.5, y, ghost, false, GHOST_CYAN);
          if (Math.random() < 0.06) continue; // core dropouts mid-burst
        }

        if (red) {
          ink(ch, x, y, Math.min(1, alpha * 1.3), true, SPARK_RED);
        } else {
          ink(ch, x, y, alpha, c.glow);
        }
      }
      ctx.globalAlpha = 1;
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
      className="relative h-full w-full"
      onPointerMove={handleMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <div
        className="relative flex h-full w-full flex-col transition-transform duration-200 ease-out will-change-transform"
        style={{
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        }}
      >
        {/* The stage the canvas measures — sized exactly as before, so
            the caption overlays the mark instead of pushing it. */}
        <div ref={wrapRef} className="min-h-0 w-full flex-1" aria-hidden="true">
          <canvas ref={canvasRef} className="block h-full w-full" />
        </div>
        {caption && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[4%]">
            {caption}
          </div>
        )}
      </div>
    </div>
  );
}
