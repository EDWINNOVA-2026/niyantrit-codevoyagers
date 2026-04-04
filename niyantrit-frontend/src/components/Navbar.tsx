import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { cn } from "../lib/utils";
import niyantritLogo from "../assets/niyantrit-logo.svg";

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, userRole, logout } = useAppContext();

  if (!isAuthenticated) {
    return null;
  }

  const projectsPath = userRole === "tender" ? "/tender" : "/dashboard";

  const navItems = [
    {
      label: "Projects",
      to: projectsPath,
      isActive: location.pathname === projectsPath || location.pathname.startsWith("/project/"),
    },
    {
      label: "Issues",
      to: "/issues",
      isActive: location.pathname.startsWith("/issues"),
    },
    {
      label: "Profile",
      to: "/profile",
      isActive: location.pathname.startsWith("/profile"),
    },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate(projectsPath)}
          className="flex items-center gap-3 text-left"
        >
          <img
            src={niyantritLogo}
            alt="Niyantrit"
            className="h-11 w-11 rounded-lg object-contain"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Niyantrit Civic Grid
            </p>
            <p className="text-sm font-bold text-foreground">Project Monitoring Interface</p>
          </div>
        </button>

        <nav className="flex items-center gap-2 rounded-xl border border-border bg-card/70 p-1">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                item.isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-secondary"
              )}
            >
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
