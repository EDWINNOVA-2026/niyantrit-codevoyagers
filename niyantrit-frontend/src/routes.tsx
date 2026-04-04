import { Navigate, useRoutes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import OTP from "./pages/OTP";
import Issues from "./pages/Issues";
import ProjectDetail from "./pages/ProjectDetail";
import Profile from "./pages/Profile";
import RoleSelection from "./pages/RoleSelection";
import TenderDashboard from "./pages/TenderDashboard";

export function AppRoutes() {
  return useRoutes([
    { path: "/", element: <Login /> },
    { path: "/otp", element: <OTP /> },
    { path: "/role-selection", element: <RoleSelection /> },
    { path: "/dashboard", element: <Dashboard /> },
    { path: "/issues", element: <Issues /> },
    { path: "/profile", element: <Profile /> },
    { path: "/project/:projectId", element: <ProjectDetail /> },
    { path: "/tender", element: <TenderDashboard /> },
    { path: "*", element: <NotFound /> },
    { path: "", element: <Navigate to="/" replace /> },
  ]);
}
