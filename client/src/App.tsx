import { useState, useEffect, useRef } from "react";
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

function App() {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPresetsPanelOpen, setIsPresetsPanelOpen] = useState(false);
  const [selectedFrameId, setSelectedFrameId] = useState('frame-1');
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineDuration, setTimelineDuration] = useState(5); // Default 5 seconds
  
  // Track auto-save state for notifications
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Listen for auto-save events
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'figma-animation-plugin' && e.newValue) {
        setLastSaved(new Date());
        setSaving(false);
      }
    };
    
    // Also listen for console logs of auto-save
    const originalConsoleLog = console.log;
    console.log = function(...args) {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('auto-saved')) {
        setLastSaved(new Date());
        setSaving(false);
      }
      originalConsoleLog.apply(console, args);
    };
    
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
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
  };
  
  // Handle timeline updates
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };
  
  // Handle layer linking through Timeline component
  const handleLinkLayers = () => {
    console.log("App: Linking layers by name");
    // This will be handled by the Timeline component directly
  };
  
  const handleUnlinkLayer = (layerId: string) => {
    console.log("App: Unlinking layer", layerId);
    // This will be handled by the Timeline component directly
  };
  
  // Track animation frame ID in a ref so we can cancel it
  const animationFrameIdRef = useRef<number | null>(null);
  
  // Handle play/pause toggle
  const handlePlayPauseToggle = (playing: boolean) => {
    // Reset to beginning if we're at the end of the timeline and trying to play
    if (playing && currentTime >= timelineDuration) {
      setCurrentTime(0);
    }
    
    setIsPlaying(playing);
    
    // If we're stopping playback, cancel the animation frame
    if (!playing) {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      return;
    }
    
    // If we're starting playback, set up the animation loop
    if (playing) {
      const startTime = performance.now();
      const initialTime = currentTime;
      
      const animationFrame = (now: number) => {
        const elapsed = (now - startTime) / 1000; // Convert to seconds
        const newTime = initialTime + elapsed;
        
        // If we reach the end of the timeline, stop playing
        if (newTime >= timelineDuration) {
          setCurrentTime(timelineDuration);
          setIsPlaying(false);
          animationFrameIdRef.current = null;
          return;
        }
        
        setCurrentTime(newTime);
        animationFrameIdRef.current = requestAnimationFrame(animationFrame);
      };
      
      // Start the animation loop
      animationFrameIdRef.current = requestAnimationFrame(animationFrame);
    }
  }
  
  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

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
                onTimeUpdate={handleTimeUpdate}
                onPlayPauseToggle={handlePlayPauseToggle}
                isPlaying={isPlaying}
                currentTime={currentTime}
                selectedFrameId={selectedFrameId}
                onDurationChange={setTimelineDuration}
                onLinkLayers={handleLinkLayers}
                onUnlinkLayer={handleUnlinkLayer}
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