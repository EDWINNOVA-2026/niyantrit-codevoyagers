import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { firebaseAuth, firebaseEnabled } from "../lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import {
  Shield,
  Mail,
  Phone,
  ArrowRight,
  Building2,
  Users,
  BarChart3,
  HardHat,
  User,
  Lock,
  Fingerprint,
  Eye,
  EyeOff,
} from "lucide-react";

const NAVY = "#1A237E";
const NAVY_LIGHT = "#283593";
const NAVY_DARK = "#0D1642";

const fontPublic: React.CSSProperties = {
  fontFamily: "'Public Sans', system-ui, sans-serif",
};

export default function Login() {
  const navigate = useNavigate();
  const { loginWithCredentials, loginWithFirebase, requestOtp, error, clearError } =
    useAppContext();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [role, setRole] = useState<"citizen" | "contractor">("citizen");
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<"otp" | "email">("otp");
  const [submitting, setSubmitting] = useState(false);

  const normalizedPhone = useMemo(() => phone.replace(/\D/g, ""), [phone]);

  const onEmailSubmit = async (event: FormEvent) => {
    event.preventDefault();
    clearError();
    if (!email.trim() || !password) {
      setFormError("Enter both email and password.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      const r = await loginWithCredentials(email.trim(), password);
      navigate(r === "tender" ? "/tender" : "/dashboard");
    } catch {}
    finally {
      setSubmitting(false);
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
    setSubmitting(true);
    try {
      if (firebaseEnabled) {
        navigate("/otp", {
          state: {
            phone: normalizedPhone,
            roleHint: role,
          },
        });
        return;
      }

      const otpResponse = await requestOtp(normalizedPhone);
      navigate("/otp", {
        state: {
          phone: normalizedPhone,
          roleHint: role,
          devOtp: otpResponse.devOtp,
        },
      });
    } catch {}
    finally {
      setSubmitting(false);
    }
  };

  const onGoogleSignIn = async () => {
    clearError();
    setFormError("");

    if (!firebaseEnabled || !firebaseAuth) {
      setFormError("Firebase is not configured for Google Sign-In.");
      return;
    }

    setSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const credential = await signInWithPopup(firebaseAuth, provider);
      const idToken = await credential.user.getIdToken();
      const signedInRole = await loginWithFirebase(idToken, role);
      navigate(signedInRole === "tender" ? "/tender" : "/dashboard");
    } catch {
      setFormError(
        "Google sign-in failed. Ensure Firebase Google provider is enabled and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ ...fontPublic, background: "#F5F6FA" }}
    >
      {/* Geometric background pattern */}
      <div className="pointer-events-none absolute inset-0">
        {/* Grid pattern */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path
                d="M 60 0 L 0 0 0 60"
                fill="none"
                stroke="#64748b"
                strokeWidth="0.5"
              />
            </pattern>
            <pattern
              id="hexagons"
              width="56"
              height="100"
              patternUnits="userSpaceOnUse"
              patternTransform="translate(0,0)"
            >
              <polygon
                points="24.8,22 37.2,29 37.2,43 24.8,50 12.4,43 12.4,29"
                fill="none"
                stroke="#475569"
                strokeWidth="0.5"
              />
              <polygon
                points="24.8,72 37.2,79 37.2,93 24.8,100 12.4,93 12.4,79"
                fill="none"
                stroke="#475569"
                strokeWidth="0.5"
              />
              <polygon
                points="52.8,47 65.2,54 65.2,68 52.8,75 40.4,68 40.4,54"
                fill="none"
                stroke="#475569"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <rect width="100%" height="100%" fill="url(#hexagons)" opacity="0.5" />
        </svg>
        {/* Subtle radial glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(ellipse, rgba(26,35,126,0.07) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Top bar */}
      <header
        className="relative z-10 border-b"
        style={{
          borderColor: "rgba(26,35,126,0.08)",
          background: "rgba(255,255,255,0.7)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: NAVY }}
            >
              <Shield className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <p
                className="text-[9px] tracking-[0.25em] uppercase"
                style={{ color: NAVY, fontWeight: 600 }}
              >
                Government of India
              </p>
              <p className="text-sm" style={{ color: NAVY_DARK, fontWeight: 700 }}>
                NIYANTRIT
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: "#64748b" }}>
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span style={{ fontWeight: 500 }}>System Online</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl items-center px-4 py-6 sm:px-6 lg:min-h-[calc(100vh-56px)] lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
          {/* Left panel */}
          <section className="hidden lg:flex flex-col justify-center py-8">
            <div className="mb-8">
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase"
                style={{
                  background: "rgba(26,35,126,0.06)",
                  color: NAVY,
                  fontWeight: 700,
                }}
              >
                <Fingerprint className="h-3 w-3" />
                National Civic Intelligence Platform
              </div>
              <h1
                className="mt-5 leading-tight"
                style={{
                  fontSize: "2.5rem",
                  fontWeight: 800,
                  color: NAVY_DARK,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                }}
              >
                Project Monitoring
                <br />
                <span style={{ color: NAVY }}>System</span>
              </h1>
              <p
                className="mt-4 max-w-md text-sm leading-relaxed"
                style={{ color: "#64748b", fontWeight: 400 }}
              >
                Transparent infrastructure tracking across every district.
                Report progress, monitor tenders, and follow AI-powered project
                risk analysis in real-time.
              </p>
            </div>

            <div className="grid gap-3">
              {[
                {
                  icon: Building2,
                  label: "200+ Projects Monitored",
                  desc: "Real-time tracking across all states",
                  color: "#1A237E",
                },
                {
                  icon: Users,
                  label: "Role-Based Access",
                  desc: "Citizen & Contractor portals",
                  color: "#0277BD",
                },
                {
                  icon: BarChart3,
                  label: "AI Risk Intelligence",
                  desc: "Predictive scoring & smart routing",
                  color: "#00695C",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-4 rounded-lg p-4 transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.6)",
                    border: "1px solid rgba(226,232,240,0.8)",
                  }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${item.color}0D` }}
                  >
                    <item.icon className="h-5 w-5" style={{ color: item.color }} />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: NAVY_DARK, fontWeight: 600 }}>
                      {item.label}
                    </p>
                    <p className="text-xs" style={{ color: "#94a3b8", fontWeight: 400 }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex items-center gap-6">
              {["256-bit Encrypted", "CERT-In Compliant", "NIC Hosted"].map((badge) => (
                <div
                  key={badge}
                  className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider"
                  style={{ color: "#94a3b8", fontWeight: 600 }}
                >
                  <Shield className="h-3 w-3" />
                  {badge}
                </div>
              ))}
            </div>
          </section>

          {/* Right – Glassmorphism Login Card */}
          <section className="flex flex-col justify-center">
            <div
              className="rounded-lg p-6 sm:p-8"
              style={{
                background: "rgba(255,255,255,0.72)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.8)",
                boxShadow:
                  "0 4px 32px rgba(26,35,126,0.06), 0 1px 4px rgba(0,0,0,0.04)",
                borderRadius: "8px",
              }}
            >
              {/* Mobile header */}
              <div className="flex items-center gap-2.5 lg:hidden mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: NAVY }}>
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm" style={{ fontWeight: 700, color: NAVY_DARK }}>
                  NIYANTRIT
                </span>
              </div>

              <p className="text-[10px] tracking-[0.2em] uppercase" style={{ color: NAVY, fontWeight: 700 }}>
                Secure Login
              </p>
              <h2
                className="mt-1.5"
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: NAVY_DARK,
                  letterSpacing: "-0.01em",
                }}
              >
                Welcome back
              </h2>
              <p className="mt-1 text-sm" style={{ color: "#64748b", fontWeight: 400 }}>
                Sign in as a{" "}
                <span style={{ fontWeight: 600, color: NAVY }}>
                  {role === "citizen" ? "Citizen" : "Contractor"}
                </span>
                {" "}to access your portal.
              </p>

              <div className="mt-5 flex p-0.5 rounded-lg" style={{ background: "#EEF0F6", border: "1px solid #E2E5EF" }}>
                {(["citizen", "contractor"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className="flex flex-1 items-center justify-center gap-2 py-2.5 text-xs transition-all"
                    style={{
                      borderRadius: "6px",
                      fontWeight: role === r ? 700 : 500,
                      color: role === r ? NAVY : "#94a3b8",
                      background: role === r ? "#fff" : "transparent",
                      boxShadow: role === r ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                    }}
                  >
                    {r === "citizen" ? (
                      <User className="h-3.5 w-3.5" />
                    ) : (
                      <HardHat className="h-3.5 w-3.5" />
                    )}
                    {r === "citizen" ? "Citizen" : "Contractor"}
                  </button>
                ))}
              </div>

              {firebaseEnabled && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={onGoogleSignIn}
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm transition-all disabled:opacity-60"
                    style={{
                      borderColor: "#E2E5EF",
                      background: "#fff",
                      color: NAVY_DARK,
                      fontWeight: 700,
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path d="M21.805 10.023H12v3.955h5.617c-.242 1.273-.969 2.352-2.063 3.075v2.554h3.332c1.95-1.796 3.074-4.44 3.074-7.584 0-.667-.06-1.308-.155-1.955Z" fill="#4285F4"/>
                      <path d="M12 22c2.79 0 5.129-.925 6.839-2.393l-3.332-2.554c-.925.62-2.108.985-3.507.985-2.699 0-4.982-1.822-5.8-4.275H2.756v2.634A10 10 0 0 0 12 22Z" fill="#34A853"/>
                      <path d="M6.2 13.763A5.993 5.993 0 0 1 5.876 12c0-.612.11-1.206.324-1.763V7.603H2.756A10 10 0 0 0 2 12c0 1.61.386 3.132 1.068 4.397L6.2 13.763Z" fill="#FBBC05"/>
                      <path d="M12 5.962c1.518 0 2.883.522 3.955 1.548l2.966-2.967C17.12 2.87 14.78 2 12 2A10 10 0 0 0 3.068 7.603L6.2 10.237C7.018 7.784 9.301 5.962 12 5.962Z" fill="#EA4335"/>
                    </svg>
                    {submitting ? "Please wait..." : "Continue with Google"}
                  </button>
                </div>
              )}

              {/* Login mode tabs */}
              <div className="mt-5 flex gap-4 border-b" style={{ borderColor: "#E2E5EF" }}>
                {[
                  { key: "otp" as const, label: "Mobile OTP", icon: Phone },
                  { key: "email" as const, label: "Email Login", icon: Mail },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setLoginMode(key)}
                    className="flex items-center gap-1.5 pb-3 text-xs transition-colors relative"
                    style={{
                      fontWeight: loginMode === key ? 700 : 500,
                      color: loginMode === key ? NAVY : "#94a3b8",
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    {loginMode === key && (
                      <span
                        className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                        style={{ background: NAVY }}
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-5">
                {/* OTP Login */}
                {loginMode === "otp" && (
                  <form onSubmit={onPhoneSubmit} className="space-y-4">
                    <div>
                      <label
                        className="block text-[11px] tracking-wider uppercase mb-1.5"
                        style={{ color: "#64748b", fontWeight: 600 }}
                        htmlFor="phone"
                      >
                        Mobile Number
                      </label>
                      <div
                        className="flex items-center rounded-lg overflow-hidden transition-all"
                        style={{ border: "1.5px solid #E2E5EF", background: "#FAFBFD" }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = NAVY;
                          e.currentTarget.style.boxShadow = `0 0 0 3px ${NAVY}14`;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#E2E5EF";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <span className="flex items-center gap-1 pl-3.5 pr-2 text-xs" style={{ color: "#94a3b8", fontWeight: 600 }}>
                          🇮🇳 +91
                        </span>
                        <div className="w-px h-6 bg-[#E2E5EF]" />
                        <input
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Enter 10-digit mobile number"
                          maxLength={10}
                          className="w-full bg-transparent px-3 py-3 text-sm outline-none"
                          style={{
                            color: NAVY_DARK,
                            fontWeight: 500,
                            fontFamily: "'Public Sans', sans-serif",
                          }}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm text-white transition-all disabled:opacity-60"
                      style={{
                        background: NAVY,
                        fontWeight: 700,
                        boxShadow: `0 2px 8px ${NAVY}30`,
                        letterSpacing: "0.02em",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = NAVY_LIGHT;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = NAVY;
                      }}
                    >
                      {submitting ? "Sending OTP..." : "Send OTP"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                )}

                {/* Email Login */}
                {loginMode === "email" && (
                  <form onSubmit={onEmailSubmit} className="space-y-4">
                    <div>
                      <label
                        className="block text-[11px] tracking-wider uppercase mb-1.5"
                        style={{ color: "#64748b", fontWeight: 600 }}
                        htmlFor="email"
                      >
                        Email Address
                      </label>
                      <div
                        className="flex items-center rounded-lg overflow-hidden transition-all"
                        style={{ border: "1.5px solid #E2E5EF", background: "#FAFBFD" }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = NAVY;
                          e.currentTarget.style.boxShadow = `0 0 0 3px ${NAVY}14`;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#E2E5EF";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <span className="pl-3.5 pr-2">
                          <Mail className="h-4 w-4" style={{ color: "#94a3b8" }} />
                        </span>
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full bg-transparent px-2 py-3 text-sm outline-none"
                          style={{
                            color: NAVY_DARK,
                            fontWeight: 500,
                            fontFamily: "'Public Sans', sans-serif",
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        className="block text-[11px] tracking-wider uppercase mb-1.5"
                        style={{ color: "#64748b", fontWeight: 600 }}
                        htmlFor="password"
                      >
                        Password
                      </label>
                      <div
                        className="flex items-center rounded-lg overflow-hidden transition-all"
                        style={{ border: "1.5px solid #E2E5EF", background: "#FAFBFD" }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = NAVY;
                          e.currentTarget.style.boxShadow = `0 0 0 3px ${NAVY}14`;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#E2E5EF";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <span className="pl-3.5 pr-2">
                          <Lock className="h-4 w-4" style={{ color: "#94a3b8" }} />
                        </span>
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full bg-transparent px-2 py-3 text-sm outline-none"
                          style={{
                            color: NAVY_DARK,
                            fontWeight: 500,
                            fontFamily: "'Public Sans', sans-serif",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="pr-3.5 pl-2"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" style={{ color: "#94a3b8" }} />
                          ) : (
                            <Eye className="h-4 w-4" style={{ color: "#94a3b8" }} />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm text-white transition-all disabled:opacity-60"
                      style={{
                        background: NAVY,
                        fontWeight: 700,
                        boxShadow: `0 2px 8px ${NAVY}30`,
                        letterSpacing: "0.02em",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = NAVY_LIGHT;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = NAVY;
                      }}
                    >
                      {submitting
                        ? "Signing in..."
                        : "Sign in"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                )}

                {/* Error */}
                {(formError || error) && (
                  <div
                    className="mt-4 rounded-lg px-3.5 py-3 text-xs"
                    style={{
                      background: "#FEF2F2",
                      border: "1px solid #FECACA",
                      color: "#991B1B",
                      fontWeight: 500,
                    }}
                  >
                    {formError || error}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-5" style={{ borderTop: "1px solid #E2E5EF" }}>
                <p className="text-center text-[10px]" style={{ color: "#94a3b8", fontWeight: 500 }}>
                  By signing in you agree to the{" "}
                  <span style={{ color: NAVY, fontWeight: 600, cursor: "pointer" }}>
                    Terms of Service
                  </span>
                  {" "}and{" "}
                  <span style={{ color: NAVY, fontWeight: 600, cursor: "pointer" }}>
                    Privacy Policy
                  </span>
                </p>
              </div>
            </div>

            {/* Bottom badge */}
            <div className="mt-4 flex items-center justify-center gap-2 text-[10px]" style={{ color: "#94a3b8", fontWeight: 500 }}>
              <Shield className="h-3 w-3" />
              Secured by Government of India • NIC Infrastructure
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
