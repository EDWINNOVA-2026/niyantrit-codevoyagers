import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import ImageWithFallback from "../components/ImageWithFallback";
import { MapView } from "../components/MapView";
import { Progress } from "../components/ui/progress";
import {
  Post,
  Project,
  ProjectStatus,
  RiskLevel,
  useAppContext,
} from "../context/AppContext";
import {
  ArrowLeft,
  Building2,
  MapPin,
  AlertTriangle,
  Mic,
  Send,
  Clock,
  BadgeCheck,
  ThumbsUp,
} from "lucide-react";

export default function ProjectDetail() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const {
    isAuthenticated,
    userRole,
    projects,
    posts,
    submitTextIssue,
    submitVoiceIssue,
    loading,
    error,
    clearError,
  } = useAppContext();

  const project = useMemo<Project | undefined>(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId],
  );

  const projectPosts = useMemo<Post[]>(
    () =>
      posts
        .filter((p) => p.projectId === projectId)
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        ),
    [posts, projectId],
  );

  const [mode, setMode] = useState<"text" | "voice">("text");
  const [severity, setSeverity] = useState(7);
  const [description, setDescription] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioLabel, setAudioLabel] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [success, setSuccess] = useState<string | null>(null);

  const backPath = userRole === "tender" ? "/tender" : "/dashboard";

  const handleSubmit = async () => {
    if (!project) return;
    clearError();
    setSuccess(null);
    setRecordError(null);

    try {
      if (mode === "voice") {
        if (!audioBlob) return;
        await submitVoiceIssue({
          projectId: project.id,
          severity,
          audioBlob,
        });
        setAudioBlob(null);
        setAudioLabel(null);
        setSuccess("Voice issue submitted.");
      } else {
        if (!description.trim()) return;
        await submitTextIssue({
          projectId: project.id,
          description: description.trim(),
          severity,
        });
        setDescription("");
        setSuccess("Issue submitted.");
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch {}
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    try {
      if (recorder.state !== "inactive") recorder.stop();
    } catch {}
    setRecording(false);
  };

  const startRecording = async () => {
    setRecordError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordError("Audio recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeTypeCandidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ];
      const mimeType = mimeTypeCandidates.find(
        (candidate) =>
          typeof MediaRecorder !== "undefined" &&
          MediaRecorder.isTypeSupported(candidate),
      );

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        setAudioBlob(blob);
        setAudioLabel("voice_recording.webm");
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        stopStream();
      };

      recorder.start();
      setRecording(true);
      setAudioBlob(null);
      setAudioLabel(null);
    } catch {
      stopStream();
      setRecordError("Microphone permission was denied or unavailable.");
    }
  };

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder) {
        try {
          if (recorder.state !== "inactive") recorder.stop();
        } catch {}
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

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

  if (!project) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          <section className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">Project not found.</p>
            <button
              type="button"
              onClick={() => navigate(backPath)}
              className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm text-primary-foreground"
              style={{ fontWeight: 600 }}
            >
              Back to dashboard
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
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-foreground shadow-sm transition hover:bg-slate-50"
            style={{ fontWeight: 600 }}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs ${statusPill(project.status)}`}
              style={{ fontWeight: 600 }}
            >
              {project.status}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs ${riskPill(project.riskLevel)}`}
              style={{ fontWeight: 600 }}
            >
              Risk: {project.riskLevel.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Header */}
        <section className="mt-4 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p
                className="text-xs tracking-[0.2em] text-primary uppercase"
                style={{ fontWeight: 600 }}
              >
                Project Detail
              </p>
              <h1
                className="mt-2 text-2xl text-foreground sm:text-3xl"
                style={{ fontWeight: 700 }}
              >
                {project.name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> {project.department}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {project.location.city}, {project.location.state}
                </span>
              </div>
              <p className="mt-4 max-w-3xl text-sm text-muted-foreground leading-relaxed">
                {project.description}
              </p>
            </div>

            <div className="w-full max-w-sm rounded-2xl border border-border bg-slate-50/60 p-4">
              <div className="flex items-center justify-between">
                <p
                  className="text-xs tracking-wider text-muted-foreground uppercase"
                  style={{ fontWeight: 600 }}
                >
                  Progress
                </p>
                <p className="text-sm text-foreground" style={{ fontWeight: 700 }}>
                  {project.progress}%
                </p>
              </div>
              <Progress value={project.progress} className="mt-2 h-2" />

              <div className="mt-4 grid grid-cols-3 gap-3">
                <Stat label="Budget" value={formatCurrency(project.budget)} />
                <Stat label="Labour" value={formatCurrency(project.labourCost)} />
                <Stat label="Material" value={formatCurrency(project.materialCost)} />
              </div>

              <div className="mt-4 rounded-xl border border-border bg-white p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Risk score</span>
                  <span className="text-foreground" style={{ fontWeight: 700 }}>
                    {project.riskScore ?? "—"}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Risk level is computed by the engine using budget, progress, complaint density, and field signals.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p
                className="text-xs tracking-[0.2em] text-primary uppercase"
                style={{ fontWeight: 600 }}
              >
                Project Location
              </p>
              <h2 className="mt-2 text-lg text-foreground" style={{ fontWeight: 700 }}>
                On-ground View
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {project.location.city}, {project.location.state}
            </p>
          </div>

          <div className="mt-4 h-[280px] overflow-hidden rounded-xl border border-border bg-white">
            <MapView
              projects={[project]}
              userLocation={null}
              onProjectClick={(id) => navigate(`/project/${id}`)}
            />
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]">
          {/* Feed */}
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg text-foreground" style={{ fontWeight: 600 }}>
                  Activity Feed
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Citizen complaints and contractor updates for this project.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {projectPosts.length} updates
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {projectPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
              {projectPosts.length === 0 && (
                <div className="rounded-xl border border-border bg-slate-50 p-6 text-center text-sm text-muted-foreground">
                  No updates yet.
                </div>
              )}
            </div>
          </section>

          {/* Issue submit */}
          <aside className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <h2 className="text-lg text-foreground" style={{ fontWeight: 600 }}>
                  Report an Issue
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Submit a text note or upload a voice clip.
                </p>
              </div>
            </div>

            <div className="mt-5 flex rounded-xl border border-border bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setMode("text")}
                className={`flex-1 rounded-lg px-3 py-2 text-xs transition ${mode === "text" ? "bg-white shadow-sm" : "text-muted-foreground"}`}
                style={{ fontWeight: 600 }}
              >
                Text
              </button>
              <button
                type="button"
                onClick={() => setMode("voice")}
                className={`flex-1 rounded-lg px-3 py-2 text-xs transition ${mode === "voice" ? "bg-white shadow-sm" : "text-muted-foreground"}`}
                style={{ fontWeight: 600 }}
              >
                Voice
              </button>
            </div>

            <div className="mt-4">
              <label
                className="text-xs tracking-wider text-muted-foreground uppercase"
                style={{ fontWeight: 600 }}
              >
                Severity: {severity}/10
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="mt-2 w-full accent-primary"
              />
            </div>

            {mode === "text" ? (
              <div className="mt-4">
                <label
                  className="text-xs tracking-wider text-muted-foreground uppercase"
                  style={{ fontWeight: 600 }}
                >
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe the issue you observed..."
                  className="mt-1 w-full resize-none rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none"
                />
              </div>
            ) : (
              <div className="mt-4">
                <label
                  className="text-xs tracking-wider text-muted-foreground uppercase"
                  style={{ fontWeight: 600 }}
                >
                  Voice Clip
                </label>
                <div className="mt-1 rounded-xl border border-border bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mic className="h-4 w-4" />
                      <span>
                        {recording
                          ? "Recording..."
                          : audioLabel
                            ? audioLabel
                            : "Record or upload audio evidence"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={recording ? stopRecording : startRecording}
                        className={`rounded-lg border px-3 py-2 text-xs transition ${
                          recording
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-border bg-slate-50 text-foreground hover:bg-slate-100"
                        }`}
                        style={{ fontWeight: 700 }}
                      >
                        {recording ? "Stop" : "Record"}
                      </button>

                      <input
                        type="file"
                        accept="audio/*"
                        disabled={recording}
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setAudioBlob(file);
                          setAudioLabel(file ? file.name : null);
                          setRecordError(null);
                        }}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground">
                    Tip: you can record in-browser or upload audio.
                  </p>
                </div>

                {recordError && (
                  <div
                    className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    style={{ fontWeight: 500 }}
                  >
                    {recordError}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                loading ||
                (mode === "text" && !description.trim()) ||
                (mode === "voice" && (!audioBlob || recording))
              }
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:opacity-50"
              style={{ fontWeight: 600 }}
            >
              {mode === "voice" ? <Mic className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {loading ? "Submitting..." : "Submit"}
            </button>

            {success && (
              <div
                className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                style={{ fontWeight: 500 }}
              >
                {success}
              </div>
            )}

            {error && (
              <div
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                style={{ fontWeight: 500 }}
              >
                {error}
              </div>
            )}

            <div className="mt-5 rounded-xl border border-border bg-slate-50 p-4">
              <p
                className="text-xs tracking-[0.15em] text-muted-foreground uppercase"
                style={{ fontWeight: 600 }}
              >
                Evidence Chain
              </p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                In the full system, media hashes are logged for tamper-evidence and
                location metadata is attached for investigation.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const { supportComplaint, unsupportComplaint } = useAppContext();
  const isUpdate = post.isContractorUpdate;
  const [supporting, setSupporting] = useState(false);

  const toggleSupport = async () => {
    if (supporting) return;
    setSupporting(true);
    try {
      if (post.supportedByMe) {
        await unsupportComplaint(post.id);
      } else {
        await supportComplaint(post.id);
      }
    } catch {
    } finally {
      setSupporting(false);
    }
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-slate-50/30">
      <div className="grid gap-4 p-4 sm:grid-cols-[180px_1fr] sm:p-5">
        <div className="relative overflow-hidden rounded-xl border border-border bg-white">
          <ImageWithFallback
            src={post.imageUrl}
            alt={post.caption}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] ${isUpdate ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
                style={{ fontWeight: 700 }}
              >
                {isUpdate ? "Contractor Update" : "Citizen Complaint"}
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] ${statusChip(post.complaintStatus)}`}
                style={{ fontWeight: 700 }}
              >
                {post.complaintStatus}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSupport}
                disabled={supporting}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition disabled:opacity-60 ${
                  post.supportedByMe
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-white text-foreground hover:bg-slate-50"
                }`}
                style={{ fontWeight: 700 }}
                aria-label={
                  post.supportedByMe
                    ? `Remove support (${post.supportCount})`
                    : `Support issue (${post.supportCount})`
                }
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>{post.supportCount}</span>
              </button>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{new Date(post.createdAt).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          <p className="mt-2 text-sm text-foreground" style={{ fontWeight: 600 }}>
            {post.authorName}
          </p>

          {post.milestoneName && (
            <p className="mt-1 text-xs text-primary" style={{ fontWeight: 600 }}>
              {post.milestoneName}
            </p>
          )}

          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {post.caption}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Chip label={`Severity: ${post.severity}/10`} tone={severityTone(post.severity)} />
            {post.evidenceMediaType && (
              <Chip
                label={`Evidence: ${post.evidenceMediaType}`}
                tone="slate"
              />
            )}
            {post.evidenceLocationLabel && (
              <Chip
                label={post.evidenceLocationLabel}
                tone="slate"
                icon={MapPin}
              />
            )}
            {isUpdate && (
              <Chip
                label={`Progress: ${post.progress}%`}
                tone="blue"
                icon={BadgeCheck}
              />
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-white p-3">
              <p
                className="text-[10px] tracking-wider text-muted-foreground uppercase"
                style={{ fontWeight: 600 }}
              >
                Evidence hash
              </p>
              <p
                className="mt-1 text-xs text-foreground break-all"
                style={{ fontWeight: 600 }}
              >
                {post.evidenceTamperHash}
              </p>
            </div>
            <DetailBlock label="Media metadata" value={formatMediaMeta(post)} />
          </div>

          {(post.workSummary || post.nextAction || post.blockers) && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {post.workSummary && (
                <DetailBlock label="Work summary" value={post.workSummary} />
              )}
              {post.nextAction && (
                <DetailBlock label="Next action" value={post.nextAction} />
              )}
              {post.blockers && (
                <DetailBlock label="Blockers" value={post.blockers} />
              )}
              {post.targetDate && (
                <DetailBlock label="Target date" value={post.targetDate} />
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function formatMediaMeta(post: Post) {
  const parts: string[] = [];
  if (post.evidenceMediaFilename) parts.push(post.evidenceMediaFilename);
  if (post.evidenceMediaMimeType) parts.push(post.evidenceMediaMimeType);
  if (post.evidenceMediaSizeBytes !== null && post.evidenceMediaSizeBytes !== undefined) {
    parts.push(formatBytes(post.evidenceMediaSizeBytes));
  }

  if (parts.length) return parts.join(" · ");
  return post.evidenceMediaType || "text";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

function Chip({
  label,
  tone,
  icon: Icon,
}: {
  label: string;
  tone: "blue" | "amber" | "red" | "emerald" | "slate";
  icon?: React.ElementType;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px]";

  const tones: Record<typeof tone, string> = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    slate: "border-border bg-white text-muted-foreground",
  };

  return (
    <span className={`${base} ${tones[tone]}`} style={{ fontWeight: 600 }}>
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <p
        className="text-[10px] tracking-wider text-muted-foreground uppercase"
        style={{ fontWeight: 600 }}
      >
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground" style={{ fontWeight: 600 }}>
        {value}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2">
      <p
        className="text-[10px] tracking-wider text-muted-foreground uppercase"
        style={{ fontWeight: 600 }}
      >
        {label}
      </p>
      <p className="mt-0.5 text-sm text-foreground" style={{ fontWeight: 700 }}>
        {value}
      </p>
    </div>
  );
}

function formatCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function statusPill(status: ProjectStatus) {
  switch (status) {
    case "Completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Ongoing":
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function riskPill(level: RiskLevel) {
  switch (level) {
    case "CRITICAL":
      return "border-red-200 bg-red-50 text-red-700";
    case "VERY_HIGH":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "HIGH":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "MODERATE":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

function statusChip(status: string) {
  if (status === "Resolved" || status === "Closed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "In Review") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function severityTone(severity: number): "blue" | "amber" | "red" | "emerald" {
  if (severity >= 8) return "red";
  if (severity >= 6) return "amber";
  if (severity >= 4) return "blue";
  return "emerald";
}
