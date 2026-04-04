import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Gauge,
  Landmark,
  ListFilter,
  TrendingUp,
} from "lucide-react";
import ImageWithFallback from "../components/ImageWithFallback";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import { Post, useAppContext } from "../context/AppContext";
import { Progress } from "../components/ui/progress";
import { Slider } from "../components/ui/slider";

interface EnrichedPost {
  post: Post;
  projectName: string;
}

type ReporterFilter = "all" | "contractor" | "citizen";

interface FormErrors {
  projectId?: string;
  milestoneName?: string;
  workSummary?: string;
  nextAction?: string;
  plannedDate?: string;
  costs?: string;
}

function getDefaultPlannedDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateLike: string | null) {
  if (!dateLike) return "Not set";
  const parsed = new Date(dateLike);
  if (Number.isNaN(parsed.getTime())) return dateLike;
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateLike: string) {
  const parsed = new Date(dateLike);
  if (Number.isNaN(parsed.getTime())) return dateLike;
  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function toMidnight(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getComplaintStatusStyles(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("resolved") || normalized.includes("closed")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized.includes("progress") || normalized.includes("investigat")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function trimText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function TenderDashboard() {
  const { projects, posts, addPost, loading, error, clearError } = useAppContext();

  const [projectId, setProjectId] = useState("");
  const [milestoneName, setMilestoneName] = useState("");
  const [workSummary, setWorkSummary] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [blockers, setBlockers] = useState("");
  const [plannedDate, setPlannedDate] = useState(getDefaultPlannedDate);
  const [progressValue, setProgressValue] = useState<number[]>([40]);
  const [materialCost, setMaterialCost] = useState("0");
  const [labourCost, setLabourCost] = useState("0");
  const [imagePreview, setImagePreview] = useState("https://picsum.photos/seed/tender-default/960/560");
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [filterProjectId, setFilterProjectId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "milestone" | "issue">("all");
  const [reporterFilter, setReporterFilter] = useState<ReporterFilter>("contractor");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!projects.length) {
      setProjectId("");
      return;
    }

    if (!projectId || !projects.some((project) => project.id === projectId)) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  const enrichedPosts = useMemo<EnrichedPost[]>(
    () =>
      posts
        .filter((post) => projectMap.has(post.projectId))
        .map((post) => ({
          post,
          projectName: projectMap.get(post.projectId)?.name || "Unknown Project",
        })),
    [posts, projectMap]
  );

  const availableStatuses = useMemo(
    () => Array.from(new Set(enrichedPosts.map((item) => item.post.complaintStatus))).sort(),
    [enrichedPosts]
  );

  const selectedProject = projectMap.get(projectId) || null;

  const selectedProjectUpdates = useMemo(
    () => enrichedPosts.filter((item) => item.post.projectId === projectId),
    [enrichedPosts, projectId]
  );

  const kpiStats = useMemo(() => {
    const activeProjects = projects.filter((project) => project.status === "Ongoing").length;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weeklyMilestones = enrichedPosts.filter(
      (item) =>
        item.post.isContractorUpdate &&
        item.post.authorRole === "tender" &&
        Number.isFinite(new Date(item.post.createdAt).getTime()) &&
        new Date(item.post.createdAt).getTime() >= sevenDaysAgo
    ).length;

    const openIssues = enrichedPosts.filter((item) => item.post.complaintStatus !== "Resolved").length;
    const progressSamples = enrichedPosts
      .filter((item) => item.post.isContractorUpdate)
      .map((item) => item.post.progress);
    const averageProgress =
      progressSamples.length > 0
        ? Math.round(progressSamples.reduce((sum, value) => sum + value, 0) / progressSamples.length)
        : 0;

    return {
      activeProjects,
      weeklyMilestones,
      openIssues,
      averageProgress,
    };
  }, [projects, enrichedPosts]);

  const projectHealth = useMemo(() => {
    if (!selectedProject) return null;

    const reportedSpend = selectedProjectUpdates.reduce(
      (sum, item) => sum + item.post.materialCost + item.post.labourCost,
      0
    );
    const openIssues = selectedProjectUpdates.filter((item) => item.post.complaintStatus !== "Resolved").length;
    const highPriorityOpen = selectedProjectUpdates.filter(
      (item) => item.post.complaintStatus !== "Resolved" && item.post.priority >= 7
    ).length;
    const latestMilestone = selectedProjectUpdates.find((item) => item.post.isContractorUpdate);
    const latestProgress = latestMilestone?.post.progress ?? selectedProject.progress;
    const budgetUsagePercentRaw =
      selectedProject.budget > 0 ? (reportedSpend / selectedProject.budget) * 100 : 0;
    const budgetUsagePercent = Math.max(0, Math.round(budgetUsagePercentRaw));
    const budgetMeterValue = Math.min(100, budgetUsagePercent);

    let healthLabel = "On Track";
    let healthClasses = "border-emerald-200 bg-emerald-50 text-emerald-700";

    if (highPriorityOpen >= 2 || budgetUsagePercent > 95) {
      healthLabel = "Critical";
      healthClasses = "border-rose-200 bg-rose-50 text-rose-700";
    } else if (openIssues >= 3 || budgetUsagePercent > 80) {
      healthLabel = "Needs Attention";
      healthClasses = "border-amber-200 bg-amber-50 text-amber-700";
    }

    return {
      reportedSpend,
      openIssues,
      highPriorityOpen,
      latestProgress,
      budgetUsagePercent,
      budgetMeterValue,
      latestMilestone,
      healthLabel,
      healthClasses,
    };
  }, [selectedProject, selectedProjectUpdates]);

  const filteredRecentPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return enrichedPosts
      .filter((item) => {
        if (filterProjectId !== "all" && item.post.projectId !== filterProjectId) {
          return false;
        }

        if (statusFilter !== "all" && item.post.complaintStatus !== statusFilter) {
          return false;
        }

        if (typeFilter === "milestone" && !item.post.isContractorUpdate) {
          return false;
        }

        if (typeFilter === "issue" && item.post.isContractorUpdate) {
          return false;
        }

        if (reporterFilter === "contractor" && item.post.authorRole !== "tender") {
          return false;
        }

        if (reporterFilter === "citizen" && item.post.authorRole !== "user") {
          return false;
        }

        if (!query) {
          return true;
        }

        const searchableText = [
          item.projectName,
          item.post.caption,
          item.post.milestoneName || "",
          item.post.workSummary || "",
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      })
      .slice(0, 12);
  }, [enrichedPosts, filterProjectId, statusFilter, typeFilter, reporterFilter, searchQuery]);

  const onFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    if (!projectId) {
      nextErrors.projectId = "Select a project before publishing an update.";
    }

    if (milestoneName.trim().length < 4) {
      nextErrors.milestoneName = "Milestone name must be at least 4 characters.";
    }

    if (workSummary.trim().length < 15) {
      nextErrors.workSummary = "Work summary should explain what happened in at least 15 characters.";
    }

    if (nextAction.trim().length < 8) {
      nextErrors.nextAction = "Add a clear next action for the field team.";
    }

    if (!plannedDate) {
      nextErrors.plannedDate = "Provide the target completion date for this milestone.";
    } else {
      const today = toMidnight(new Date());
      const target = toMidnight(new Date(`${plannedDate}T00:00:00`));
      if (target < today) {
        nextErrors.plannedDate = "Target date cannot be in the past.";
      }
    }

    const parsedMaterial = Number(materialCost);
    const parsedLabour = Number(labourCost);
    if (!Number.isFinite(parsedMaterial) || parsedMaterial < 0 || !Number.isFinite(parsedLabour) || parsedLabour < 0) {
      nextErrors.costs = "Material and labour values must be valid non-negative numbers.";
    } else if (parsedMaterial + parsedLabour <= 0) {
      nextErrors.costs = "Enter at least one non-zero cost value to keep budget tracking meaningful.";
    }

    return nextErrors;
  };

  const resetForm = () => {
    setMilestoneName("");
    setWorkSummary("");
    setNextAction("");
    setBlockers("");
    setPlannedDate(getDefaultPlannedDate());
    setProgressValue([40]);
    setMaterialCost("0");
    setLabourCost("0");
    setFormErrors({});
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationErrors = validateForm();
    setFormErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    clearError();

    try {
      await addPost({
        projectId,
        imageUrl: imagePreview,
        progress: progressValue[0] || 0,
        materialCost: Number(materialCost) || 0,
        labourCost: Number(labourCost) || 0,
        milestoneName: milestoneName.trim(),
        workSummary: workSummary.trim(),
        nextAction: nextAction.trim(),
        blockers: blockers.trim(),
        targetDate: plannedDate,
      });
    } catch {
      return;
    }

    resetForm();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-border bg-gradient-to-br from-emerald-50 via-cyan-50 to-background p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Contractor Dashboard v1</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">Milestone Delivery Console</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Track execution quality using milestone-driven updates, structured budget capture, and real-time activity
            filters for faster site oversight.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={<Landmark className="h-4 w-4" />}
              label="Active Projects"
              value={String(kpiStats.activeProjects)}
              hint="Projects currently in execution"
            />
            <KpiCard
              icon={<CalendarClock className="h-4 w-4" />}
              label="Contractor Updates (7 Days)"
              value={String(kpiStats.weeklyMilestones)}
              hint="Structured contractor updates this week"
            />
            <KpiCard
              icon={<Gauge className="h-4 w-4" />}
              label="Average Reported Progress"
              value={`${kpiStats.averageProgress}%`}
              hint="Across all structured updates"
            />
            <KpiCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Open Issues"
              value={String(kpiStats.openIssues)}
              hint="Needs coordination with field teams"
            />
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Publish Milestone Update</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Structured entries improve audit trails, escalation quality, and budget tracking.
            </p>

            <div className="mt-4 grid gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Project
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <select
                    value={projectId}
                    onChange={(event) => {
                      setProjectId(event.target.value);
                      setFormErrors((current) => ({ ...current, projectId: undefined }));
                    }}
                    className="min-w-[220px] flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.location.city})
                      </option>
                    ))}
                  </select>
                  {selectedProject ? <StatusBadge status={selectedProject.status} /> : null}
                </div>
                <FieldError message={formErrors.projectId} />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Milestone Name
                </label>
                <input
                  type="text"
                  value={milestoneName}
                  onChange={(event) => {
                    setMilestoneName(event.target.value);
                    setFormErrors((current) => ({ ...current, milestoneName: undefined }));
                  }}
                  placeholder="Example: Drainage trenching package A"
                  className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
                />
                <FieldError message={formErrors.milestoneName} />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Work Summary
                </label>
                <textarea
                  value={workSummary}
                  onChange={(event) => {
                    setWorkSummary(event.target.value);
                    setFormErrors((current) => ({ ...current, workSummary: undefined }));
                  }}
                  rows={3}
                  placeholder="Describe completed work and site conditions"
                  className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
                />
                <FieldError message={formErrors.workSummary} />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Next Action
                </label>
                <input
                  type="text"
                  value={nextAction}
                  onChange={(event) => {
                    setNextAction(event.target.value);
                    setFormErrors((current) => ({ ...current, nextAction: undefined }));
                  }}
                  placeholder="What will be completed in the next shift?"
                  className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
                />
                <FieldError message={formErrors.nextAction} />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Blockers (Optional)
                </label>
                <textarea
                  value={blockers}
                  onChange={(event) => setBlockers(event.target.value)}
                  rows={2}
                  placeholder="Any approvals, utilities, or logistics blocking progress"
                  className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Image Upload
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onFileSelected}
                  className="mt-2 block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
                <ImageWithFallback
                  src={imagePreview}
                  alt="Preview"
                  className="mt-3 h-56 w-full rounded-xl object-cover"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Target Date
                </label>
                <input
                  type="date"
                  value={plannedDate}
                  onChange={(event) => {
                    setPlannedDate(event.target.value);
                    setFormErrors((current) => ({ ...current, plannedDate: undefined }));
                  }}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
                <FieldError message={formErrors.plannedDate} />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Progress: {progressValue[0]}%
                </label>
                <Slider value={progressValue} onValueChange={setProgressValue} min={0} max={100} step={1} className="mt-3" />
                <Progress value={progressValue[0]} className="mt-3" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Material Cost (INR)
                  </label>
                  <input
                    type="number"
                    value={materialCost}
                    onChange={(event) => setMaterialCost(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                    min={0}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Labour Cost (INR)
                  </label>
                  <input
                    type="number"
                    value={labourCost}
                    onChange={(event) => setLabourCost(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                    min={0}
                  />
                </div>
              </div>
              <FieldError message={formErrors.costs} />

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                {loading ? "Publishing..." : "Publish Update"}
              </button>
            </div>

            {error ? <p className="mt-4 text-sm font-medium text-destructive">{error}</p> : null}
          </form>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Project Health Snapshot</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Live signal for the selected project based on milestones, spend, and escalations.
            </p>

            {selectedProject && projectHealth ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-border bg-secondary/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-foreground">{selectedProject.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedProject.location.city}, {selectedProject.location.state}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${projectHealth.healthClasses}`}
                    >
                      {projectHealth.healthLabel}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>Budget Usage</span>
                      <span>{projectHealth.budgetUsagePercent}%</span>
                    </div>
                    <Progress value={projectHealth.budgetMeterValue} />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <HealthStat label="Reported Spend" value={formatCurrency(projectHealth.reportedSpend)} />
                    <HealthStat label="Project Budget" value={formatCurrency(selectedProject.budget)} />
                    <HealthStat label="Latest Reported Progress" value={`${projectHealth.latestProgress}%`} />
                    <HealthStat label="Open Issues" value={String(projectHealth.openIssues)} />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Latest Milestone Intelligence
                  </p>
                  {projectHealth.latestMilestone ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-sm font-semibold text-foreground">
                        {projectHealth.latestMilestone.post.milestoneName || "Milestone update posted"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {trimText(
                          projectHealth.latestMilestone.post.workSummary ||
                            projectHealth.latestMilestone.post.caption,
                          170
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Target Date: {formatDate(projectHealth.latestMilestone.post.targetDate)}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No structured milestone posts yet for this project.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Select a project to review health metrics.</p>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Recent Updates</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Filter by project, status, and update type to isolate critical field activity.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <ListFilter className="h-3.5 w-3.5" />
              {filteredRecentPosts.length} shown
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <select
              value={filterProjectId}
              onChange={(event) => setFilterProjectId(event.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="all">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="all">All statuses</option>
              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as "all" | "milestone" | "issue")}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="all">All activity</option>
              <option value="milestone">Milestone updates</option>
              <option value="issue">Issue escalations</option>
            </select>

            <select
              value={reporterFilter}
              onChange={(event) => setReporterFilter(event.target.value as ReporterFilter)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="contractor">Contractor only</option>
              <option value="citizen">Citizen only</option>
              <option value="all">All reporters</option>
            </select>

            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search milestone or project"
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div className="mt-5 space-y-3">
            {filteredRecentPosts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-background/70 p-5 text-sm text-muted-foreground">
                No updates match the active filters.
              </div>
            ) : (
              filteredRecentPosts.map((item) => (
                <article key={item.post.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {item.post.milestoneName || trimText(item.post.caption, 90)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.projectName} | {formatDateTime(item.post.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${getComplaintStatusStyles(item.post.complaintStatus)}`}
                      >
                        {item.post.complaintStatus}
                      </span>
                      <span className="inline-flex rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        {item.post.isContractorUpdate ? "Milestone" : "Issue"}
                      </span>
                      <span className="inline-flex rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        {item.post.authorRole === "tender" ? "Contractor" : "Citizen"}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground">
                    {trimText(item.post.workSummary || item.post.caption, 200)}
                  </p>

                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                    <MetricChip
                      icon={<TrendingUp className="h-3.5 w-3.5" />}
                      label="Progress"
                      value={`${item.post.progress}%`}
                    />
                    <MetricChip
                      icon={<Landmark className="h-3.5 w-3.5" />}
                      label="Spend"
                      value={formatCurrency(item.post.materialCost + item.post.labourCost)}
                    />
                    <MetricChip
                      icon={<CalendarClock className="h-3.5 w-3.5" />}
                      label="Target"
                      value={formatDate(item.post.targetDate)}
                    />
                    <MetricChip
                      icon={<AlertTriangle className="h-3.5 w-3.5" />}
                      label="Priority/Severity"
                      value={`${item.post.priority}/${item.post.severity}`}
                    />
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/90 px-4 py-3">
      <div className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-secondary text-primary">
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function HealthStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function MetricChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/70 px-2.5 py-2">
      <span className="text-primary">{icon}</span>
      <span>
        <span className="font-semibold text-foreground">{label}:</span> {value}
      </span>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-destructive">
      <AlertTriangle className="h-3 w-3" />
      {message}
    </p>
  );
}

export default TenderDashboard;
