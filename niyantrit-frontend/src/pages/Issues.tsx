import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { MapView } from "../components/MapView";
import { Post, Project, useAppContext } from "../context/AppContext";
import {
  AlertTriangle,
  MapPin,
  Flame,
  Activity,
} from "lucide-react";

interface AggregatedIssue {
  project: Project;
  count: number;
  openCount: number;
  avgSeverity: number;
  maxSeverity: number;
}

function groupIssuesByProject(posts: Post[], projects: Project[]) {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const grouped = new Map<
    string,
    {
      project: Project;
      count: number;
      openCount: number;
      totalSev: number;
      maxSev: number;
    }
  >();
  posts.forEach((post) => {
    const project = byId.get(post.projectId);
    if (!project) return;
    const e = grouped.get(project.id) || {
      project,
      count: 0,
      openCount: 0,
      totalSev: 0,
      maxSev: 0,
    };
    e.count++;
    e.totalSev += post.severity;
    e.maxSev = Math.max(e.maxSev, post.severity);
    if (post.complaintStatus !== "Resolved" && post.complaintStatus !== "Closed")
      e.openCount++;
    grouped.set(project.id, e);
  });
  return Array.from(grouped.values())
    .map((i) => ({
      project: i.project,
      count: i.count,
      openCount: i.openCount,
      avgSeverity: +(i.totalSev / i.count).toFixed(1),
      maxSeverity: i.maxSev,
    }))
    .sort((a, b) => b.count - a.count);
}

export default function Issues() {
  const navigate = useNavigate();
  const { isAuthenticated, posts, projects } = useAppContext();

  const density = useMemo(
    () => groupIssuesByProject(posts, projects),
    [posts, projects],
  );

  const projectCounts = useMemo(() => {
    return Object.fromEntries(density.map((d) => [d.project.id, d.count]));
  }, [density]);

  const summary = useMemo(
    () => ({
      totalIssues: posts.length,
      openIssues: posts.filter(
        (p) => p.complaintStatus !== "Resolved" && p.complaintStatus !== "Closed",
      ).length,
      highSeverity: posts.filter((p) => p.severity >= 7).length,
      impactedProjects: density.length,
    }),
    [posts, density],
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
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p
                className="text-xs tracking-[0.2em] text-red-600 uppercase"
                style={{ fontWeight: 600 }}
              >
                Issue Intelligence
              </p>
              <h1 className="text-2xl text-foreground sm:text-3xl" style={{ fontWeight: 700 }}>
                Complaint Heatmap
              </h1>
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Density analysis of issues raised across all tracked projects.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={Activity}
              label="Total Issues"
              value={summary.totalIssues}
              bg="bg-blue-50"
              fg="text-blue-700"
              iconBg="bg-blue-100"
            />
            <SummaryCard
              icon={AlertTriangle}
              label="Open Issues"
              value={summary.openIssues}
              bg="bg-amber-50"
              fg="text-amber-700"
              iconBg="bg-amber-100"
            />
            <SummaryCard
              icon={Flame}
              label="High Severity"
              value={summary.highSeverity}
              bg="bg-red-50"
              fg="text-red-700"
              iconBg="bg-red-100"
            />
            <SummaryCard
              icon={MapPin}
              label="Impacted Projects"
              value={summary.impactedProjects}
              bg="bg-slate-50"
              fg="text-slate-700"
              iconBg="bg-slate-200"
            />
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          {/* Visual Heatmap */}
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="text-lg text-foreground" style={{ fontWeight: 600 }}>
              Issue Density Map
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Relative complaint concentration per project location.
            </p>

            <div className="mt-4 h-[420px] overflow-hidden rounded-xl border border-border bg-white">
              <MapView
                projects={projects}
                userLocation={null}
                projectCounts={projectCounts}
                onProjectClick={(projectId) => navigate(`/project/${projectId}`)}
              />
            </div>

            {density.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                No issues raised yet.
              </p>
            )}
          </section>

          {/* Top Issue Zones */}
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="text-lg text-foreground" style={{ fontWeight: 600 }}>
              Top Issue Zones
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Projects with highest complaint concentration.
            </p>

            <div className="mt-4 space-y-3">
              {density.slice(0, 8).map((item, index) => (
                <button
                  key={item.project.id}
                  type="button"
                  onClick={() => navigate(`/project/${item.project.id}`)}
                  className="flex w-full items-start gap-4 rounded-xl border border-border bg-slate-50/50 p-4 text-left transition hover:bg-white hover:shadow-sm"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs text-primary"
                    style={{ fontWeight: 700 }}
                  >
                    #{index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate" style={{ fontWeight: 600 }}>
                      {item.project.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.project.location.city}, {item.project.location.state}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700"
                        style={{ fontWeight: 600 }}
                      >
                        {item.count} issues
                      </span>
                      <span
                        className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700"
                        style={{ fontWeight: 600 }}
                      >
                        Open: {item.openCount}
                      </span>
                      <span
                        className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] text-red-700"
                        style={{ fontWeight: 600 }}
                      >
                        Sev: {item.avgSeverity}
                      </span>
                    </div>
                  </div>
                </button>
              ))}

              {density.length === 0 && (
                <div className="rounded-xl border border-border bg-slate-50 p-6 text-center text-sm text-muted-foreground">
                  No issues raised yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  bg,
  fg,
  iconBg,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  bg: string;
  fg: string;
  iconBg: string;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border border-border p-4 ${bg} ${fg}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider" style={{ fontWeight: 500 }}>
          {label}
        </p>
        <p className="mt-0.5 text-2xl" style={{ fontWeight: 700 }}>
          {value}
        </p>
      </div>
    </div>
  );
}
