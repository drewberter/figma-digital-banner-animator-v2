import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { PluginProvider } from "./context/PluginContext";

// Import the automated test runner
// This will automatically run the test suite after app initialization
import "./runTests";

createRoot(document.getElementById("root")!).render(
  <PluginProvider>
    <App />
  </PluginProvider>
);
