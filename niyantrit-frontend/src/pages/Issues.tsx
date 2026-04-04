import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import Navbar from "../components/Navbar";
import { Post, Project, useAppContext } from "../context/AppContext";

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];
const USER_MARKER_COLOR = "#2563EB";

interface AggregatedIssue {
  project: Project;
  count: number;
  openCount: number;
  avgSeverity: number;
  maxSeverity: number;
  latestAt: string;
}

function FitHeatmapBounds({ points }: { points: AggregatedIssue[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      map.setView(INDIA_CENTER, 5);
      return;
    }

    if (points.length === 1) {
      map.setView(
        [points[0].project.location.latitude, points[0].project.location.longitude],
        10
      );
      return;
    }

    const bounds = L.latLngBounds(
      points.map((item) => [item.project.location.latitude, item.project.location.longitude])
    );
    map.fitBounds(bounds.pad(0.2));
  }, [map, points]);

  return null;
}

function isOpenIssue(status: string) {
  const normalized = status.trim().toLowerCase();
  return normalized !== "resolved" && normalized !== "closed";
}

function colorForDensity(count: number, maxCount: number) {
  const ratio = maxCount <= 0 ? 0 : count / maxCount;
  if (ratio >= 0.8) return "#B91C1C";
  if (ratio >= 0.6) return "#EA580C";
  if (ratio >= 0.4) return "#F59E0B";
  if (ratio >= 0.2) return "#84CC16";
  return "#2563EB";
}

function groupIssuesByProject(posts: Post[], projects: Project[]) {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const grouped = new Map<
    string,
    {
      project: Project;
      count: number;
      openCount: number;
      totalSeverity: number;
      maxSeverity: number;
      latestAt: string;
    }
  >();

  posts.forEach((post) => {
    const project = projectById.get(post.projectId);
    if (!project) return;

    const existing = grouped.get(project.id) || {
      project,
      count: 0,
      openCount: 0,
      totalSeverity: 0,
      maxSeverity: 0,
      latestAt: post.createdAt,
    };

    existing.count += 1;
    existing.totalSeverity += post.severity;
    existing.maxSeverity = Math.max(existing.maxSeverity, post.severity);

    if (isOpenIssue(post.complaintStatus)) {
      existing.openCount += 1;
    }

    if (new Date(post.createdAt).getTime() > new Date(existing.latestAt).getTime()) {
      existing.latestAt = post.createdAt;
    }

    grouped.set(project.id, existing);
  });

  return Array.from(grouped.values())
    .map((item) => ({
      project: item.project,
      count: item.count,
      openCount: item.openCount,
      avgSeverity: Number((item.totalSeverity / item.count).toFixed(1)),
      maxSeverity: item.maxSeverity,
      latestAt: item.latestAt,
    }))
    .sort((first, second) => second.count - first.count);
}

function Issues() {
  const navigate = useNavigate();
  const { isAuthenticated, posts, projects } = useAppContext();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Ignore very coarse location fixes (e.g., IP-level fallback).
        if (Number.isFinite(position.coords.accuracy) && position.coords.accuracy > 50000) {
          setUserLocation(null);
          return;
        }

        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => setUserLocation(null),
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 12000 }
    );
  }, []);

  const issueDensity = useMemo(
    () => groupIssuesByProject(posts, projects),
    [posts, projects]
  );

  const maxCount = issueDensity[0]?.count ?? 1;

  const summary = useMemo(() => {
    const totalIssues = posts.length;
    const openIssues = posts.filter((post) => isOpenIssue(post.complaintStatus)).length;
    const highSeverity = posts.filter((post) => post.severity >= 7).length;
    const impactedProjects = issueDensity.length;

    return { totalIssues, openIssues, highSeverity, impactedProjects };
  }, [posts, issueDensity]);

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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Issue Intelligence</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
            User Report Heatmap
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Density map of issues raised by all users across all tracked projects.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Total Issues" value={summary.totalIssues} />
            <SummaryCard label="Open Issues" value={summary.openIssues} />
            <SummaryCard label="High Severity" value={summary.highSeverity} />
            <SummaryCard label="Impacted Projects" value={summary.impactedProjects} />
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-semibold text-foreground">Issue Heatmap</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Circle size and color indicate complaint density per project location.
            </p>

            <div className="relative isolate z-0 mt-4 h-[520px] overflow-hidden rounded-xl border border-border">
              <MapContainer
                center={INDIA_CENTER}
                zoom={5}
                scrollWheelZoom
                className="relative z-0 h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <FitHeatmapBounds points={issueDensity} />

                {userLocation ? (
                  <CircleMarker
                    center={[userLocation.lat, userLocation.lng]}
                    radius={8}
                    pathOptions={{
                      color: USER_MARKER_COLOR,
                      fillColor: USER_MARKER_COLOR,
                      fillOpacity: 0.9,
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -4]}>
                      Your location
                    </Tooltip>
                  </CircleMarker>
                ) : null}

                {issueDensity.map((item) => {
                  const color = colorForDensity(item.count, maxCount);
                  return (
                    <Circle
                      key={item.project.id}
                      center={[item.project.location.latitude, item.project.location.longitude]}
                      radius={1200 + item.count * 800}
                      pathOptions={{
                        color,
                        fillColor: color,
                        fillOpacity: 0.35,
                        weight: 1,
                      }}
                    >
                      <Tooltip direction="top">
                        {item.project.name} ({item.count} issues)
                      </Tooltip>
                      <Popup>
                        <div className="min-w-[220px]">
                          <p className="text-sm font-semibold text-foreground">{item.project.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.project.location.city}, {item.project.location.state}
                          </p>
                          <div className="mt-3 grid gap-1 text-xs text-foreground">
                            <p>Total Issues: {item.count}</p>
                            <p>Open Issues: {item.openCount}</p>
                            <p>Average Severity: {item.avgSeverity}</p>
                            <p>Max Severity: {item.maxSeverity}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(`/project/${item.project.id}`)}
                            className="mt-3 w-full rounded-md bg-primary px-2 py-1.5 text-xs font-semibold text-primary-foreground"
                          >
                            Open Project
                          </button>
                        </div>
                      </Popup>
                    </Circle>
                  );
                })}
              </MapContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-semibold text-foreground">Top Issue Zones</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Projects with highest complaint concentration.
            </p>

            <div className="mt-4 space-y-3">
              {issueDensity.slice(0, 10).map((item) => (
                <article key={item.project.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{item.project.name}</p>
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      {item.count} issues
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.project.location.city}, {item.project.location.state}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-foreground">
                    <span className="rounded-md bg-secondary px-2 py-1">Open: {item.openCount}</span>
                    <span className="rounded-md bg-secondary px-2 py-1">Avg Severity: {item.avgSeverity}</span>
                    <span className="rounded-md bg-secondary px-2 py-1">Max Severity: {item.maxSeverity}</span>
                  </div>
                </article>
              ))}

              {issueDensity.length === 0 ? (
                <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                  No issues have been raised yet.
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-secondary px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export default Issues;