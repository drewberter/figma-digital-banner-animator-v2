import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { PluginProvider } from "./context/PluginContext";
import { AnimationProvider } from "./context/AnimationContext";

createRoot(document.getElementById("root")!).render(
  <PluginProvider>
    <AnimationProvider>
      <App />
    </AnimationProvider>
  </PluginProvider>
);
