import { useEffect, useState } from "react";
import Toolbar from "./components/Toolbar";
import LeftSidebar from "./components/LeftSidebar";
import PreviewCanvas from "./components/PreviewCanvas";
import Timeline from "./components/Timeline";
import PropertiesPanel from "./components/PropertiesPanel";
import ExportModal from "./components/ExportModal";
import PresetsPanel from "./components/PresetsPanel";
import { usePluginContext } from "./context/PluginContext";
import { useAnimationContext } from "./context/AnimationContext";

function App() {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPresetsPanelOpen, setIsPresetsPanelOpen] = useState(false);
  const { initialized } = usePluginContext();
  const { loadAnimationState } = useAnimationContext();

  useEffect(() => {
    if (initialized) {
      // Load saved animation state when plugin is initialized
      loadAnimationState();
    }
  }, [initialized, loadAnimationState]);

  const handleExport = () => {
    setIsExportModalOpen(true);
  };

  const handlePreview = () => {
    // Toggle preview mode
    console.log("Toggle preview mode");
  };

  return (
    <div className="bg-neutral-900 text-white h-screen flex flex-col">
      <Toolbar onExport={handleExport} onPreview={handlePreview} />
      
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar onOpenPresets={() => setIsPresetsPanelOpen(true)} />
        
        <div className="flex-1 flex flex-col bg-neutral-900 overflow-hidden">
          <PreviewCanvas />
          <Timeline />
        </div>
        
        <PropertiesPanel />
      </div>

      {isExportModalOpen && (
        <ExportModal onClose={() => setIsExportModalOpen(false)} />
      )}

      {isPresetsPanelOpen && (
        <PresetsPanel onClose={() => setIsPresetsPanelOpen(false)} />
      )}
    </div>
  );
}

export default App;
