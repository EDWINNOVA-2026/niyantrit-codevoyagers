import { createBrowserRouter } from "react-router-dom";
import Login from "./pages/Login";
import OTP from "./pages/OTP";
import Dashboard from "./pages/Dashboard";
import Issues from "./pages/Issues";
import ProjectDetail from "./pages/ProjectDetail";
import Profile from "./pages/Profile";
import TenderDashboard from "./pages/TenderDashboard";
import NotFound from "./pages/NotFound";

export const router = createBrowserRouter([
  { path: "/", Component: Login },
  { path: "/otp", Component: OTP },
  { path: "/dashboard", Component: Dashboard },
  { path: "/issues", Component: Issues },
  { path: "/project/:projectId", Component: ProjectDetail },
  { path: "/profile", Component: Profile },
  { path: "/tender", Component: TenderDashboard },
  { path: "*", Component: NotFound },
]);