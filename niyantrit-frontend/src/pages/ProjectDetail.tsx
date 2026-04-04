import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ImageWithFallback from "../components/ImageWithFallback";
import Navbar from "../components/Navbar";
import { useAppContext, type Post } from "../context/AppContext";
import { Progress } from "../components/ui/progress";

type IssueMode = "text" | "voice";

function ProjectDetail() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const {
    projects,
    posts,
    submitTextIssue,
    submitVoiceIssue,
    loading,
    clearError,
  } = useAppContext();

  const [issueMode, setIssueMode] = useState<IssueMode>("text");
  const [severity, setSeverity] = useState(5);
  const [textIssue, setTextIssue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitFailure, setSubmitFailure] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const project = useMemo(
    () => projects.find((item) => item.id === projectId),
    [projects, projectId]
  );

  const feed = useMemo(
    () =>
      posts
        .filter((post) => post.projectId === projectId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [posts, projectId]
  );

  const clearRecordedAudio = () => {
    setRecordedAudioBlob(null);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, [recordedAudioUrl]);

  const startVoiceRecording = async () => {
    if (isRecording) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setSubmitFailure("Microphone access is not available in this browser.");
      return;
    }

    clearError();
    setSubmitSuccess(null);
    setSubmitFailure(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const preferredTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const supportedType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = supportedType
        ? new MediaRecorder(stream, { mimeType: supportedType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (audioBlob.size > 0) {
          clearRecordedAudio();
          setRecordedAudioBlob(audioBlob);
          setRecordedAudioUrl(URL.createObjectURL(audioBlob));
        }

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }

        setIsRecording(false);
      };

      recorder.onerror = () => {
        setSubmitFailure("Recording failed. Please try again.");
        setIsRecording(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setSubmitFailure("Unable to access microphone. Please allow permission and try again.");
    }
  };

  const stopVoiceRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
      return;
    }

    mediaRecorderRef.current.stop();
  };

  const submitTextIssueForProject = async () => {
    if (!project) return;

    const description = textIssue.trim();
    if (!description) {
      setSubmitFailure("Please add issue details before submitting.");
      return;
    }

    clearError();
    setSubmitSuccess(null);
    setSubmitFailure(null);

    try {
      await submitTextIssue({
        projectId: project.id,
        description,
        severity,
      });

      setTextIssue("");
      setSubmitSuccess("Issue submitted successfully through text.");
    } catch (error) {
      setSubmitFailure(errorToMessage(error));
    }
  };

  const submitVoiceIssueForProject = async () => {
    if (!project) return;
    if (!recordedAudioBlob) {
      setSubmitFailure("Please record a voice message before submitting.");
      return;
    }

    clearError();
    setSubmitSuccess(null);
    setSubmitFailure(null);

    try {
      await submitVoiceIssue({
        projectId: project.id,
        severity,
        audioBlob: recordedAudioBlob,
        filename: `project-${project.id}-${Date.now()}.webm`,
      });

      clearRecordedAudio();
      setSubmitSuccess("Issue submitted successfully through voice.");
    } catch (error) {
      setSubmitFailure(errorToMessage(error));
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto flex min-h-[calc(100vh-1px)] w-full max-w-3xl items-center px-4 py-8 sm:px-6 lg:px-8">
          <section className="w-full rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-foreground">Project not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The requested project identifier does not exist in current session data.
            </p>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="mt-6 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Back to Dashboard
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-semibold text-foreground"
          >
            Back
          </button>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-primary">
            {project.department}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">{project.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Progress
              </p>
              <p className="mt-2 text-xl font-bold text-foreground">{project.progress}%</p>
              <Progress value={project.progress} className="mt-3" />
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Budget Overview
              </p>
              <div className="mt-3 grid gap-2 text-sm">
                <p className="text-foreground">
                  Total Budget: <span className="font-semibold">{formatCurrency(project.budget)}</span>
                </p>
                <p className="text-foreground">
                  Material Cost: <span className="font-semibold">{formatCurrency(project.materialCost)}</span>
                </p>
                <p className="text-foreground">
                  Labour Cost: <span className="font-semibold">{formatCurrency(project.labourCost)}</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-foreground">Raise an Issue</h2>
              <p className="text-sm text-muted-foreground">
                Submit a complaint in text or voice for this project.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIssueMode("text")}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  issueMode === "text"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-secondary text-foreground"
                }`}
              >
                Text Issue
              </button>
              <button
                type="button"
                onClick={() => setIssueMode("voice")}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  issueMode === "voice"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-secondary text-foreground"
                }`}
              >
                Voice Issue
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-xl border border-border bg-background p-4">
              {issueMode === "text" ? (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Issue Description
                  </label>
                  <textarea
                    value={textIssue}
                    onChange={(event) => setTextIssue(event.target.value)}
                    rows={6}
                    placeholder="Describe the issue with project execution, funds, quality, or safety"
                    className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none"
                  />
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Voice Recording
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      disabled={isRecording || loading}
                      className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Start Recording
                    </button>
                    <button
                      type="button"
                      onClick={stopVoiceRecording}
                      disabled={!isRecording || loading}
                      className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Stop Recording
                    </button>
                    <button
                      type="button"
                      onClick={clearRecordedAudio}
                      disabled={!recordedAudioBlob || loading}
                      className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear Audio
                    </button>
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground">
                    {isRecording
                      ? "Recording in progress. Press Stop Recording when done."
                      : recordedAudioBlob
                      ? "Recording ready. Review and submit your voice issue."
                      : "No recording captured yet."}
                  </p>

                  {recordedAudioUrl ? (
                    <audio controls className="mt-3 w-full">
                      <source src={recordedAudioUrl} />
                    </audio>
                  ) : null}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Severity: {severity}
              </label>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={severity}
                onChange={(event) => setSeverity(Number(event.target.value))}
                className="mt-2 w-full"
              />

              <button
                type="button"
                onClick={issueMode === "text" ? submitTextIssueForProject : submitVoiceIssueForProject}
                disabled={loading || (issueMode === "voice" && !recordedAudioBlob)}
                className="mt-4 w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Submitting..." : issueMode === "text" ? "Submit Text Issue" : "Submit Voice Issue"}
              </button>

              {submitFailure ? (
                <p className="mt-3 text-sm font-medium text-destructive">{submitFailure}</p>
              ) : null}

              {submitSuccess ? (
                <p className="mt-3 text-sm font-medium text-success">{submitSuccess}</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Project Updates</h2>
            <p className="text-sm text-muted-foreground">Feed-style progress updates and engagement</p>
          </div>

          {feed.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
              No updates yet for this project.
            </div>
          ) : (
            feed.map((post) => (
              <article key={post.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{post.authorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(post.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-1 text-xs font-semibold text-foreground">
                    {post.authorRole === "tender" ? "Contractor" : "Citizen"}
                  </span>
                </div>

                <p className="mt-3 text-sm text-foreground">{post.caption}</p>

                <ImageWithFallback
                  src={post.imageUrl}
                  alt={post.caption}
                  className="mt-3 h-60 w-full rounded-xl object-cover"
                />

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Metric label="Progress" value={`${post.progress}%`} />
                  <Metric label="Material" value={formatCurrency(post.materialCost)} />
                  <Metric label="Labour" value={formatCurrency(post.labourCost)} />
                </div>

                <TrustEvidenceCard post={post} />

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Metric label="Category" value={post.complaintCategory || "General"} />
                  <Metric label="Status" value={post.complaintStatus} />
                  <Metric label="Severity" value={String(post.severity)} />
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Priority Index
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{post.priority}</p>
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

function errorToMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Failed to submit issue. Please try again.";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function TrustEvidenceCard({ post }: { post: Post }) {
  const coordinates = formatCoordinates(post.evidenceLatitude, post.evidenceLongitude);
  const mediaSummary = [
    formatEvidenceMediaType(post.evidenceMediaType),
    post.evidenceMediaMimeType,
    post.evidenceMediaSizeBytes !== null ? formatBytes(post.evidenceMediaSizeBytes) : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <section className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Trust Evidence Card</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Metric label="Timestamp" value={formatEvidenceTimestamp(post.createdAt)} />
        <Metric
          label="Location"
          value={coordinates ? `${post.evidenceLocationLabel} (${coordinates})` : post.evidenceLocationLabel}
        />
        <Metric label="Media Metadata" value={mediaSummary || "Text submission"} />
      </div>

      <div className="mt-3 rounded-lg border border-emerald-200 bg-white/80 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700">Tamper Hash (SHA-256)</p>
        <p className="mt-1 break-all font-mono text-[11px] text-foreground">{post.evidenceTamperHash}</p>
        {post.evidenceMediaFilename ? (
          <p className="mt-1 text-xs text-muted-foreground">File: {post.evidenceMediaFilename}</p>
        ) : null}
      </div>
    </section>
  );
}

function formatEvidenceTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unavailable";
  }

  return parsed.toLocaleString("en-IN");
}

function formatCoordinates(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) {
    return null;
  }

  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function formatEvidenceMediaType(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "voice") return "Voice";
  if (normalized === "image") return "Image";
  if (normalized === "attachment") return "Attachment";
  return "Text";
}

function formatBytes(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "0 B";
  }

  if (sizeBytes < 1024) {
    return `${Math.round(sizeBytes)} B`;
  }

  const sizeKb = sizeBytes / 1024;
  if (sizeKb < 1024) {
    return `${sizeKb.toFixed(1)} KB`;
  }

  const sizeMb = sizeKb / 1024;
  return `${sizeMb.toFixed(2)} MB`;
}

export default ProjectDetail;
