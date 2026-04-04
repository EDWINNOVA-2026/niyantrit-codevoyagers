import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAppContext } from "../context/AppContext";

function Login() {
  const navigate = useNavigate();
  const { loginWithCredentials, requestOtp, loading, error, clearError } = useAppContext();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  const normalizedPhone = useMemo(() => phone.replace(/\D/g, ""), [phone]);

  const onEmailSubmit = async (event: FormEvent) => {
    event.preventDefault();
    clearError();

    if (!email.trim() || !password) {
      setFormError("Enter both email and password.");
      return;
    }

    setFormError("");

    try {
      const role = await loginWithCredentials(email.trim(), password);
      navigate(role === "tender" ? "/tender" : "/dashboard");
    } catch {
      // Error is surfaced via context error state.
    }
  };

  const onPhoneSubmit = async (event: FormEvent) => {
    event.preventDefault();
    clearError();

    if (normalizedPhone.length !== 10) {
      setFormError("Enter a valid 10-digit mobile number.");
      return;
    }

    setFormError("");

    try {
      const otpResponse = await requestOtp(normalizedPhone);
      navigate("/otp", {
        state: {
          phone: normalizedPhone,
          roleHint: otpResponse.roleHint,
          devOtp: otpResponse.devOtp,
        },
      });
    } catch {
      // Error is surfaced via context error state.
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f2f6ff] via-[#eef4ff] to-[#f5f8ff]">
      <Navbar />
      <main className="mx-auto flex min-h-[calc(100vh-1px)] w-full max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_1fr]">
          <section className="hidden rounded-3xl border border-white/60 bg-gradient-to-br from-[#0a2f73] via-[#174ea6] to-[#1d4ed8] p-10 text-white shadow-2xl shadow-[#0a2f73]/25 lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#f6c453]">National Civic Interface</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight">
              Public infrastructure tracking for every district and every citizen.
            </h1>
            <p className="mt-4 max-w-xl text-sm text-blue-100">
              Report progress, monitor tenders, and follow project updates using one transparent digital channel aligned with governance workflows.
            </p>

            <div className="mt-8 grid gap-3 text-sm">
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">Live project status by ward and district</div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">Citizen and contractor role journeys</div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">Social update feed with progress visibility</div>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Sign In</p>
            <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Welcome to Niyantrit</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in using backend credentials or authenticate with real OTP verification.
            </p>

            <div className="mt-6 space-y-4">
              <form onSubmit={onEmailSubmit} className="space-y-3 rounded-2xl border border-border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Email Login
                </p>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none ring-primary transition focus:ring-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none ring-primary transition focus:ring-2"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  {loading ? "Signing in..." : "Sign in with Email"}
                </button>
              </form>

              <div className="relative text-center text-xs uppercase tracking-[0.15em] text-muted-foreground">
                <span className="bg-card px-2">or continue with phone otp</span>
                <div className="absolute left-0 top-1/2 -z-10 h-px w-full bg-border" />
              </div>

              <form onSubmit={onPhoneSubmit} className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground" htmlFor="phone">
                  Mobile Number
                </label>
                <div className="flex rounded-xl border border-border bg-background px-3 py-2.5">
                  <span className="mr-2 text-sm font-semibold text-muted-foreground">+91</span>
                  <input
                    id="phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="9876543210"
                    maxLength={10}
                    className="w-full bg-transparent text-sm font-medium text-foreground outline-none"
                  />
                </div>

                {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>
              </form>

              {formError ? <p className="text-sm font-medium text-destructive">{formError}</p> : null}
              {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

              <button
                type="button"
                onClick={() => navigate("/role-selection")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary/70"
              >
                Continue with Role Picker
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Login;
