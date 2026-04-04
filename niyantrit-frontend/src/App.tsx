import { BrowserRouter } from "react-router-dom";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { AppProvider } from "./context/AppContext";
import { AppRoutes } from "./routes";

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppErrorBoundary>
          <AppRoutes />
        </AppErrorBoundary>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
