import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAppContext } from "../context/AppContext";
import {
  User,
  Phone,
  FolderOpen,
  AlertTriangle,
  Shield,
  Activity,
  Flame,
} from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const { isAuthenticated, userRole, phoneNumber, projects, posts } =
    useAppContext();

  const summary = useMemo(
    () => ({
      projectsVisible: projects.length,
      totalIssues: posts.length,
      openIssues: posts.filter(
        (p) => p.complaintStatus !== "Resolved" && p.complaintStatus !== "Closed",
      ).length,
      highPriority: posts.filter((p) => p.priority >= 7).length,
    }),
    [projects, posts],
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto flex min-h-[60vh] max-w-lg items-center px-4 py-8">
          <section className="w-full rounded-2xl border border-border bg-white p-8 text-center shadow-lg">
            <p className="text-sm text-muted-foreground">You are not signed in.</p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm text-primary-foreground"
              style={{ fontWeight: 600 }}
            >
              Go to Login
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/20">
              <User className="h-8 w-8" />
            </div>
            <div>
              <p
                className="text-xs tracking-[0.2em] text-primary uppercase"
                style={{ fontWeight: 600 }}
              >
                Profile
              </p>
              <h1 className="text-2xl text-foreground sm:text-3xl" style={{ fontWeight: 700 }}>
                Account Overview
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Your monitoring context and activity summary.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ProfileCard
              icon={Shield}
              label="Role"
              value={userRole === "tender" ? "Contractor" : "Citizen"}
              iconBg="bg-blue-100"
              iconColor="text-blue-700"
            />
            <ProfileCard
              icon={Phone}
              label="Phone"
              value={phoneNumber || "Not set"}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-700"
            />
            <ProfileCard
              icon={FolderOpen}
              label="Projects Visible"
              value={String(summary.projectsVisible)}
              iconBg="bg-purple-100"
              iconColor="text-purple-700"
            />
            <ProfileCard
              icon={AlertTriangle}
              label="Open Issues"
              value={String(summary.openIssues)}
              iconBg="bg-amber-100"
              iconColor="text-amber-700"
            />
          </div>
        </section>

        {/* Activity */}
        <section className="mt-6 rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-lg text-foreground" style={{ fontWeight: 600 }}>
            Activity Snapshot
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Summary of your engagement across the platform.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <ProfileCard
              icon={Activity}
              label="Total Issues"
              value={String(summary.totalIssues)}
              iconBg="bg-blue-100"
              iconColor="text-blue-700"
            />
            <ProfileCard
              icon={Flame}
              label="High Priority"
              value={String(summary.highPriority)}
              iconBg="bg-red-100"
              iconColor="text-red-700"
            />
            <ProfileCard
              icon={FolderOpen}
              label="Projects Tracked"
              value={String(summary.projectsVisible)}
              iconBg="bg-slate-200"
              iconColor="text-slate-700"
            />
          </div>
        </section>

        {/* Info */}
        <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/50 p-6">
          <p
            className="text-xs tracking-[0.15em] text-blue-700 uppercase"
            style={{ fontWeight: 600 }}
          >
            Backend Integration
          </p>
          <p className="mt-2 text-sm text-blue-800 leading-relaxed">
            This profile page displays data from the authenticated session. When
            connected to the Niyantrit backend (FastAPI), user details,
            complaint history, and project associations will be loaded
            dynamically via JWT-authenticated API calls.
          </p>
        </section>
      </main>
    </div>
  );
}

function ProfileCard({
  icon: Icon,
  label,
  value,
  iconBg,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-slate-50/50 p-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
      >
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div>
        <p
          className="text-xs tracking-wider text-muted-foreground uppercase"
          style={{ fontWeight: 500 }}
        >
          {label}
        </p>
        <p className="mt-0.5 text-lg text-foreground" style={{ fontWeight: 700 }}>
          {value}
        </p>
      </div>
    </div>
  );
}
