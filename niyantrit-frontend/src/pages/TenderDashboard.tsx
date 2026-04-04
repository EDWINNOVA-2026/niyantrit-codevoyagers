import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import ImageWithFallback from "../components/ImageWithFallback";
import Navbar from "../components/Navbar";
import { useAppContext } from "../context/AppContext";
import { Progress } from "../components/ui/progress";
import { Slider } from "../components/ui/slider";

function TenderDashboard() {
  const { projects, posts, addPost, loading, error, clearError } = useAppContext();

  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [caption, setCaption] = useState("");
  const [progressValue, setProgressValue] = useState<number[]>([40]);
  const [materialCost, setMaterialCost] = useState("0");
  const [labourCost, setLabourCost] = useState("0");
  const [imagePreview, setImagePreview] = useState("https://picsum.photos/seed/tender-default/960/560");

  useEffect(() => {
    if (!projectId && projects[0]) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  const recentPosts = useMemo(
    () =>
      posts
        .filter((post) => projects.some((project) => project.id === post.projectId))
        .slice(0, 5),
    [posts, projects]
  );

  const engagementStats = useMemo(() => {
    const unresolved = posts.filter((post) => post.complaintStatus !== "Resolved").length;
    const highPriority = posts.filter((post) => post.priority >= 7).length;
    return {
      totalPosts: posts.length,
      unresolved,
      highPriority,
    };
  }, [posts]);

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

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectId || !caption.trim()) return;

    clearError();

    try {
      await addPost({
        projectId,
        caption,
        imageUrl: imagePreview,
        progress: progressValue[0] || 0,
        materialCost: Number(materialCost) || 0,
        labourCost: Number(labourCost) || 0,
      });
    } catch {
      return;
    }

    setCaption("");
    setProgressValue([40]);
    setMaterialCost("0");
    setLabourCost("0");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Contractor Dashboard</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">Tender Field Update Console</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload project visuals, progress percentages, and cost movement snapshots.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <MiniStat label="Posts" value={engagementStats.totalPosts} />
            <MiniStat label="Open Complaints" value={engagementStats.unresolved} />
            <MiniStat label="High Priority" value={engagementStats.highPriority} />
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Upload New Progress Post</h2>

            <div className="mt-4 grid gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Project
                </label>
                <select
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({project.location.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Caption
                </label>
                <textarea
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  rows={3}
                  placeholder="Describe today's work progress"
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
                  />
                </div>
              </div>

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
            <h2 className="text-lg font-semibold text-foreground">Recent Posts</h2>
            <p className="mt-1 text-sm text-muted-foreground">Most recent updates across active project feeds</p>

            <div className="mt-4 space-y-3">
              {recentPosts.map((post) => (
                <article key={post.id} className="rounded-xl border border-border bg-background p-3">
                  <p className="text-sm font-semibold text-foreground">{post.caption}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Severity {post.severity} | Priority {post.priority} | Status {post.complaintStatus}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-secondary px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export default TenderDashboard;
