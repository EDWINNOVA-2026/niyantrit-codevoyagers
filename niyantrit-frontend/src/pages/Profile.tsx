import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAppContext } from "../context/AppContext";

function Profile() {
  const navigate = useNavigate();
  const { isAuthenticated, userRole, phoneNumber, projects, posts } = useAppContext();

  const profileSummary = useMemo(() => {
    const totalIssues = posts.length;
    const openIssues = posts.filter((post) => {
      const status = post.complaintStatus.trim().toLowerCase();
      return status !== "resolved" && status !== "closed";
    }).length;
    const highPriorityIssues = posts.filter((post) => post.priority >= 7).length;

    return {
      projectsVisible: projects.length,
      totalIssues,
      openIssues,
      highPriorityIssues,
    };
  }, [projects, posts]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto flex min-h-[calc(100vh-1px)] w-full max-w-3xl items-center px-4 py-8 sm:px-6 lg:px-8">
          <section className="w-full rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">You are not signed in.</p>
            <h1 className="mt-2 text-2xl font-bold text-foreground">Open the login flow to continue</h1>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-6 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Go to Login
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Profile</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">Account Overview</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your account details and review your current monitoring context.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ProfileStat label="Role" value={userRole || "guest"} />
            <ProfileStat label="Phone" value={phoneNumber || "not available"} />
            <ProfileStat label="Projects Visible" value={String(profileSummary.projectsVisible)} />
            <ProfileStat label="Open Issues" value={String(profileSummary.openIssues)} />
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-foreground">Activity Snapshot</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ProfileStat label="Total Issues" value={String(profileSummary.totalIssues)} />
            <ProfileStat label="High Priority Issues" value={String(profileSummary.highPriorityIssues)} />
            <ProfileStat label="Projects Tracked" value={String(profileSummary.projectsVisible)} />
          </div>
        </section>
      </main>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export default Profile;