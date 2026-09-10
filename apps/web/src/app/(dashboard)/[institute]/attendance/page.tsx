import { getInstituteTheme } from "@/lib/get-institute-theme";
import { CheckCircle2, XCircle, Clock, Calendar, AlertCircle } from "lucide-react";

interface AttendancePageProps {
  params: Promise<{ institute: string }>;
}

export default async function AttendancePage({ params }: AttendancePageProps) {
  const { institute } = await params;
  const theme = getInstituteTheme(institute);

  // Mock initial attendance records for academic demonstration
  const records = [
    { id: "att-1", course: "CS 101", date: "Sep 2, 2026", time: "09:00 AM - 10:30 AM", status: "PRESENT", room: "Lab 3" },
    { id: "att-2", course: "MATH 201", date: "Sep 1, 2026", time: "01:00 PM - 02:30 PM", status: "PRESENT", room: "Room 402" },
    { id: "att-3", course: "PHYS 102", date: "Aug 29, 2026", time: "10:30 AM - 12:00 PM", status: "LATE", room: "Lecture Hall A" },
    { id: "att-4", course: "ENG 105", date: "Aug 27, 2026", time: "03:00 PM - 04:30 PM", status: "PRESENT", room: "Room 201" },
    { id: "att-5", course: "CS 101", date: "Aug 26, 2026", time: "09:00 AM - 10:30 AM", status: "EXCUSED", room: "Lab 3" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F0F2F8]">
            Attendance & Participation
          </h1>
          <p className="text-sm text-slate-500 dark:text-[#8B92A5] mt-1">
            Track your class attendance, verify check-ins, and monitor academic attendance requirements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{
              backgroundColor: `${theme.colors.primary}1A`,
              color: theme.colors.primary,
            }}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Fall Semester 2026</span>
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 dark:text-[#8B92A5]">Attendance Rate</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-[#F0F2F8]">
            96.2%
          </p>
          <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Satisfies 85% requirement</span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 dark:text-[#8B92A5]">Present Sessions</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-[#F0F2F8]">
            28
          </p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-[#8B92A5]">Out of 30 total lectures</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 dark:text-[#8B92A5]">Late Check-Ins</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            1
          </p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-[#8B92A5]">Within 10-minute grace window</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 dark:text-[#8B92A5]">Unexcused Absences</p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
            0
          </p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-[#8B92A5]">Max permitted: 4 per course</p>
        </div>
      </div>

      {/* Attendance Records Log */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8]">
            Recent Session Attendance
          </h2>
          <span className="text-xs text-slate-500 dark:text-[#8B92A5]">
            Verified via Beacon & QR
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {records.map((rec) => {
            const isPresent = rec.status === "PRESENT";
            const isLate = rec.status === "LATE";
            return (
              <div
                key={rec.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isPresent
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : isLate
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {isPresent ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isLate ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8]">
                      {rec.course} · {rec.room}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
                      {rec.date} · {rec.time}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider ${
                      isPresent
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : isLate
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {rec.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
