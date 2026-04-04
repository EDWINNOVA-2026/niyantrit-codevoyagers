import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAppContext } from "../context/AppContext";

function RoleSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error, clearError } = useAppContext();
  const phone = (location.state as { phone?: string } | null)?.phone || "";

  const selectRole = async (role: "user" | "tender") => {
    clearError();
    try {
      await login(role, phone);
      navigate(role === "user" ? "/dashboard" : "/tender");
    } catch {
      // Error is handled in global context and shown in-page.
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7f9ff] via-[#f2f6ff] to-[#ffffff]">
      <Navbar />
      <main className="mx-auto flex min-h-[calc(100vh-1px)] w-full max-w-4xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="w-full rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Role Selection</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Choose your dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Select a role to continue. Access behavior is mocked and in-memory for this UI flow.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => void selectRole("user")}
              disabled={loading}
              className="rounded-2xl border border-border bg-gradient-to-b from-[#eff6ff] to-[#ffffff] p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Citizen</p>
              <h2 className="mt-2 text-xl font-bold text-foreground">Public Monitoring Dashboard</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Search projects, track status, and interact with project progress updates.
              </p>
            </button>

            <button
              type="button"
              onClick={() => void selectRole("tender")}
              disabled={loading}
              className="rounded-2xl border border-border bg-gradient-to-b from-[#fff7ed] to-[#ffffff] p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Contractor</p>
              <h2 className="mt-2 text-xl font-bold text-foreground">Tender Operations Dashboard</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload field updates, attach progress images, and share cost + completion metrics.
              </p>
            </button>
          </div>

          {error ? <p className="mt-4 text-sm font-medium text-destructive">{error}</p> : null}

          <div className="mt-6">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary/70"
            >
              Back to login
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default RoleSelection;
