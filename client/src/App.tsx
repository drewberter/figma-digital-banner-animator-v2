import { useState } from "react";
import Toolbar from "./components/Toolbar";
import LeftSidebar from "./components/LeftSidebar";
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
  const [selectedFrameId, setSelectedFrameId] = useState('frame-1');

  const handleExport = () => {
    setIsExportModalOpen(true);
  };

  const handlePreview = () => {
    // Toggle preview mode
    console.log("Toggle preview mode");
  };
  
  const handleOpenPresets = () => {
    setIsPresetsPanelOpen(true);
  };
  
  // Handle frame selection from left sidebar
  const handleFrameSelect = (frameId: string) => {
    console.log('App: Selected frame:', frameId);
    setSelectedFrameId(frameId);
  };

  return (
    <div className="bg-[#0A0A0A] text-white h-screen flex flex-col">
      <Toolbar onExport={handleExport} onPreview={handlePreview} />
      
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar 
          onOpenPresets={handleOpenPresets} 
          onSelectFrame={handleFrameSelect}
        />
        
        <div className="flex-1 flex flex-col bg-neutral-900 overflow-hidden">
          <PreviewCanvas selectedFrameId={selectedFrameId} />
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
};

function App() {
  return (
    <AnimationProvider>
      <PluginProvider>
        <AppContent />
      </PluginProvider>
    </AnimationProvider>
  );
}

export default App;
