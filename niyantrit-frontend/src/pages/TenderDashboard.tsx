import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Progress } from "../components/ui/progress";
import { useAppContext, type TenderLeaderboardEntry } from "../context/AppContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Trophy,
  Star,
  Upload,
  Search,
  MapPin,
  ArrowRight,
  Award,
  Zap,
} from "lucide-react";

export default function TenderDashboard() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    projects,
    posts,
    addPost,
    getTenderLeaderboard,
    loading,
    error,
  } = useAppContext();

  const [leaderboard, setLeaderboard] = useState<TenderLeaderboardEntry[]>([]);
  const [search, setSearch] = useState("");
  const [showPostForm, setShowPostForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [milestone, setMilestone] = useState("");
  const [workSummary, setWorkSummary] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [blockers, setBlockers] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [progress, setProgress] = useState(50);
  const [materialCost, setMaterialCost] = useState(0);
  const [labourCost, setLabourCost] = useState(0);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    getTenderLeaderboard(10).then(setLeaderboard).catch(() => {});
  }, [isAuthenticated]);

  const currentUser = useMemo(
    () => leaderboard.find((e) => e.isCurrentUser),
    [leaderboard],
  );

  const contractorPosts = useMemo(
    () =>
      posts
        .filter((p) => p.isContractorUpdate)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        ),
    [posts],
  );

  const filteredProjects = useMemo(
    () =>
      projects.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.location.city.toLowerCase().includes(search.toLowerCase()),
      ),
    [projects, search],
  );

  const radarData = currentUser
    ? [
        { metric: "Quality", value: currentUser.qualityScore },
        { metric: "Timeliness", value: currentUser.timelinessScore },
        { metric: "Budget", value: currentUser.budgetScore },
        { metric: "Reliability", value: currentUser.reliabilityScore },
      ]
    : [];

  const barData = leaderboard.slice(0, 5).map((e, i) => ({
    name: `${e.contractorName.split(" ")[0]} (#${i + 1})`,
    score: e.promotionScore,
  }));

  const handleSubmitPost = async () => {
    if (!selectedProject) return;
    setSubmitSuccess(null);
    try {
      await addPost({
        projectId: selectedProject,
        imageUrl: `https://picsum.photos/seed/tender-${Date.now()}/960/560`,
        progress,
        materialCost,
        labourCost,
        milestoneName: milestone,
        workSummary,
        nextAction,
        blockers,
        targetDate,
      });
      setShowPostForm(false);
      setMilestone("");
      setWorkSummary("");
      setNextAction("");
      setBlockers("");
      setTargetDate("");
      setProgress(50);
      setMaterialCost(0);
      setLabourCost(0);
      setSelectedProject("");
      setSubmitSuccess("Update published successfully!");
      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch {}
  };

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
        <section className="rounded-2xl border border-border bg-gradient-to-r from-amber-50 via-white to-amber-50/30 p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <p
                  className="text-xs tracking-[0.2em] text-amber-700 uppercase"
                  style={{ fontWeight: 600 }}
                >
                  Contractor Portal
                </p>
                <h1 className="text-2xl text-foreground sm:text-3xl" style={{ fontWeight: 700 }}>
                  Tender Operations Dashboard
                </h1>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPostForm(!showPostForm)}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
              style={{ fontWeight: 600 }}
            >
              <Upload className="h-4 w-4" /> Post Update
            </button>
          </div>

          {submitSuccess && (
            <div
              className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              style={{ fontWeight: 500 }}
            >
              {submitSuccess}
            </div>
          )}
        </section>

        {/* Post Form */}
        {showPostForm && (
          <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/30 p-5 shadow-sm sm:p-6">
            <h2 className="text-lg text-foreground" style={{ fontWeight: 600 }}>
              Publish Milestone Update
            </h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <label
                    className="text-xs tracking-wider text-muted-foreground uppercase"
                    style={{ fontWeight: 600 }}
                  >
                    Project
                  </label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none"
                  >
                    <option value="">Select project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="text-xs tracking-wider text-muted-foreground uppercase"
                    style={{ fontWeight: 600 }}
                  >
                    Milestone Name
                  </label>
                  <input
                    value={milestone}
                    onChange={(e) => setMilestone(e.target.value)}
                    placeholder="e.g., Foundation Phase 2"
                    className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none"
                  />
                </div>
                <div>
                  <label
                    className="text-xs tracking-wider text-muted-foreground uppercase"
                    style={{ fontWeight: 600 }}
                  >
                    Work Summary
                  </label>
                  <textarea
                    value={workSummary}
                    onChange={(e) => setWorkSummary(e.target.value)}
                    rows={3}
                    placeholder="Describe work completed..."
                    className="mt-1 w-full resize-none rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className="text-xs tracking-wider text-muted-foreground uppercase"
                      style={{ fontWeight: 600 }}
                    >
                      Next Action
                    </label>
                    <input
                      value={nextAction}
                      onChange={(e) => setNextAction(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label
                      className="text-xs tracking-wider text-muted-foreground uppercase"
                      style={{ fontWeight: 600 }}
                    >
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label
                    className="text-xs tracking-wider text-muted-foreground uppercase"
                    style={{ fontWeight: 600 }}
                  >
                    Blockers
                  </label>
                  <textarea
                    value={blockers}
                    onChange={(e) => setBlockers(e.target.value)}
                    rows={2}
                    placeholder="Any blockers..."
                    className="mt-1 w-full resize-none rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none"
                  />
                </div>
                <div>
                  <label
                    className="text-xs tracking-wider text-muted-foreground uppercase"
                    style={{ fontWeight: 600 }}
                  >
                    Progress: {progress}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="mt-2 w-full accent-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className="text-xs tracking-wider text-muted-foreground uppercase"
                      style={{ fontWeight: 600 }}
                    >
                      Material Cost
                    </label>
                    <input
                      type="number"
                      value={materialCost}
                      onChange={(e) => setMaterialCost(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label
                      className="text-xs tracking-wider text-muted-foreground uppercase"
                      style={{ fontWeight: 600 }}
                    >
                      Labour Cost
                    </label>
                    <input
                      type="number"
                      value={labourCost}
                      onChange={(e) => setLabourCost(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSubmitPost}
                  disabled={loading || !selectedProject}
                  className="mt-2 w-full rounded-xl bg-primary px-4 py-3 text-sm text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:opacity-50"
                  style={{ fontWeight: 600 }}
                >
                  {loading ? "Publishing..." : "Publish Update"}
                </button>
              </div>
            </div>
          </section>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                <Zap className="h-5 w-5 text-indigo-700" />
              </div>
              <div>
                <h2 className="text-lg text-foreground" style={{ fontWeight: 600 }}>
                  My Performance
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your contractor metrics and scores.
                </p>
              </div>
            </div>

            {currentUser ? (
              <>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-amber-50/50 p-4 text-center">
                    <p className="text-xs text-amber-700 uppercase" style={{ fontWeight: 600 }}>
                      Rank
                    </p>
                    <p className="mt-1 text-3xl text-amber-800" style={{ fontWeight: 700 }}>
                      #{currentUser.rank}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-blue-50/50 p-4 text-center">
                    <p className="text-xs text-blue-700 uppercase" style={{ fontWeight: 600 }}>
                      Score
                    </p>
                    <p className="mt-1 text-3xl text-blue-800" style={{ fontWeight: 700 }}>
                      {currentUser.promotionScore}
                    </p>
                  </div>
                </div>

                <div className="mt-5 h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis
                        dataKey="metric"
                        tick={{ fontSize: 12, fill: "#64748b" }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                      />
                      <Radar
                        name="Score"
                        dataKey="value"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 space-y-2">
                  {[
                    { label: "Quality", value: currentUser.qualityScore, color: "bg-blue-500" },
                    { label: "Timeliness", value: currentUser.timelinessScore, color: "bg-emerald-500" },
                    { label: "Budget", value: currentUser.budgetScore, color: "bg-amber-500" },
                    { label: "Reliability", value: currentUser.reliabilityScore, color: "bg-purple-500" },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{m.label}</span>
                        <span style={{ fontWeight: 600 }}>{m.value}%</span>
                      </div>
                      <Progress
                        value={m.value}
                        className="mt-1 h-1.5"
                        indicatorClassName={m.color}
                      />
                    </div>
                  ))}
                </div>

                {currentUser.suggestedActions.length > 0 && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs text-amber-700 uppercase" style={{ fontWeight: 600 }}>
                      Suggested Actions
                    </p>
                    <ul className="mt-2 space-y-1">
                      {currentUser.suggestedActions.map((a, i) => (
                        <li key={i} className="text-sm text-amber-800">
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-5 rounded-xl border border-border bg-slate-50 p-6 text-center text-sm text-muted-foreground">
                Performance data loading...
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <Award className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <h2 className="text-lg text-foreground" style={{ fontWeight: 600 }}>
                  Contractor Leaderboard
                </h2>
                <p className="text-sm text-muted-foreground">
                  Top-rated contractors by promotion score.
                </p>
              </div>
            </div>

            <div className="mt-5 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="score" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-5 space-y-2">
              {leaderboard.map((entry) => (
                <div
                  key={entry.contractorUserId}
                  className={`flex items-center gap-4 rounded-xl border p-3 transition ${entry.isCurrentUser ? "border-blue-200 bg-blue-50/50" : "border-border bg-slate-50/30 hover:bg-white"}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs text-white ${entry.rank <= 3 ? "bg-amber-500" : "bg-slate-400"}`}
                    style={{ fontWeight: 700 }}
                  >
                    {entry.rank}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate" style={{ fontWeight: 600 }}>
                      {entry.contractorName}{" "}
                      {entry.isCurrentUser && (
                        <span className="text-xs text-blue-600">(You)</span>
                      )}
                    </p>
                    <div className="mt-0.5 flex gap-2 text-[11px] text-muted-foreground">
                      <span>{entry.contractorUpdateCount} updates</span>
                      <span>{entry.resolvedUpdateCount} resolved</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg text-primary" style={{ fontWeight: 700 }}>
                      {entry.promotionScore}
                    </p>
                    {entry.featuredActive && (
                      <span
                        className="flex items-center gap-1 text-[10px] text-amber-600"
                        style={{ fontWeight: 600 }}
                      >
                        <Star className="h-3 w-3" /> Featured
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg text-foreground" style={{ fontWeight: 600 }}>
              Assigned Projects
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-64 rounded-xl border border-border bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none ring-primary/30 focus:border-primary focus:ring-2"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.slice(0, 9).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/project/${p.id}`)}
                className="flex items-start gap-3 rounded-xl border border-border bg-slate-50/50 p-4 text-left transition hover:bg-white hover:shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate" style={{ fontWeight: 600 }}>
                    {p.name}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {p.location.city}
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span style={{ fontWeight: 600 }}>{p.progress}%</span>
                    </div>
                    <Progress value={p.progress} className="mt-1 h-1.5" />
                  </div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="text-lg text-foreground" style={{ fontWeight: 600 }}>
            Recent Contractor Updates
          </h2>
          <div className="mt-4 space-y-3">
            {contractorPosts.slice(0, 5).map((post) => (
              <div
                key={post.id}
                className="flex items-start gap-4 rounded-xl border border-border bg-slate-50/30 p-4"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs text-white"
                  style={{ fontWeight: 700 }}
                >
                  {post.authorName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-foreground truncate" style={{ fontWeight: 600 }}>
                      {post.authorName}
                    </p>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {new Date(post.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  {post.milestoneName && (
                    <p className="mt-0.5 text-xs text-primary" style={{ fontWeight: 600 }}>
                      {post.milestoneName}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {post.caption}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700"
                      style={{ fontWeight: 600 }}
                    >
                      Progress: {post.progress}%
                    </span>
                    <span
                      className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700"
                      style={{ fontWeight: 600 }}
                    >
                      {post.complaintStatus}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {contractorPosts.length === 0 && (
              <div className="rounded-xl border border-border bg-slate-50 p-6 text-center text-sm text-muted-foreground">
                No contractor updates yet.
              </div>
            )}
          </div>
        </section>

        {error && (
          <div
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            style={{ fontWeight: 500 }}
          >
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
