import { useNavigate, useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { Shield, ArrowLeft, Users, Wrench } from "lucide-react";

export default function RoleSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error, clearError } = useAppContext();
  const phone = (location.state as { phone?: string } | null)?.phone || "";

  const selectRole = async (role: "user" | "tender") => {
    clearError();
    try {
      await login(role, phone);
      navigate(role === "user" ? "/dashboard" : "/tender");
    } catch {}
  };

  return (
    <div className="min-h-screen">
      <div className="border-b border-border/50 bg-white/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-lg shadow-blue-600/20">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <p className="text-sm text-foreground" style={{ fontWeight: 600 }}>
            Niyantrit
          </p>
        </div>
      </div>

      <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-3xl items-center px-4 py-8 sm:px-6">
        <section className="w-full rounded-3xl border border-border bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
          <p
            className="text-xs tracking-[0.2em] text-primary uppercase"
            style={{ fontWeight: 600 }}
          >
            Role Selection
          </p>
          <h1
            className="mt-2 text-2xl text-foreground sm:text-3xl"
            style={{ fontWeight: 700 }}
          >
            Choose your dashboard
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Select your role to access the appropriate monitoring interface.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => selectRole("user")}
              disabled={loading}
              className="group rounded-2xl border-2 border-border bg-gradient-to-b from-blue-50/50 to-white p-6 text-left transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100/50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 transition group-hover:bg-blue-200">
                <Users className="h-6 w-6 text-blue-700" />
              </div>
              <p
                className="mt-4 text-xs tracking-[0.15em] text-muted-foreground uppercase"
                style={{ fontWeight: 600 }}
              >
                Citizen
              </p>
              <h2
                className="mt-1 text-lg text-foreground"
                style={{ fontWeight: 700 }}
              >
                Public Monitoring
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Search projects, track status, report issues, and follow progress
                updates.
              </p>
            </button>

            <button
              type="button"
              onClick={() => selectRole("tender")}
              disabled={loading}
              className="group rounded-2xl border-2 border-border bg-gradient-to-b from-amber-50/50 to-white p-6 text-left transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100/50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 transition group-hover:bg-amber-200">
                <Wrench className="h-6 w-6 text-amber-700" />
              </div>
              <p
                className="mt-4 text-xs tracking-[0.15em] text-muted-foreground uppercase"
                style={{ fontWeight: 600 }}
              >
                Contractor
              </p>
              <h2
                className="mt-1 text-lg text-foreground"
                style={{ fontWeight: 700 }}
              >
                Tender Operations
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload field updates, track milestones, manage cost metrics and
                leaderboard.
              </p>
            </button>
          </div>

          {error && (
            <div
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              style={{ fontWeight: 500 }}
            >
              {error}
            </div>
          )}

          <div className="mt-6">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground transition hover:bg-slate-100"
              style={{ fontWeight: 600 }}
            >
              <ArrowLeft className="h-4 w-4" /> Back to login
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
