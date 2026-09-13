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
  Award,
  CheckCircle2,
  Layers,
  Sparkles,
  Users,
  Clock,
  FileText,
  Code2,
  TrendingUp,
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
  useVelocity,
} from "framer-motion";
import HeroCrest from "./HeroCrest";
import GamificationSection from "./GamificationSection";
import AlternatingTimelineSection from "./AlternatingTimelineSection";
import MultiPlatformSection from "./MultiPlatformSection";
import FaqAndCtaSection from "./FaqAndCtaSection";
import IntroPreloader from "./IntroPreloader";

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

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 w-full h-full z-0 opacity-40"
      aria-hidden="true"
    />
  );
}

/* ─── Platform Preview Interactive Configuration ─── */
type PreviewInstitute = "ics" | "ite" | "ibe";
type PreviewRole = "student" | "instructor";
type PreviewSidebarItem =
  | "dashboard"
  | "courses"
  | "grades"
  | "announcements"
  | "tasks"
  | "flashcards"
  | "leaderboards";

interface PreviewCourse {
  name: string;
  code: string;
  progress: number;
  grade?: string;
  status?: string;
  enrolled?: number;
  pendingSubmissions?: number;
}

const previewConfig: Record<
  PreviewInstitute,
  {
    code: string;
    name: string;
    sidebarTitle: string;
    degreeName: string;
    facultyTitle: string;
    color: string;
    colorLight: string;
    colorBorder: string;
    colorGlow: string;
    studentCourses: PreviewCourse[];
    instructorCourses: PreviewCourse[];
    sampleTasks: { title: string; due: string; status: string; badgeColor: string }[];
    instructorTasks: { title: string; count: string; status: string; badgeColor: string }[];
  }
> = {
  ics: {
    code: "ICS",
    name: "Institute of Computer Studies",
    sidebarTitle: "ICS Preview",
    degreeName: "BS Computer Science",
    facultyTitle: "ICS Faculty",
    color: "#E06A26",
    colorLight: "rgba(224, 106, 38, 0.12)",
    colorBorder: "rgba(224, 106, 38, 0.35)",
    colorGlow: "rgba(224, 106, 38, 0.18)",
    studentCourses: [
      { name: "Sample Course A", code: "CS 101 · Intro to Computing", progress: 78, grade: "1.50", status: "Passed" },
      { name: "Sample Course B", code: "CS 204 · Data Structures", progress: 45, grade: "2.00", status: "In Progress" },
      { name: "Sample Course C", code: "CS 315 · Web Systems & Tech", progress: 88, grade: "1.25", status: "Passed" },
    ],
    instructorCourses: [
      { name: "Sample Course A", code: "CS 101 · Section 1-A", progress: 92, enrolled: 42, pendingSubmissions: 5, grade: "1.75" },
      { name: "Sample Course B", code: "CS 204 · Section 2-B", progress: 78, enrolled: 38, pendingSubmissions: 12, grade: "2.00" },
      { name: "Sample Course C", code: "CS 315 · Section 3-A", progress: 95, enrolled: 35, pendingSubmissions: 3, grade: "1.50" },
    ],
    sampleTasks: [
      { title: "Lab Exercise 3: Binary Search Tree", due: "Due Tomorrow, 11:59 PM", status: "Pending", badgeColor: "#E06A26" },
      { title: "Database Normalization Case Study", due: "Due in 3 days", status: "In Progress", badgeColor: "#38BDF8" },
      { title: "Algorithms Quiz 2: Sorting", due: "Completed", status: "Score: 94/100", badgeColor: "#4ADE80" },
    ],
    instructorTasks: [
      { title: "CS 101: Lab 3 Submissions Review", count: "37/42 Submitted", status: "5 Needs Grading", badgeColor: "#E06A26" },
      { title: "CS 204: Midterm Project Proposals", count: "38/38 Submitted", status: "Needs Review", badgeColor: "#38BDF8" },
      { title: "CS 315: Quiz 2 Attempt Integrity Logs", count: "35 Verified", status: "0 Flagged", badgeColor: "#4ADE80" },
    ],
  },
  ite: {
    code: "ITE",
    name: "Institute of Teacher Education",
    sidebarTitle: "ITE Preview",
    degreeName: "Bachelor of Secondary Education",
    facultyTitle: "ITE Faculty",
    color: "#0284C7",
    colorLight: "rgba(2, 132, 199, 0.12)",
    colorBorder: "rgba(2, 132, 199, 0.35)",
    colorGlow: "rgba(2, 132, 199, 0.18)",
    studentCourses: [
      { name: "Sample Course A", code: "EDUC 101 · Child & Adolescent Dev", progress: 82, grade: "1.50", status: "Passed" },
      { name: "Sample Course B", code: "EDUC 205 · Curriculum & Pedagogy", progress: 60, grade: "1.75", status: "In Progress" },
      { name: "Sample Course C", code: "EDUC 310 · Technology for Teaching", progress: 91, grade: "1.25", status: "Passed" },
    ],
    instructorCourses: [
      { name: "Sample Course A", code: "EDUC 101 · Section 1-A", progress: 88, enrolled: 45, pendingSubmissions: 8, grade: "1.50" },
      { name: "Sample Course B", code: "EDUC 205 · Section 2-A", progress: 75, enrolled: 40, pendingSubmissions: 15, grade: "1.75" },
      { name: "Sample Course C", code: "EDUC 310 · Section 3-B", progress: 96, enrolled: 37, pendingSubmissions: 2, grade: "1.25" },
    ],
    sampleTasks: [
      { title: "Lesson Plan Unit 2: Collaborative Learning", due: "Due Tomorrow, 11:59 PM", status: "Pending", badgeColor: "#0284C7" },
      { title: "Pedagogical Field Observation Reflection", due: "Due in 4 days", status: "In Progress", badgeColor: "#38BDF8" },
      { title: "Educational Assessment Diagnostic Quiz", due: "Completed", status: "Score: 98/100", badgeColor: "#4ADE80" },
    ],
    instructorTasks: [
      { title: "EDUC 101: Demo Teaching Video Rubrics", count: "41/45 Submitted", status: "8 Needs Grading", badgeColor: "#0284C7" },
      { title: "EDUC 205: Curriculum Matrix Evaluation", count: "40/40 Submitted", status: "Needs Review", badgeColor: "#38BDF8" },
      { title: "EDUC 310: Synchronous Quiz Integrity Logs", count: "37 Verified", status: "0 Flagged", badgeColor: "#4ADE80" },
    ],
  },
  ibe: {
    code: "IBE",
    name: "Institute of Business & Entrep",
    sidebarTitle: "IBE Preview",
    degreeName: "BS Business Administration",
    facultyTitle: "IBE Faculty",
    color: "#EAB308",
    colorLight: "rgba(234, 179, 8, 0.12)",
    colorBorder: "rgba(234, 179, 8, 0.35)",
    colorGlow: "rgba(234, 179, 8, 0.18)",
    studentCourses: [
      { name: "Sample Course A", code: "BBA 101 · Principles of Management", progress: 70, grade: "1.75", status: "Passed" },
      { name: "Sample Course B", code: "BBA 202 · Financial Accounting", progress: 54, grade: "2.25", status: "In Progress" },
      { name: "Sample Course C", code: "ENTR 301 · Innovation & Venture Dev", progress: 85, grade: "1.50", status: "Passed" },
    ],
    instructorCourses: [
      { name: "Sample Course A", code: "BBA 101 · Section 1-C", progress: 90, enrolled: 48, pendingSubmissions: 6, grade: "1.75" },
      { name: "Sample Course B", code: "BBA 202 · Section 2-B", progress: 72, enrolled: 44, pendingSubmissions: 11, grade: "2.25" },
      { name: "Sample Course C", code: "ENTR 301 · Section 3-A", progress: 94, enrolled: 39, pendingSubmissions: 4, grade: "1.50" },
    ],
    sampleTasks: [
      { title: "Business Model Canvas Presentation", due: "Due Tomorrow, 11:59 PM", status: "Pending", badgeColor: "#EAB308" },
      { title: "Financial Ratio Analysis Worksheet", due: "Due in 2 days", status: "In Progress", badgeColor: "#38BDF8" },
      { title: "Market Feasibility Quiz Module 3", due: "Completed", status: "Score: 92/100", badgeColor: "#4ADE80" },
    ],
    instructorTasks: [
      { title: "BBA 101: Enterprise Case Analysis", count: "45/48 Submitted", status: "6 Needs Grading", badgeColor: "#EAB308" },
      { title: "BBA 202: Balance Sheet Spreadsheet Audits", count: "44/44 Submitted", status: "Needs Review", badgeColor: "#38BDF8" },
      { title: "ENTR 301: Pitch Deck Assessment Logs", count: "39 Verified", status: "0 Flagged", badgeColor: "#4ADE80" },
    ],
  },
};

/* ─── Coverflow 3D Department Portal Deck ─── */
interface CoverflowPortalProps {
  programs: ProgramData[];
  activeIndex: number;
  onSelectIndex: (index: number) => void;
  onEnterProgram: (program: ProgramData) => void;
  reducedMotion: boolean;
  deckRef?: React.RefObject<HTMLDivElement | null>;
  isDeckInView?: boolean;
  tabBarRef?: React.RefObject<HTMLDivElement | null>;
  isTabBarInView?: boolean;
}

function CoverflowDepartmentPortal({
  programs,
  activeIndex,
  onSelectIndex,
  onEnterProgram,
  reducedMotion,
  deckRef,
  isDeckInView = true,
  tabBarRef,
  isTabBarInView = true,
}: CoverflowPortalProps) {
  // Cursor tracking for the active center card (pill position)
  const mouseX = useMotionValue(-200);
  const mouseY = useMotionValue(-200);
  const springX = useSpring(mouseX, { damping: 25, stiffness: 320, mass: 0.5 });
  const springY = useSpring(mouseY, { damping: 25, stiffness: 320, mass: 0.5 });
  const [isCenterHovered, setIsCenterHovered] = useState(false);

  // Magnetic 3D tilt for the active center card
  // tiltX drives rotateX (vertical tilt), tiltY drives rotateY (horizontal tilt)
  const rawTiltX = useMotionValue(0); // degrees: positive = bottom edge toward viewer
  const rawTiltY = useMotionValue(0); // degrees: positive = right edge toward viewer
  const tiltX = useSpring(rawTiltX, { stiffness: 180, damping: 22, mass: 0.6 });
  const tiltY = useSpring(rawTiltY, { stiffness: 180, damping: 22, mass: 0.6 });

  const activeProgram = programs[activeIndex];

  const handleCenterMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Drive cursor-following pill
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
    // Drive magnetic tilt: normalize offset to -1..+1 relative to card center
    if (!reducedMotion) {
      const maxDeg = 8;
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;  // -1 left, +1 right
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;  // -1 top, +1 bottom
      // rotateY: positive tilts right edge toward viewer (cursor right → tilt right)
      // rotateX: positive tilts bottom toward viewer (cursor bottom → tilt bottom)
      rawTiltY.set(nx * maxDeg);
      rawTiltX.set(-ny * maxDeg);
    }
  };

  const handleCenterMouseLeave = () => {
    setIsCenterHovered(false);
    // Spring back to flat
    rawTiltX.set(0);
    rawTiltY.set(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onSelectIndex((activeIndex - 1 + programs.length) % programs.length);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onSelectIndex((activeIndex + 1) % programs.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onEnterProgram(activeProgram);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* ─── DESKTOP COVERFLOW 3D DECK (md:flex) ─── */}
      <motion.div
        ref={deckRef}
        className="w-full hidden md:flex justify-center"
        initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
        animate={
          isDeckInView
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: reducedMotion ? 0 : 20 }
        }
        transition={{
          duration: reducedMotion ? 0 : 0.5,
          ease: "easeOut",
          delay: reducedMotion ? 0 : 0.18,
        }}
      >
        <div
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="relative w-full max-w-5xl flex items-center justify-center min-h-[580px] py-4 outline-none select-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-3xl"
          style={{
            perspective: reducedMotion ? "none" : 1200,
            transformStyle: "preserve-3d",
          }}
          aria-label="Academic Department Portal 3D Coverflow. Select an institute card to bring it to center, or press Enter to launch portal."
        >
        {/* Center Deck Anchor (holds the 3 overlapping cards in 3D space) */}
        <div
          className="relative w-[380px] lg:w-[440px] h-[520px]"
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          {programs.map((prog, idx) => {
            let diff = idx - activeIndex;
            if (diff === 2) diff = -1;
            if (diff === -2) diff = 1;

            const isCenter = diff === 0;

            // Positioning & 3D rotation based on coverflow perspective:
            // diff === 0: Center upright card, elevated, unblurred (blur 0px), scale 1.0, z: 30px
            // diff === -1: Left side card, tilted away by +25deg, shifted left, blurred (blur 5px), scale 0.88, z: -90px
            // diff === 1: Right side card, tilted away by -25deg, shifted right, blurred (blur 5px), scale 0.88, z: -90px
            const xOffset = diff === 0 ? 0 : diff === -1 ? -280 : 280;
            const rotateYVal = reducedMotion ? 0 : (diff === 0 ? 0 : diff === -1 ? 25 : -25);
            const scaleVal = diff === 0 ? 1 : 0.88;
            const zVal = reducedMotion ? 0 : (diff === 0 ? 30 : -90);
            const opacityVal = diff === 0 ? 1 : 0.65;
            const filterVal = isCenter ? "blur(0px)" : "blur(5px)";
            const zIndexVal = diff === 0 ? 25 : 10;

            return (
              <motion.div
                key={prog.id}
                role="button"
                tabIndex={0}
                aria-label={`${prog.name} (${prog.code}) Portal${isCenter ? " - Active" : ""}`}
                onClick={() => {
                  if (isCenter) {
                    onEnterProgram(prog);
                  } else {
                    onSelectIndex(idx);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (isCenter) {
                      onEnterProgram(prog);
                    } else {
                      onSelectIndex(idx);
                    }
                  }
                }}
                onMouseMove={isCenter ? handleCenterMouseMove : undefined}
                onMouseEnter={isCenter ? () => setIsCenterHovered(true) : undefined}
                onMouseLeave={isCenter ? handleCenterMouseLeave : undefined}
                initial={false}
                animate={{
                  x: xOffset,
                  rotateY: rotateYVal,
                  scale: scaleVal,
                  z: zVal,
                  opacity: opacityVal,
                  filter: filterVal,
                  zIndex: zIndexVal,
                }}
                transition={{
                  type: "spring",
                  stiffness: 240,
                  damping: 24,
                  mass: 0.8,
                }}
                className={`absolute inset-0 rounded-3xl border p-6 sm:p-7 backdrop-blur-xl transition-colors duration-300 flex flex-col justify-between overflow-hidden outline-none select-none ${
                  isCenter
                    ? "cursor-none [&_*]:cursor-none shadow-2xl"
                    : "cursor-pointer shadow-lg hover:opacity-85"
                }`}
                style={{
                  transformStyle: "preserve-3d",
                  backgroundColor: "rgba(15, 23, 42, 0.82)",
                  borderColor: isCenter ? prog.colorBorder : "rgba(255, 255, 255, 0.10)",
                  boxShadow: isCenter
                    ? `0 24px 60px rgba(0,0,0,0.60), 0 0 45px ${prog.colorGlow}, inset 0 1px 0 rgba(255,255,255,0.12)`
                    : "0 12px 30px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)",
                  // Apply magnetic tilt only to the active center card
                  rotateX: isCenter && !reducedMotion ? tiltX : 0,
                  rotateY: isCenter && !reducedMotion ? tiltY : 0,
                }}
              >
                {/* Ambient Radial Top Glow Beam */}
                <div
                  className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-2xl transition-opacity duration-300"
                  style={{
                    backgroundColor: prog.color,
                    opacity: isCenter ? 0.45 : 0.15,
                  }}
                />

                {/* Thematic Background Accent Per Institute (Subtle SVG Line-art Layer) */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-10 -right-8 z-0 select-none overflow-hidden transition-opacity duration-500"
                  style={{
                    opacity: isCenter ? 0.08 : 0.035,
                  }}
                >
                  {prog.id === "ics" && (
                    <Code2
                      className="w-64 h-64 sm:w-72 sm:h-72 transform -rotate-12 stroke-[1.2]"
                      style={{ color: prog.color }}
                    />
                  )}
                  {prog.id === "ite" && (
                    <GraduationCap
                      className="w-64 h-64 sm:w-72 sm:h-72 transform -rotate-6 stroke-[1.2]"
                      style={{ color: prog.color }}
                    />
                  )}
                  {prog.id === "ibe" && (
                    <TrendingUp
                      className="w-64 h-64 sm:w-72 sm:h-72 transform -rotate-6 stroke-[1.2]"
                      style={{ color: prog.color }}
                    />
                  )}
                </div>

                {/* Custom Cursor Replacement Pill: "Enter [X] →" IS the cursor */}
                {isCenter && (
                  <motion.div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0 left-0 z-40 select-none hidden md:block"
                    style={{
                      x: reducedMotion ? mouseX : springX,
                      y: reducedMotion ? mouseY : springY,
                    }}
                    initial={false}
                    animate={{
                      opacity: isCenterHovered ? 1 : 0,
                      scale: isCenterHovered ? 1 : 0.6,
                    }}
                    transition={{
                      duration: 0.18,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <div
                      className="-translate-x-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs tracking-wide shadow-2xl backdrop-blur-md border text-white whitespace-nowrap"
                      style={{
                        backgroundColor: "rgba(15, 23, 42, 0.94)",
                        borderColor: prog.colorBorder,
                        boxShadow: `0 12px 32px rgba(0, 0, 0, 0.75), 0 0 24px ${prog.colorGlow}`,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-ping"
                        style={{ backgroundColor: prog.color }}
                      />
                      <span className="text-white drop-shadow-sm">
                        Enter {prog.code}
                      </span>
                      <ArrowRight
                        className="w-3.5 h-3.5"
                        style={{ color: prog.color }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Card Main Content */}
                <div className="relative z-10">
                  {/* Top Row: Institute Logo + Institute Code Pill */}
                  <div className="flex items-center justify-between gap-3">
                    <div
                      className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shadow-lg border border-white/20 flex items-center justify-center shrink-0 transition-transform duration-300 ${
                        isCenter ? "group-hover:scale-105" : ""
                      } ${
                        prog.id === "ite" ? "bg-transparent" : "bg-white p-1"
                      }`}
                      style={{
                        boxShadow: `0 0 0 2px ${prog.colorBorder}, 0 6px 18px ${prog.colorGlow}`,
                      }}
                    >
                      <div className="relative w-full h-full rounded-2xl overflow-hidden">
                        <Image
                          src={prog.logo}
                          alt={prog.alt}
                          fill
                          sizes="(max-width: 640px) 56px, 64px"
                          className={
                            prog.id === "ite" ? "w-full h-full object-cover" : "object-contain"
                          }
                          priority
                        />
                      </div>
                    </div>

                    <span
                      className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm"
                      style={{
                        backgroundColor: prog.colorLight,
                        color: prog.color,
                        borderColor: prog.colorBorder,
                      }}
                    >
                      {prog.code}
                    </span>
                  </div>

                  {/* Program Full Name */}
                  <h3 className="text-lg sm:text-xl font-extrabold text-white mt-4 tracking-tight leading-snug">
                    {prog.name}
                  </h3>

                  {/* Program Subtitle / Tagline */}
                  <p
                    className="text-xs sm:text-sm font-semibold mt-1 tracking-wide"
                    style={{ color: prog.color }}
                  >
                    {prog.subtitle}
                  </p>

                  {/* Factual Description (Always visible for accessibility) */}
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-3 line-clamp-4">
                    {prog.description}
                  </p>

                  {/* Curricula feature highlights */}
                  <div className="flex flex-wrap gap-1.5 mt-3.5">
                    {prog.features.map((feat) => (
                      <span
                        key={feat}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md border"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.03)",
                          borderColor: "rgba(255, 255, 255, 0.08)",
                          color: "rgba(255, 255, 255, 0.70)",
                        }}
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom Row / Status Indicator */}
                <div className="relative z-10 mt-auto pt-4 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ backgroundColor: prog.color }}
                      />
                      Portal Active
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      cdm.edu.ph/{prog.id}
                    </span>
                  </div>

                  {/* Active Center Card Static Hint */}
                  {isCenter && (
                    <div className="mt-2.5 text-center text-[11px] text-slate-400/80 font-medium tracking-wide">
                      Click / Tap anywhere to enter {prog.code} Portal
                    </div>
                  )}

                  {/* Side Card Helper Hint */}
                  {!isCenter && (
                    <div className="mt-2.5 text-center text-[10px] text-slate-400/70 font-medium tracking-wide">
                      Click to bring to center
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      </motion.div>

      {/* ─── INTERACTIVE DOTS / PILLS (Desktop Carousel Indicators) ─── */}
      <motion.div
        ref={tabBarRef}
        className="hidden md:flex items-center justify-center gap-2 mt-6"
        initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
        animate={
          isTabBarInView
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: reducedMotion ? 0 : 16 }
        }
        transition={{
          duration: reducedMotion ? 0 : 0.45,
          ease: "easeOut",
          delay: reducedMotion ? 0 : 0.24,
        }}
      >
        {programs.map((prog, idx) => {
          const isSelected = activeIndex === idx;
          return (
            <button
              key={prog.id}
              type="button"
              onClick={() => onSelectIndex(idx)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer"
              style={{
                backgroundColor: isSelected ? prog.colorLight : "rgba(255, 255, 255, 0.03)",
                borderColor: isSelected ? prog.colorBorder : "rgba(255, 255, 255, 0.08)",
                color: isSelected ? prog.color : "rgba(255, 255, 255, 0.50)",
              }}
              aria-label={`Select ${prog.code} Department`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: isSelected ? prog.color : "rgba(255, 255, 255, 0.30)",
                }}
              />
              <span>{prog.code}</span>
            </button>
          );
        })}
      </motion.div>

      {/* ─── MOBILE STACKED CARDS (md:hidden) ─── */}
      <motion.div
        ref={deckRef}
        className="md:hidden w-full space-y-5 mt-4"
        initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
        animate={
          isDeckInView
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: reducedMotion ? 0 : 20 }
        }
        transition={{
          duration: reducedMotion ? 0 : 0.5,
          ease: "easeOut",
          delay: reducedMotion ? 0 : 0.18,
        }}
      >
        {programs.map((prog) => (
          <div
            key={prog.id}
            onClick={() => onEnterProgram(prog)}
            className="relative rounded-3xl border p-5 backdrop-blur-xl flex flex-col justify-between overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.82)",
              borderColor: prog.colorBorder,
              boxShadow: `0 14px 35px rgba(0,0,0,0.45), 0 0 25px ${prog.colorGlow}`,
            }}
          >
            {/* Thematic Background Accent Per Institute */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-6 -right-6 z-0 select-none overflow-hidden opacity-[0.06]"
            >
              {prog.id === "ics" && (
                <Code2
                  className="w-48 h-48 transform -rotate-12 stroke-[1.2]"
                  style={{ color: prog.color }}
                />
              )}
              {prog.id === "ite" && (
                <GraduationCap
                  className="w-48 h-48 transform -rotate-6 stroke-[1.2]"
                  style={{ color: prog.color }}
                />
              )}
              {prog.id === "ibe" && (
                <TrendingUp
                  className="w-48 h-48 transform -rotate-6 stroke-[1.2]"
                  style={{ color: prog.color }}
                />
              )}
            </div>

            {/* Top Row: Institute Logo + Institute Code Pill */}
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div
                className={`relative w-14 h-14 rounded-2xl overflow-hidden shadow-lg border border-white/20 flex items-center justify-center shrink-0 ${
                  prog.id === "ite" ? "bg-transparent" : "bg-white p-1"
                }`}
                style={{
                  boxShadow: `0 0 0 2px ${prog.colorBorder}, 0 6px 18px ${prog.colorGlow}`,
                }}
              >
                <div className="relative w-full h-full rounded-2xl overflow-hidden">
                  <Image
                    src={prog.logo}
                    alt={prog.alt}
                    fill
                    sizes="56px"
                    className={
                      prog.id === "ite" ? "w-full h-full object-cover" : "object-contain"
                    }
                  />
                </div>
              </div>

              <span
                className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm"
                style={{
                  backgroundColor: prog.colorLight,
                  color: prog.color,
                  borderColor: prog.colorBorder,
                }}
              >
                {prog.code}
              </span>
            </div>

            {/* Program Full Name */}
            <h3 className="text-lg font-extrabold text-white mt-4 tracking-tight leading-snug">
              {prog.name}
            </h3>

            {/* Program Subtitle / Tagline */}
            <p
              className="text-xs font-semibold mt-1 tracking-wide"
              style={{ color: prog.color }}
            >
              {prog.subtitle}
            </p>

            {/* Factual Description */}
            <p className="text-xs text-slate-300 leading-relaxed mt-2.5">
              {prog.description}
            </p>

            {/* Curricula feature highlights */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {prog.features.map((feat) => (
                <span
                  key={feat}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md border"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    borderColor: "rgba(255, 255, 255, 0.08)",
                    color: "rgba(255, 255, 255, 0.70)",
                  }}
                >
                  {feat}
                </span>
              ))}
            </div>

            {/* Mobile Action Button (Always Visible on Touch) */}
            <div className="mt-5 pt-3.5 border-t border-white/[0.08]">
              <div
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs tracking-wide text-white shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${prog.color}, #1E293B)`,
                  border: `1px solid ${prog.colorBorder}`,
                  boxShadow: `0 4px 20px ${prog.colorGlow}`,
                }}
              >
                <span>Tap To Enter {prog.code} Portal</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ─── CDM LMS Scroll-Velocity-Driven Marquee ─── */
/*
  Implementation notes:
  - useVelocity(scrollY) gives the instantaneous scroll speed in px/s.
  - useSpring smooths/damps that velocity so the lines decelerate gracefully
    after the user stops scrolling (natural ease-out feel).
  - Each line keeps its own accumulated x MotionValue. On every velocity
    tick we add  (smoothVelocity * dt * multiplier * direction)  to x.
  - x is then clamped into the [-WRAP_PX, 0] range via a modulo so the
    two-copy duplicated content loops seamlessly.
  - WRAP_PX ≈ half the total track width; 2400px covers the duplicated row
    at any viewport size (each copy renders 10 tokens at ~100-200px each).
  - reducedMotion: the effect is skipped entirely (x stays 0).
*/
const WRAP_PX = 2400; // half of the 2-copy content width; adjust if tokens change

interface MarqueeSectionProps {
  reducedMotion: boolean;
  scrollY: ReturnType<typeof useScroll>["scrollY"];
}

function MarqueeSection({ reducedMotion, scrollY }: MarqueeSectionProps) {
  // Raw scroll velocity (px/s)
  const scrollVelocity = useVelocity(scrollY);

  // Spring-smooth the velocity so lines decelerate naturally after scroll stops
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400,
    mass: 0.8,
  });

  // Per-line accumulated x positions (start at 0)
  const x1 = useMotionValue(0); // Line 1: left, faster
  const x2 = useMotionValue(0); // Line 2: right, medium
  const x3 = useMotionValue(0); // Line 3: left, slowest

  useEffect(() => {
    if (reducedMotion) return;

    // Track previous timestamp for delta-time calculation
    let lastTime = performance.now();

    const unsubscribe = smoothVelocity.on("change", (v) => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05); // seconds, capped at 50ms
      lastTime = now;

      // Scale factor: controls how far text moves per px/s of scroll velocity.
      // Higher = more sensitive. ~0.15 feels natural for large editorial text.
      const SCALE = 0.15;

      // Accumulate, then wrap into [-WRAP_PX, 0] range
      const wrap = (val: number) => {
        // Modulo that always stays negative (cycles between -WRAP_PX and 0)
        const mod = ((val % WRAP_PX) + WRAP_PX) % WRAP_PX;
        return mod === 0 ? 0 : mod - WRAP_PX;
      };

      x1.set(wrap(x1.get() - v * dt * SCALE * 1.0));   // left, 1× speed
      x2.set(wrap(x2.get() + v * dt * SCALE * 0.65));  // right (opposite sign), 0.65×
      x3.set(wrap(x3.get() - v * dt * SCALE * 0.42));  // left, 0.42×
    });

    return () => unsubscribe();
  }, [reducedMotion, smoothVelocity, x1, x2, x3]);

  const TOKENS = ["CDM LMS", "·", "CDM LMS", "·", "CDM LMS", "·", "CDM LMS", "·", "CDM LMS", "·"] as const;

  return (
    <section
      aria-label="CDM LMS editorial marquee"
      className="relative overflow-hidden py-10 sm:py-12 select-none"
    >
      <div className="flex flex-col gap-3 sm:gap-4">

        {/* LINE 1 — scrolls LEFT with scroll-down, solid white fill */}
        <div className="overflow-hidden w-full">
          <motion.div
            style={{ x: x1 }}
            className="flex w-max items-center gap-8 sm:gap-12"
            aria-hidden="true"
          >
            {[0, 1].map((copyIdx) => (
              <div key={copyIdx} className="flex items-center gap-8 sm:gap-12 pr-8 sm:pr-12">
                {TOKENS.map((token, i) => (
                  <span
                    key={i}
                    className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-none whitespace-nowrap"
                    style={{
                      color: token === "·" ? brand.goldSubtle : brand.white,
                      opacity: token === "·" ? 0.35 : 1,
                    }}
                  >
                    {token}
                  </span>
                ))}
              </div>
            ))}
          </motion.div>
        </div>

        {/* LINE 2 — scrolls RIGHT with scroll-down, hollow/outlined gold */}
        <div className="overflow-hidden w-full">
          <motion.div
            style={{ x: x2 }}
            className="flex w-max items-center gap-8 sm:gap-12"
            aria-hidden="true"
          >
            {[0, 1].map((copyIdx) => (
              <div key={copyIdx} className="flex items-center gap-8 sm:gap-12 pr-8 sm:pr-12">
                {TOKENS.map((token, i) => (
                  <span
                    key={i}
                    className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-none whitespace-nowrap"
                    style={token === "·" ? {
                      color: brand.gold,
                      opacity: 0.25,
                    } : {
                      color: "transparent",
                      WebkitTextStroke: `1.5px ${brand.gold}`,
                      opacity: 0.55,
                    }}
                  >
                    {token}
                  </span>
                ))}
              </div>
            ))}
          </motion.div>
        </div>

        {/* LINE 3 — scrolls LEFT with scroll-down, dim gold fill */}
        <div className="overflow-hidden w-full">
          <motion.div
            style={{ x: x3 }}
            className="flex w-max items-center gap-8 sm:gap-12"
            aria-hidden="true"
          >
            {[0, 1].map((copyIdx) => (
              <div key={copyIdx} className="flex items-center gap-8 sm:gap-12 pr-8 sm:pr-12">
                {TOKENS.map((token, i) => (
                  <span
                    key={i}
                    className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-none whitespace-nowrap"
                    style={{
                      color: token === "·" ? "rgba(255,255,255,0.08)" : brand.gold,
                      opacity: token === "·" ? 1 : 0.30,
                    }}
                  >
                    {token}
                  </span>
                ))}
              </div>
            ))}
          </motion.div>
        </div>

      </div>
    </section>
  );
}

export default function HomePage() {
  const currentYear = new Date().getFullYear();
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Intro sequence states:
  // 1. Initial/load: solid dark overlay covers bg; logo is stationary in hero position; text & navbar hidden
  // 2. (~350ms): solid dark overlay fades out smoothly, revealing campus background photo beneath stationary logo
  // 3. (~750ms): hero text and top navbar smoothly perform independent opacity fade-in
  const [bgRevealed, setBgRevealed] = useState(false);
  const [textRevealed, setTextRevealed] = useState(false);

  // Interactive Platform Preview State
  const [previewInstitute, setPreviewInstitute] = useState<PreviewInstitute>("ics");
  const [previewRole, setPreviewRole] = useState<PreviewRole>("student");
  const [previewSidebarItem, setPreviewSidebarItem] = useState<PreviewSidebarItem>("dashboard");

  const handleIntroComplete = useCallback(() => {
    setBgRevealed(true);
    setTextRevealed(true);
  }, []);

  useEffect(() => {
    if (shouldReduceMotion) {
      setReducedMotion(true);
    }
    setMounted(true);
    const resizeTimer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 100);

    // Safety fallback timer ensuring hero text/bg reveal even if preloader is skipped
    const safetyTimer = setTimeout(() => {
      setBgRevealed(true);
      setTextRevealed(true);
    }, 3500);

    return () => {
      clearTimeout(resizeTimer);
      clearTimeout(safetyTimer);
    };
  }, [shouldReduceMotion]);

  // Hydration-safe video playback handling for reduced motion preferences
  useEffect(() => {
    if (!videoRef.current) return;
    if (reducedMotion) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    } else {
      videoRef.current.play().catch(() => {
        // Autoplay policy: safely ignored since muted & playsInline are set
      });
    }
  }, [reducedMotion]);

  // Active program department state (for Coverflow 3D deck)
  const [activeDepartmentIndex, setActiveDepartmentIndex] = useState(0);
  const activeProgram = programs[activeDepartmentIndex] || programs[0];
  const activeTab = activeProgram.id as "ics" | "ite" | "ibe";
  const setActiveTab = useCallback((id: "ics" | "ite" | "ibe") => {
    const idx = programs.findIndex((p) => p.id === id);
    if (idx !== -1) setActiveDepartmentIndex(idx);
  }, []);

  // Window scroll tracking for hero parallax
  const { scrollY } = useScroll();

  // Calm, single-axis hero parallax: gentle upward drift (-40px) and fade as sheet covers it
  const heroY = useTransform(scrollY, [0, 300], [0, -40]);
  const heroOpacity = useTransform(scrollY, [0, 200, 300], [1, 0.7, 0]);

  // Position-based scroll flag — drives BOTH the floating navbar box state and the year badge.
  // Pure position check (scrollY > 30): no direction tracking, no previous-scroll ref.
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const unsubscribe = scrollY.on("change", (latest) => {
      setIsScrolled(latest > 30);
    });
    return () => unsubscribe();
  }, [scrollY]);

  // Year badge reuses the same isScrolled flag (visible when scrolled, hidden at top)
  const yearBadgeVisible = isScrolled;

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

  /* ─── Platform Preview Section InView Hooks ─── */
  const previewSectionRef = useRef<HTMLDivElement>(null);
  const isPreviewInView = useInView(previewSectionRef, { once: false, amount: 0.1 });

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



  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

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

  const handleProgramClick = useCallback(
    (program: ProgramData) => {
      if (isNavigating) return;
      setIsNavigating(true);
      setTimeout(() => {
        router.push(program.loginUrl);
      }, 250);
    },
    [isNavigating, router]
  );

  const handlePortalCardClick = useCallback(() => {
    handleProgramClick(activeProgram);
  }, [handleProgramClick, activeProgram]);

  return (
    <motion.div
      className="relative min-h-screen w-full"
      style={{ backgroundColor: "#0B0F19" }}
      animate={{ opacity: isNavigating ? 0 : 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.3, ease: "easeInOut" }}
    >
      {/* ─── FULLSCREEN INTRO PRELOADER (Animated "Welcome") ─── */}
      <IntroPreloader
        reducedMotion={reducedMotion}
        onIntroComplete={handleIntroComplete}
      />

      {/* ═══════════════════ SCROLL-REACTIVE FLOATING NAVIGATION BAR ═══════════════════ */}
      {/*
        Two visual states, both always fixed at top — never hides:
        • At top (isScrolled=false): transparent, full-width, text floats over hero photo
        • Scrolled (isScrolled=true): compact rounded-xl box, dark blur bg, centered pill float
      */}
      <motion.header
        role="banner"
        className="fixed top-0 left-0 right-0 z-50 flex justify-center"
        initial={false}
        animate={{
          opacity: textRevealed ? 1 : 0,
          y: textRevealed ? 0 : -8,
        }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.45, ease: "easeOut" }}
        style={{ pointerEvents: textRevealed ? "auto" : "none" }}
      >
        <motion.nav
          aria-label="Main navigation"
          className="flex items-center justify-between"
          animate={
            isScrolled
              ? {
                  // Compact floating box state
                  maxWidth: "860px",
                  width: "calc(100% - 2rem)",
                  marginTop: "12px",
                  paddingLeft: "20px",
                  paddingRight: "20px",
                  paddingTop: "10px",
                  paddingBottom: "10px",
                  borderRadius: "16px",
                  backgroundColor: "rgba(0, 0, 0, 0)",
                  backdropFilter: "blur(14px)",
                  boxShadow:
                    "0 4px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: "rgba(255,255,255,0.09)",
                }
              : {
                  // Transparent full-width state
                  maxWidth: "1152px",
                  width: "100%",
                  marginTop: "0px",
                  paddingLeft: "32px",
                  paddingRight: "32px",
                  paddingTop: "16px",
                  paddingBottom: "16px",
                  borderRadius: "0px",
                  backgroundColor: "rgba(0,0,0,0)",
                  backdropFilter: "blur(0px)",
                  boxShadow: "none",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: "rgba(255,255,255,0)",
                }
          }
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: 0.38, ease: [0.16, 1, 0.3, 1] }
          }
          style={{ WebkitBackdropFilter: isScrolled ? "blur(16px)" : "blur(0px)" }}
        >
          {/* Left: CDM Seal / Logo + CdM LMS Brand */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg p-1 shrink-0"
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
            <span
              className="font-bold text-base tracking-tight text-white group-hover:text-amber-400 transition-colors"
              style={{
                textShadow: isScrolled ? "none" : "0 1px 8px rgba(0,0,0,0.7)",
              }}
            >
              CdM LMS
            </span>
            {/* Year badge — same position-based flag as the navbar box */}
            <AnimatePresence>
              {yearBadgeVisible && (
                <motion.span
                  key="year-badge"
                  initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.82 }}
                  animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                  exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.82 }}
                  transition={
                    reducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
                  }
                  aria-label="Academic year 2026 to 2027"
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider leading-none border select-none"
                  style={{
                    backgroundColor: "rgba(245, 196, 0, 0.12)",
                    borderColor: "rgba(245, 196, 0, 0.35)",
                    color: "#F5C400",
                  }}
                >
                  2026–2027
                </motion.span>
              )}
            </AnimatePresence>
          </a>

          {/* Right: Anchor navigation links */}
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-7">
            {([
              { href: "departments", label: "Institutes" },
              { href: "dashboard-preview", label: "Preview" },
              { href: "faq", label: "FAQs" },
              { href: "mission-vision", label: "Mission & Vision" },
              { href: "about", label: "About" },
            ] as const).map(({ href, label }) => (
              <a
                key={href}
                href={`#${href}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(href)?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-sm font-medium transition-colors hover:text-amber-400"
                style={{
                  color: isScrolled ? "rgba(203,213,225,1)" : "rgba(255,255,255,0.75)",
                  textShadow: isScrolled ? "none" : "0 1px 8px rgba(0,0,0,0.65)",
                }}
              >
                {label}
              </a>
            ))}
          </div>
        </motion.nav>
      </motion.header>

      {/* ═══════════════════ STICKY HERO SECTION ═══════════════════ */}
      <section
        ref={heroRef}
        className="sticky top-0 h-screen w-full flex flex-col items-center justify-center px-4 overflow-hidden z-0"
        style={{ backgroundColor: "#0B0F19" }}
      >
        {/* Background photo + dark overlays */}
        <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster="/images/cdm-background.jpg"
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/videos/hero-bg.mp4" type="video/mp4" />
          </video>
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.72) 50%, rgba(0,0,0,0.85) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(245,196,0,0.06) 0%, transparent 60%)",
            }}
          />
          <div
            className={`absolute inset-0 bg-neutral-950 transition-opacity duration-700 ease-out ${
              bgRevealed ? "opacity-0" : "opacity-100"
            }`}
          />
        </div>

        {/* Ambient constellation particles */}
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
                CdM LMS
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

        {/* Scroll to Explore cue */}
        <div
          className={`absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-20 transition-opacity duration-700 ease-out ${
            textRevealed ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <MagneticWrapper disabled={reducedMotion}>
            <button
              type="button"
              onClick={() => {
                document.getElementById("dashboard-preview")?.scrollIntoView({ behavior: "smooth" }) ||
                  document.getElementById("departments")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg p-2"
              aria-label="Scroll to explore"
            >
              <span className="text-[11px] font-medium tracking-widest uppercase text-white/70 group-hover:text-amber-400 transition-colors">Scroll to explore</span>
              <motion.svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-amber-400" animate={{ y: [0, 4, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} aria-hidden="true">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

        {/* ─── SECTION 0: STANDALONE DASHBOARD PREVIEW (TWO-COLUMN) ─── */}
        <section
          id="dashboard-preview"
          ref={previewSectionRef}
          className="relative px-4 sm:px-6 lg:px-8 pt-8 pb-16 sm:pt-12 sm:pb-20 overflow-hidden"
        >
          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 xl:gap-12 items-center">
              {/* LEFT COLUMN: Full Hero Copy Block */}
              <motion.div
                initial={{ opacity: 0, y: reducedMotion ? 0 : 24 }}
                animate={
                  isPreviewInView
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: reducedMotion ? 0 : 24 }
                }
                transition={{
                  duration: reducedMotion ? 0 : 0.6,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="lg:col-span-6 xl:col-span-6 flex flex-col justify-center text-left"
              >
                {/* Eyebrow Pill */}
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-[0.2em] uppercase border"
                    style={{
                      backgroundColor: "rgba(245, 196, 0, 0.08)",
                      borderColor: "rgba(245, 196, 0, 0.28)",
                      color: brand.gold,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Platform Preview
                  </span>
                </div>

                {/* Main Headline with colored word treatment */}
                <h2 className="text-3xl sm:text-4xl lg:text-[2.65rem] xl:text-[2.9rem] font-extrabold text-white tracking-tight leading-[1.14]">
                  The Unified Learning Platform for Montalban&apos;s Future{" "}
                  <span style={{ color: brand.gold }}>Innovators, Leaders</span>{" "}
                  <span className="text-white">&amp;</span>{" "}
                  <span className="text-emerald-400">Educators.</span>
                </h2>

                {/* Subheadline */}
                <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                  Track grades and analytics, manage coursework and tasks, receive real-time announcements, study with flashcards, and stay protected by built-in academic integrity monitoring — for ICS, ITE, and IBE students and faculty.
                </p>

                {/* Dual CTA Buttons */}
                <div className="flex flex-wrap items-center gap-3.5 mt-6 sm:mt-7">
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById("departments")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="group inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold text-sm text-slate-950 transition-all duration-200 shadow-lg hover:shadow-amber-400/25 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    style={{
                      backgroundColor: brand.gold,
                      boxShadow: "0 10px 25px rgba(245, 196, 0, 0.30)",
                    }}
                  >
                    <span>Launch Portal</span>
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-200 group-hover:translate-x-1" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="inline-flex items-center justify-center px-5 sm:px-6 py-3 rounded-xl font-semibold text-sm text-white/90 border border-white/20 hover:border-white/40 hover:bg-white/5 transition-all duration-200 cursor-pointer"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    Explore Features
                  </button>
                </div>

                {/* 4-Stat Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-8 pt-6 border-t border-white/[0.08]">
                  {[
                    { value: "3", label: "Academic Institutes", sub: "ICS · ITE · IBE" },
                    { value: "7+", label: "Feature Areas", sub: "Modules & Tools" },
                    { value: "100%", label: "Integrity Monitoring", sub: "Attempt Security" },
                    { value: "3", label: "Access Roles", sub: "Student · Faculty · Admin" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="p-3 rounded-xl border"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.03)",
                        borderColor: "rgba(255, 255, 255, 0.07)",
                      }}
                    >
                      <div className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
                        {stat.value}
                      </div>
                      <div className="text-xs font-semibold text-white/90 leading-tight mt-0.5">
                        {stat.label}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {stat.sub}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tech Badges Row */}
                <div className="flex flex-wrap items-center gap-2 mt-6">
                  <span className="text-[11px] font-semibold text-slate-400 mr-1 tracking-wider uppercase">
                    Built With:
                  </span>
                  {[
                    "Next.js 16",
                    "React 19",
                    "Prisma 7",
                    "PostgreSQL",
                    "Tailwind CSS 4",
                  ].map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium border font-mono"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.04)",
                        borderColor: "rgba(255, 255, 255, 0.10)",
                        color: "rgba(255, 255, 255, 0.75)",
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* RIGHT COLUMN: Interactive Dashboard Preview Glass Card */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={
                  isPreviewInView
                    ? { opacity: 1 }
                    : { opacity: 0 }
                }
                transition={{
                  duration: reducedMotion ? 0 : 0.65,
                  delay: reducedMotion ? 0 : 0.12,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="lg:col-span-6 xl:col-span-6 w-full"
              >
                {/* Style injection for smooth hardware-accelerated continuous vertical floating */}
                <style dangerouslySetInnerHTML={{ __html: `
                  @keyframes previewCardFloating {
                    0%, 100% {
                      transform: translateY(-6px);
                    }
                    50% {
                      transform: translateY(6px);
                    }
                  }
                  .floating-preview-card {
                    animation: previewCardFloating 5s ease-in-out infinite;
                  }
                  @media (prefers-reduced-motion: reduce) {
                    .floating-preview-card {
                      animation: none !important;
                    }
                  }
                `}} />

                {/* Continuous Subtle Floating Animation Wrapper */}
                <div
                  className={`w-full rounded-3xl border overflow-hidden backdrop-blur-xl transition-colors duration-300 shadow-2xl ${
                    reducedMotion ? "" : "floating-preview-card"
                  }`}
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.80)",
                    borderColor: previewConfig[previewInstitute].colorBorder,
                    boxShadow: `0 24px 60px rgba(0,0,0,0.55), 0 0 50px ${previewConfig[previewInstitute].colorGlow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
                  }}
                >
                  {/* Window Top Chrome Bar */}
                  <div
                    className="flex flex-wrap items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3 border-b gap-2 relative z-20"
                    style={{
                      backgroundColor: "rgba(11, 17, 30, 0.90)",
                      borderColor: "rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    {/* Left: Window controls & URL bar */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/70 border border-red-400/40" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70 border border-amber-400/40" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70 border border-emerald-400/40" />
                      </div>
                      <div
                        className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono border truncate"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.04)",
                          color: "rgba(255, 255, 255, 0.45)",
                          borderColor: "rgba(255, 255, 255, 0.06)",
                        }}
                      >
                        <span style={{ color: previewConfig[previewInstitute].color, fontSize: "7px" }}>●</span>
                        <span className="truncate">
                          lms.cdm.edu.ph/{previewInstitute}/{previewRole === "instructor" ? "teachers" : "students"}
                        </span>
                      </div>
                    </div>

                    {/* Right: Controls (Institute Selector + Role Toggle) */}
                    <div className="flex items-center gap-2 sm:gap-2.5 ml-auto shrink-0">
                      {/* Institute Selector Pills: ICS | ITE | IBE (Visible on BOTH Student and Instructor views) */}
                      <div
                        className="inline-flex items-center p-0.5 rounded-lg border transition-all"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.04)",
                          borderColor: "rgba(255, 255, 255, 0.08)",
                        }}
                        aria-label="Select Institute Preview"
                      >
                        {(["ics", "ite", "ibe"] as const).map((instId) => {
                          const inst = previewConfig[instId];
                          const isSelected = previewInstitute === instId;
                          return (
                            <button
                              key={instId}
                              type="button"
                              onClick={() => setPreviewInstitute(instId)}
                              className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer"
                              style={{
                                backgroundColor: isSelected ? inst.color : "transparent",
                                color: isSelected ? "#0F172A" : "rgba(255, 255, 255, 0.55)",
                                boxShadow: isSelected ? `0 2px 8px ${inst.colorGlow}` : "none",
                              }}
                            >
                              {inst.code}
                            </button>
                          );
                        })}
                      </div>

                      {/* Student / Instructor Role Toggle */}
                      <div
                        className="inline-flex items-center p-0.5 rounded-lg border"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.04)",
                          borderColor: "rgba(255, 255, 255, 0.08)",
                        }}
                        aria-label="Toggle Student or Instructor View"
                      >
                        {(["student", "instructor"] as const).map((roleKey) => {
                          const isSelected = previewRole === roleKey;
                          return (
                            <button
                              key={roleKey}
                              type="button"
                              onClick={() => setPreviewRole(roleKey)}
                              className="px-2.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer capitalize"
                              style={{
                                backgroundColor: isSelected ? "rgba(255, 255, 255, 0.12)" : "transparent",
                                color: isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.50)",
                                border: isSelected ? "1px solid rgba(255, 255, 255, 0.18)" : "1px solid transparent",
                              }}
                            >
                              {roleKey === "student" ? "Student" : "Instructor"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Inner App Body */}
                  <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
                    {/* Sidebar */}
                    <div
                      className="w-full md:w-44 xl:w-48 shrink-0 flex flex-col py-3.5 px-2.5 sm:px-3 gap-1 overflow-hidden"
                      style={{
                        backgroundColor: "rgba(6, 9, 18, 0.70)",
                      }}
                    >
                      {/* Institute Branded Sidebar Header (Replaces Juan Santos) */}
                      <div
                        className="flex items-center gap-2.5 px-2 pb-3 mb-1.5 border-b transition-colors duration-200"
                        style={{ borderColor: "rgba(255, 255, 255, 0.07)" }}
                      >
                        <div
                          className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-black transition-colors duration-200"
                          style={{
                            backgroundColor: previewConfig[previewInstitute].colorLight,
                            color: previewConfig[previewInstitute].color,
                            border: `1px solid ${previewConfig[previewInstitute].colorBorder}`,
                          }}
                        >
                          {previewConfig[previewInstitute].code}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white/90 truncate">
                            {previewConfig[previewInstitute].sidebarTitle}
                          </div>
                          <div className="text-[10px] text-slate-400 capitalize">
                            {previewRole === "instructor" ? "Instructor View" : "Student View"}
                          </div>
                        </div>
                      </div>

                      {/* Clickable Sidebar Nav Items */}
                      {([
                        { id: "dashboard", label: "Dashboard", icon: BarChart3 },
                        { id: "courses", label: previewRole === "instructor" ? "Taught Classes" : "My Courses", icon: BookOpen },
                        { id: "grades", label: previewRole === "instructor" ? "Gradebook" : "Grades", icon: Award },
                        { id: "announcements", label: "Announcements", icon: Megaphone },
                        { id: "tasks", label: previewRole === "instructor" ? "To Review" : "Tasks", icon: CheckCircle2 },
                        { id: "flashcards", label: "Flashcards", icon: Layers },
                        { id: "leaderboards", label: "Leaderboards", icon: Sparkles },
                      ] as const).map(({ id, label, icon: Icon }) => {
                        const active = previewSidebarItem === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setPreviewSidebarItem(id)}
                            className="flex items-center gap-2 px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-medium transition-all text-left w-full cursor-pointer"
                            style={{
                              backgroundColor: active ? previewConfig[previewInstitute].colorLight : "transparent",
                              color: active ? previewConfig[previewInstitute].color : "rgba(255, 255, 255, 0.50)",
                              borderLeft: active ? `3px solid ${previewConfig[previewInstitute].color}` : "3px solid transparent",
                            }}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0 opacity-85" />
                            <span className="truncate">{label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Main Content Area (Dynamic per sidebar selection and role) */}
                    <div className="flex-1 p-4 sm:p-5 flex flex-col gap-3.5 min-h-[390px] overflow-hidden">
                      {/* Top Content Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-white capitalize">
                            {previewSidebarItem === "dashboard"
                              ? previewRole === "instructor"
                                ? "Faculty Dashboard"
                                : "Dashboard"
                              : previewSidebarItem === "courses"
                              ? previewRole === "instructor"
                                ? "Assigned Teaching Classes"
                                : "Enrolled Courses"
                              : previewSidebarItem === "grades"
                              ? previewRole === "instructor"
                                ? "Class Gradebook & Analytics"
                                : "Verified Course Grades"
                              : previewSidebarItem === "announcements"
                              ? "Institutional Notices"
                              : previewSidebarItem === "tasks"
                              ? previewRole === "instructor"
                                ? "Pending Submissions Review"
                                : "Coursework Deadlines"
                              : previewSidebarItem === "flashcards"
                              ? "Spaced Repetition Decks"
                              : "Institute Leaderboards"}
                          </h3>
                          {/* Note: "· 1st Semester" removed as requested */}
                          <p className="text-xs text-slate-400 mt-0.5">Academic Year 2026–2027</p>
                        </div>
                      </div>

                      {/* Content Panel 1: DASHBOARD */}
                      {previewSidebarItem === "dashboard" && (
                        <>
                          {previewRole === "student" ? (
                            <>
                              <div
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-colors duration-200"
                                style={{
                                  backgroundColor: previewConfig[previewInstitute].colorLight,
                                  border: `1px solid ${previewConfig[previewInstitute].colorBorder}`,
                                  color: previewConfig[previewInstitute].color,
                                }}
                              >
                                <ShieldCheck className="w-4 h-4 shrink-0" />
                                <span>Integrity monitoring active during quizzes</span>
                              </div>

                              <div>
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                                  My Courses — Sample Data
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                                  {previewConfig[previewInstitute].studentCourses.map(
                                    ({ name, code, progress }) => (
                                      <div
                                        key={code}
                                        className="p-2.5 sm:p-3 rounded-xl border"
                                        style={{
                                          backgroundColor: "rgba(255, 255, 255, 0.03)",
                                          borderColor: "rgba(255, 255, 255, 0.07)",
                                        }}
                                      >
                                        <div className="flex items-center justify-between mb-2 gap-1">
                                          <div className="min-w-0">
                                            <div className="text-xs font-semibold text-white/85 leading-tight">
                                              {name}
                                            </div>
                                            <div className="text-[10px] text-slate-500">{code}</div>
                                          </div>
                                          <span
                                            className="text-xs font-bold shrink-0"
                                            style={{ color: previewConfig[previewInstitute].color }}
                                          >
                                            {progress}%
                                          </span>
                                        </div>
                                        <div
                                          className="h-1.5 rounded-full overflow-hidden"
                                          style={{ backgroundColor: "rgba(255, 255, 255, 0.06)" }}
                                        >
                                          <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                              width: `${progress}%`,
                                              backgroundColor: previewConfig[previewInstitute].color,
                                              opacity: 0.85,
                                            }}
                                          />
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </>
                          ) : (
                            /* INSTRUCTOR DASHBOARD VIEW (Mirrored from real Instructor Analytics) */
                            <div className="space-y-3">
                              {/* 4 Instructor Metric Summary Cards */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                  { label: "Enrolled", val: "115", sub: "Active Students" },
                                  { label: "Submissions", val: "94%", sub: "On-Time Rate" },
                                  { label: "To Grade", val: "20", sub: "Pending Work" },
                                  { label: "At-Risk", val: "2", sub: "Flags Identified" },
                                ].map((stat) => (
                                  <div
                                    key={stat.label}
                                    className="p-2.5 rounded-xl border"
                                    style={{
                                      backgroundColor: "rgba(255, 255, 255, 0.03)",
                                      borderColor: "rgba(255, 255, 255, 0.07)",
                                    }}
                                  >
                                    <div
                                      className="text-base sm:text-lg font-black tracking-tight"
                                      style={{ color: previewConfig[previewInstitute].color }}
                                    >
                                      {stat.val}
                                    </div>
                                    <div className="text-[11px] font-semibold text-white/90">
                                      {stat.label}
                                    </div>
                                    <div className="text-[9px] text-slate-500">{stat.sub}</div>
                                  </div>
                                ))}
                              </div>

                              <div>
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                  Taught Classes — Sample Data
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  {previewConfig[previewInstitute].instructorCourses.map(
                                    ({ name, code, enrolled, pendingSubmissions, grade }) => (
                                      <div
                                        key={code}
                                        className="p-2.5 rounded-xl border flex flex-col justify-between"
                                        style={{
                                          backgroundColor: "rgba(255, 255, 255, 0.03)",
                                          borderColor: "rgba(255, 255, 255, 0.07)",
                                        }}
                                      >
                                        <div>
                                          <div className="text-xs font-semibold text-white/90">
                                            {name}
                                          </div>
                                          <div className="text-[10px] text-slate-400 mt-0.5">
                                            {code}
                                          </div>
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px]">
                                          <span className="text-slate-400">{enrolled} students</span>
                                          <span
                                            className="font-bold px-1.5 py-0.5 rounded"
                                            style={{
                                              backgroundColor: previewConfig[previewInstitute].colorLight,
                                              color: previewConfig[previewInstitute].color,
                                            }}
                                          >
                                            {pendingSubmissions} to review
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Content Panel 2: COURSES */}
                      {previewSidebarItem === "courses" && (
                        <div className="space-y-2.5">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            {previewRole === "instructor" ? "Sections & Syllabi" : "Course Catalog & Syllabus"}
                          </div>
                          <div className="space-y-2">
                            {(previewRole === "instructor"
                              ? previewConfig[previewInstitute].instructorCourses
                              : previewConfig[previewInstitute].studentCourses
                            ).map((course) => (
                              <div
                                key={course.code}
                                className="p-2.5 rounded-xl border flex items-center justify-between gap-3"
                                style={{
                                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                                  borderColor: "rgba(255, 255, 255, 0.07)",
                                }}
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-white/90">
                                    {course.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    {course.code}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold border"
                                    style={{
                                      backgroundColor: previewConfig[previewInstitute].colorLight,
                                      borderColor: previewConfig[previewInstitute].colorBorder,
                                      color: previewConfig[previewInstitute].color,
                                    }}
                                  >
                                    {previewRole === "instructor"
                                      ? `${course.enrolled} Enrolled`
                                      : `${course.progress}% Completed`}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Content Panel 3: GRADES */}
                      {previewSidebarItem === "grades" && (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              {previewRole === "instructor" ? "Section Averages" : "Midterm Evaluation Record"}
                            </span>
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: previewConfig[previewInstitute].colorLight,
                                color: previewConfig[previewInstitute].color,
                              }}
                            >
                              {previewRole === "instructor" ? "Class Average: 1.75" : "Cumulative GWA: 1.58"}
                            </span>
                          </div>
                          <div className="border border-white/[0.08] rounded-xl overflow-hidden text-xs">
                            <div className="grid grid-cols-3 bg-white/[0.04] p-2 font-semibold text-slate-400 text-[10px] uppercase">
                              <span>Course</span>
                              <span className="text-center">{previewRole === "instructor" ? "Pass Rate" : "Midterm Grade"}</span>
                              <span className="text-right">Status</span>
                            </div>
                            {(previewRole === "instructor"
                              ? previewConfig[previewInstitute].instructorCourses
                              : previewConfig[previewInstitute].studentCourses
                            ).map((c) => (
                              <div
                                key={c.code}
                                className="grid grid-cols-3 p-2.5 border-t border-white/[0.06] items-center text-[11px]"
                              >
                                <span className="font-medium text-white/90 truncate">{c.name}</span>
                                <span
                                  className="text-center font-bold"
                                  style={{ color: previewConfig[previewInstitute].color }}
                                >
                                  {previewRole === "instructor" ? `${c.progress}%` : c.grade}
                                </span>
                                <span className="text-right text-emerald-400 font-semibold">
                                  {c.status || "Recorded"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Content Panel 4: ANNOUNCEMENTS */}
                      {previewSidebarItem === "announcements" && (
                        <div className="space-y-2.5">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Official Notices & Advisories
                          </div>
                          <div className="space-y-2">
                            <div
                              className="p-2.5 rounded-xl border"
                              style={{
                                backgroundColor: "rgba(255, 255, 255, 0.03)",
                                borderColor: "rgba(255, 255, 255, 0.07)",
                              }}
                            >
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>Office of the Dean · {previewConfig[previewInstitute].code}</span>
                                <span>2 days ago</span>
                              </div>
                              <div className="text-xs font-semibold text-white/90 mt-1">
                                Midterm Examination Guidelines for AY 2026–2027
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                                Synchronized examination schedules and proctoring protocols are now published in student portals.
                              </div>
                            </div>
                            <div
                              className="p-2.5 rounded-xl border"
                              style={{
                                backgroundColor: "rgba(255, 255, 255, 0.03)",
                                borderColor: "rgba(255, 255, 255, 0.07)",
                              }}
                            >
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>LMS Operations</span>
                                <span>Yesterday</span>
                              </div>
                              <div className="text-xs font-semibold text-white/90 mt-1">
                                Cloud Quiz Server Synchronization Completed
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                                All course submission channels are operational with automated attempt integrity monitoring.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Content Panel 5: TASKS */}
                      {previewSidebarItem === "tasks" && (
                        <div className="space-y-2.5">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            {previewRole === "instructor" ? "Submissions Requiring Action" : "Upcoming Deadlines"}
                          </div>
                          <div className="space-y-2">
                            {(previewRole === "instructor"
                              ? previewConfig[previewInstitute].instructorTasks
                              : previewConfig[previewInstitute].sampleTasks
                            ).map((task, i) => (
                              <div
                                key={i}
                                className="p-2.5 rounded-xl border flex items-center justify-between gap-2"
                                style={{
                                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                                  borderColor: "rgba(255, 255, 255, 0.07)",
                                }}
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-white/90 truncate">
                                    {task.title}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    {"due" in task ? task.due : task.count}
                                  </div>
                                </div>
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0 border"
                                  style={{
                                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                                    borderColor: task.badgeColor,
                                    color: task.badgeColor,
                                  }}
                                >
                                  {task.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Content Panel 6: FLASHCARDS */}
                      {previewSidebarItem === "flashcards" && (
                        <div className="space-y-2.5">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Interactive Spaced Repetition Decks
                          </div>
                          <div
                            className="p-3 rounded-2xl border flex flex-col justify-between"
                            style={{
                              backgroundColor: "rgba(255, 255, 255, 0.04)",
                              borderColor: previewConfig[previewInstitute].colorBorder,
                            }}
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span
                                className="font-bold"
                                style={{ color: previewConfig[previewInstitute].color }}
                              >
                                Concept Card #14
                              </span>
                              <span>Spaced Repetition Active</span>
                            </div>
                            <div className="text-xs font-semibold text-white/95 my-3 leading-relaxed">
                              &ldquo;What is the primary benefit of role-based academic integrity monitoring in LMS architectures?&rdquo;
                            </div>
                            <div
                              className="p-2 rounded-lg text-[11px] text-slate-300 italic"
                              style={{ backgroundColor: "rgba(0, 0, 0, 0.35)" }}
                            >
                              Tap to reveal answer · 32 Cards Remaining
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Content Panel 7: LEADERBOARDS */}
                      {previewSidebarItem === "leaderboards" && (
                        <div className="space-y-2.5">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Institute Gamification & XP Ranking
                          </div>
                          <div className="space-y-1.5">
                            {[
                              { rank: "1", id: "Student #2024-0182", xp: "2,450 XP", streak: "14 Days" },
                              { rank: "2", id: "Student #2024-0094", xp: "2,280 XP", streak: "11 Days" },
                              { rank: "3", id: "Student #2024-0311", xp: "2,100 XP", streak: "9 Days" },
                            ].map((row) => (
                              <div
                                key={row.rank}
                                className="p-2 rounded-xl border flex items-center justify-between text-xs"
                                style={{
                                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                                  borderColor: "rgba(255, 255, 255, 0.07)",
                                }}
                              >
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]"
                                    style={{
                                      backgroundColor:
                                        row.rank === "1"
                                          ? previewConfig[previewInstitute].colorLight
                                          : "rgba(255, 255, 255, 0.06)",
                                      color:
                                        row.rank === "1"
                                          ? previewConfig[previewInstitute].color
                                          : "#FFFFFF",
                                    }}
                                  >
                                    {row.rank}
                                  </span>
                                  <span className="text-white/90 font-medium text-[11px]">{row.id}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px]">
                                  <span className="text-slate-400">{row.streak} Streak</span>
                                  <span
                                    className="font-bold font-mono"
                                    style={{ color: previewConfig[previewInstitute].color }}
                                  >
                                    {row.xp}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Footer Disclaimer */}
                      <div className="mt-auto pt-2.5 border-t border-white/[0.06] text-[11px] text-slate-500 italic text-center">
                        Illustrative preview — not a live account
                      </div>
                    </div>
                  </div>
                  </div>
                </motion.div>
            </div>
          </div>
        </section>
      </div>

      {/* ═══════════════════ SOLID BLACK CONTAINER: DEPARTMENT PORTAL & BEYOND ═══════════════════ */}
      <div
        className="relative z-10 w-full"
        style={{
          backgroundColor: "#0B0F19",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >

        {/* ─── SECTION 1: PROGRAM PORTALS (3D COVERFLOW DECK) ─── */}
        <section id="departments" className="relative px-4 sm:px-6 lg:px-8 pt-8 pb-16 sm:pt-12 sm:pb-24 overflow-hidden">
          {/* Subtle Ambient Constellation / Particle Field behind department portal */}
          <ConstellationCanvas reducedMotion={reducedMotion} />

          <div className="relative z-10 max-w-6xl mx-auto">
            {/* Section Header with Staggered Children */}
            <div ref={portalHeadingRef} className="text-center mb-8 sm:mb-10">
              <motion.div
                initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
                animate={
                  isHeadingInView
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: reducedMotion ? 0 : 16 }
                }
                transition={{ duration: reducedMotion ? 0 : 0.45, ease: "easeOut", delay: 0 }}
              >
                <span
                  className="text-xs font-bold tracking-[0.25em] uppercase drop-shadow-sm transition-colors duration-300"
                  style={{ color: activeProgram.color }}
                >
                  Academic Institutes
                </span>
              </motion.div>

              <motion.h2
                className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight"
                initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
                animate={
                  isHeadingInView
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: reducedMotion ? 0 : 16 }
                }
                transition={{ duration: reducedMotion ? 0 : 0.45, ease: "easeOut", delay: reducedMotion ? 0 : 0.06 }}
              >
                Select Your Department Portal
              </motion.h2>

              <motion.p
                className="mt-2 text-xs sm:text-sm text-slate-300 max-w-lg mx-auto"
                initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
                animate={
                  isHeadingInView
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: reducedMotion ? 0 : 16 }
                }
                transition={{ duration: reducedMotion ? 0 : 0.45, ease: "easeOut", delay: reducedMotion ? 0 : 0.12 }}
              >
                Choose your institute to access specialized student coursework, faculty grading rosters, and academic portals
              </motion.p>
            </div>

            {/* Coverflow 3D Department Portal Deck with Staggered InView Reveals */}
            <CoverflowDepartmentPortal
              programs={programs}
              activeIndex={activeDepartmentIndex}
              onSelectIndex={setActiveDepartmentIndex}
              onEnterProgram={handleProgramClick}
              reducedMotion={reducedMotion}
              isDeckInView={isHeadingInView}
              isTabBarInView={isHeadingInView}
            />
          </div>
        </section>


        {/* ─── TOP DIVIDER above CDM LMS Marquee ─── */}
        <div
          className="max-w-4xl mx-auto border-t"
          style={{ borderColor: "rgba(255,255,255,0.10)" }}
        />

        {/* ─── CDM LMS SCROLL-DRIVEN MARQUEE SECTION ─── */}
        {/*
          Scroll-velocity technique:
          - useVelocity(scrollY) gives px/s velocity of the page scroll.
          - useSpring smooths it so rapid flicks feel damped rather than jittery.
          - Each line accumulates its own MotionValue x offset scaled by a per-line
            multiplier (speed ratio) and direction sign (+1 left, -1 right).
          - The accumulated x wraps modulo a negative half-width constant so the
            duplicated content creates a seamless infinite loop.
          - Text stays completely still when the user is not scrolling.
          - prefers-reduced-motion: no movement at all.
        */}
        <MarqueeSection reducedMotion={reducedMotion} scrollY={scrollY} />

        {/* ─── BOTTOM DIVIDER below CDM LMS Marquee ─── */}
        <div
          className="max-w-4xl mx-auto border-t"
          style={{ borderColor: "rgba(255,255,255,0.10)" }}
        />

        {/* ─── GAMIFICATION & KINETIC MATRIX SECTION ─── */}
        <GamificationSection reducedMotion={reducedMotion} brand={brand} />

        {/* Subtle section divider */}
        <div
          className="max-w-4xl mx-auto border-t"
          style={{ borderColor: "rgba(255,255,255,0.10)" }}
        />

        {/* ─── ALTERNATING TIMELINE: ARCHITECTURAL FOUNDATIONS ─── */}
        <AlternatingTimelineSection reducedMotion={reducedMotion} brand={brand} />

        {/* Subtle section divider */}
        <div
          className="max-w-4xl mx-auto border-t"
          style={{ borderColor: "rgba(255,255,255,0.10)" }}
        />

        {/* ─── MULTI-PLATFORM ECOSYSTEM SECTION ─── */}
        <MultiPlatformSection reducedMotion={reducedMotion} brand={brand} />

        {/* Subtle section divider */}
        <div
          className="max-w-4xl mx-auto border-t"
          style={{ borderColor: "rgba(255,255,255,0.10)" }}
        />

        {/* ─── FAQ & CLOSING CTA SECTIONS ─── */}
        <FaqAndCtaSection reducedMotion={reducedMotion} brand={brand} />

        {/* Subtle section divider */}
        <div
          className="max-w-4xl mx-auto border-t"
          style={{ borderColor: "rgba(255,255,255,0.10)" }}
        />

        {/* ─── SECTION 2: INSTITUTIONAL FOUNDATIONS (MISSION & VISION) ─── */}
        {/*
          Background treatment: subtle dark CSS grid-line pattern (repeating-linear-gradient)
          combined with a soft warm amber/gold radial glow from the top-center.
          Applied from here through the end of the outer container.
        */}
        <section
          id="mission-vision"
          className="relative px-4 sm:px-6 lg:px-8 py-16 sm:py-24 min-h-[580px]"
        >
          {/* Photographic Background & Layered Atmosphere */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
            {/* Layer 1: Photographic backdrop shifted so quieter foliage sits under left text */}
            <Image
              src="/images/cdm-ynares-building.jpg"
              alt=""
              fill
              sizes="100vw"
              priority={false}
              className="object-cover object-[75%_center]"
            />

            {/* Layer 2: Directional dark scrim: deeper on left (93%) for pristine text legibility */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, rgba(11, 15, 25, 0.93) 0%, rgba(11, 15, 25, 0.86) 50%, rgba(11, 15, 25, 0.88) 100%)",
              }}
            />

            {/* Layer 3: Soft vertical gradient fading to page background (#0B0F19) at top & bottom edges */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, #0B0F19 0%, rgba(11, 15, 25, 0.9) 8%, transparent 28%, transparent 72%, rgba(11, 15, 25, 0.9) 92%, #0B0F19 100%)",
              }}
            />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* ─── LEFT COLUMN (~5/12): Section Text Block (Left-aligned, Vertically centered) ─── */}
              <motion.div
                ref={mvHeadingRef}
                className="lg:col-span-5 text-left flex flex-col items-start justify-center"
                initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
                animate={
                  isMvHeadingInView
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: reducedMotion ? 0 : 16 }
                }
                transition={{ duration: reducedMotion ? 0 : 0.45, ease: "easeOut", delay: 0 }}
              >
                <span className="text-xs font-bold tracking-[0.25em] uppercase text-amber-400 drop-shadow-sm">
                  Institutional Foundations
                </span>
                <h2 className="mt-2 text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold text-white tracking-tight leading-[1.15]">
                  Mission &amp; Vision
                </h2>
                <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
                  Guiding Colegio de Montalban in shaping tomorrow&apos;s leaders, educators, and innovators across every academic discipline.
                </p>
              </motion.div>

              {/* ─── RIGHT COLUMN (~7/12): Vertically Stacked Mission & Vision Cards ─── */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                {/* Mission Card with Spring Scale Pop & Overshoot */}
                <motion.div
                  ref={missionCardRef}
                  className="relative rounded-2xl border p-7 sm:p-9 overflow-hidden backdrop-blur-md transition-all duration-300 hover:shadow-2xl"
                  initial={{
                    opacity: 0,
                    scale: reducedMotion ? 1 : 0.85,
                    y: reducedMotion ? 0 : 20,
                  }}
                  animate={
                    isMissionInView
                      ? { opacity: 1, scale: 1, y: 0 }
                      : {
                          opacity: 0,
                          scale: reducedMotion ? 1 : 0.85,
                          y: reducedMotion ? 0 : 20,
                        }
                  }
                  transition={{
                    type: "spring",
                    stiffness: 280,
                    damping: 16,
                    mass: 0.75,
                    delay: reducedMotion ? 0 : 0.12,
                  }}
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
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

                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
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

                {/* Vision Card with Cascading Spring Scale Pop & Overshoot */}
                <motion.div
                  ref={visionCardRef}
                  className="relative rounded-2xl border p-7 sm:p-9 overflow-hidden backdrop-blur-md transition-all duration-300 hover:shadow-2xl"
                  initial={{
                    opacity: 0,
                    scale: reducedMotion ? 1 : 0.85,
                    y: reducedMotion ? 0 : 20,
                  }}
                  animate={
                    isVisionInView
                      ? { opacity: 1, scale: 1, y: 0 }
                      : {
                          opacity: 0,
                          scale: reducedMotion ? 1 : 0.85,
                          y: reducedMotion ? 0 : 20,
                        }
                  }
                  transition={{
                    type: "spring",
                    stiffness: 280,
                    damping: 16,
                    mass: 0.75,
                    delay: reducedMotion ? 0 : 0.22,
                  }}
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
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

                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
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
          </div>
        </section>

        {/* Subtle section divider */}
        <div
          className="max-w-4xl mx-auto border-t"
          style={{ borderColor: "rgba(255,255,255,0.10)" }}
        />

        {/* ─── SECTION 3: ABOUT CDM LMS ─── */}
        <section
          id="about"
          className="relative px-4 sm:px-6 lg:px-8 py-16 sm:py-24 min-h-[640px]"
        >
          {/* Photographic Background & Layered Atmosphere */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
            {/* Layer 1: Photographic backdrop shifted so quieter facade sits under left text */}
            <Image
              src="/images/cdm-background.jpg"
              alt=""
              fill
              sizes="100vw"
              priority={false}
              className="object-cover object-[72%_center]"
            />

            {/* Layer 2: Directional dark scrim: deeper on left (93%) for pristine text legibility */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, rgba(11, 15, 25, 0.93) 0%, rgba(11, 15, 25, 0.86) 50%, rgba(11, 15, 25, 0.88) 100%)",
              }}
            />

            {/* Layer 3: Soft vertical gradient fading to page background (#0B0F19) at top & bottom edges */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, #0B0F19 0%, rgba(11, 15, 25, 0.9) 8%, transparent 28%, transparent 72%, rgba(11, 15, 25, 0.9) 92%, #0B0F19 100%)",
              }}
            />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* ─── LEFT COLUMN (~5/12): Section Text Block (Left-aligned, Vertically centered) ─── */}
              <motion.div
                ref={aboutHeadingRef}
                className="lg:col-span-5 text-left flex flex-col items-start justify-center"
                initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
                animate={
                  isAboutHeadingInView
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: reducedMotion ? 0 : 16 }
                }
                transition={{ duration: reducedMotion ? 0 : 0.45, ease: "easeOut", delay: 0 }}
              >
                <span className="text-xs font-bold tracking-[0.25em] uppercase text-amber-400 drop-shadow-sm">
                  About the Platform
                </span>
                <h2 className="mt-2 text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold text-white tracking-tight leading-[1.15]">
                  What is CdM LMS?
                </h2>
                <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
                  CdM LMS is the official learning management system for{" "}
                  <span className="text-white font-medium">Colegio de Montalban</span>.
                  It unifies coursework, learning materials, assessments, and departmental
                  communication across the Institute of Computing Studies (ICS), Institute of
                  Teacher Education (ITE), and Institute of Business and Entrepreneurship (IBE) in
                  one secure, accessible environment.
                </p>
              </motion.div>

              {/* ─── RIGHT COLUMN (~7/12): Feature Highlights 2x2 Grid ─── */}
              <div ref={aboutGridRef} className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
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
                      delay: reducedMotion ? 0 : 0.12 + idx * 0.08,
                    }}
                    style={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
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
          </div>
        </section>

        {/* ─── FULL MULTI-COLUMN FOOTER ─── */}
        <footer
          className="border-t px-4 sm:px-6 lg:px-8 pt-16 pb-12"
          style={{
            borderColor: "rgba(255, 255, 255, 0.08)",
            backgroundColor: "#06090F",
          }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12 mb-12">
              {/* ── COLUMN 1 (~5/12): Identity & Campus Info ── */}
              <div className="lg:col-span-5 flex flex-col items-start">
                {/* Crest + Wordmark */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative w-10 h-10 aspect-square rounded-full overflow-hidden bg-white p-0.5 border border-amber-400/40 shadow-sm shrink-0">
                    <Image
                      src="/images/cdm-logo.png"
                      alt="Colegio de Montalban Seal"
                      fill
                      sizes="40px"
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-lg tracking-tight text-white block leading-tight">
                      CdM LMS
                    </span>
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-amber-400/90 block mt-0.5">
                      Colegio de Montalban
                    </span>
                  </div>
                </div>

                {/* Condensed Description */}
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mb-4">
                  The official learning management system of Colegio de Montalban, unifying
                  digitized course syllabi, interactive laboratories, assessments, and departmental
                  communication in one secure academic environment.
                </p>

                {/* Campus Location */}
                <p className="text-xs text-slate-500 leading-normal mb-3">
                  Kasiglahan Village, San Jose, Rodriguez (Montalban), Rizal, Philippines 1860
                </p>

                {/* Helpdesk Contact Chip (Matching FAQ placeholder) */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-xs text-slate-400">
                  <span className="text-slate-500 font-medium">Campus Helpdesk:</span>
                  <code className="font-mono text-amber-300 font-semibold text-[11px]">
                    TODO_HELPDESK_EMAIL
                  </code>
                </div>
              </div>

              {/* ── COLUMN 2 (~3/12): Academic Institutes ── */}
              <div className="lg:col-span-3">
                <h4 className="text-xs font-bold tracking-[0.2em] uppercase text-white/90 mb-4">
                  Institutes
                </h4>
                <ul className="space-y-3">
                  <li>
                    <Link
                      href="/login?institute=ics"
                      className="group block text-xs sm:text-sm text-slate-400 hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                    >
                      <span className="font-semibold text-slate-200 group-hover:text-amber-300 transition-colors block">
                        Institute of Computing Studies
                      </span>
                      <span className="text-[11px] text-slate-500">
                        ICS · BS Computer Science &amp; IT
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/login?institute=ite"
                      className="group block text-xs sm:text-sm text-slate-400 hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                    >
                      <span className="font-semibold text-slate-200 group-hover:text-amber-300 transition-colors block">
                        Institute of Teacher Education
                      </span>
                      <span className="text-[11px] text-slate-500">
                        ITE · Secondary &amp; Elementary Ed
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/login?institute=ibe"
                      className="group block text-xs sm:text-sm text-slate-400 hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                    >
                      <span className="font-semibold text-slate-200 group-hover:text-amber-300 transition-colors block">
                        Institute of Business &amp; Entrep
                      </span>
                      <span className="text-[11px] text-slate-500">
                        IBE · Business Admin &amp; Entrep
                      </span>
                    </Link>
                  </li>
                </ul>
              </div>

              {/* ── COLUMN 3 (~4/12): Real Verified Access Portals ── */}
              <div className="lg:col-span-4">
                <h4 className="text-xs font-bold tracking-[0.2em] uppercase text-white/90 mb-4">
                  Portals
                </h4>
                <ul className="space-y-2.5">
                  <li>
                    <Link
                      href="/login"
                      className="text-xs sm:text-sm text-slate-400 hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded inline-block"
                    >
                      Student &amp; Faculty Sign In
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/register"
                      className="text-xs sm:text-sm text-slate-400 hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded inline-block"
                    >
                      Student Account Registration
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/forgot-password"
                      className="text-xs sm:text-sm text-slate-400 hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded inline-block"
                    >
                      Account Password Recovery
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/login?desktop=admin"
                      className="text-xs sm:text-sm text-slate-400 hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded inline-block"
                    >
                      Administrative Console Access
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* ── BOTTOM BAR: Divider, Copyright & Project Metadata ── */}
            <div className="border-t border-white/[0.08] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="text-slate-500 text-center sm:text-left">
                <p>
                  &copy; {currentYear} Colegio de Montalban. All rights reserved.
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  A capstone project for Colegio de Montalban, Rodriguez, Rizal
                </p>
              </div>

              <div className="flex items-center gap-2.5 font-mono text-xs text-slate-400">
                <span className="font-semibold text-amber-400/90">ICS</span>
                <span className="text-slate-700">·</span>
                <span className="font-semibold text-amber-400/90">ITE</span>
                <span className="text-slate-700">·</span>
                <span className="font-semibold text-amber-400/90">IBE</span>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </motion.div>
  );
}
