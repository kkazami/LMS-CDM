"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Clock, ExternalLink, MapPin, Pencil, Plus, Trash2, User, X } from "lucide-react";
import type { CalendarEvent } from "@/lib/lms-types";
import type { InstituteTheme } from "@/lib/theme";
import { addCalendarDays, calendarLabel, classOccurrences, eventOnDay, layoutDayEvents, schoolDateKey, schoolInput, schoolTime, WEEKDAYS, type ClassSchedule } from "@/lib/student-calendar";
import styles from "./calendar.module.css";

type Props = {
  events: CalendarEvent[];
  schedules: ClassSchedule[];
  userId: string;
  instituteCode: string;
  theme: InstituteTheme;
  today: string;
  showClasswork?: boolean;
};
type View = "day" | "week" | "month";
type Selection = { event: CalendarEvent; anchor: HTMLButtonElement };

function dateLabel(key: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));
}

async function mutateEvent(method: string, payload: object | string) {
  const response = await fetch(`/api/workspace/events${typeof payload === "string" ? `?id=${encodeURIComponent(payload)}` : ""}`, {
    method, headers: { "Content-Type": "application/json" },
    ...(typeof payload === "object" ? { body: JSON.stringify(payload) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Could not save the event. Please try again.");
  return data;
}

function EventPopover({ selection, editable, onClose, onEdit, onDelete, busy, error }: {
  selection: Selection; editable: boolean; onClose: () => void; onEdit: () => void;
  onDelete: () => void; busy: boolean; error: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const { event, anchor } = selection;
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const scrollContainer = anchor.closest<HTMLElement>("[data-calendar-scroll]");
    const initialScrollTop = scrollContainer?.scrollTop;
    const initialScrollLeft = scrollContainer?.scrollLeft;
    function place() {
      if (!node) return;
      const rect = anchor.getBoundingClientRect();
      const viewport = window.visualViewport;
      const minLeft = (viewport?.offsetLeft ?? 0) + 12;
      const minTop = (viewport?.offsetTop ?? 0) + 12;
      const maxRight = minLeft + (viewport?.width ?? window.innerWidth) - 24;
      const navigation = document.querySelector("[data-mobile-bottom-nav]")?.getBoundingClientRect();
      const calendarBounds = anchor.closest("[data-calendar-scroll]")?.getBoundingClientRect();
      const viewportBottom = minTop + (viewport?.height ?? window.innerHeight) - 24;
      const maxBottom = Math.min(viewportBottom, navigation && navigation.height > 0 ? navigation.top - 12 : viewportBottom, calendarBounds ? calendarBounds.bottom - 8 : viewportBottom);
      const width = node.offsetWidth;
      const height = Math.min(node.scrollHeight, maxBottom - minTop);
      let left = rect.left;
      let top: number;
      let available = maxBottom - minTop;
      if (window.innerWidth >= 768 && (maxRight - rect.right >= width + 8 || rect.left - minLeft >= width + 8)) {
        left = maxRight - rect.right >= width + 8 ? rect.right + 8 : rect.left - width - 8;
        top = Math.max(minTop, Math.min(rect.top, maxBottom - height));
      } else {
        const above = Math.max(0, rect.top - minTop - 8);
        const below = Math.max(0, maxBottom - rect.bottom - 8);
        const useBelow = below >= height || (above < height && below > above);
        available = useBelow ? below : above;
        top = useBelow ? rect.bottom + 8 : rect.top - Math.min(height, available) - 8;
      }
      node.style.left = `${Math.max(minLeft, Math.min(left, maxRight - width)) + window.scrollX}px`;
      node.style.top = `${Math.max(minTop, top) + window.scrollY}px`;
      node.style.maxHeight = `${available}px`;
      node.style.visibility = "visible";
    }
    function dismissOnCalendarScroll(e: Event) {
      // Ignore scroll events queued while the browser brought the clicked event into view.
      if (e.target === scrollContainer && (scrollContainer?.scrollTop !== initialScrollTop || scrollContainer?.scrollLeft !== initialScrollLeft)) onClose();
    }
    place();
    closeRef.current?.focus({ preventScroll: true });
    window.addEventListener("resize", place);
    window.addEventListener("scroll", dismissOnCalendarScroll, true);
    window.visualViewport?.addEventListener("resize", place);
    function dismiss(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose();
    }
    function escape(e: KeyboardEvent) { if (e.key === "Escape") { onClose(); anchor.focus({ preventScroll: true }); } }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("resize", place); window.removeEventListener("scroll", dismissOnCalendarScroll, true);
      window.visualViewport?.removeEventListener("resize", place);
      document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape);
    };
  }, [anchor, event, onClose, error]);
  return createPortal(
    <div ref={ref} role="dialog" aria-modal="false" aria-labelledby={titleId} className={styles.popover}>
      <div className={styles.popoverHeader}>
      <h3 id={titleId}>{calendarLabel(event)}</h3>
      <div className={styles.popoverActions}>
        {editable && <><button disabled={busy} onClick={onEdit} aria-label="Edit event"><Pencil size={17} /></button><button disabled={busy} onClick={onDelete} aria-label="Delete event"><Trash2 size={17} /></button></>}
        <button ref={closeRef} onClick={() => { onClose(); anchor.focus({ preventScroll: true }); }} aria-label="Close event details"><X size={19} /></button>
      </div>
      </div>
      <p className={styles.eventType}>{event.eventType === "personal" ? "Personal event" : event.eventType}{event.maxPoints !== null && ` · ${event.maxPoints} points`}</p>
      <p><Clock size={15} /><span>{dateLabel(schoolDateKey(event.eventDate), { weekday: "short", month: "short", day: "numeric" })} · {schoolTime(event.eventDate)}{event.endDate ? ` – ${schoolDateKey(event.endDate) !== schoolDateKey(event.eventDate) ? `${dateLabel(schoolDateKey(event.endDate), { month: "short", day: "numeric" })}, ` : ""}${schoolTime(event.endDate)}` : " · Due"} · GMT+8</span></p>
      {event.recurrence && <p>{event.recurrence}</p>}
      {event.courseTitle && <p className={styles.courseTitle}>{event.courseTitle}</p>}
      {(event.professorName || event.room) && <p className={styles.eventPeople}>
        {event.professorName && <span><User size={15} />{event.professorName}</span>}
        {event.room && <span><MapPin size={15} />{event.room}</span>}
      </p>}
      {event.description && event.description !== event.courseTitle && <p className={styles.description}>{event.description.replace(/<[^>]*>/g, "")}</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {event.deepLink.startsWith("/") && !event.deepLink.startsWith("//") && !event.deepLink.includes("\\") && <a className={styles.eventLink} href={event.deepLink}>Go to {event.source === "class" ? "class" : "task"}<ExternalLink size={15} /></a>}
    </div>, document.body,
  );
}

export default function StudentCalendar({ events: initialEvents, schedules, userId, instituteCode, theme, today, showClasswork = true }: Props) {
  const [events, setEvents] = useState(initialEvents);
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(today);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [editor, setEditor] = useState<CalendarEvent | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const editorRef = useRef<HTMLFormElement>(null);
  const headingId = useId();
  useEffect(() => { setEvents(initialEvents); }, [initialEvents]);
  useEffect(() => { if (editor) editorRef.current?.querySelector("input")?.focus(); }, [editor]);

  const days = useMemo(() => {
    if (view === "day") return [date];
    const current = new Date(`${date}T12:00:00Z`);
    const first = view === "month" ? `${date.slice(0, 7)}-01` : date;
    const weekday = new Date(`${first}T12:00:00Z`).getUTCDay();
    const start = addCalendarDays(first, -weekday);
    const last = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0)).getUTCDate();
    const count = view === "week" ? 7 : Math.ceil((weekday + last) / 7) * 7;
    return Array.from({ length: count }, (_, index) => addCalendarDays(start, index));
  }, [date, view]);
  const allEvents = useMemo(() => [...events, ...classOccurrences(schedules, days, instituteCode)], [events, schedules, days, instituteCode]);
  const eventsByDay = useMemo(() => new Map(days.map((day) => [day, allEvents.filter((event) => eventOnDay(event, day)).sort((a, b) => a.eventDate.localeCompare(b.eventDate))])), [days, allEvents]);
  const title = view === "day" ? dateLabel(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : view === "week" ? `${dateLabel(days[0], { month: "short", day: "numeric" })} – ${dateLabel(days[6], { month: "short", day: "numeric", year: "numeric" })}`
      : dateLabel(date, { month: "long", year: "numeric" });

  const closePopover = useCallback(() => { setSelection(null); setError(""); }, []);
  function showDay(day: string) { setDate(day); setView("day"); setEditor(null); closePopover(); }
  function changeView(next: View) { setView(next); setEditor(null); closePopover(); }
  function navigate(direction: number) {
    if (view === "month") {
      const target = new Date(`${date.slice(0, 7)}-01T12:00:00Z`);
      target.setUTCMonth(target.getUTCMonth() + direction);
      setDate(target.toISOString().slice(0, 10));
    } else setDate(addCalendarDays(date, direction * (view === "week" ? 7 : 1)));
    setEditor(null); closePopover();
  }
  function openEvent(event: CalendarEvent, anchor: HTMLButtonElement) { setSelection({ event, anchor }); setError(""); }
  function canEdit(event: CalendarEvent) { return event.creatorId === userId && event.source !== "class" && event.source !== "classwork"; }
  async function saveEvent(form: HTMLFormElement) {
    const data = new FormData(form);
    setBusy(true); setError("");
    try {
      const existing = editor && editor !== "new" && editor.id ? editor : null;
      const saved = await mutateEvent(existing ? "PATCH" : "POST", {
        ...(existing ?? {}), title: data.get("title"), description: data.get("description"),
        eventDate: new Date(`${data.get("start")}:00+08:00`).toISOString(),
        endDate: new Date(`${data.get("end")}:00+08:00`).toISOString(),
        eventType: existing?.eventType ?? "personal", courseId: existing?.courseId ?? null,
      });
      const event: CalendarEvent = { ...saved, courseTitle: saved.course?.title, courseCode: saved.course?.code, source: "personal" };
      setEvents((current) => [...current.filter((item) => item.id !== event.id), event]);
      setDate(schoolDateKey(event.eventDate)); setEditor(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save event."); }
    finally { setBusy(false); }
  }
  async function deleteEvent() {
    if (!selection || !canEdit(selection.event)) return;
    setBusy(true); setError("");
    try {
      await mutateEvent("DELETE", selection.event.id);
      setEvents((current) => current.filter((item) => item.id !== selection.event.id)); closePopover();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not delete event."); }
    finally { setBusy(false); }
  }
  function eventButton(event: CalendarEvent, timed = false, showDetails = false) {
    return <button key={event.id} type="button" className={`${styles.event} ${timed ? styles.timedEvent : ""} ${selection?.event.id === event.id ? styles.selectedEvent : ""}`}
      data-kind={event.eventType} aria-label={`${calendarLabel(event)}, ${schoolTime(event.eventDate)}`} aria-expanded={selection?.event.id === event.id}
      onClick={(e) => openEvent(event, e.currentTarget)}>
      <strong>{event.courseCode && <><span className={styles.eventCode}>{event.courseCode}</span><span className={styles.eventSeparator}> - </span></>}<span className={styles.eventTitle}>{event.title}</span></strong><span className={styles.eventTime}>{schoolTime(event.eventDate)}{event.endDate && ` – ${schoolTime(event.endDate)}`}</span>
      {timed && view === "day" && showDetails && <><span className={styles.eventDetails}>{event.courseTitle}{event.room && ` · ${event.room}`}</span><span className={styles.eventDetails}>{event.professorName}</span></>}
    </button>;
  }

  const draft = editor && editor !== "new" ? editor : null;
  return <section className={styles.calendar} aria-labelledby={headingId} style={{ "--calendar-accent": theme.colors.primary } as React.CSSProperties}>
    <div className={styles.toolbar}>
      <h2 id={headingId}>Calendar</h2>
      <div className={styles.viewControls} role="group" aria-label="Calendar view">
        {(["day", "week", "month"] as const).map((mode) => <button key={mode} aria-pressed={view === mode} onClick={() => changeView(mode)}>{mode === "day" ? "Day" : mode === "week" ? "Week" : "Month"}</button>)}
      </div>
      {view === "day" && <button className={styles.addButton} onClick={() => { setEditor("new"); closePopover(); }}><Plus size={17} />Add event</button>}
    </div>
    <div className={styles.navigation}>
      <div><button onClick={() => { setDate(today); setEditor(null); closePopover(); }}>Today</button><button onClick={() => navigate(-1)} aria-label={`Previous ${view}`}><ChevronLeft size={19} /></button><button onClick={() => navigate(1)} aria-label={`Next ${view}`}><ChevronRight size={19} /></button></div>
      <h3 aria-live="polite">{title}</h3><span className={styles.timezone}>GMT+8</span>
    </div>
    {editor && <form key={draft?.id ?? `new-${date}`} ref={editorRef} className={styles.editor} onSubmit={(e) => { e.preventDefault(); void saveEvent(e.currentTarget); }}>
      <h3>{draft ? "Edit event" : "New personal event"}</h3>
      <label>Title<input name="title" required maxLength={200} defaultValue={draft?.title ?? ""} /></label>
      <div className={styles.editorTimes}><label>Starts (GMT+8)<input type="datetime-local" name="start" required defaultValue={draft ? schoolInput(draft.eventDate) : `${date}T09:00`} /></label>
        <label>Ends (GMT+8)<input type="datetime-local" name="end" required defaultValue={draft ? schoolInput(draft.endDate ?? new Date(new Date(draft.eventDate).getTime() + 3600000).toISOString()) : `${date}T10:00`} /></label></div>
      <label>Notes<textarea name="description" rows={2} maxLength={5000} defaultValue={draft?.description ?? ""} /></label>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.editorActions}><button type="submit" className={styles.addButton} disabled={busy}>{busy ? "Saving…" : "Save event"}</button><button type="button" disabled={busy} onClick={() => { setEditor(null); setError(""); }}>Cancel</button></div>
    </form>}
    <div data-calendar-scroll className={`${styles.scroller} ${view === "month" ? styles.monthScroller : ""}`} tabIndex={0} aria-label={`${view} calendar, scroll to explore`}>
      {view === "month" ? <div className={styles.month}>
        {WEEKDAYS.map((name) => <div key={name} className={styles.weekday}>{name.slice(0, 3)}</div>)}
        {days.map((day) => { const dayEvents = eventsByDay.get(day) ?? []; return <div key={day} className={`${styles.monthDay} ${day.slice(0, 7) !== date.slice(0, 7) ? styles.outsideMonth : ""}`}>
          <button className={`${styles.dateButton} ${day === today ? styles.today : ""}`} aria-label={`View ${dateLabel(day, { month: "long", day: "numeric", year: "numeric" })}`} onClick={() => showDay(day)}>{Number(day.slice(8))}</button>
          <div className={styles.monthEvents}>{dayEvents.slice(0, 3).map((event) => eventButton(event))}</div>
          {dayEvents.length > 2 && <button className={`${styles.more} ${dayEvents.length === 3 ? styles.mobileOnly : ""}`} onClick={() => showDay(day)}><span className={styles.desktopOnly}>+{dayEvents.length - 3} more</span><span className={styles.mobileOnly}>+{dayEvents.length - 2} more</span></button>}
          <button className={styles.daySpace} aria-label={`Open day ${day}`} onClick={() => showDay(day)} />
        </div>; })}
      </div> : <div className={`${styles.timeGrid} ${view === "week" ? styles.weekGrid : ""}`} style={{ gridTemplateColumns: `var(--time-axis-width) repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className={styles.timeHeader}>GMT+8</div>
        {days.map((day) => <button key={day} className={styles.dayHeader} onClick={() => showDay(day)}><span>{dateLabel(day, { weekday: "short" })}</span><strong className={day === today ? styles.today : ""}>{Number(day.slice(8))}</strong></button>)}
        <div className={styles.timeAxis}>{Array.from({ length: 25 }, (_, hour) => <span key={hour} style={{ top: `calc(var(--hour-size) * ${hour})` }}>{hour === 0 || hour === 24 ? "12 AM" : hour === 12 ? "12 PM" : `${hour % 12} ${hour < 12 ? "AM" : "PM"}`}</span>)}</div>
        {days.map((day) => <div key={day} className={styles.timeDay}>
          {Array.from({ length: 24 }, (_, hour) => <button key={hour} className={styles.hourSlot} style={{ top: `calc(var(--hour-size) * ${hour})` }} aria-label={`${day}, ${hour}:00, ${view === "day" ? "add personal event" : "open day"}`} onClick={() => {
            showDay(day);
            if (view === "day") { const eventDate = new Date(`${day}T${String(hour).padStart(2, "0")}:00:00+08:00`).toISOString(); setEditor({ id: "", title: "", description: "", professorName: "", eventDate, endDate: new Date(new Date(eventDate).getTime() + 3600000).toISOString(), eventType: "personal", maxPoints: null, deepLink: "#", courseId: null, creatorId: userId, instituteId: "", createdAt: "", updatedAt: "" }); }
          }} />)}
          {layoutDayEvents(eventsByDay.get(day) ?? [], day).map(({ event, start, end, column, columns }) => <div key={event.id} className={styles.positionedEvent} style={{ top: `calc(var(--hour-size) * ${start / 60})`, height: `max(25px, calc(var(--hour-size) * ${(end - start) / 60} - 2px))`, left: `calc(${column / columns * 100}% + 2px)`, width: `calc(${100 / columns}% - 4px)` }}>{eventButton(event, true, (end - start) / 60 * 64 >= 90)}</div>)}
        </div>)}
      </div>}
    </div>
    {view === "day" && (eventsByDay.get(date)?.length ?? 0) === 0 && <p className={styles.empty}>No events on this day. Add a personal event or choose another date.</p>}
    <div className={styles.legend}><span>Classes</span>{showClasswork && <span data-kind="classwork">Tasks & quizzes</span>}<span data-kind="personal">Personal events</span></div>
    {selection && <EventPopover selection={selection} editable={canEdit(selection.event)} onClose={closePopover} busy={busy} error={error} onDelete={() => void deleteEvent()} onEdit={() => { showDay(schoolDateKey(selection.event.eventDate)); setEditor(selection.event); }} />}
  </section>;
}
