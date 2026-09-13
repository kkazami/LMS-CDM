"use client";

/**
 * IntroPreloader — SVG masked reveal with CSS transform sweep
 *
 * REVEAL APPROACH: <clipPath> from the glyph outline + CSS-animated sweep rect.
 *
 * The welcome.svg path is a filled glyph outline. A <clipPath> using that path
 * is applied to a group containing a white <rect>. The rect starts with
 * scaleX(0) transform-origin at the left, and CSS animates it to scaleX(1).
 * The clip path restricts the fill to the exact glyph shapes.
 *
 * Counters (holes in W, e, o) stay open because no fill-rule is added —
 * default nonzero winding is correct for this path.
 *
 * The skewed leading edge is achieved by placing a narrow slanted <polygon>
 * immediately ahead of the fill rect; it uses the same scaleX animation,
 * offset so it reads as a diagonal pen-tip leading the fill.
 *
 * SVG data: verbatim from welcome.svg
 *   viewBox="0 18.149999618530273 195 47.25"  (preserved exactly)
 *   One <path>, no fill-rule attribute
 *
 * Sequence (~2.6s total):
 *   0–400ms      Video panel fades in (already playing beneath)
 *   400–1900ms   SVG fill sweeps left→right inside glyph clip (1.5s ease-out)
 *   1900–2300ms  Brief hold (400ms)
 *   2300–2900ms  Overlay fades out to hero (600ms)
 */

import { useState, useEffect, useRef } from "react";

// viewBox constants — DO NOT change
const VB_X = 0;
const VB_Y = 18.149999618530273;
const VB_W = 195;
const VB_H = 47.25;
const VB_BOTTOM = VB_Y + VB_H; // 65.4

const VIEWBOX = `${VB_X} ${VB_Y} ${VB_W} ${VB_H}`;

// Path verbatim from welcome.svg
const PATH_D =
  "M59.85 43.55Q61 43.55 61.53 44.05Q62.05 44.55 62.05 45.35Q62.05 46.65 61.28 47.65Q60.50 48.65 58.85 48.70Q54.90 48.75 51.75 48.10Q48.25 55.55 43.33 60.47Q38.40 65.40 33.60 65.40Q29.20 65.40 27.00 60.72Q24.80 56.05 24.50 48.20Q21.50 56.90 17.73 61.15Q13.95 65.40 9.70 65.40Q4.90 65.40 2.45 59.42Q0 53.45 0 43.35Q0 36.00 1.30 27.20Q1.65 24.70 2.57 23.72Q3.50 22.75 5.50 22.75Q7 22.75 7.82 23.40Q8.65 24.05 8.65 25.80Q8.65 26.15 8.55 27.15Q7.05 37.40 7.05 44.60Q7.05 51.30 8.20 54.95Q9.35 58.60 11.30 58.60Q13.05 58.60 15.53 54.92Q18 51.25 20.45 44.02Q22.90 36.80 24.60 26.80Q25 24.50 26.07 23.62Q27.15 22.75 29.00 22.75Q30.55 22.75 31.28 23.42Q32 24.10 32 25.45Q32 26.25 31.90 26.70Q30.50 34.85 30.50 43.00Q30.50 48.55 30.88 51.85Q31.25 55.15 32.33 56.87Q33.40 58.60 35.45 58.60Q37.85 58.60 40.80 54.97Q43.75 51.35 46.20 45.95Q43.15 44.05 41.60 41.02Q40.05 38.00 40.05 34.05Q40.05 30.10 41.28 27.37Q42.50 24.65 44.63 23.30Q46.75 21.95 49.35 21.95Q52.55 21.95 54.42 24.25Q56.30 26.55 56.30 30.55Q56.30 36.20 53.85 43.10Q56.40 43.55 59.85 43.55M45.10 33.70Q45.10 38.60 48.25 40.95Q50.20 35.35 50.20 31.70Q50.20 29.60 49.65 28.62Q49.10 27.65 48.15 27.65Q46.80 27.65 45.95 29.22Q45.10 30.80 45.10 33.70ZM79.50 54.00Q80.15 54.00 80.53 54.60Q80.90 55.20 80.90 56.25Q80.90 58.25 79.95 59.35Q78.10 61.60 74.72 63.50Q71.35 65.40 67.50 65.40Q62.25 65.40 59.35 62.55Q56.45 59.70 56.45 54.75Q56.45 51.30 57.90 48.32Q59.35 45.35 61.92 43.60Q64.50 41.85 67.75 41.85Q70.65 41.85 72.40 43.57Q74.15 45.30 74.15 48.25Q74.15 51.70 71.67 54.17Q69.20 56.65 63.30 58.10Q64.55 60.40 68.05 60.40Q70.30 60.40 73.17 58.82Q76.05 57.25 78.15 54.70Q78.75 54.00 79.50 54.00M66.90 46.75Q65.05 46.75 63.77 48.90Q62.50 51.05 62.50 54.10L62.50 54.20Q65.45 53.50 67.15 52.10Q68.85 50.70 68.85 48.85Q68.85 47.90 68.33 47.32Q67.80 46.75 66.90 46.75ZM95.80 54.00Q96.45 54.00 96.83 54.60Q97.20 55.20 97.20 56.25Q97.20 58.25 96.25 59.35Q94.10 62.00 91.58 63.70Q89.05 65.40 85.85 65.40Q81.45 65.40 79.33 61.40Q77.20 57.40 77.20 51.05Q77.20 44.95 78.78 37.15Q80.35 29.35 83.42 23.75Q86.50 18.15 90.75 18.15Q93.15 18.15 94.53 20.37Q95.90 22.60 95.90 26.75Q95.90 32.70 92.60 40.55Q89.30 48.40 83.65 56.10Q84 58.15 84.80 59.02Q85.60 59.90 86.90 59.90Q88.95 59.90 90.50 58.72Q92.05 57.55 94.45 54.70Q95.05 54.00 95.80 54.00M89.65 23.10Q88.50 23.10 87.05 27.25Q85.60 31.40 84.50 37.55Q83.40 43.70 83.30 49.35Q86.85 43.50 88.95 37.62Q91.05 31.75 91.05 26.90Q91.05 23.10 89.65 23.10ZM102.70 65.40Q97.80 65.40 95.08 62.62Q92.35 59.85 92.35 55.30Q92.35 51.25 93.95 48.20Q95.55 45.15 98.10 43.50Q100.65 41.85 103.45 41.85Q106.20 41.85 107.72 43.47Q109.25 45.10 109.25 47.65Q109.25 49.75 108.33 51.20Q107.40 52.65 105.90 52.65Q104.95 52.65 104.38 52.20Q103.80 51.75 103.80 50.95Q103.80 50.60 103.90 50.15Q104 49.70 104.05 49.50Q104.30 48.75 104.30 48.10Q104.30 47.45 103.97 47.10Q103.65 46.75 103.05 46.75Q101.90 46.75 100.90 47.77Q99.90 48.80 99.30 50.55Q98.70 52.30 98.70 54.40Q98.70 60.20 103.75 60.20Q105.80 60.20 108.17 58.82Q110.55 57.45 112.85 54.70Q113.45 54.00 114.20 54.00Q114.85 54.00 115.22 54.60Q115.60 55.20 115.60 56.25Q115.60 58.15 114.65 59.35Q112.30 62.25 109.03 63.82Q105.75 65.40 102.70 65.40ZM137.05 49.80Q137.70 49.80 138.05 50.45Q138.40 51.10 138.40 52.10Q138.40 54.50 136.95 54.95Q133.95 56.00 130.35 56.15Q129.40 60.35 126.60 62.87Q123.80 65.40 120.25 65.40Q117.25 65.40 115.13 63.95Q113 62.50 111.90 60.10Q110.80 57.70 110.80 54.90Q110.80 51.10 112.25 48.12Q113.70 45.15 116.25 43.47Q118.80 41.80 121.90 41.80Q125.70 41.80 128.03 44.42Q130.35 47.05 130.75 50.90Q133.10 50.75 136.35 49.90Q136.75 49.80 137.05 49.80M120.65 60.10Q122.25 60.10 123.43 58.80Q124.60 57.50 125 55.05Q123.45 54.00 122.63 52.30Q121.80 50.60 121.80 48.70Q121.80 47.90 121.95 47.10L121.70 47.10Q119.70 47.10 118.38 49.02Q117.05 50.95 117.05 54.45Q117.05 57.20 118.13 58.65Q119.20 60.10 120.65 60.10ZM137.65 65.40Q135.75 65.40 134.98 63.40Q134.20 61.40 134.20 57.00Q134.20 50.50 136.05 44.65Q136.50 43.20 137.53 42.52Q138.55 41.85 140.40 41.85Q141.40 41.85 141.80 42.10Q142.20 42.35 142.20 43.05Q142.20 43.85 141.45 46.65Q140.95 48.65 140.65 50.12Q140.35 51.60 140.15 53.80Q141.50 49.90 143.38 47.20Q145.25 44.50 147.23 43.17Q149.20 41.85 150.95 41.85Q152.70 41.85 153.43 42.65Q154.15 43.45 154.15 45.10Q154.15 46.70 153.20 50.90Q152.80 52.70 152.65 53.60Q155.15 47.45 158.20 44.65Q161.25 41.85 163.90 41.85Q167.15 41.85 167.15 45.10Q167.15 47.05 166.05 52.15Q165.10 56.50 165.10 57.90Q165.10 59.90 166.55 59.90Q167.55 59.90 168.93 58.67Q170.30 57.45 172.60 54.70Q173.20 54.00 173.95 54.00Q174.60 54.00 174.98 54.60Q175.35 55.20 175.35 56.25Q175.35 58.25 174.40 59.35Q172.25 62.00 169.78 63.70Q167.30 65.40 164.15 65.40Q161.60 65.40 160.30 63.92Q159.00 62.45 159.00 59.65Q159.00 58.25 159.70 54.65Q160.35 51.50 160.35 50.30Q160.35 49.50 159.80 49.50Q159.15 49.50 157.95 51.17Q156.75 52.85 155.55 55.60Q154.35 58.35 153.60 61.40Q153.05 63.80 152.33 64.60Q151.60 65.40 150.00 65.40Q148.35 65.40 147.53 63.82Q146.70 62.25 146.70 60.00Q146.70 58.10 147.20 54.50Q147.60 51.30 147.60 50.30Q147.60 49.50 147.05 49.50Q146.30 49.50 145.15 51.30Q144.00 53.10 142.93 55.90Q141.85 58.70 141.20 61.40Q140.65 63.75 139.93 64.57Q139.20 65.40 137.65 65.40ZM193.60 54.00Q194.25 54.00 194.63 54.60Q195.00 55.20 195.00 56.25Q195.00 58.25 194.05 59.35Q192.20 61.60 188.83 63.50Q185.45 65.40 181.60 65.40Q176.35 65.40 173.45 62.55Q170.55 59.70 170.55 54.75Q170.55 51.30 172.00 48.32Q173.45 45.35 176.03 43.60Q178.60 41.85 181.85 41.85Q184.75 41.85 186.50 43.57Q188.25 45.30 188.25 48.25Q188.25 51.70 185.78 54.17Q183.30 56.65 177.40 58.10Q178.65 60.40 182.15 60.40Q184.40 60.40 187.28 58.82Q190.15 57.25 192.25 54.70Q192.85 54.00 193.60 54.00M181.00 46.75Q179.15 46.75 177.88 48.90Q176.60 51.05 176.60 54.10L176.60 54.20Q179.55 53.50 181.25 52.10Q182.95 50.70 182.95 48.85Q182.95 47.90 182.43 47.32Q181.90 46.75 181.00 46.75Z";

// Timing
const PANEL_FADE_MS = 400;
const REVEAL_DELAY_MS = 400;   // start reveal after panel has faded in
const REVEAL_DURATION_MS = 1500;
const HOLD_MS = 400;
const FADE_MS = 600;
const FADE_STARTS_AT = REVEAL_DELAY_MS + REVEAL_DURATION_MS + HOLD_MS;
const FINISH_AT = FADE_STARTS_AT + FADE_MS;

// Unique DOM ids
const CLIP_ID = "wip-glyph-clip-2025";

interface IntroPreloaderProps {
  onIntroComplete: () => void;
  reducedMotion: boolean;
}

export default function IntroPreloader({ onIntroComplete, reducedMotion }: IntroPreloaderProps) {
  const [mounted, setMounted] = useState(false);
  const [skip, setSkip] = useState(false);     // true when sessionStorage already set
  const [panelVisible, setPanelVisible] = useState(false);
  const [revealActive, setRevealActive] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setMounted(true);

    let seen = false;
    try {
      seen = !!sessionStorage.getItem("cdm_lms_intro_seen");
      if (!seen) sessionStorage.setItem("cdm_lms_intro_seen", "true");
    } catch { /* restricted */ }

    if (seen) {
      setSkip(true);
      onIntroComplete();
      return;
    }

    if (reducedMotion) {
      setPanelVisible(true);
      setRevealActive(true);
      const t1 = setTimeout(() => { setIsFadingOut(true); onIntroComplete(); }, 700);
      const t2 = setTimeout(() => setIsFinished(true), 700 + FADE_MS);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }

    // Stagger: panel fades in, then reveal starts
    const t0 = requestAnimationFrame(() => setPanelVisible(true));

    const t1 = setTimeout(() => setRevealActive(true), REVEAL_DELAY_MS);

    const t2 = setTimeout(() => {
      setIsFadingOut(true);
      onIntroComplete();
    }, FADE_STARTS_AT);

    const t3 = setTimeout(() => setIsFinished(true), FINISH_AT);

    return () => {
      cancelAnimationFrame(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [reducedMotion, onIntroComplete]);

  useEffect(() => {
    if (!videoRef.current || reducedMotion) return;
    videoRef.current.play().catch(() => {});
  }, [mounted, reducedMotion]);

  // Don't render anything once finished or when session was already set
  if (isFinished || (mounted && skip)) return null;

  return (
    <div
      aria-hidden="true"
      tabIndex={-1}
      suppressHydrationWarning
      className={`fixed inset-0 z-[999] flex items-center justify-center bg-[#070A11] pointer-events-none select-none transition-opacity ease-out ${isFadingOut ? "opacity-0" : "opacity-100"}`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      {/*
        CSS animations for the reveal sweep.
        The sweep rect starts at scaleX(0) anchored at the left edge of the SVG viewBox.
        It scales to scaleX(1) over REVEAL_DURATION_MS.
        The skewed leading-edge polygon runs ~6 units ahead and creates the diagonal effect.
      */}
      <style>{`
        @keyframes svgSweep {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        .svg-sweep-group {
          transform-origin: ${VB_X}px ${VB_Y}px;
          transform: scaleX(0);
        }
        .svg-sweep-group.active {
          animation: svgSweep ${REVEAL_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        /* Reduced motion: immediately reveal */
        @media (prefers-reduced-motion: reduce) {
          .svg-sweep-group {
            transform: scaleX(1) !important;
            animation: none !important;
          }
        }
      `}</style>

      {/* ── Grayscale video panel — contained rectangle, not full-bleed ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "62vw",
          aspectRatio: "16 / 9",
          overflow: "hidden",
          opacity: panelVisible ? 1 : 0,
          transition: `opacity ${PANEL_FADE_MS}ms ease-out`,
        }}
      >
        <video
          ref={videoRef}
          autoPlay loop muted playsInline
          preload="none"
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            filter: "grayscale(1) brightness(0.38)",
          }}
        >
          <source src="/videos/hero-bg.mp4" type="video/mp4" />
        </video>
      </div>

      {/*
        ── SVG word — wider than the panel, sits on top, tilted -4deg ──
        Width: ~78vw so it overhangs the 62vw panel on both sides.
        Height: driven by 4.13:1 viewBox ratio.
        overflow:visible so the descenders/ascenders aren't clipped by the SVG frame.
      */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          transform: "rotate(-4deg)",
          width: "clamp(280px, 78vw, 1200px)",
        }}
      >
        <svg
          viewBox={VIEWBOX}
          preserveAspectRatio="xMidYMid meet"
          aria-label="Welcome"
          role="img"
          style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
        >
          <defs>
            {/*
              clipPath from the glyph outline.
              clipPathUnits="userSpaceOnUse" → coordinates match the viewBox.
              NO fill-rule added → default nonzero winding keeps e/o/W counters open.
            */}
            <clipPath id={CLIP_ID} clipPathUnits="userSpaceOnUse">
              <path d={PATH_D} />
            </clipPath>
          </defs>

          {/*
            Everything inside this group is clipped to the glyph outlines.
            The group scales from left (scaleX 0→1).
            It contains:
              1. A solid white fill rect covering the entire viewBox.
              2. A narrow skewed leading-edge polygon slightly wider and offset
                 right by ~8 SVG units, creating the angled reveal tip.
                 The polygon is also white and blends into the fill rect,
                 so it just rounds/angles the leading edge visually.
          */}
          <g clipPath={`url(#${CLIP_ID})`}>
            <g className={`svg-sweep-group${revealActive ? " active" : ""}`}>
              {/* Main fill */}
              <rect
                x={VB_X - 1}
                y={VB_Y - 1}
                width={VB_W + 2}
                height={VB_H + 2}
                fill="white"
              />
              {/*
                Leading-edge skew: a right-pointing parallelogram sitting just
                ahead of the fill rect's right edge (at x = VB_W+2).
                Its left edge is at the top-right corner (slanting down-right),
                creating a ~-12deg angled leading boundary.
                In SVG space: top-left at (VB_W+2, VB_Y-1), top-right 8 units
                further right but at the same y, bottom-right at x + 8 lower.
                The scaleX on the parent makes this move left→right as a whole.
              */}
              <polygon
                points={`
                  ${VB_W + 2},${VB_Y - 1}
                  ${VB_W + 10},${VB_Y - 1}
                  ${VB_W + 2},${VB_BOTTOM + 1}
                  ${VB_W - 6},${VB_BOTTOM + 1}
                `}
                fill="white"
              />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
