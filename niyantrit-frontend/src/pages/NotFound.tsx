import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/25 to-background">
      <Navbar />
      <main className="mx-auto flex min-h-[calc(100vh-1px)] w-full max-w-3xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="w-full rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">404</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Page Not Found</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This route does not exist in the current civic workflow. Use the actions below to continue.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground"
            >
              Go Back
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Home
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default NotFound;
