import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MapView from "../components/MapView";
import Navbar from "../components/Navbar";
import { ProjectStatus, useAppContext } from "../context/AppContext";
import { useIsMobile } from "../hooks/use-mobile";

const INDIA_CENTER = {
  latitude: 20.5937,
  longitude: 78.9629,
};

const filters: Array<"All" | ProjectStatus> = ["All", "Pending", "Ongoing", "Completed"];
const PROJECTS_PER_PAGE = 10;

function Dashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isAuthenticated, projects } = useAppContext();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ProjectStatus>("All");
  const [userLocation, setUserLocation] = useState<typeof INDIA_CENTER | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

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
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => setUserLocation(null),
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 12000 }
    );
  }, []);

  const distanceOrigin = userLocation ?? INDIA_CENTER;

  const projectWithDistance = useMemo(() => {
    return projects
      .filter((project) => {
        const matchesSearch =
          project.name.toLowerCase().includes(search.toLowerCase()) ||
          project.location.city.toLowerCase().includes(search.toLowerCase()) ||
          project.department.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === "All" || project.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .map((project) => ({
        project,
        distanceKm: haversineDistance(
          distanceOrigin.latitude,
          distanceOrigin.longitude,
          project.location.latitude,
          project.location.longitude
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [projects, search, statusFilter, distanceOrigin]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(projectWithDistance.length / PROJECTS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * PROJECTS_PER_PAGE;
    return projectWithDistance.slice(startIndex, startIndex + PROJECTS_PER_PAGE);
  }, [projectWithDistance, currentPage]);

  const visibleStart = projectWithDistance.length === 0 ? 0 : (currentPage - 1) * PROJECTS_PER_PAGE + 1;
  const visibleEnd = Math.min(projectWithDistance.length, currentPage * PROJECTS_PER_PAGE);

  const stats = useMemo(() => {
    const total = projects.length;
    const pending = projects.filter((project) => project.status === "Pending").length;
    const ongoing = projects.filter((project) => project.status === "Ongoing").length;
    const completed = projects.filter((project) => project.status === "Completed").length;
    return { total, pending, ongoing, completed };
  }, [projects]);

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Citizen Dashboard</p>
              <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
                District Project Monitoring
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {userLocation
                  ? "Sorted by nearest distance from your current location."
                  : "Sorted by nearest distance from India center (location access unavailable)."}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Projects" value={stats.total} accent="bg-primary/10 text-primary" />
            <StatCard label="Pending" value={stats.pending} accent="bg-amber-50 text-amber-700" />
            <StatCard label="Ongoing" value={stats.ongoing} accent="bg-success/10 text-success" />
            <StatCard label="Completed" value={stats.completed} accent="bg-secondary text-foreground" />
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[2fr_1fr]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by project, city, or department"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none ring-primary transition focus:ring-2"
            />
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    statusFilter === filter
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-secondary text-foreground hover:bg-secondary/70"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-semibold text-foreground">Projects</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Showing {visibleStart}-{visibleEnd} of {projectWithDistance.length} project records.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {paginatedProjects.map(({ project, distanceKm }) => (
                <article
                  key={project.id}
                  className="rounded-xl border border-border bg-background p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-foreground">{project.name}</h3>
                    <span className={statusClass(project.status)}>{project.status}</span>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {project.department}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {project.location.city}, {project.location.state}
                  </p>
                  <p className="mt-2 text-sm text-foreground">Distance: {distanceKm.toFixed(1)} km</p>
                  <p className="mt-2 text-sm text-foreground">Progress: {project.progress}%</p>

                  <button
                    type="button"
                    onClick={() => navigate(`/project/${project.id}`)}
                    className="mt-4 w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    View Project
                  </button>
                </article>
              ))}
            </div>

            {projectWithDistance.length > PROJECTS_PER_PAGE ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                        currentPage === page
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-background text-foreground"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className={isMobile ? "order-first" : ""}>
            <MapView
              projects={projectWithDistance.map((entry) => entry.project)}
              userLocation={
                userLocation
                  ? { lat: userLocation.latitude, lng: userLocation.longitude }
                  : null
              }
              onProjectClick={(projectId) => navigate(`/project/${projectId}`)}
            />
          </section>
        </div>
      </main>
    </div>
  );
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function statusClass(status: ProjectStatus) {
  if (status === "Pending") {
    return "rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700";
  }
  if (status === "Ongoing") {
    return "rounded-full border border-success/30 bg-success/10 px-2 py-1 text-[11px] font-semibold text-success";
  }
  return "rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary";
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className={`rounded-xl border border-border px-4 py-3 ${accent}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default Dashboard;
