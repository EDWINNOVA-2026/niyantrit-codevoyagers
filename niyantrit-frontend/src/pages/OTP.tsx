import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAppContext } from "../context/AppContext";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { firebaseAuth, firebaseEnabled, formatPhoneE164 } from "../lib/firebase";
import { Shield, ArrowLeft, CheckCircle } from "lucide-react";

const OTP_LENGTH = 6;

export default function OTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    verifyOtp,
    sendOtp,
    loginWithFirebase,
    loading,
    error: contextError,
    clearError,
  } = useAppContext();

  const locationState =
    (location.state as {
      phone?: string;
      roleHint?: string | null;
      devOtp?: string | null;
    } | null) || null;
  const phone = locationState?.phone || "";
  const roleHint = locationState?.roleHint ?? null;
  const devOtp = locationState?.devOtp || null;

  const [digits, setDigits] = useState<string[]>(
    Array(OTP_LENGTH).fill(""),
  );
  const [error, setError] = useState("");
  const [devOtpValue, setDevOtpValue] = useState<string | null>(devOtp);
  const [resendLoading, setResendLoading] = useState(false);
  const [confirmation, setConfirmation] =
    useState<ConfirmationResult | null>(null);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const sentOnceRef = useRef(false);

  const otpValue = useMemo(() => digits.join(""), [digits]);

  const updateDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < OTP_LENGTH - 1)
      inputsRef.current[index + 1]?.focus();
  };

  const onKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !digits[index] && index > 0)
      inputsRef.current[index - 1]?.focus();
  };

  const submit = async () => {
    clearError();
    if (!phone) {
      setError("Phone number missing. Please restart.");
      return;
    }
    if (otpValue.length !== OTP_LENGTH) {
      setError("Enter the full 6-digit OTP.");
      return;
    }
    setError("");
    try {
      if (firebaseEnabled) {
        if (!confirmation) {
          setError("OTP has not been sent yet. Please resend.");
          return;
        }

        const userCredential = await confirmation.confirm(otpValue);
        const idToken = await userCredential.user.getIdToken();
        const role = await loginWithFirebase(idToken, roleHint, phone);
        navigate(role === "tender" ? "/tender" : "/dashboard");
        return;
      }

      const role = await verifyOtp(phone, otpValue, roleHint);
      navigate(role === "tender" ? "/tender" : "/dashboard");
    } catch {}
  };

  const sendFirebaseOtp = async () => {
    if (!firebaseAuth) {
      setError("Firebase authentication is not configured.");
      return;
    }

    const formatted = formatPhoneE164(phone);
    if (!formatted) {
      setError("Enter a valid phone number.");
      return;
    }

    if (recaptchaRef.current) {
      recaptchaRef.current.clear();
      recaptchaRef.current = null;
    }

    recaptchaRef.current = new RecaptchaVerifier(firebaseAuth, "recaptcha-container", {
      size: "invisible",
    });

    const confirmationResult = await signInWithPhoneNumber(
      firebaseAuth,
      formatted,
      recaptchaRef.current,
    );

    setConfirmation(confirmationResult);
    setDevOtpValue(null);
  };

  useEffect(() => {
    const triggerOtp = async () => {
      if (!phone) {
        setError("No phone number found. Please go back.");
        return;
      }
      if (sentOnceRef.current) return;
      sentOnceRef.current = true;

      try {
        if (firebaseEnabled) {
          await sendFirebaseOtp();
          return;
        }

        if (devOtpValue) return;
        const response = await sendOtp(phone);
        setDevOtpValue(response.devOtp ?? null);
      } catch {
        setError("Failed to send OTP. Please try again.");
      }
    };

    triggerOtp();
  }, [devOtpValue, phone, sendOtp]);

  const handleResend = async () => {
    if (!phone) {
      setError("No phone number found. Please go back.");
      return;
    }
    clearError();
    setResendLoading(true);
    try {
      if (firebaseEnabled) {
        await sendFirebaseOtp();
        setResendLoading(false);
        return;
      }

      const response = await sendOtp(phone);
      setDevOtpValue(response.devOtp ?? null);
    } catch {
      setError("Failed to resend OTP. Please try again.");
    }
    setResendLoading(false);
  };

  useEffect(() => {
    return () => {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      {/* Minimal top bar for unauthenticated state */}
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

      <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-xl items-center px-4 py-8 sm:px-6">
        <section className="w-full rounded-3xl border border-border bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100">
            <CheckCircle className="h-6 w-6 text-blue-700" />
          </div>

          <p
            className="mt-4 text-xs tracking-[0.2em] text-primary uppercase"
            style={{ fontWeight: 600 }}
          >
            OTP Verification
          </p>
          <h1
            className="mt-2 text-2xl text-foreground sm:text-3xl"
            style={{ fontWeight: 700 }}
          >
            Enter the 6-digit code
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verify the OTP sent to {phone ? `+91 ${phone}` : "your phone"}.
          </p>

          {devOtpValue && (
            <div
              className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700"
              style={{ fontWeight: 600 }}
            >
              Demo OTP: {devOtpValue}
            </div>
          )}

          {/* OTP inputs */}
          <div className="mt-8 flex justify-center gap-3">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                value={digit}
                onChange={(e) => updateDigit(index, e.target.value)}
                onKeyDown={(e) => onKeyDown(index, e)}
                inputMode="numeric"
                maxLength={1}
                className="h-14 w-12 rounded-xl border-2 border-border bg-slate-50 text-center text-xl text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2 sm:w-14"
                style={{ fontWeight: 700 }}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="text-xs text-primary transition hover:text-primary/80 disabled:opacity-60"
              style={{ fontWeight: 600 }}
            >
              {resendLoading ? "Sending again..." : "Resend OTP"}
            </button>
          </div>

          <div id="recaptcha-container" className="hidden" />

          {(error || contextError) && (
            <div
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700"
              style={{ fontWeight: 500 }}
            >
              {error || contextError}
            </div>
          )}

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-5 py-3 text-sm text-foreground transition hover:bg-slate-100"
              style={{ fontWeight: 600 }}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={submit}
              className="flex-1 rounded-xl bg-primary px-5 py-3 text-sm text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:opacity-60"
              style={{ fontWeight: 600 }}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
