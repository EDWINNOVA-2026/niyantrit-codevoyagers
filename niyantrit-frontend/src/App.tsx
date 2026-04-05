import { RouterProvider } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { router } from "./routes";
import { AppBackground } from "./components/AppBackground";

export default function App() {
  return (
    <AppProvider>
      <AppBackground>
        <RouterProvider router={router} />
      </AppBackground>
    </AppProvider>
  );
}
