import type { ReactNode } from "react";

/**
 * The storefront shell. It fills the viewport — no fixed design canvas and
 * no downscaling — so the layout uses all the room the screen gives it.
 *
 * The `@container` is what keeps the sizing automatic: the layout's `@sm`
 * / `@lg` / `@xl` variants are container queries, so type, tiles and
 * spacing still step up from the space actually available, whether that's
 * a phone, a laptop or an embed.
 *
 * `min-h-dvh` keeps the footer on the bottom edge of the screen without
 * letting mobile browser chrome crop it; content taller than the window
 * scrolls instead of being shrunk to fit.
 */
export function Stage({ children }: { children: ReactNode }) {
  return (
    <div className="@container flex min-h-dvh w-full flex-col bg-[#0a0a0a]">
      {children}
    </div>
  );
}
