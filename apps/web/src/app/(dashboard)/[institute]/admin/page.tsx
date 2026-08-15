import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import {
  Users,
  GraduationCap,
  Library,
  ShieldCheck,
  FileText,
  HardDrive,
  Sparkles,
  ArrowRight,
  UserCheck,
  Layers,
  Settings,
} from "lucide-react";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    institute: string;
  }>;
};

export default async function AdminDashboardPage({ params }: PageProps) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  if (session.user.role.toUpperCase() !== "ADMIN") {
    redirect(`/${institute}`);
  }

  const theme = getInstituteTheme(institute);

  // Resolve institute record
  const instituteRecord = await db.institute.findUnique({
    where: { code: institute.toLowerCase() },
    select: { id: true, name: true },
  });

  if (!instituteRecord) {
    redirect(`/login?institute=${institute}`);
  }

  // Fetch KPI statistics
  const [totalStudents, totalInstructors, totalCourses, pendingEnrollments] = await Promise.all([
    db.user.count({
      where: {
        instituteId: instituteRecord.id,
        role: "STUDENT",
      },
    }),
    db.user.count({
      where: {
        instituteId: instituteRecord.id,
        role: { in: ["PROFESSOR", "TEACHER", "INSTRUCTOR"] },
      },
    }),
    db.course.count({
      where: {
        instituteId: instituteRecord.id,
        isArchived: false,
      },
    }),
    db.enrollment.count({
      where: {
        course: { instituteId: instituteRecord.id },
        status: "PENDING",
      },
    }),
  ]);

  const quickActions = [
    {
      title: "Course Management",
      description: "Create, assign instructors, and manage course offerings",
      href: `/${institute}/admin/courses`,
      icon: Library,
      color: "#3B82F6",
      count: `${totalCourses} Courses`,
    },
    {
      title: "Account Management",
      description: "Directory of students, instructors, and bulk user imports",
      href: `/${institute}/accounts`,
      icon: Users,
      color: "#10B981",
      count: `${totalStudents + totalInstructors} Accounts`,
    },
    {
      title: "Permission Matrix",
      description: "Configure granular role permissions and access levels",
      href: `/${institute}/accounts/permissions`,
      icon: ShieldCheck,
      color: "#8B5CF6",
      count: "RBAC Controls",
    },
    {
      title: "Audit Logs",
      description: "Trace system operations, logins, and security events",
      href: `/${institute}/logs`,
      icon: FileText,
      color: "#F59E0B",
      count: "System Activity",
    },
    {
      title: "Backup & Recovery",
      description: "Database snapshots, data export, and disaster recovery",
      href: `/${institute}/backup`,
      icon: HardDrive,
      color: "#EC4899",
      count: "Automated Daily",
    },
    {
      title: "Security Tools",
      description: "Two-factor authentication, active sessions, IP filtering",
      href: `/${institute}/security`,
      icon: ShieldCheck,
      color: "#06B6D4",
      count: "Protected",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto page-enter">
      {/* ─── 1. Welcome Banner ─── */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-orange-950/10"
        style={{
          background: `linear-gradient(135deg, ${theme.colors.sidebar} 0%, ${theme.colors.primary} 100%)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: "16px 16px",
          }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md mb-3 text-white border border-white/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{instituteRecord.name} • Administrator Console</span>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight"
              style={{ textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)" }}
            >
              Welcome back, Administrator {session.user.name}! 🛡️
            </h1>
            <p
              className="mt-1 text-sm sm:text-base text-white/90 font-medium"
              style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.15)" }}
            >
              Centralized oversight and management hub for all academic entities.
            </p>
          </div>
        </div>
      </div>

      {/* ─── 2. KPI Metrics Grid ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="rounded-2xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
              Active Students
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-[#F0F2F8] mt-1">
              {totalStudents}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <GraduationCap className="h-6 w-6" />
          </div>
        </div>

        {/* Total Instructors */}
        <div className="rounded-2xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
              Instructors
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-[#F0F2F8] mt-1">
              {totalInstructors}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Active Courses */}
        <div className="rounded-2xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
              Active Courses
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-[#F0F2F8] mt-1">
              {totalCourses}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Library className="h-6 w-6" />
          </div>
        </div>

        {/* Pending Requests */}
        <div className="rounded-2xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
              Pending Requests
            </p>
            <p className="text-2xl font-black text-amber-500 mt-1">
              {pendingEnrollments}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
            <UserCheck className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* ─── 3. Quick Administrative Actions Grid ─── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500/10 text-[#F97316]">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-[#F0F2F8]">
              Administrative Modules
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
              Manage courses, user credentials, security controls, and infrastructure
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#1A1D27] p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-slate-300 dark:hover:border-white/20"
                style={{
                  animation: `staggerFadeIn 0.2s ease-out both`,
                  animationDelay: `${idx * 40}ms`,
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className="p-3 rounded-2xl"
                      style={{
                        backgroundColor: `${action.color}18`,
                        color: action.color,
                      }}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#8B92A5]">
                      {action.count}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8] group-hover:text-[#F97316] transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-1 line-clamp-2">
                      {action.description}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-[rgba(255,255,255,0.06)] flex items-center justify-between text-xs font-semibold text-[#F97316]">
                  <span>Access Module</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
