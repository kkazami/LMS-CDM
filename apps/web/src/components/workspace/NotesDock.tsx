"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowUpRight, EyeOff } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent } from "react";
import MobileQuickNote from "./MobileQuickNote";
import { useNotes } from "./NotesProvider";
import { toast } from "@/components/common/Toast";
import styles from "./notes-dock.module.css";

const NotesBoard = dynamic(() => import("./NotesBoard"), { loading: () => <p className={styles.loading} role="status">Opening Notes…</p> });
const mobileNotesQuery = "(max-width: 767px), (hover: none) and (pointer: coarse) and (max-width: 1023px)";
const formResponsePath = /^\/[^/]+\/courses\/[^/]+\/classwork\/forms\/[^/]+\/respond\/?$/;

function subscribeToMobileNotes(change: () => void) {
  const media = window.matchMedia(mobileNotesQuery);
  media.addEventListener("change", change);
  return () => media.removeEventListener("change", change);
}

const isMobileNotes = () => window.matchMedia(mobileNotesQuery).matches;
const isServerMobileNotes = () => false;

type Position = { side: "left" | "right"; ratio: number };
type Drag = {
  pointerId: number;
  x: number;
  y: number;
  startedOpen: boolean;
  mode: "pending" | "slide" | "move";
  start: Position;
  next: Position;
  sliding?: boolean;
  width: number;
};
type Phase = "closed" | "dragging" | "returning" | "opening" | "open";
const defaultPosition: Position = { side: "right", ratio: 0.47 };
const clamp = (ratio: number) => Math.max(0, Math.min(1, ratio));

function inwardDistance(drag: Drag, x: number) {
  return (x - drag.x) * (drag.start.side === "left" ? 1 : -1);
}

export default function NotesDock({ instituteCode, userId, isStudent }: { instituteCode: string; userId?: string; isStudent: boolean }) {
  const { shortcutHidden, setShortcutVisibility } = useNotes();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const notesPath = `/${instituteCode}/tasks`;
  const views = searchParams.getAll("view");
  const onNotesPage = pathname.replace(/\/$/, "") === notesPath && views.length === 1 && views[0] === "notes";
  const unavailable = onNotesPage || (isStudent && formResponsePath.test(pathname));
  const [position, setPosition] = useState(defaultPosition);
  const [phase, setPhase] = useState<Phase>("closed");
  const [keepDocked, setKeepDocked] = useState(false);
  const [visited, setVisited] = useState(false);
  const [desktopVisited, setDesktopVisited] = useState(false);
  const mobile = useSyncExternalStore(subscribeToMobileNotes, isMobileNotes, isServerMobileNotes);
  const drag = useRef<Drag | null>(null);
  const ignoreClick = useRef(false);
  const rail = useRef<HTMLDivElement>(null);
  const notebook = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const panelId = useId();
  const helpId = useId();
  const storageKey = `cdm:notes-dock:v1:${userId ?? instituteCode}`;
  const open = phase === "open" && !unavailable;
  const preview = phase === "dragging" || phase === "returning" || phase === "opening";
  const location = { "--notes-position": `${position.ratio * 100}dvh` } as CSSProperties;

  useEffect(() => {
    if (visited && !mobile) setDesktopVisited(true);
  }, [visited, mobile]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as Position | null;
      setPosition(saved && (saved.side === "left" || saved.side === "right") && Number.isFinite(saved.ratio)
        ? { side: saved.side, ratio: clamp(saved.ratio) } : defaultPosition);
    } catch {
      setPosition(defaultPosition);
    }
  }, [storageKey]);

  useEffect(() => {
    if (unavailable) {
      drag.current = null;
      notebook.current?.style.removeProperty("--notes-travel");
      setKeepDocked(false);
      setPhase("closed");
    }
  }, [unavailable]);

  useEffect(() => {
    if (open) panel.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const syncViewport = () => {
      rail.current?.style.setProperty("--notes-visible-height", `${viewport.height}px`);
      rail.current?.style.setProperty("--notes-keyboard-inset", `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`);
    };
    syncViewport();
    viewport.addEventListener("resize", syncViewport);
    viewport.addEventListener("scroll", syncViewport);
    return () => {
      viewport.removeEventListener("resize", syncViewport);
      viewport.removeEventListener("scroll", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (phase !== "opening" && phase !== "returning") return;
    const settle = () => {
      notebook.current?.style.removeProperty("--notes-travel");
      setKeepDocked(false);
      setPhase(phase === "opening" ? "open" : "closed");
      if (phase === "returning") requestAnimationFrame(() => launcher.current?.focus({ preventScroll: true }));
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      settle();
      return;
    }
    const movingPage = notebook.current;
    const finishTransition = (event: TransitionEvent) => {
      if (event.target === movingPage && event.propertyName === "transform") settle();
    };
    movingPage?.addEventListener("transitionend", finishTransition);
    const timer = window.setTimeout(settle, 320);
    return () => {
      movingPage?.removeEventListener("transitionend", finishTransition);
      window.clearTimeout(timer);
    };
  }, [phase]);

  function persist(next: Position) {
    setPosition(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Position still applies for this session. */ }
  }

  function close(restoreFocus = true) {
    setKeepDocked(restoreFocus);
    setPhase(restoreFocus ? "returning" : "closed");
  }

  function toggleNotes() {
    if (open) {
      close();
      return;
    }
    setVisited(true);
    setPhase("opening");
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const gesture = drag.current;
    if (gesture?.pointerId !== event.pointerId) return;

    const inward = inwardDistance(gesture, event.clientX);
    const vertical = Math.abs(event.clientY - gesture.y);
    if (gesture.mode === "pending") {
      if (Math.max(Math.abs(inward), vertical) < 8) return;
      gesture.mode = gesture.startedOpen || Math.abs(inward) > vertical ? "slide" : "move";
    }

    if (gesture.mode === "slide") {
      if (!gesture.sliding) {
        if (gesture.startedOpen ? inward >= 0 : inward <= 0) return;
        gesture.sliding = true;
        if (gesture.startedOpen) setKeepDocked(true);
        setVisited(true);
        setPhase("dragging");
      }
      const { width } = gesture;
      const travel = Math.max(0, Math.min(width, (gesture.startedOpen ? width : 0) + inward));
      notebook.current?.style.setProperty("--notes-travel", `${travel}px`);
      return;
    }

    gesture.next = {
      side: event.clientX < window.innerWidth / 2 ? "left" : "right",
      ratio: clamp(gesture.start.ratio + (event.clientY - gesture.y) / window.innerHeight),
    };
    setPosition(gesture.next);
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const gesture = drag.current;
    if (gesture?.pointerId !== event.pointerId) return;
    drag.current = null;
    ignoreClick.current = cancelled || gesture.mode !== "pending";

    if (!cancelled && gesture.mode === "pending" && event.pointerType === "touch") {
      ignoreClick.current = true;
      toggleNotes();
      return;
    }

    if (gesture.mode === "move") {
      if (cancelled) setPosition(gesture.start);
      else persist(gesture.next);
    } else if (gesture.sliding) {
      const { width } = gesture;
      const released = inwardDistance(gesture, event.clientX);
      const stayOpen = cancelled ? gesture.startedOpen : gesture.startedOpen ? released > -width * 0.38 : released >= width * 0.38;
      setPhase(stayOpen ? "opening" : "returning");
    }
  }

  return (
    <div ref={rail} hidden={shortcutHidden !== false || unavailable} className={styles.rail} style={location} data-side={position.side} data-docked={!unavailable && (open || keepDocked) || undefined}>
      <span id={helpId} className="sr-only">{open ? "Push the binding toward the screen edge to close Quick Notes, or activate it to close." : "Pull inward to reveal Quick Notes, or activate to open it fully. Drag along the edge to move the binding, or use the arrow keys."}</span>
      <div ref={notebook} className={styles.notebook} data-phase={phase}>
        <button
          ref={launcher}
          type="button"
          className={styles.launcher}
          aria-label={open ? "Push quick notes closed" : "Open quick notes"}
          aria-describedby={helpId}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={panelId}
          title={open ? "Push toward the edge to close Quick Notes" : "Pull inward to open Quick Notes"}
          onPointerDown={event => {
            if (!event.isPrimary || event.button !== 0 || preview) return;
            const width = panel.current?.getBoundingClientRect().width;
            if (!width) return;
            ignoreClick.current = false;
            drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, startedOpen: open, mode: "pending", start: position, next: position, width };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={move}
          onPointerUp={event => endDrag(event)}
          onPointerCancel={event => endDrag(event, true)}
          onLostPointerCapture={event => endDrag(event, true)}
          onClick={event => {
            if (preview || (event.detail && ignoreClick.current)) return;
            toggleNotes();
          }}
          onKeyDown={event => {
            if (open && event.key === "Escape") {
              event.stopPropagation();
              close();
              return;
            }
            if (open || preview) return;
            const { key } = event;
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) return;
            event.preventDefault();
            if (key === "ArrowLeft" || key === "ArrowRight") persist({ ...position, side: key === "ArrowLeft" ? "left" : "right" });
            else persist({ ...position, ratio: clamp(position.ratio + (key === "ArrowUp" ? -0.075 : 0.075)) });
          }}
        >
          <span className={styles.rings} aria-hidden="true">
            {Array.from({ length: 28 }, (_, index) => <span key={index} />)}
          </span>
          <span className={styles.tabLabel} aria-hidden="true">Notes</span>
        </button>

        <aside ref={panel} id={panelId} inert={!open} aria-label="Quick notes" role="dialog" tabIndex={-1} className={styles.panel} onKeyDown={event => {
          if (event.key === "Escape" && !event.defaultPrevented && event.currentTarget.contains(event.target as Node)) {
            event.stopPropagation();
            close();
          }
        }}>
          {visited && <>
            <header className={styles.header}>
              <h2>Quick notes</h2>
              <Link href={`${notesPath}?view=notes`} className={styles.headerAction} title="Open Notes board" aria-label="Open Notes board" onClick={() => close(false)}><ArrowUpRight size={18} aria-hidden="true" /></Link>
              <button type="button" className={styles.headerAction} title="Hide Quick Notes shortcut" aria-label="Hide Quick Notes shortcut" onClick={() => {
                close(false);
                setShortcutVisibility(false);
                toast.info("Quick Notes shortcut hidden", "Show it again from the full Notes page.");
              }}><EyeOff size={18} aria-hidden="true" /></button>
            </header>
            <MobileQuickNote />
            {(desktopVisited || !mobile) && <div className={styles.scroller}><NotesBoard compact active={open} /></div>}
          </>}
        </aside>
      </div>
    </div>
  );
}
