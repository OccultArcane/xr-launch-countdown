import { useEffect, useRef, useState, type ReactNode } from "react";

/** Design size of the storefront canvas — the page is authored at
 *  926 × 700 and scaled uniformly from there, so the exact same layout
 *  shows on every screen, phone or desktop, and inside any iframe. */
const STAGE_W = 926;
const STAGE_H = 700;

/** How much of the viewport the whole canvas fits into — width- or
 *  height-bound, whichever is tighter. Inside an iframe `window` *is*
 *  the iframe's viewport, so embeds size themselves automatically. */
const viewportScale = () => {
  const s = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  return Number.isFinite(s) && s > 0 ? s : 1;
};

/**
 * The fixed-canvas wrapper: lays the storefront out at its 926 × 700
 * design size, then scales that canvas to fit the current viewport
 * (letterboxed on the store's black), so proportions never change with
 * screen or device. Content taller than the canvas — e.g. before images
 * settle — is scaled to fit as well, so nothing is ever clipped or
 * scrollable, even in a small embed.
 *
 * All measurement happens in layout pixels (clientWidth/scrollHeight),
 * which transforms never affect, so the two scale layers — canvas →
 * viewport, content → canvas — can never feed back into each other.
 */
export function Stage({ children }: { children: ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(viewportScale);
  // Fit of the content inside the box: scale ≤ 1 plus the vertical offset
  // that centres it. Measured, never assumed.
  const [fit, setFit] = useState({ scale: 1, y: 0 });

  // Viewport resizes (window, rotation, mobile browser chrome, iframe
  // resizes) all land here; state is only set from event/observer
  // callbacks, never synchronously inside an effect.
  useEffect(() => {
    const update = () => setScale(viewportScale());
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  // Measure the laid-out content height (transform-independent) and fit
  // it into the 700px box. ResizeObserver fires once on observe, which
  // covers the initial measurement too.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.scrollHeight;
      if (h <= 0) return;
      const s = Math.min(1, STAGE_H / h);
      const next = { scale: s, y: (STAGE_H - h * s) / 2 };
      setFit((prev) =>
        prev.scale === next.scale && prev.y === next.y ? prev : next,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-[#0a0a0a]">
      <div
        className="@container relative shrink-0 overflow-hidden"
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transform: `scale(${scale})`,
        }}
      >
        <div
          ref={contentRef}
          className="absolute inset-x-0 top-0 origin-top-left will-change-transform"
          style={{ transform: `translateY(${fit.y}px) scale(${fit.scale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
