import { AnimationProvider } from "./context/AnimationContext";
import { PluginProvider } from "./context/PluginContext";
import AppContent from "./components/AppContent";

// Main App component
function App() {
  return (
    <PluginProvider>
      <AnimationProvider>
        <AppContent />
      </AnimationProvider>
    </PluginProvider>
  );
}

export default App;