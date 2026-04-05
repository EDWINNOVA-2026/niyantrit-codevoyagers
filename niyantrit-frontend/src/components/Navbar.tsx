import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import {
  LayoutDashboard,
  AlertTriangle,
  User,
  LogOut,
  Menu,
  X,
  Shield,
} from "lucide-react";

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, userRole, logout } = useAppContext();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!isAuthenticated) return null;

  const projectsPath = userRole === "tender" ? "/tender" : "/dashboard";

  const navItems = [
    {
      label: "Projects",
      to: projectsPath,
      icon: LayoutDashboard,
      isActive:
        location.pathname === projectsPath ||
        location.pathname.startsWith("/project/"),
    },
    {
      label: "Issues",
      to: "/issues",
      icon: AlertTriangle,
      isActive: location.pathname.startsWith("/issues"),
    },
    {
      label: "Profile",
      to: "/profile",
      icon: User,
      isActive: location.pathname.startsWith("/profile"),
    },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-white/60 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate(projectsPath)}
          className="flex items-center gap-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-lg shadow-blue-600/20">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <p
              className="text-[9px] tracking-[0.25em] text-primary uppercase"
              style={{ fontWeight: 600 }}
            >
              Niyantrit Civic Grid
            </p>
            <p className="text-sm text-foreground" style={{ fontWeight: 700 }}>
              Project Monitoring
            </p>
          </div>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 rounded-xl border border-border bg-slate-50 p-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={
                "flex items-center gap-2 rounded-lg px-4 py-2 text-xs transition-colors " +
                (item.isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-white hover:text-foreground")
              }
              style={{ fontWeight: item.isActive ? 700 : 600 }}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-700"
            style={{ fontWeight: 600 }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-xl border border-border bg-white p-2 shadow-sm md:hidden"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t border-border/50 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition " +
                  (item.isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-slate-50")
                }
                style={{ fontWeight: item.isActive ? 700 : 600 }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/");
                setMobileOpen(false);
              }}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-700 transition hover:bg-red-50"
              style={{ fontWeight: 600 }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
export { Navbar };
