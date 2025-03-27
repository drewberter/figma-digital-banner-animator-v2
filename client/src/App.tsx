import { useState, useEffect } from "react";
import Toolbar from "./components/Toolbar";
import LeftSidebar from "./components/LeftSidebar";
import PreviewCanvas from "./components/PreviewCanvas";
import Timeline from "./components/Timeline";
import PropertiesPanel from "./components/PropertiesPanel";
import ExportModal from "./components/ExportModal";
import PresetsPanel from "./components/PresetsPanel";
import AutoSaveIndicator from "./components/AutoSaveIndicator";
import { AnimationProvider } from "./context/AnimationContext";
import { PluginProvider } from "./context/PluginContext";
import { initializePlugin } from "./lib/figmaPlugin";

// Main App component
function App() {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPresetsPanelOpen, setIsPresetsPanelOpen] = useState(false);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Track auto-save state for notifications
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Initialize plugin when component mounts
  useEffect(() => {
    // Initialize the Figma plugin
    initializePlugin();
    console.log("Figma plugin initialized from App component");
  }, []);

  // Listen for auto-save events
  useEffect(() => {
    const originalConsoleLog = console.log;
    console.log = function(...args) {
      if (args[0] && typeof args[0] === 'string' && 
          (args[0].includes('auto-saved') || args[0].includes('Animation state'))) {
        setLastSaved(new Date());
        setSaving(false);
      }
      originalConsoleLog.apply(console, args);
    };
    
    return () => {
      console.log = originalConsoleLog;
    };
  }, []);

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
    
    // Reset playback when changing frames
    setCurrentTime(0);
    setIsPlaying(false);
  };
  
  // Handle timeline updates
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };
  
  // Handle play/pause toggle
  const handlePlayPauseToggle = (playing: boolean) => {
    setIsPlaying(playing);
  };

  return (
    <PluginProvider>
      <AnimationProvider>
        <div className="bg-[#0A0A0A] text-white h-screen flex flex-col">
          <Toolbar onExport={handleExport} onPreview={handlePreview} />
          
          <div className="flex-1 flex overflow-hidden">
            <LeftSidebar 
              onOpenPresets={handleOpenPresets} 
              onSelectFrame={handleFrameSelect}
            />
            
            <div className="flex-1 flex flex-col bg-neutral-900 overflow-hidden">
              <PreviewCanvas 
                selectedFrameId={selectedFrameId} 
                currentTime={currentTime} 
              />
              <Timeline 
                key={selectedFrameId} // Force re-render when frame changes
                onTimeUpdate={handleTimeUpdate}
                onPlayPauseToggle={handlePlayPauseToggle}
                isPlaying={isPlaying}
                currentTime={currentTime}
                selectedFrameId={selectedFrameId}
              />
            </div>
            
            <PropertiesPanel />
          </div>

          {isExportModalOpen && (
            <ExportModal onClose={() => setIsExportModalOpen(false)} />
          )}

          {isPresetsPanelOpen && (
            <PresetsPanel onClose={() => setIsPresetsPanelOpen(false)} />
          )}
          
          {/* Auto-save indicator */}
          <AutoSaveIndicator saving={saving} lastSaved={lastSaved} />
        </div>
      </AnimationProvider>
    </PluginProvider>
  );
}

export default App;