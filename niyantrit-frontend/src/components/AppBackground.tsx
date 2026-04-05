import { ReactNode } from "react";

export function AppBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Decorative background layer */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-white" />

        {/* Gradient orbs */}
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-200/20 blur-[120px]" />
        <div className="absolute top-1/3 -left-60 h-[400px] w-[400px] rounded-full bg-indigo-200/15 blur-[100px]" />
        <div className="absolute -bottom-32 right-1/4 h-[350px] w-[350px] rounded-full bg-sky-200/20 blur-[100px]" />
        <div className="absolute top-2/3 right-10 h-[250px] w-[250px] rounded-full bg-violet-200/10 blur-[80px]" />

        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--muted-foreground) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Subtle diagonal lines */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, transparent, transparent 60px, var(--border) 60px, var(--border) 61px)",
          }}
        />
      </div>

      {/* Page content */}
      <div className="relative">{children}</div>
    </div>
  );
}
