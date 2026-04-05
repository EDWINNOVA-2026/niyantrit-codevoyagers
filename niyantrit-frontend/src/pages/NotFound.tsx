import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-lg items-center px-4 py-8">
        <section className="w-full rounded-3xl border border-border bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
            <span className="text-2xl text-blue-700" style={{ fontWeight: 800 }}>
              404
            </span>
          </div>
          <h1 className="mt-4 text-2xl text-foreground" style={{ fontWeight: 700 }}>
            Page Not Found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This route does not exist in the current civic workflow.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-5 py-2.5 text-sm text-foreground transition hover:bg-slate-100"
              style={{ fontWeight: 600 }}
            >
              <ArrowLeft className="h-4 w-4" /> Go Back
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground transition hover:bg-primary/90"
              style={{ fontWeight: 600 }}
            >
              <Home className="h-4 w-4" /> Home
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
