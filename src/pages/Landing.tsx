import { useEffect } from "react";
import { motion } from "framer-motion";
import { BinaryMark } from "@/components/BinaryMark";
import { Countdown } from "@/components/Countdown";
import { MarkWithProducts } from "@/components/ProductsSection";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Stage } from "@/components/Stage";
import { SUPPORTED_CREATORS } from "@/lib/links";
import { SITE } from "@/lib/store";

export default function Landing() {
  useEffect(() => {
    document.title = `${SITE.name} — IMVU storefront`;
  }, []);

  // The page fills the viewport: header on the top edge, footer on the
  // bottom edge, and the storefront column taking all the space between
  // them, sized by the stage's container queries rather than a scale
  // factor.
  return (
    <Stage>
      <div className="flex flex-1 flex-col bg-[#0a0a0a] font-mono text-neutral-100 selection:bg-neutral-100 selection:text-[#0a0a0a]">
        <SiteHeader />

        <main className="flex flex-1 items-center justify-center px-6 py-4 short:py-2.5 shorter:py-1.5">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 @sm:gap-8 short:gap-4 shorter:gap-3">
            <h1 className="sr-only">xr — IMVU storefront</h1>

            {/* Mark, catalog and countdown kept tight together */}
            <div className="flex w-full flex-col items-center gap-6 @sm:gap-8 short:gap-4 shorter:gap-3">
              <MarkWithProducts>
                <BinaryMark
                  text={SITE.maskText}
                  fontSrc={SITE.maskFontFile || undefined}
                  imageSrc={SITE.maskImage || undefined}
                  fallbackImageSrc={SITE.maskImageFallback || undefined}
                  caption={
                    // Italic slogan in Discord's inactive grey — anchored
                    // under the wordmark and tilting with the mark. The
                    // brand X and R pick up the accent red.
                    <p className="text-center text-[10px] italic tracking-[0.16em] text-neutral-600 @sm:text-[12px] @sm:tracking-[0.2em]">
                      <span className="text-xr-red">X</span>tend your{" "}
                      <span className="text-xr-red">R</span>eality
                    </p>
                  }
                />
              </MarkWithProducts>

              {/* Countdown to the weekly Friday drop */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
                className="w-full max-w-3xl"
              >
                <Countdown />
              </motion.div>
            </div>

            {/* Support — the creators the studio backs, each with their
                avatar in a bracketed chip that links into their IMVU shop */}
            <motion.section
              aria-label="supported creators"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              <p className="text-[9px] uppercase tracking-[0.32em] text-neutral-500 @sm:text-[10px] @sm:tracking-[0.4em]">
                {/* "Shop" carries the same red as the countdown label, the
                    drop date and the DMCA line. */}
                <span className="text-xr-red">Shop</span> these creators
              </p>

              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-3 @sm:mt-3 @sm:gap-3.5 short:mt-2 short:gap-2.5 shorter:mt-1.5 shorter:gap-2">
                {/* The link's box is the hover target, and it never moves: the
                    bump happens on the layer inside it. Sliding the link itself
                    put its edge out from under a cursor sitting on the border,
                    which dropped the hover, slid the link back under that
                    cursor, and repeated — a flicker along that border. */}
                {SUPPORTED_CREATORS.map((creator) => (
                  <a
                    key={creator.id}
                    href={creator.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${creator.label} on IMVU`}
                    className="group relative inline-flex outline-none"
                  >
                    <span className="viewfinder inline-flex items-center gap-2 bg-[#0a0a0a] py-1.5 pr-2.5 pl-1.5 transition-[transform,background-color] duration-150 group-hover:-translate-x-1 group-hover:bg-white/[0.04] short:py-1 short:pr-2 short:pl-1 shorter:py-0.5">
                      {/* The avatar is decorative — the name beside it is the
                          link's text — so it stays out of the accessibility
                          tree. It is loaded live from IMVU, so a creator's new
                          avatar shows up on its own; the copy in public/ stands
                          in only when that request fails. Muted by default, in
                          colour on hover/focus. */}
                      <img
                        src={creator.image}
                        alt=""
                        width={52}
                        height={72}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(event) => {
                          const img = event.currentTarget;
                          if (img.dataset.fallback === "done") {
                            // IMVU unreachable and no local copy either — drop
                            // the frame rather than show a broken-image glyph.
                            img.style.visibility = "hidden";
                            return;
                          }
                          img.dataset.fallback = "done";
                          img.src = creator.fallback;
                        }}
                        className="block h-[72px] w-[52px] shrink-0 object-cover grayscale transition-[filter] duration-300 group-hover:grayscale-0 group-focus-visible:grayscale-0 short:h-[56px] short:w-[40px] shorter:h-[44px] shorter:w-[32px]"
                      />
                      {/* The name carries the same red as "Shop" in the label
                          above; the brackets stay neutral so the accent sits on
                          the name alone. */}
                      <span className="inline-flex items-center whitespace-nowrap text-[12px] tracking-[0.12em] text-xr-red transition-colors group-hover:text-white">
                        <span aria-hidden="true" className="text-neutral-600">
                          [
                        </span>
                        {creator.label}
                        <span aria-hidden="true" className="text-neutral-600">
                          ]
                        </span>
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </motion.section>
          </div>
        </main>

        <SiteFooter />
      </div>
    </Stage>
  );
}
