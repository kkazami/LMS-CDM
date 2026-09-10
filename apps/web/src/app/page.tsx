"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Target,
  Eye,
  ArrowRight,
  BookOpen,
  BarChart3,
  Megaphone,
  ShieldCheck,
} from "lucide-react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  AnimatePresence,
  useInView,
  useMotionValue,
  useSpring,
} from "framer-motion";
import HeroCrest from "./HeroCrest";

/* ─── CDM Brand Palette (sampled from the school crest) ─── */
const brand = {
  gold: "#F5C400",
  goldLight: "#FFDE40",
  goldSubtle: "rgba(245, 196, 0, 0.10)",
  red: "#8B1A1A",
  redDeep: "#6B1010",
  green: "#1B5E20",
  greenLight: "#2E7D32",
  navy: "#0F1724",
  navyLight: "#1A2332",
  cream: "#FFF8E1",
  creamDark: "#FFF3CC",
  white: "#FFFFFF",
  slate: "#64748B",
  slateLight: "#94A3B8",
} as const;

/* ─── About Section Feature Highlights (Confirmed Core LMS Capabilities) ─── */
const aboutFeatures = [
  {
    title: "Coursework & Modules",
    description:
      "Access digitized course syllabi, interactive learning materials, assignments, and lecture modules organized by semester.",
    icon: BookOpen,
  },
  {
    title: "Assessments & Gradebook",
    description:
      "Submit coursework, complete timed quizzes and activities, and monitor verified academic grades and performance history in real time.",
    icon: BarChart3,
  },
  {
    title: "Campus Communications",
    description:
      "Stay updated with official institutional advisories, department notices, and announcements from professors and faculty heads.",
    icon: Megaphone,
  },
  {
    title: "Academic Integrity",
    description:
      "Integrated attempt monitoring, proctored activity review, and role-based access control protecting student and teacher workflows.",
    icon: ShieldCheck,
  },
];

/* ─── Programs Data (Factual descriptions of CDM institutes) ─── */
interface ProgramData {
  id: "ics" | "ite" | "ibe";
  code: string;
  name: string;
  subtitle: string;
  description: string;
  logo: string;
  alt: string;
  color: string;
  colorLight: string;
  colorBorder: string;
  colorGlow: string;
  features: string[];
  loginUrl: string;
}

const programs: ProgramData[] = [
  {
    id: "ics",
    code: "ICS",
    name: "Institute of Computing Studies",
    subtitle: "Computing, Software Engineering & Applied Technology",
    description:
      "The Institute of Computing Studies prepares students for technology careers through rigorous programming laboratories, software engineering methodology, algorithmic problem-solving, and industry-aligned capstone projects.",
    logo: "/images/ics-logo.jpg",
    alt: "ICS — Institute of Computer Studies emblem",
    color: "#E06A26",
    colorLight: "rgba(224, 106, 38, 0.15)",
    colorBorder: "rgba(224, 106, 38, 0.35)",
    colorGlow: "rgba(224, 106, 38, 0.15)",
    features: [
      "Coding Laboratories & Simulations",
      "Capstone Project Development",
      "Software Systems & Database Architecture",
    ],
    loginUrl: "/login?institute=ics",
  },
  {
    id: "ite",
    code: "ITE",
    name: "Institute of Teacher Education",
    subtitle: "Pedagogical Excellence, Curriculum & Academic Leadership",
    description:
      "The Institute of Teacher Education is committed to molding values-oriented, competent professional educators equipped with contemporary instructional methodologies, classroom leadership skills, and demonstration teaching practice.",
    logo: "/images/ite-logo.jpg",
    alt: "ITE — Institute of Teacher Education emblem",
    color: "#0284C7",
    colorLight: "rgba(2, 132, 199, 0.15)",
    colorBorder: "rgba(2, 132, 199, 0.35)",
    colorGlow: "rgba(2, 132, 199, 0.15)",
    features: [
      "Instructional Design & Lesson Planning",
      "Demonstration Teaching & Rubrics",
      "Certified Educator Leadership Preparation",
    ],
    loginUrl: "/login?institute=ite",
  },
  {
    id: "ibe",
    code: "IBE",
    name: "Institute of Business and Entrepreneurship",
    subtitle: "Enterprise Management, Finance & Strategic Leadership",
    description:
      "The Institute of Business and Entrepreneurship nurtures future enterprise managers and ethical entrepreneurs through comprehensive training in financial analysis, corporate administration, marketing strategies, and venture creation.",
    logo: "/images/ibe-logo.jpg",
    alt: "IBE — Institute of Business and Entrepreneurship emblem",
    color: "#EAB308",
    colorLight: "rgba(234, 179, 8, 0.15)",
    colorBorder: "rgba(234, 179, 8, 0.35)",
    colorGlow: "rgba(234, 179, 8, 0.15)",
    features: [
      "Enterprise & Strategic Operations",
      "Financial Analysis & Feasibility Studies",
      "Venture Incubation & Entrepreneurship",
    ],
    loginUrl: "/login?institute=ibe",
  },
];

/* ─── Interactive Stats Counter Strip ─── */
interface StatItemData {
  target: number;
  suffix: string;
  label: string;
  sublabel: string;
}

const statsData: StatItemData[] = [
  {
    target: 3,
    suffix: "",
    label: "Academic Institutes",
    sublabel: "Specialized Curricula",
  },
  {
    target: 100,
    suffix: "%",
    label: "Cloud Syllabi",
    sublabel: "Digitized Modules",
  },
  {
    target: 24,
    suffix: "/7",
    label: "Portal Access",
    sublabel: "Always Available",
  },
  {
    target: 0,
    suffix: "ms",
    label: "Roster Lag",
    sublabel: "Instant Synchronization",
  },
];

function StatsCounterStrip({ reducedMotion }: { reducedMotion: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });
  const [counts, setCounts] = useState([0, 0, 0, 0]);

  useEffect(() => {
    if (!isInView) return;
    if (reducedMotion) {
      setCounts([3, 100, 24, 0]);
      return;
    }

    const duration = 1200; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      setCounts([
        Math.round(ease * 3),
        Math.round(ease * 100),
        Math.round(ease * 24),
        0,
      ]);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCounts([3, 100, 24, 0]);
      }
    };

    const handle = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(handle);
  }, [isInView, reducedMotion]);

  return (
    <div ref={containerRef} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 my-8 sm:my-12">
      <motion.div
        initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: reducedMotion ? 0 : 20 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-white/10 p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden"
        style={{
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* Ambient background glow beam */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            background:
              "radial-gradient(800px circle at 50% -30%, rgba(245, 196, 0, 0.15), transparent 70%)",
          }}
        />

        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 divide-y sm:divide-y-0 sm:divide-x-0 lg:divide-x divide-white/10">
          {statsData.map((stat, idx) => (
            <div
              key={idx}
              className={`flex flex-col items-center text-center ${
                idx > 1 ? "pt-6 sm:pt-0" : ""
              } ${idx > 0 ? "lg:pl-8" : ""}`}
            >
              <div className="flex items-baseline gap-0.5">
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-sm font-mono">
                  {counts[idx]}
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-400">
                  {stat.suffix}
                </span>
              </div>
              <span className="mt-2 text-xs sm:text-sm font-bold text-slate-200 tracking-wide uppercase">
                {stat.label}
              </span>
              <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                {stat.sublabel}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Magnetic Wrapper for Interactive Pull Physics ─── */
function MagneticWrapper({
  children,
  className = "",
  maxOffset = 8,
  disabled = false,
}: {
  children: React.ReactNode;
  className?: string;
  maxOffset?: number;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { damping: 15, stiffness: 220, mass: 0.2 });
  const springY = useSpring(y, { damping: 15, stiffness: 220, mass: 0.2 });

  useEffect(() => {
    if (disabled) return;
    if (typeof window !== "undefined" && window.matchMedia("(hover: none)").matches) {
      return;
    }

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Distance from element bounds
      const clampedMouseX = Math.max(rect.left, Math.min(rect.right, e.clientX));
      const clampedMouseY = Math.max(rect.top, Math.min(rect.bottom, e.clientY));
      const distFromBounds = Math.hypot(e.clientX - clampedMouseX, e.clientY - clampedMouseY);

      // Within 35px perimeter of the element:
      if (distFromBounds <= 35) {
        const distX = e.clientX - centerX;
        const distY = e.clientY - centerY;
        // Translate slightly toward mouse coordinates, clamped to maxOffset (8px)
        const pullFactor = 0.25;
        const offsetX = Math.max(-maxOffset, Math.min(maxOffset, distX * pullFactor));
        const offsetY = Math.max(-maxOffset, Math.min(maxOffset, distY * pullFactor));
        x.set(offsetX);
        y.set(offsetY);
      } else {
        // Snap back with spring transition on exit
        if (x.get() !== 0 || y.get() !== 0) {
          x.set(0);
          y.set(0);
        }
      }
    };

    window.addEventListener("mousemove", handleWindowMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleWindowMouseMove);
  }, [disabled, maxOffset, x, y]);

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Lightweight Ambient Constellation / Particle Field ─── */
function ConstellationCanvas({ reducedMotion }: { reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(hover: none)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let isVisible = true;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener("resize", handleResize);

    // Mouse coordinates relative to canvas
    const mouse = { x: -1000, y: -1000, active: false };

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        mouse.active = true;
      } else {
        mouse.active = false;
      }
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    // IntersectionObserver to pause animation when scrolled out of view
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    // Generate ~36 lightweight nodes for optimal 60fps performance
    const NODE_COUNT = 36;
    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * (width || 800),
      y: Math.random() * (height || 600),
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      radius: Math.random() * 1.5 + 1.2,
      baseAlpha: Math.random() * 0.35 + 0.25,
    }));

    const render = () => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Update and draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Move
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off bounds
        if (node.x <= 0 || node.x >= width) node.vx *= -1;
        if (node.y <= 0 || node.y >= height) node.vy *= -1;

        // Mouse interaction: repel slightly and connect
        if (mouse.active) {
          const dx = node.x - mouse.x;
          const dy = node.y - mouse.y;
          const dist = Math.hypot(dx, dy);

          // Repel when cursor is close (< 110px)
          if (dist < 110 && dist > 0) {
            const force = (110 - dist) / 110;
            const angle = Math.atan2(dy, dx);
            node.x += Math.cos(angle) * force * 1.1;
            node.y += Math.sin(angle) * force * 1.1;

            // Connect cursor to node with subtle glowing line
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(245, 196, 0, ${force * 0.35})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }

        // Draw glowing particle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 196, 0, ${node.baseAlpha})`;
        ctx.shadowColor = "rgba(245, 196, 0, 0.45)";
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Connect nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const dist = Math.hypot(node.x - other.x, node.y - other.y);
          if (dist < 100) {
            const alpha = (1 - dist / 100) * 0.16;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(245, 196, 0, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      observer.disconnect();
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 w-full h-full z-0 opacity-40"
      aria-hidden="true"
    />
  );
}

export default function HomePage() {
  const currentYear = new Date().getFullYear();
  const heroRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const [mounted, setMounted] = useState(false);

  // Intro sequence states:
  // 1. Initial/load: solid dark overlay covers bg; logo is stationary in hero position; text & navbar hidden
  // 2. (~350ms): solid dark overlay fades out smoothly, revealing campus background photo beneath stationary logo
  // 3. (~750ms): hero text and top navbar smoothly perform independent opacity fade-in
  const [bgRevealed, setBgRevealed] = useState(false);
  const [textRevealed, setTextRevealed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const resizeTimer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 100);

    // As logo finishes scaling in place (~650ms), fade out dark scrim
    const bgTimer = setTimeout(() => {
      setBgRevealed(true);
    }, 650);

    // After logo finishes scaling up (~850ms), reveal text and top navbar
    const textTimer = setTimeout(() => {
      setTextRevealed(true);
    }, 850);

    return () => {
      clearTimeout(resizeTimer);
      clearTimeout(bgTimer);
      clearTimeout(textTimer);
    };
  }, []);

  // Smart auto-hiding top navigation bar state
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 20) {
        // Near the top (scrollY < 20): Keep the navbar visible
        setNavVisible(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        // Scrolling DOWN: Slide the navbar out of view upward
        setNavVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        // Scrolling UP: Slide the navbar back into view
        setNavVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Active program tab state
  const [activeTab, setActiveTab] = useState<"ics" | "ite" | "ibe">("ics");
  const activeProgram = programs.find((p) => p.id === activeTab) || programs[0];

  // Window scroll tracking for hero parallax
  const { scrollY } = useScroll();

  // Calm, single-axis hero parallax: gentle upward drift (-40px) and fade as sheet covers it
  const heroY = useTransform(scrollY, [0, 300], [0, -40]);
  const heroOpacity = useTransform(scrollY, [0, 200, 300], [1, 0.7, 0]);

  // Keyboard navigation handler for program tabs
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      let nextIndex = currentIndex;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % programs.length;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + programs.length) % programs.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIndex = programs.length - 1;
      } else {
        return;
      }
      const nextProgram = programs[nextIndex];
      setActiveTab(nextProgram.id);
      const nextBtn = document.getElementById(`tab-${nextProgram.id}`);
      nextBtn?.focus();
    },
    []
  );

  /* ─── Hero Sequential Timeline Variants ─── */
  const bgPhotoVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: reducedMotion ? 0 : 0.85,
        delay: reducedMotion ? 0 : 0.85,
        ease: "easeOut" as const,
      },
    },
  };

  const crestVariants = {
    hidden: { scale: reducedMotion ? 1 : 0.4, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: reducedMotion ? 0 : 0.85,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  const heroTextContainerVariants = {
    hidden: {
      opacity: 0,
      y: reducedMotion ? 0 : 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reducedMotion ? 0 : 0.7,
        delay: reducedMotion ? 0 : 1.35,
        ease: "easeOut" as const,
      },
    },
  };

  /* ─── Program Portal Section InView Hooks ─── */
  const portalHeadingRef = useRef<HTMLDivElement>(null);
  const isHeadingInView = useInView(portalHeadingRef, { once: false, amount: 0.1 });

  const portalCardRef = useRef<HTMLDivElement>(null);
  const isCardInView = useInView(portalCardRef, { once: false, amount: 0.1 });

  const portalTabBarRef = useRef<HTMLDivElement>(null);
  const isTabBarInView = useInView(portalTabBarRef, { once: false, amount: 0.05 });

  const portalPanelRef = useRef<HTMLDivElement>(null);
  const isPanelInView = useInView(portalPanelRef, { once: false, amount: 0.05 });

  /* ─── Mission & Vision Section InView Hooks ─── */
  const mvHeadingRef = useRef<HTMLDivElement>(null);
  const isMvHeadingInView = useInView(mvHeadingRef, { once: false, amount: 0.1 });

  const missionCardRef = useRef<HTMLDivElement>(null);
  const isMissionInView = useInView(missionCardRef, { once: false, amount: 0.1 });

  const visionCardRef = useRef<HTMLDivElement>(null);
  const isVisionInView = useInView(visionCardRef, { once: false, amount: 0.1 });

  /* ─── About Section InView Hooks ─── */
  const aboutHeadingRef = useRef<HTMLDivElement>(null);
  const isAboutHeadingInView = useInView(aboutHeadingRef, { once: false, amount: 0.1 });

  const aboutGridRef = useRef<HTMLDivElement>(null);
  const isAboutGridInView = useInView(aboutGridRef, { once: false, amount: 0.1 });

  /* ─── Footer InView Hook ─── */
  const footerRef = useRef<HTMLElement>(null);
  const isFooterInView = useInView(footerRef, { once: false, amount: 0.1 });

  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  // Floating Magnetic Follow-Cursor Badge state for Program Portal
  const mouseX = useMotionValue(-200);
  const mouseY = useMotionValue(-200);
  const springConfig = { damping: 25, stiffness: 320, mass: 0.5 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);
  const [isCardHovered, setIsCardHovered] = useState(false);

  // Subtle 3D Card Tilt Physics (Mouse Follow)
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const tiltSpringConfig = { damping: 20, stiffness: 180, mass: 0.5 };
  const rotateX = useSpring(tiltX, tiltSpringConfig);
  const rotateY = useSpring(tiltY, tiltSpringConfig);

  const handleCardMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);

      // Disable 3D tilt on touch devices or reduced motion
      if (
        reducedMotion ||
        (typeof window !== "undefined" && window.matchMedia("(hover: none)").matches)
      ) {
        return;
      }

      if (!portalCardRef.current) return;
      const rect = portalCardRef.current.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const cardCenterY = rect.top + rect.height / 2;

      // Delta from card center (-1 to 1)
      const deltaX = (e.clientX - cardCenterX) / (rect.width / 2);
      const deltaY = (e.clientY - cardCenterY) / (rect.height / 2);

      // Clamp tilt to max ±4 degrees for subtlety
      const maxTilt = 4;
      const clampedX = Math.max(-1, Math.min(1, deltaX)) * maxTilt;
      const clampedY = Math.max(-1, Math.min(1, deltaY)) * -maxTilt;

      tiltX.set(clampedY);
      tiltY.set(clampedX);
    },
    [mouseX, mouseY, reducedMotion, tiltX, tiltY]
  );

  const handleCardMouseLeave = useCallback(() => {
    setIsCardHovered(false);
    tiltX.set(0);
    tiltY.set(0);
  }, [tiltX, tiltY]);

  // Spotlight mouse tracking for About feature cards
  const handleSpotlightMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
      e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
    },
    []
  );

  const handlePortalCardClick = useCallback(() => {
    if (isNavigating) return;
    setIsNavigating(true);
    setTimeout(() => {
      router.push(activeProgram.loginUrl);
    }, 250);
  }, [isNavigating, router, activeProgram.loginUrl]);

  return (
    <motion.div
      className="relative min-h-screen w-full"
      style={{ backgroundColor: "#0B0F19" }}
      animate={{ opacity: isNavigating ? 0 : 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.3, ease: "easeInOut" }}
    >
      {/* ═══════════════════ FLOATING MAGNETIC CURSOR BADGE (Program Portal) ═══════════════════ */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-50 select-none hidden [@media(hover:hover)_and_(pointer:fine)]:block"
        style={{
          x: cursorX,
          y: cursorY,
        }}
        initial={false}
        animate={{
          opacity: isCardHovered ? 1 : 0,
          scale: isCardHovered ? 1 : 0.6,
        }}
        transition={{
          duration: 0.16,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <div
          className="relative -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 rounded-full font-medium text-xs tracking-wide shadow-2xl backdrop-blur-md border text-white whitespace-nowrap transition-colors duration-200"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.90)",
            boxShadow: `0 14px 34px rgba(0, 0, 0, 0.65), 0 0 20px ${activeProgram.colorGlow}`,
            borderColor: activeProgram.colorBorder,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-ping"
            style={{ backgroundColor: activeProgram.color }}
          />
          <span className="font-semibold text-white drop-shadow-sm">
            Enter {activeProgram.code}
          </span>
          <span
            className="text-xs font-bold transition-transform duration-200"
            style={{ color: activeProgram.color }}
          >
            &rarr;
          </span>
        </div>
      </motion.div>

      {/* ═══════════════════ SMART AUTO-HIDING TOP NAVIGATION BAR ═══════════════════ */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-neutral-950/75 border-b border-white/10 transition-all duration-300 ease-in-out ${
          !textRevealed
            ? "opacity-0 pointer-events-none -translate-y-2"
            : navVisible
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: CDM Seal / Logo + Lumina LMS Brand */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg p-1"
          >
            <div className="relative w-8 h-8 aspect-square rounded-full overflow-hidden bg-white p-0.5 border border-amber-400/40 shadow-sm shrink-0">
              <Image
                src="/images/cdm-logo.png"
                alt="Colegio de Montalban Seal"
                fill
                sizes="32px"
                className="object-contain"
                priority
              />
            </div>
            <span className="font-bold text-base tracking-tight text-white group-hover:text-amber-400 transition-colors">
              Lumina LMS
            </span>
          </a>

          {/* Center/Right: Anchor Navigation Links (Sign In button completely removed) */}
          <div className="flex items-center gap-6 sm:gap-8">
            <a
              href="#departments"
              onClick={(e) => {
                e.preventDefault();
                const target = document.getElementById("departments");
                target?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-sm font-medium text-neutral-400 hover:text-amber-400 transition-colors"
            >
              Departments
            </a>
            <a
              href="#mission-vision"
              onClick={(e) => {
                e.preventDefault();
                const target = document.getElementById("mission-vision");
                target?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-sm font-medium text-neutral-400 hover:text-amber-400 transition-colors"
            >
              Mission &amp; Vision
            </a>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                const target = document.getElementById("about");
                target?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-sm font-medium text-neutral-400 hover:text-amber-400 transition-colors"
            >
              About
            </a>
          </div>
        </nav>
      </header>

      {/* ═══════════════════ STICKY HERO SECTION ═══════════════════ */}
      <section
        ref={heroRef}
        className="sticky top-0 h-screen w-full flex flex-col items-center justify-center px-4 overflow-hidden z-0"
        style={{ backgroundColor: "#0B0F19" }}
      >
        {/* Background photo + dark overlays */}
        <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
          {/* Background photo — school signage */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/images/cdm-background.jpg')" }}
          />

          {/* Dark overlay for contrast & readability */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.80) 100%)",
            }}
          />

          {/* Subtle gold vignette over the overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(245,196,0,0.06) 0%, transparent 60%)",
            }}
          />

          {/* Solid dark transition overlay that fades out to reveal campus background */}
          <div
            className={`absolute inset-0 bg-neutral-950 transition-opacity duration-700 ease-out ${
              bgRevealed ? "opacity-0" : "opacity-100"
            }`}
          />
        </div>

        {/* Subtle Ambient Constellation / Particle Field behind hero */}
        <ConstellationCanvas reducedMotion={reducedMotion} />

        {/* Hero Content Stack — unified calm parallax motion */}
        <div className="relative z-10 flex flex-col items-center text-center -mt-6 sm:-mt-10">
          <motion.div
            className="flex flex-col items-center text-center"
            initial={false}
            style={
              mounted
                ? reducedMotion
                  ? { opacity: 1 }
                  : { y: heroY, opacity: heroOpacity }
                : { opacity: 1 }
            }
            suppressHydrationWarning
          >
            {/* Scale/Pop-in CDM Seal — strictly in place at exact hero position directly above headline */}
            <motion.div
              className="mb-6 sm:mb-8 origin-center"
              initial={false}
              animate={
                mounted
                  ? { scale: 1, opacity: 1 }
                  : { scale: reducedMotion ? 1 : 0.35, opacity: reducedMotion ? 1 : 0 }
              }
              transition={{
                duration: reducedMotion ? 0 : 0.85,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <HeroCrest goldColor={brand.gold} />
            </motion.div>

            {/* Independent Text Reveal: stationary position, pure opacity fade-in */}
            <div
              className={`flex flex-col items-center text-center transition-opacity duration-700 ease-out ${
                textRevealed ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* Headline */}
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight drop-shadow-lg"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${brand.gold} 0%, ${brand.goldLight} 40%, ${brand.white} 100%)`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                }}
              >
                Lumina LMS
              </h1>

              {/* Subheadline */}
              <p
                className="mt-4 text-base sm:text-lg lg:text-xl max-w-xl leading-relaxed drop-shadow-md"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                The official Learning Management System of{" "}
                <span style={{ color: brand.gold, fontWeight: 600 }}>
                  Colegio de Montalban
                </span>
              </p>

              {/* Accent divider */}
              <div className="mt-6 sm:mt-8 flex items-center gap-3">
                <div
                  className="w-12 h-px"
                  style={{ backgroundColor: brand.gold, opacity: 0.5 }}
                />
                <GraduationCap
                  className="w-5 h-5"
                  style={{ color: brand.gold, opacity: 0.8 }}
                />
                <div
                  className="w-12 h-px"
                  style={{ backgroundColor: brand.gold, opacity: 0.5 }}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Repositioned & Pinned "Scroll to Explore" Button near bottom of hero viewport */}
        <div
          className={`absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-20 transition-opacity duration-700 ease-out ${
            textRevealed ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <MagneticWrapper disabled={reducedMotion}>
            <button
              type="button"
              onClick={() => {
                const target = document.getElementById("departments");
                target?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg p-2"
              aria-label="Scroll to academic departments"
            >
              <span className="text-[11px] font-medium tracking-widest uppercase text-white/70 group-hover:text-amber-400 transition-colors">
                Scroll to explore
              </span>
              <motion.svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="text-amber-400"
                animate={{ y: [0, 4, 0] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                aria-hidden="true"
              >
                <path
                  d="M4 6l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            </button>
          </MagneticWrapper>
        </div>
      </section>

      {/* ═══════════════════ SCROLL-COVER CONTENT SHEET (FROSTED GLASS) ═══════════════════ */}
      <div
        className="relative z-10 rounded-t-3xl sm:rounded-t-[2.5rem] backdrop-blur-2xl"
        style={{
          backgroundColor: "transparent",
          WebkitBackdropFilter: "blur(28px)",
          backdropFilter: "blur(28px)",
          borderTop: "1.5px solid rgba(255, 255, 255, 0.30)",
          boxShadow: "0 -28px 72px rgba(0,0,0,0.55), 0 -6px 20px rgba(0,0,0,0.30)",
        }}
      >
        {/* Decorative sheet grab handle */}
        <div className="pt-4 pb-2 flex justify-center">
          <div className="w-12 h-1 rounded-full bg-white/40 shadow-sm" />
        </div>

        {/* ─── SECTION 1: TABBED BROWSER DEPARTMENT SELECTOR ─── */}
        <section id="departments" className="relative px-4 sm:px-6 lg:px-8 pt-6 pb-16 sm:pt-8 sm:pb-20 overflow-hidden">
          {/* Subtle Ambient Constellation / Particle Field behind department portal */}
          <ConstellationCanvas reducedMotion={reducedMotion} />

          <div className="relative z-10 max-w-4xl mx-auto">
            <motion.div
              ref={portalHeadingRef}
              className="text-center mb-8"
              initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
              animate={
                isHeadingInView
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: reducedMotion ? 0 : 16 }
              }
              transition={{ duration: reducedMotion ? 0 : 0.5, ease: "easeOut" }}
            >
              <span
                className="text-xs font-bold tracking-[0.25em] uppercase drop-shadow-sm transition-colors duration-300"
                style={{ color: activeProgram.color }}
              >
                Academic Institutes
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Select Your Department Portal
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-300">
                Choose your department to access student or faculty sign-in
              </p>
            </motion.div>

            {/* Browser Window Frame — smooth spring scale pop & fade on first scroll */}
            <motion.div
              ref={portalCardRef}
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              className="rounded-3xl border overflow-hidden backdrop-blur-xl"
              initial={{
                opacity: 0,
                scale: reducedMotion ? 1 : 0.94,
                y: reducedMotion ? 0 : 30,
              }}
              animate={
                isCardInView
                  ? { opacity: 1, scale: 1, y: 0 }
                  : {
                      opacity: 0,
                      scale: reducedMotion ? 1 : 0.94,
                      y: reducedMotion ? 0 : 30,
                    }
              }
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                mass: 0.8,
                delay: reducedMotion ? 0 : 0.08,
              }}
              style={{
                rotateX,
                rotateY,
                transformPerspective: 1000,
                backgroundColor: "rgba(15, 23, 42, 0.75)",
                borderColor: activeProgram.colorBorder,
                boxShadow: `0 24px 60px rgba(0,0,0,0.50), 0 0 50px ${activeProgram.colorGlow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
                transition: "border-color 400ms ease, box-shadow 400ms ease, background-color 400ms ease",
              }}
            >
              {/* Browser Window Top Chrome Bar (Exclusion Zone: hides badge, restores standard pointer) */}
              <div
                onMouseEnter={() => setIsCardHovered(false)}
                className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3.5 border-b gap-3 relative z-20 cursor-default"
                style={{
                  backgroundColor: "rgba(11, 17, 30, 0.85)",
                  borderColor: "rgba(255, 255, 255, 0.08)",
                }}
              >
                {/* Left: Window controls & label */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    <div className="w-3 h-3 rounded-full bg-red-500/70 border border-red-400/40" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/70 border border-amber-400/40" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/70 border border-emerald-400/40" />
                  </div>
                  <span className="text-xs font-medium text-slate-400 pl-2 hidden sm:inline border-l border-white/10">
                    Lumina LMS &bull; Department Portal
                  </span>
                </div>

                {/* Right: Accessible Horizontal Tab Bar (fades + slides in from left, replaying on scroll) */}
                <motion.div
                  ref={portalTabBarRef}
                  role="tablist"
                  aria-label="Colegio de Montalban Departments"
                  className="flex items-center gap-1.5 p-1 rounded-xl"
                  initial={{ opacity: 0, x: reducedMotion ? 0 : -25 }}
                  animate={
                    isTabBarInView
                      ? { opacity: 1, x: 0 }
                      : { opacity: 0, x: reducedMotion ? 0 : -25 }
                  }
                  transition={{
                    duration: reducedMotion ? 0 : 0.5,
                    delay: reducedMotion ? 0 : 0.1,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.60)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  {programs.map((prog, idx) => {
                    const isSelected = activeTab === prog.id;
                    return (
                      <MagneticWrapper key={prog.id} disabled={reducedMotion}>
                        <button
                          id={`tab-${prog.id}`}
                          role="tab"
                          aria-selected={isSelected}
                          aria-controls={`panel-${prog.id}`}
                          tabIndex={isSelected ? 0 : -1}
                          onClick={() => setActiveTab(prog.id)}
                          onKeyDown={(e) => handleTabKeyDown(e, idx)}
                          className={`relative flex items-center gap-2.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400 ${
                            isSelected
                              ? "text-white shadow-md"
                              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                          }`}
                          style={{
                            backgroundColor: isSelected
                              ? prog.colorLight
                              : "transparent",
                            borderColor: isSelected
                              ? prog.colorBorder
                              : "transparent",
                          }}
                        >
                          {/* Department Official Logo Tab Badge */}
                          <div
                            className={`relative w-6 h-6 rounded-full overflow-hidden shadow-sm shrink-0 border border-white/40 flex items-center justify-center ${
                              prog.id === "ite" ? "bg-transparent" : "bg-white p-0.5"
                            }`}
                          >
                            <Image
                              src={prog.logo}
                              alt={prog.alt}
                              fill
                              sizes="24px"
                              className={prog.id === "ite" ? "w-full h-full object-cover" : "object-contain"}
                            />
                          </div>
                          <span>{prog.code}</span>

                          {/* Active tab bottom indicator highlight */}
                          {isSelected && (
                            <motion.div
                              layoutId="activeTabUnderline"
                              className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                              style={{ backgroundColor: prog.color }}
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                        </button>
                      </MagneticWrapper>
                    );
                  })}
                </motion.div>
              </div>

              {/* Browser Content Panel (Active Zone with Follow-Cursor) */}
              <motion.div
                ref={portalPanelRef}
                onMouseEnter={() => setIsCardHovered(true)}
                onMouseLeave={() => setIsCardHovered(false)}
                onMouseMove={handleCardMouseMove}
                onClick={handlePortalCardClick}
                role="link"
                tabIndex={0}
                aria-label={`Enter ${activeProgram.name} Portal`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handlePortalCardClick();
                  }
                }}
                className={`p-6 sm:p-8 lg:p-10 relative overflow-hidden flex items-center transition-all duration-300 select-none group ${
                  isCardHovered ? "lg:cursor-none [&_*]:lg:cursor-none" : "cursor-pointer"
                }`}
                initial={{ opacity: 0, x: reducedMotion ? 0 : 25 }}
                animate={
                  isPanelInView
                    ? { opacity: 1, x: 0 }
                    : { opacity: 0, x: reducedMotion ? 0 : 25 }
                }
                transition={{
                  duration: reducedMotion ? 0 : 0.5,
                  delay: reducedMotion ? 0 : 0.15,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeProgram.id}
                    id={`panel-${activeProgram.id}`}
                    role="tabpanel"
                    aria-labelledby={`tab-${activeProgram.id}`}
                    initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reducedMotion ? 0 : -10 }}
                    transition={{
                      duration: reducedMotion ? 0 : 0.22,
                      ease: "easeInOut",
                    }}
                    className="w-full flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 lg:gap-12"
                  >
                    {/* Left: Program Information */}
                    <div className="flex-1 max-w-2xl">
                      {/* Department Logo Badge + Code Header */}
                      <div className="flex items-center gap-4 sm:gap-5 mb-5">
                        <div
                          className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex items-center justify-center shadow-xl transition-transform shrink-0 ${
                            activeProgram.id === "ite" ? "bg-transparent" : "bg-white p-1.5"
                          }`}
                          style={{
                            boxShadow: `0 0 0 2px ${activeProgram.colorBorder}, 0 8px 24px ${activeProgram.colorGlow}`,
                          }}
                        >
                          <div className="relative w-full h-full rounded-2xl overflow-hidden">
                            <Image
                              src={activeProgram.logo}
                              alt={activeProgram.alt}
                              fill
                              sizes="(max-width: 640px) 64px, 80px"
                              className={
                                activeProgram.id === "ite"
                                  ? "w-full h-full object-cover"
                                  : "object-contain"
                              }
                              priority
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                              style={{
                                backgroundColor: activeProgram.colorLight,
                                color: activeProgram.color,
                                border: `1px solid ${activeProgram.colorBorder}`,
                              }}
                            >
                              {activeProgram.code}
                            </span>
                          </div>
                          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mt-1 tracking-tight">
                            {activeProgram.name}
                          </h2>
                        </div>
                      </div>

                      {/* Tagline / Subtitle */}
                      <p
                        className="text-xs sm:text-sm font-semibold mb-3 tracking-wide"
                        style={{ color: activeProgram.color }}
                      >
                        {activeProgram.subtitle}
                      </p>

                      {/* Factual Description */}
                      <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                        {activeProgram.description}
                      </p>
                    </div>

                    {/* Right: Ambient Status Pill (Desktop) & Mobile Fallback Button */}
                    <div className="w-full lg:w-auto flex flex-col items-start lg:items-end justify-center shrink-0">
                      {/* Desktop Direct Portal Visual Indicator */}
                      <div className="hidden lg:flex flex-col items-end gap-3 text-right">
                        <div
                          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-medium border backdrop-blur-sm transition-all duration-300 group-hover:border-white/30"
                          style={{
                            backgroundColor: "rgba(15, 23, 42, 0.60)",
                            borderColor: "rgba(255, 255, 255, 0.12)",
                            color: activeProgram.color,
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full animate-pulse"
                            style={{ backgroundColor: activeProgram.color }}
                          />
                          <span className="font-semibold tracking-wide">Portal Active</span>
                        </div>
                        <p className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">
                          Click anywhere to enter {activeProgram.code}
                        </p>
                      </div>

                      {/* Mobile / Touch Fallback Action Button */}
                      <div className="lg:hidden w-full pt-4">
                        <div
                          className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm tracking-wide text-white shadow-xl transition-transform active:scale-[0.98]"
                          style={{
                            background: `linear-gradient(135deg, ${activeProgram.color}, #1E293B)`,
                            border: `1px solid ${activeProgram.colorBorder}`,
                            boxShadow: `0 8px 24px ${activeProgram.colorGlow}`,
                          }}
                        >
                          <span>Enter {activeProgram.code}</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════ INTERACTIVE STATS COUNTER STRIP ═══════════════════ */}
        <StatsCounterStrip reducedMotion={reducedMotion} />

        {/* Subtle section divider */}
        <div
          className="max-w-4xl mx-auto border-t"
          style={{ borderColor: "rgba(255,255,255,0.10)" }}
        />

        {/* ─── SECTION 2: INSTITUTIONAL FOUNDATIONS (MISSION & VISION) ─── */}
        <section id="mission-vision" className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20 overflow-hidden">
          <div className="max-w-4xl mx-auto">
            {/* Section Header (replays on scroll) */}
            <motion.div
              ref={mvHeadingRef}
              className="text-center mb-10"
              initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
              animate={
                isMvHeadingInView
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: reducedMotion ? 0 : 16 }
              }
              transition={{ duration: reducedMotion ? 0 : 0.5, ease: "easeOut" }}
            >
              <span className="text-xs font-bold tracking-[0.25em] uppercase text-amber-400 drop-shadow-sm">
                Institutional Foundations
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Mission & Vision
              </h2>
              <p className="mt-2 text-sm text-slate-300 max-w-lg mx-auto">
                Guiding Colegio de Montalban in shaping tomorrow's leaders, educators, and innovators
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Mission Card with Spring Scale Pop & Overshoot (replays on scroll) */}
              <motion.div
                ref={missionCardRef}
                className="relative rounded-2xl border p-8 sm:p-10 overflow-hidden backdrop-blur-md transition-all duration-300 hover:shadow-2xl"
                initial={{
                  opacity: 0,
                  scale: reducedMotion ? 1 : 0.75,
                  y: reducedMotion ? 0 : 20,
                }}
                animate={
                  isMissionInView
                    ? { opacity: 1, scale: 1, y: 0 }
                    : {
                        opacity: 0,
                        scale: reducedMotion ? 1 : 0.75,
                        y: reducedMotion ? 0 : 20,
                      }
                }
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 16,
                  mass: 0.75,
                  delay: reducedMotion ? 0 : 0.05,
                }}
                style={{
                  backgroundColor: "rgba(15, 23, 42, 0.65)",
                  borderColor: "rgba(255,255,255,0.10)",
                  boxShadow:
                    "0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                {/* Accent top border */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{
                    background: `linear-gradient(90deg, ${brand.red}, ${brand.gold})`,
                  }}
                />

                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${brand.red}20, ${brand.red}0A)`,
                      border: `1px solid ${brand.red}25`,
                    }}
                  >
                    <Target className="w-5 h-5" style={{ color: "#EF4444" }} />
                  </div>
                  <h3
                    className="text-xs font-bold tracking-[0.2em] uppercase"
                    style={{ color: "rgba(255,255,255,0.75)" }}
                  >
                    Mission
                  </h3>
                </div>

                <blockquote
                  className="text-base sm:text-lg leading-relaxed italic"
                  style={{ color: "rgba(255,255,255,0.88)" }}
                >
                  &ldquo;Colegio de Montalban educates students to become highly
                  competitive and value-oriented professionals.&rdquo;
                </blockquote>
              </motion.div>

              {/* Vision Card with Cascading Spring Scale Pop & Overshoot (replays on scroll) */}
              <motion.div
                ref={visionCardRef}
                className="relative rounded-2xl border p-8 sm:p-10 overflow-hidden backdrop-blur-md transition-all duration-300 hover:shadow-2xl"
                initial={{
                  opacity: 0,
                  scale: reducedMotion ? 1 : 0.75,
                  y: reducedMotion ? 0 : 20,
                }}
                animate={
                  isVisionInView
                    ? { opacity: 1, scale: 1, y: 0 }
                    : {
                        opacity: 0,
                        scale: reducedMotion ? 1 : 0.75,
                        y: reducedMotion ? 0 : 20,
                      }
                }
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 16,
                  mass: 0.75,
                  delay: reducedMotion ? 0 : 0.20,
                }}
                style={{
                  backgroundColor: "rgba(15, 23, 42, 0.65)",
                  borderColor: "rgba(255,255,255,0.10)",
                  boxShadow:
                    "0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                {/* Accent top border */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{
                    background: `linear-gradient(90deg, ${brand.green}, ${brand.gold})`,
                  }}
                />

                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${brand.green}20, ${brand.green}0A)`,
                      border: `1px solid ${brand.green}25`,
                    }}
                  >
                    <Eye className="w-5 h-5" style={{ color: "#22C55E" }} />
                  </div>
                  <h3
                    className="text-xs font-bold tracking-[0.2em] uppercase"
                    style={{ color: "rgba(255,255,255,0.75)" }}
                  >
                    Vision
                  </h3>
                </div>

                <blockquote
                  className="text-base sm:text-lg leading-relaxed italic"
                  style={{ color: "rgba(255,255,255,0.88)" }}
                >
                  &ldquo;Colegio de Montalban, as an excellent higher educational
                  institution in education, business, and computing studies, is
                  committed to producing responsible and productive
                  professionals.&rdquo;
                </blockquote>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Subtle section divider */}
        <div
          className="max-w-4xl mx-auto border-t"
          style={{ borderColor: "rgba(255,255,255,0.10)" }}
        />

        {/* ─── SECTION 3: ABOUT LUMINA LMS ─── */}
        <section id="about" className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-4xl mx-auto">
            {/* Section Header with slide down from above (replays on scroll) */}
            <motion.div
              ref={aboutHeadingRef}
              className="text-center mb-10 sm:mb-12"
              initial={{ opacity: 0, y: reducedMotion ? 0 : -20 }}
              animate={
                isAboutHeadingInView
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: reducedMotion ? 0 : -20 }
              }
              transition={{ duration: reducedMotion ? 0 : 0.55, ease: "easeOut" }}
            >
              <span className="text-xs font-bold tracking-[0.25em] uppercase text-amber-400 drop-shadow-sm">
                About the Platform
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                What is Lumina LMS?
              </h2>
              <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
                Lumina LMS is the official learning management system for{" "}
                <span className="text-white font-medium">Colegio de Montalban</span>.
                It unifies coursework, learning materials, assessments, and departmental
                communication across the Institute of Computing Studies (ICS), Institute of
                Teacher Education (ITE), and Institute of Business and Entrepreneurship (IBE) in
                one secure, accessible environment.
              </p>
            </motion.div>

            {/* Feature Highlights Grid with Staggered Cascading Slide-Up (replays on scroll) */}
            <div ref={aboutGridRef} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {aboutFeatures.map((feat, idx) => (
                <motion.div
                  key={idx}
                  onMouseMove={handleSpotlightMouseMove}
                  className="group relative p-5 sm:p-6 rounded-2xl border border-white/10 backdrop-blur-md overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-200"
                  initial={{
                    opacity: 0,
                    scale: reducedMotion ? 1 : 0.94,
                    y: reducedMotion ? 0 : 20,
                  }}
                  animate={
                    isAboutGridInView
                      ? { opacity: 1, scale: 1, y: 0 }
                      : {
                          opacity: 0,
                          scale: reducedMotion ? 1 : 0.94,
                          y: reducedMotion ? 0 : 20,
                        }
                  }
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: reducedMotion ? 0 : idx * 0.10,
                  }}
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.65)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.30)",
                  }}
                >
                  {/* Cursor-tracking radial spotlight border highlight */}
                  <div
                    className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"
                    style={{
                      background:
                        "radial-gradient(350px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(245, 158, 11, 0.35), transparent 70%)",
                      maskImage: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                      maskComposite: "exclude",
                      WebkitMaskImage: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                      WebkitMaskComposite: "xor",
                      padding: "1px",
                    }}
                  />

                  {/* Cursor-tracking subtle interior glow */}
                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"
                    style={{
                      background:
                        "radial-gradient(300px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(245, 158, 11, 0.07), transparent 65%)",
                    }}
                  />

                  <div className="relative z-10 flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(245,196,0,0.18), rgba(245,196,0,0.06))",
                        border: "1px solid rgba(245,196,0,0.30)",
                      }}
                    >
                      <feat.icon className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white tracking-tight group-hover:text-amber-300 transition-colors">
                        {feat.title}
                      </h3>
                      <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {feat.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FOOTER with fade-in (replays on scroll) ─── */}
        <motion.footer
          ref={footerRef}
          className="border-t px-4 py-8"
          initial={false}
          animate={isFooterInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.6, ease: "easeOut" }}
          style={{
            borderColor: "rgba(255,255,255,0.15)",
            backgroundColor: "transparent",
            opacity: isFooterInView ? 1 : 0,
          }}
          suppressHydrationWarning
        >
          <div className="max-w-4xl mx-auto text-center">
            <p
              className="text-sm font-medium"
              style={{
                color: "rgba(255,255,255,0.85)",
                textShadow: "0 1px 4px rgba(0,0,0,0.50)",
              }}
            >
              &copy; {currentYear} Colegio de Montalban &mdash; Lumina LMS
            </p>
            <p
              className="mt-2 text-xs"
              style={{
                color: "rgba(255,255,255,0.60)",
                textShadow: "0 1px 3px rgba(0,0,0,0.40)",
              }}
            >
              A capstone project for Colegio de Montalban, Rodriguez, Rizal
            </p>
          </div>
        </motion.footer>
      </div>
    </motion.div>
  );
}
