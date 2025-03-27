import { useState, useEffect } from "react";
import Toolbar from "./Toolbar";
import LeftSidebar from "./LeftSidebar";
import PreviewCanvas from "./PreviewCanvas";
import Timeline from "./Timeline";
import PropertiesPanel from "./PropertiesPanel";
import ExportModal from "./ExportModal";
import PresetsPanel from "./PresetsPanel";
import AutoSaveIndicator from "./AutoSaveIndicator";
import { useAnimationContext } from "../context/AnimationContext";
import { initializePlugin } from "../lib/figmaPlugin";

// Main AppContent component that uses AnimationContext
const AppContent = () => {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPresetsPanelOpen, setIsPresetsPanelOpen] = useState(false);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Track auto-save state for notifications
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Get data from animation context
  const animationContext = useAnimationContext();

  // Initialize plugin when component mounts
  useEffect(() => {
    // Initialize the Figma plugin
    initializePlugin();
    console.log("Figma plugin initialized from AppContent component");
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
    console.log('AppContent: Selected frame:', frameId);
    setSelectedFrameId(frameId);
    
    // Update Animation Context
    if (animationContext.selectFrame) {
      animationContext.selectFrame(frameId);
    }
    
    // Reset playback when changing frames
    setCurrentTime(0);
    setIsPlaying(false);
  };
  
  // Handle timeline updates
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
    
    // Update Animation Context
    if (animationContext.setCurrentTime) {
      animationContext.setCurrentTime(time);
    }
  };
  
  // Handle play/pause toggle
  const handlePlayPauseToggle = (playing: boolean) => {
    setIsPlaying(playing);
    
    // Update Animation Context
    if (animationContext.togglePlayback && playing !== animationContext.isPlaying) {
      animationContext.togglePlayback();
    }
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
          <PreviewCanvas 
            selectedFrameId={selectedFrameId} 
            currentTime={currentTime}
            frames={animationContext.frames}
            layers={animationContext.layers}
          />
          <Timeline 
            key={selectedFrameId} // Force re-render when frame changes
            onTimeUpdate={handleTimeUpdate}
            onPlayPauseToggle={handlePlayPauseToggle}
            isPlaying={isPlaying}
            currentTime={currentTime}
            selectedFrameId={selectedFrameId}
            updateLayerAnimation={animationContext.updateLayerAnimation}
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
  );
};

export default AppContent;