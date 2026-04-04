import { KeyboardEvent, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { UserRole, useAppContext } from "../context/AppContext";

const OTP_LENGTH = 6;

function OTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOtp, loading, error: contextError, clearError } = useAppContext();

  const locationState =
    (location.state as { phone?: string; roleHint?: Exclude<UserRole, null> | null; devOtp?: string | null } | null) ||
    null;
  const phone = locationState?.phone || "";
  const roleHint = locationState?.roleHint || "user";
  const devOtp = locationState?.devOtp || null;

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<Exclude<UserRole, null>>(roleHint);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const otpValue = useMemo(() => digits.join(""), [digits]);

  const updateDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const next = [...digits];
    next[index] = value;
    setDigits(next);

    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const submitOtpVerification = async () => {
    clearError();

    if (!phone) {
      setError("Phone number is missing. Please restart sign in.");
      return;
    }

    if (otpValue.length !== OTP_LENGTH) {
      setError("Enter the full 6-digit OTP.");
      return;
    }

    setError("");
    try {
      const role = await verifyOtp(phone, otpValue, selectedRole);
      navigate(role === "tender" ? "/tender" : "/dashboard");
    } catch {
      // Error is surfaced via context error state.
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
      <Navbar />
      <main className="mx-auto flex min-h-[calc(100vh-1px)] w-full max-w-3xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="w-full rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">OTP Verification</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Enter the 6-digit code</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verify the OTP with backend validation before access is granted.
            {phone ? ` Code sent to +91 ${phone}.` : ""}
          </p>

          {devOtp ? (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              Demo OTP for local/dev mode: {devOtp}
            </p>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSelectedRole("user")}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                selectedRole === "user"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-foreground"
              }`}
            >
              Citizen Access
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole("tender")}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                selectedRole === "tender"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-foreground"
              }`}
            >
              Contractor Access
            </button>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2 sm:gap-3">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                value={digit}
                onChange={(event) => updateDigit(index, event.target.value)}
                onKeyDown={(event) => onKeyDown(index, event)}
                inputMode="numeric"
                maxLength={1}
                className="h-14 w-12 rounded-xl border border-border bg-background text-center text-xl font-bold text-foreground outline-none ring-primary transition focus:ring-2 sm:w-14"
              />
            ))}
          </div>

          {error ? <p className="mt-4 text-center text-sm font-medium text-destructive">{error}</p> : null}
          {contextError ? <p className="mt-2 text-center text-sm font-medium text-destructive">{contextError}</p> : null}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-xl border border-border bg-secondary px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary/70"
            >
              Back
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void submitOtpVerification()}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default OTP;
