import { useState } from "react";
import Toolbar from "./components/Toolbar";
import FigmaFramesSidebar from "./components/FigmaFramesSidebar";
import PreviewCanvas from "./components/PreviewCanvas";
import Timeline from "./components/Timeline";
import PropertiesPanel from "./components/PropertiesPanel";
import ExportModal from "./components/ExportModal";
import PresetsPanel from "./components/PresetsPanel";
import { AnimationProvider } from "./context/AnimationContext";
import { PluginProvider } from "./context/PluginContext";

const AppContent = () => {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPresetsPanelOpen, setIsPresetsPanelOpen] = useState(false);
  const [selectedFrameId, setSelectedFrameId] = useState<string>('frame-1');

  const handleExport = () => {
    setIsExportModalOpen(true);
  };

  const handlePreview = () => {
    // Toggle preview mode
    console.log("Toggle preview mode");
  };
  
  const handleSelectFrame = (frameId: string) => {
    setSelectedFrameId(frameId);
    // Other logic to update the preview canvas would go here
    console.log(`Selected frame: ${frameId}`);
  };

  return (
    <div className="bg-[#1A1A1A] text-white h-screen flex flex-col">
      <Toolbar onExport={handleExport} onPreview={handlePreview} />
      
      <div className="flex-1 flex overflow-hidden">
        <FigmaFramesSidebar onSelectFrame={handleSelectFrame} />
        
        <div className="flex-1 flex flex-col bg-neutral-900 overflow-hidden">
          <PreviewCanvas />
          <Timeline />
        </div>
        
        <PropertiesPanel />
      </div>
      
      <button 
        className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        onClick={() => setIsPresetsPanelOpen(true)}
      >
        Animation Presets
      </button>

      {isExportModalOpen && (
        <ExportModal onClose={() => setIsExportModalOpen(false)} />
      )}

      {isPresetsPanelOpen && (
        <PresetsPanel onClose={() => setIsPresetsPanelOpen(false)} />
      )}
    </div>
  );
};

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
