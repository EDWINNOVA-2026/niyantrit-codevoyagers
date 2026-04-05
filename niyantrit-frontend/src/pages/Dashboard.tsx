import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { MapView } from "../components/MapView";
import { ProjectStatus, useAppContext } from "../context/AppContext";
import {
  Search,
  MapPin,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Shield,
  ChevronRight,
  Users,
  Leaf,
  ArrowUpRight,
  IndianRupee,
  Eye,
  Zap,
  ChevronLeft,
  Filter,
  MessageSquare,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const NAVY = "#1A237E";
const NAVY_DARK = "#0D1642";
const EMERALD = "#059669";
const fontPS: React.CSSProperties = {
  fontFamily: "'Public Sans', system-ui, sans-serif",
};

const PROJECT_IMAGES: Record<string, string> = {
  "1": "https://images.unsplash.com/photo-1708357997379-e55c1636e0d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaWdod2F5JTIwcm9hZCUyMGNvbnN0cnVjdGlvbiUyMGluZGlhfGVufDF8fHx8MTc3NTM2NjczMHww&ixlib=rb-4.1.0&q=80&w=1080",
  "2": "https://images.unsplash.com/photo-1758557683300-45ae99df1342?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZXRybyUyMHJhaWwlMjB0cmFpbiUyMHN0YXRpb24lMjBjb25zdHJ1Y3Rpb258ZW58MXx8fHwxNzc1MzY2NzMxfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "3": "https://images.unsplash.com/photo-1771273954407-05345d61543e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YXRlciUyMHRyZWF0bWVudCUyMHBsYW50JTIwaW5kdXN0cmlhbHxlbnwxfHx8fDE3NzUzNjY3MzF8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "4": "https://images.unsplash.com/photo-1699602050604-698045645108?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWFydCUyMGNpdHklMjBpbmZyYXN0cnVjdHVyZSUyMGRpZ2l0YWx8ZW58MXx8fHwxNzc1MzY2NzMxfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "5": "https://images.unsplash.com/photo-1769147555720-71fc71bfc216?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3NwaXRhbCUyMGJ1aWxkaW5nJTIwZXh0ZXJpb3J8ZW58MXx8fHwxNzc1MzY2NzMxfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "6": "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2xhciUyMGZhcm0lMjBwYW5lbHMlMjBlbmVyZ3l8ZW58MXx8fHwxNzc1MzY2NzMyfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "7": "https://images.unsplash.com/photo-1716108630275-be105a3d4cdd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmbG9vZCUyMGNvbnRyb2wlMjBlbWJhbmttZW50JTIwcml2ZXJ8ZW58MXx8fHwxNzc1MzY2NzMyfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "8": "https://images.unsplash.com/photo-1759320192570-66c758e63cb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxydXJhbCUyMHJvYWQlMjB2aWxsYWdlJTIwY291bnRyeXNpZGV8ZW58MXx8fHwxNzc1MzY2NzMzfDA&ixlib=rb-4.1.0&q=80&w=1080",
  "9": "https://images.unsplash.com/photo-1763315156830-07870b159121?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YXN0ZSUyMG1hbmFnZW1lbnQlMjByZWN5Y2xpbmclMjBwbGFudHxlbnwxfHx8fDE3NzUzNjY3MzN8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "10": "https://images.unsplash.com/photo-1759506363042-1da7249e29f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBjb3VydGhvdXNlJTIwZ292ZXJubWVudCUyMGJ1aWxkaW5nfGVufDF8fHx8MTc3NTM2NjczNHww&ixlib=rb-4.1.0&q=80&w=1080",
  "11": "https://images.unsplash.com/photo-1631093765993-b35d347ef470?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWJsZSUyMHN0YXllZCUyMGJyaWRnZSUyMHJpdmVyJTIwY29uc3RydWN0aW9ufGVufDF8fHx8MTc3NTM2NjczNHww&ixlib=rb-4.1.0&q=80&w=1080",
  "12": "https://images.unsplash.com/photo-1775212294593-50c9939cb92d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZmZvcmRhYmxlJTIwaG91c2luZyUyMGFwYXJ0bWVudCUyMGNvbnN0cnVjdGlvbnxlbnwxfHx8fDE3NzUzNjY3MzR8MA&ixlib=rb-4.1.0&q=80&w=1080",
};

const COMMUNITY_IMPACT: Record<string, { text: string; icon: typeof Users }> = {
  "1": { text: "Benefitting 1,20,000+ commuters daily", icon: Users },
  "2": { text: "Eco-friendly electric transit for 50,000+ riders", icon: Leaf },
  "3": { text: "Clean water for 3,00,000+ residents", icon: Users },
  "4": { text: "Smart services for 5,00,000+ citizens", icon: Zap },
  "5": { text: "Healthcare access for 80,000+ patients/year", icon: Users },
  "6": { text: "Clean energy powering 25,000+ homes", icon: Leaf },
  "7": { text: "Flood protection for 2,00,000+ residents", icon: Shield },
  "8": { text: "Connecting 120 remote villages", icon: Users },
  "9": { text: "Eco-friendly waste processing for 4L+ residents", icon: Leaf },
  "10": { text: "Faster justice delivery for 10L+ citizens", icon: Users },
  "11": { text: "Critical connectivity for 3,00,000+ people", icon: Users },
  "12": { text: "Affordable homes for 5,000+ families", icon: Users },
};

const statusFilters: Array<"All" | ProjectStatus> = [
  "All",
  "Pending",
  "Ongoing",
  "Completed",
];
const PROJECTS_PER_PAGE = 6;

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, projects } = useAppContext();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ProjectStatus>(
    "All",
  );
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        p.location.city.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [projects, search, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PROJECTS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * PROJECTS_PER_PAGE,
    currentPage * PROJECTS_PER_PAGE,
  );

  const stats = useMemo(
    () => ({
      total: projects.length,
      pending: projects.filter((p) => p.status === "Pending").length,
      ongoing: projects.filter((p) => p.status === "Ongoing").length,
      completed: projects.filter((p) => p.status === "Completed").length,
    }),
    [projects],
  );

  const riskSummary = useMemo(() => {
    const highRisk = projects.filter((p) =>
      ["HIGH", "VERY_HIGH", "CRITICAL"].includes(p.riskLevel),
    ).length;
    const unknown = projects.filter((p) => p.riskLevel === "UNKNOWN").length;
    const moderate = projects.filter((p) => p.riskLevel === "MODERATE").length;
    const low = projects.filter((p) => p.riskLevel === "LOW").length;
    return {
      highRisk,
      unknown,
      moderate,
      low,
    };
  }, [projects]);

  const totalBudget = useMemo(
    () => projects.reduce((s, p) => s + p.budget, 0),
    [projects],
  );
  const totalMaterial = useMemo(
    () => projects.reduce((s, p) => s + p.materialCost, 0),
    [projects],
  );
  const totalLabour = useMemo(
    () => projects.reduce((s, p) => s + p.labourCost, 0),
    [projects],
  );
  const totalOther = totalBudget - totalMaterial - totalLabour;

  const expenditureData = [
    { name: "Materials", value: totalMaterial, color: "#1A237E" },
    { name: "Labour", value: totalLabour, color: "#0277BD" },
    { name: "Equipment & Other", value: totalOther, color: "#00897B" },
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen" style={fontPS}>
        <Navbar />
        <main className="mx-auto flex min-h-[60vh] w-full max-w-lg items-center px-4 py-8">
          <section
            className="w-full p-8 text-center"
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
            }}
          >
            <p className="text-sm" style={{ color: "#64748b" }}>
              You are not signed in.
            </p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-4 px-6 py-2.5 text-sm text-white"
              style={{ background: NAVY, borderRadius: 8, fontWeight: 700 }}
            >
              Go to Login
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ ...fontPS, background: "#F5F6FA" }}>
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Search bar */}
        <div className="relative mb-6">
          <Search
            className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "#94a3b8" }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects in your area..."
            className="w-full py-3 pl-11 pr-4 text-sm outline-none transition-all"
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              color: NAVY_DARK,
              fontWeight: 500,
              fontFamily: "'Public Sans', sans-serif",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = NAVY;
              e.target.style.boxShadow = `0 0 0 3px ${NAVY}14`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#E2E8F0";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div>
            <div
              className="mb-6 p-5"
              style={{
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 8,
              }}
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] tracking-[0.2em] uppercase"
                    style={{
                      background: `${NAVY}0A`,
                      color: NAVY,
                      borderRadius: 6,
                      fontWeight: 700,
                    }}
                  >
                    <Eye className="h-3 w-3" />
                    Citizen Transparency Dashboard
                  </div>
                  <h1
                    className="mt-2"
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 800,
                      color: NAVY_DARK,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Active Projects
                  </h1>
                  <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
                    {filtered.length} projects found across all monitored
                    districts.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MiniStat
                  icon={FolderOpen}
                  label="Total"
                  value={stats.total}
                  bg="#F0F1FF"
                  color={NAVY}
                />
                <MiniStat
                  icon={Clock}
                  label="Pending"
                  value={stats.pending}
                  bg="#FFF8E1"
                  color="#F57F17"
                />
                <MiniStat
                  icon={TrendingUp}
                  label="Ongoing"
                  value={stats.ongoing}
                  bg="#E8F5E9"
                  color={EMERALD}
                />
                <MiniStat
                  icon={CheckCircle2}
                  label="Completed"
                  value={stats.completed}
                  bg="#F5F5F5"
                  color="#546E7A"
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Filter className="h-3.5 w-3.5" style={{ color: "#94a3b8" }} />
                {statusFilters.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setStatusFilter(f)}
                    className="px-3.5 py-1.5 text-xs transition-colors"
                    style={{
                      borderRadius: 6,
                      fontWeight: statusFilter === f ? 700 : 500,
                      background: statusFilter === f ? NAVY : "transparent",
                      color: statusFilter === f ? "#fff" : "#64748b",
                      border:
                        statusFilter === f
                          ? "none"
                          : "1px solid #E2E8F0",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {paginated.map((project) => {
                const budgetSpent = project.labourCost + project.materialCost;
                const budgetPercent = Math.round(
                  (budgetSpent / project.budget) * 100,
                );
                const impact = COMMUNITY_IMPACT[project.id];
                const ImpactIcon = impact?.icon || Users;

                return (
                  <article
                    key={project.id}
                    className="group flex flex-col overflow-hidden transition-all"
                    style={{
                      background: "#fff",
                      border: "1px solid #E2E8F0",
                      borderRadius: 8,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#CBD5E1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#E2E8F0";
                    }}
                  >
                    <div
                      className="relative h-40 overflow-hidden"
                      style={{ background: "#F1F5F9" }}
                    >
                      <img
                        src={PROJECT_IMAGES[project.id]}
                        alt={project.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <span
                        className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px]"
                        style={{
                          background: "rgba(255,255,255,0.92)",
                          backdropFilter: "blur(8px)",
                          borderRadius: 6,
                          fontWeight: 700,
                          color: statusColor(project.status),
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            background: statusColor(project.status),
                          }}
                        />
                        {project.status}
                      </span>
                      <span
                        className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 text-[9px]"
                        style={{
                          background: "rgba(255,255,255,0.92)",
                          backdropFilter: "blur(8px)",
                          borderRadius: 6,
                          fontWeight: 600,
                          color: "#64748b",
                        }}
                      >
                        <Shield className="h-3 w-3" style={{ color: EMERALD }} />
                        Verified by AI
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      <p
                        className="text-[10px] uppercase tracking-wider"
                        style={{ color: "#94a3b8", fontWeight: 600 }}
                      >
                        {project.department}
                      </p>
                      <h3
                        className="mt-1 line-clamp-2"
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 700,
                          color: NAVY_DARK,
                        }}
                      >
                        {project.name}
                      </h3>
                      <div
                        className="mt-2 flex items-center gap-1.5 text-xs"
                        style={{ color: "#94a3b8" }}
                      >
                        <MapPin className="h-3 w-3" />
                        <span style={{ fontWeight: 500 }}>
                          {project.location.city}, {project.location.state}
                        </span>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-[11px]">
                          <span style={{ color: "#64748b", fontWeight: 500 }}>
                            Progress
                          </span>
                          <span style={{ color: NAVY_DARK, fontWeight: 700 }}>
                            {project.progress}%
                          </span>
                        </div>
                        <div
                          className="mt-1.5 h-2 overflow-hidden"
                          style={{ background: "#F1F5F9", borderRadius: 4 }}
                        >
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${project.progress}%`,
                              background: EMERALD,
                              borderRadius: 4,
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[11px]">
                        <div
                          className="flex items-center gap-1"
                          style={{ color: "#64748b" }}
                        >
                          <IndianRupee className="h-3 w-3" />
                          <span style={{ fontWeight: 500 }}>Budget Spent</span>
                        </div>
                        <span style={{ fontWeight: 700, color: NAVY_DARK }}>
                          {formatCurrency(budgetSpent)} / {formatCurrency(project.budget)} ({budgetPercent}%)
                        </span>
                      </div>

                      {impact && (
                        <div
                          className="mt-3 flex items-center gap-1.5 px-2.5 py-1.5 text-[10px]"
                          style={{
                            background: "#F0FDF4",
                            border: "1px solid #E2F5EA",
                            borderRadius: 6,
                            color: "#15803D",
                            fontWeight: 600,
                          }}
                        >
                          <ImpactIcon className="h-3 w-3" />
                          {impact.text}
                        </div>
                      )}

                      {project.riskScore !== null && (
                        <div className="mt-3 flex items-center gap-2 text-[10px]">
                          <span
                            className="px-2 py-0.5"
                            style={{
                              borderRadius: 4,
                              fontWeight: 700,
                              ...riskStyles(project.riskLevel),
                            }}
                          >
                            Risk: {project.riskScore}
                          </span>
                          <span style={{ color: "#94a3b8", fontWeight: 500 }}>
                            {project.riskLevel.replace("_", " ")}
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => navigate(`/project/${project.id}`)}
                        className="mt-4 flex w-full items-center justify-center gap-1.5 py-2.5 text-xs transition-colors"
                        style={{
                          border: `1px solid ${NAVY}20`,
                          borderRadius: 6,
                          color: NAVY,
                          fontWeight: 700,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = NAVY;
                          e.currentTarget.style.color = "#fff";
                          e.currentTarget.style.borderColor = NAVY;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = NAVY;
                          e.currentTarget.style.borderColor = `${NAVY}20`;
                        }}
                      >
                        View Details
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div
                className="mt-8 p-12 text-center"
                style={{
                  background: "#fff",
                  border: "1px solid #E2E8F0",
                  borderRadius: 8,
                }}
              >
                <AlertTriangle className="mx-auto h-8 w-8" style={{ color: "#94a3b8" }} />
                <p className="mt-3 text-sm" style={{ color: "#64748b" }}>
                  No projects match your search criteria.
                </p>
              </div>
            )}

            {totalPages > 1 && (
              <div
                className="mt-6 flex flex-wrap items-center justify-between gap-3 p-4"
                style={{
                  background: "#fff",
                  border: "1px solid #E2E8F0",
                  borderRadius: 8,
                }}
              >
                <p className="text-xs" style={{ color: "#64748b", fontWeight: 500 }}>
                  Page {currentPage} of {totalPages} ({filtered.length} projects)
                </p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs disabled:opacity-40"
                    style={{
                      border: "1px solid #E2E8F0",
                      borderRadius: 6,
                      fontWeight: 600,
                      color: NAVY_DARK,
                    }}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Prev
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page =
                      currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                    if (page > totalPages) return null;
                    return (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className="px-3 py-1.5 text-xs"
                        style={{
                          borderRadius: 6,
                          fontWeight: 600,
                          background: currentPage === page ? NAVY : "transparent",
                          color: currentPage === page ? "#fff" : NAVY_DARK,
                          border:
                            currentPage === page
                              ? "none"
                              : "1px solid #E2E8F0",
                        }}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs disabled:opacity-40"
                    style={{
                      border: "1px solid #E2E8F0",
                      borderRadius: 6,
                      fontWeight: 600,
                      color: NAVY_DARK,
                    }}
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="hidden lg:block space-y-5">
            <div
              className="p-4"
              style={{
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 8,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className="text-[10px] tracking-[0.2em] uppercase"
                  style={{ color: NAVY, fontWeight: 700 }}
                >
                  Project Risk Map
                </p>
                <span
                  className="px-2 py-0.5 text-[10px]"
                  style={{
                    background: "#F0F4FF",
                    color: NAVY,
                    borderRadius: 999,
                    fontWeight: 700,
                  }}
                >
                  Live
                </span>
              </div>

              <div
                className="mt-3 h-[260px] overflow-hidden"
                style={{ borderRadius: 8, border: "1px solid #E2E8F0" }}
              >
                <MapView
                  projects={projects}
                  userLocation={null}
                  onProjectClick={(projectId) => navigate(`/project/${projectId}`)}
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div
                  className="p-3"
                  style={{ background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0" }}
                >
                  <p
                    className="text-[10px] tracking-wider uppercase"
                    style={{ color: "#64748b", fontWeight: 600 }}
                  >
                    Risk Legend
                  </p>
                  <div className="mt-2 space-y-1.5 text-[11px]" style={{ color: "#334155" }}>
                    <p style={{ fontWeight: 500 }}>Critical: {riskSummary.highRisk}</p>
                    <p style={{ fontWeight: 500 }}>Moderate: {riskSummary.moderate}</p>
                    <p style={{ fontWeight: 500 }}>Unknown: {riskSummary.unknown}</p>
                    <p style={{ fontWeight: 500 }}>Low: {riskSummary.low}</p>
                  </div>
                </div>
                <div
                  className="p-3"
                  style={{
                    background: NAVY,
                    color: "#fff",
                    borderRadius: 8,
                    border: `1px solid ${NAVY}`,
                  }}
                >
                  <p className="text-[26px] leading-none" style={{ fontWeight: 800 }}>
                    {projects.length}
                  </p>
                  <p className="mt-1 text-[11px]" style={{ fontWeight: 600 }}>
                    shown across all districts
                  </p>
                  <p className="mt-2 text-[11px]" style={{ color: "#CBD5E1", fontWeight: 500 }}>
                    {riskSummary.highRisk} high-risk in current view
                  </p>
                </div>
              </div>
            </div>

            <div
              className="p-5"
              style={{
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 8,
              }}
            >
              <p
                className="text-[10px] tracking-[0.2em] uppercase"
                style={{ color: NAVY, fontWeight: 700 }}
              >
                Total State Expenditure
              </p>
              <p
                className="mt-1"
                style={{ fontSize: "1.375rem", fontWeight: 800, color: NAVY_DARK }}
              >
                {formatCurrency(totalBudget)}
              </p>

              <div className="relative mt-4 h-48" style={{ width: "100%", minWidth: 0 }}>
                <ResponsiveContainer width="100%" height={192}>
                  <PieChart>
                    <Pie
                      data={expenditureData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {expenditureData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => formatCurrency(val)}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #E2E8F0",
                        fontSize: 12,
                        fontFamily: "'Public Sans', sans-serif",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-2 space-y-2">
                {expenditureData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ background: item.color }}
                      />
                      <span style={{ color: "#64748b", fontWeight: 500 }}>
                        {item.name}
                      </span>
                    </div>
                    <span style={{ color: NAVY_DARK, fontWeight: 700 }}>
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="p-5"
              style={{
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 8,
              }}
            >
              <p
                className="text-[10px] tracking-[0.2em] uppercase"
                style={{ color: NAVY, fontWeight: 700 }}
              >
                Budget Breakdown
              </p>
              <p className="mt-1 text-xs" style={{ color: "#94a3b8", fontWeight: 400 }}>
                Allocation across all projects
              </p>

              <div className="mt-4 space-y-3">
                {expenditureData.map((item) => {
                  const pct = Math.round((item.value / totalBudget) * 100);
                  return (
                    <div key={item.name}>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span style={{ color: "#64748b", fontWeight: 500 }}>
                          {item.name}
                        </span>
                        <span style={{ color: NAVY_DARK, fontWeight: 700 }}>
                          {pct}%
                        </span>
                      </div>
                      <div
                        className="h-1.5 overflow-hidden"
                        style={{ background: "#F1F5F9", borderRadius: 4 }}
                      >
                        <div
                          className="h-full"
                          style={{ width: `${pct}%`, background: item.color, borderRadius: 4 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="p-5"
              style={{
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 8,
              }}
            >
              <p
                className="text-[10px] tracking-[0.2em] uppercase"
                style={{ color: NAVY, fontWeight: 700 }}
              >
                Project Timeline
              </p>
              <p className="mt-1 text-xs" style={{ color: "#94a3b8", fontWeight: 400 }}>
                Key milestones across monitored projects
              </p>

              <div className="mt-4 relative">
                <div
                  className="absolute left-[7px] top-1 bottom-1 w-px"
                  style={{ background: "#E2E8F0" }}
                />
                <div className="space-y-4">
                  {[
                    { label: "Foundation & Permits", status: "completed" as const, date: "Jan 2026" },
                    { label: "Structural Work", status: "completed" as const, date: "Feb 2026" },
                    { label: "Infrastructure Build", status: "active" as const, date: "Mar 2026" },
                    { label: "Quality Audit", status: "upcoming" as const, date: "May 2026" },
                    { label: "Public Handover", status: "upcoming" as const, date: "Jul 2026" },
                  ].map((milestone) => (
                    <div
                      key={milestone.label}
                      className="flex items-start gap-3 relative"
                    >
                      <div
                        className="relative z-10 mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full"
                        style={{
                          background:
                            milestone.status === "completed"
                              ? EMERALD
                              : milestone.status === "active"
                                ? NAVY
                                : "#E2E8F0",
                          border:
                            milestone.status === "active"
                              ? `2px solid ${NAVY}40`
                              : "none",
                        }}
                      >
                        {milestone.status === "completed" && (
                          <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                        )}
                        {milestone.status === "active" && (
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <p
                          className="text-xs"
                          style={{
                            fontWeight:
                              milestone.status === "upcoming" ? 400 : 600,
                            color:
                              milestone.status === "upcoming"
                                ? "#94a3b8"
                                : NAVY_DARK,
                          }}
                        >
                          {milestone.label}
                        </p>
                        <p
                          className="text-[10px]"
                          style={{ color: "#94a3b8", fontWeight: 500 }}
                        >
                          {milestone.date}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="p-4 flex flex-col items-center gap-2 text-center"
              style={{
                background: `${NAVY}06`,
                border: "1px solid #E2E8F0",
                borderRadius: 8,
              }}
            >
              <Shield className="h-5 w-5" style={{ color: NAVY }} />
              <p
                className="text-[10px]"
                style={{ color: "#64748b", fontWeight: 600 }}
              >
                All data verified via NIC servers.
                <br />
                256-bit encrypted. CERT-In compliant.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <button
        type="button"
        onClick={() => navigate("/issues")}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 text-white text-sm transition-transform hover:scale-105"
        style={{
          background: NAVY,
          borderRadius: 8,
          fontWeight: 700,
          boxShadow: `0 4px 20px ${NAVY}40`,
          fontFamily: "'Public Sans', sans-serif",
        }}
      >
        <MessageSquare className="h-4 w-4" />
        Report an Issue
      </button>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  bg,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  bg: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3" style={{ background: bg, borderRadius: 6 }}>
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
        style={{ background: `${color}18` }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div>
        <p
          className="text-[10px] uppercase tracking-wider"
          style={{ color: "#64748b", fontWeight: 500 }}
        >
          {label}
        </p>
        <p style={{ fontSize: "1.125rem", fontWeight: 800, color }}>{value}</p>
      </div>
    </div>
  );
}

function statusColor(status: ProjectStatus) {
  if (status === "Pending") return "#F57F17";
  if (status === "Ongoing") return "#059669";
  return "#1A237E";
}

function riskStyles(level: string): React.CSSProperties {
  if (level === "CRITICAL") return { background: "#FEF2F2", color: "#991B1B" };
  if (level === "VERY_HIGH") return { background: "#FFF1F2", color: "#BE123C" };
  if (level === "HIGH") return { background: "#FFF7ED", color: "#C2410C" };
  if (level === "MODERATE") return { background: "#FFFBEB", color: "#A16207" };
  return { background: "#F0FDF4", color: "#15803D" };
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
