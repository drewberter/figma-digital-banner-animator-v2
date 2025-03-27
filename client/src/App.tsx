import { useState, useEffect, useRef } from "react";
import Toolbar from "./components/Toolbar";
import LeftSidebar from "./components/LeftSidebar";
import PreviewCanvas from "./components/PreviewCanvas";
import Timeline from "./components/Timeline";
import PropertiesPanel from "./components/PropertiesPanel";
import ExportModal from "./components/ExportModal";
import PresetsPanel from "./components/PresetsPanel";
import AutoSaveIndicator from "./components/AutoSaveIndicator";
import { AnimationProvider, useAnimationContext } from "./context/AnimationContext";
import { PluginProvider } from "./context/PluginContext";
import { TimelineMode } from "./types/animation";

function App() {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPresetsPanelOpen, setIsPresetsPanelOpen] = useState(false);
  const [selectedFrameId, setSelectedFrameId] = useState('frame-1');
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineDuration, setTimelineDuration] = useState(5); // Default 5 seconds
  const [timelineMode, setTimelineMode] = useState<TimelineMode>(TimelineMode.Animation);
  
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
    console.log = function(...args: any[]) {
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
    // The actual unlinking is handled in the Timeline component
    // This function is just a callback to inform the App component
  };
  
  // Handle timeline mode changes
  const handleTimelineModeChange = (mode: TimelineMode) => {
    console.log(`App: Switching to ${mode} mode`);
    setTimelineMode(mode);
  };
  
  // Track animation frame ID in a ref so we can cancel it
  const animationFrameIdRef = useRef<number | null>(null);
  
  // Track frame sequence playback
  const [frameSequenceData, setFrameSequenceData] = useState({
    currentFrameIndex: 0,
    frameIds: [] as string[],
    frameTotalDurations: new Map<string, number>(),   // Total duration including delay
    frameStartTimes: new Map<string, number>()        // When this frame starts in the sequence
  });
  
  // We'll get access to animation context data within the AnimationProvider wrapper

  // Initialize or update frame sequence data when frames or mode changes
  // This will be updated in wrapped Timeline component
  useEffect(() => {
    // Only update in GIF Frames mode - this will now get data from mock objects instead of context
    if (timelineMode !== TimelineMode.GifFrames) return;
    
    // Hardcode frame IDs for development (in real app, would use context)
    const frameIds = ['frame-1', 'frame-2', 'frame-3', 'frame-4'];
    
    // Calculate frame durations including their delay
    const frameTotalDurations = new Map<string, number>();
    const frameStartTimes = new Map<string, number>();
    
    let cumulativeTime = 0;
    frameIds.forEach(frameId => {
      // Use 2.5s delays as shown in the screenshot
      const frameDelay = 2.5; // Match the delay shown in the screenshot
      
      // Start time is the cumulative time before this frame
      frameStartTimes.set(frameId, cumulativeTime);
      
      // Each frame plays for its delay plus the animation duration
      const frameTotalDuration = frameDelay + timelineDuration;
      frameTotalDurations.set(frameId, frameTotalDuration);
      
      // Add this frame's duration to the cumulative time
      cumulativeTime += frameTotalDuration;
    });
    
    setFrameSequenceData({
      currentFrameIndex: frameIds.indexOf(selectedFrameId),
      frameIds,
      frameTotalDurations,
      frameStartTimes
    });
    
  }, [timelineMode, selectedFrameId, timelineDuration]);

  // Handle play/pause toggle
  const handlePlayPauseToggle = (playing: boolean) => {
    // Reset time if we're at the end or changing modes
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
        
        // Different playback behavior based on timeline mode
        if (timelineMode === TimelineMode.Animation) {
          // Standard animation mode - plays a single animation
          const newTime = initialTime + elapsed;
          
          // If we reach the end of the timeline, stop playing
          if (newTime >= timelineDuration) {
            setCurrentTime(timelineDuration);
            setIsPlaying(false);
            animationFrameIdRef.current = null;
            return;
          }
          
          setCurrentTime(newTime);
        } 
        else if (timelineMode === TimelineMode.GifFrames) {
          // GIF frames sequence mode - plays through all frames
          const { frameIds, frameTotalDurations, frameStartTimes } = frameSequenceData;
          
          if (frameIds.length === 0) {
            setIsPlaying(false);
            animationFrameIdRef.current = null;
            return;
          }
          
          const newTime = initialTime + elapsed;
          
          // Calculate total sequence duration
          const totalSequenceDuration = Array.from(frameTotalDurations.values()).reduce((sum, duration) => sum + duration, 0);
          
          // If we've completed the sequence, start over
          if (newTime >= totalSequenceDuration) {
            setCurrentTime(0);
            setSelectedFrameId(frameIds[0]);
            animationFrameIdRef.current = requestAnimationFrame(animationFrame);
            return;
          }
          
          // Find which frame should be playing at this time
          let foundCurrentFrame = false;
          let framePositionTime = 0;
          
          for (let i = 0; i < frameIds.length; i++) {
            const frameId = frameIds[i];
            const frameStartTime = frameStartTimes.get(frameId) || 0;
            const frameDuration = frameTotalDurations.get(frameId) || 0;
            
            // If this frame contains the current time
            if (newTime >= frameStartTime && newTime < frameStartTime + frameDuration) {
              foundCurrentFrame = true;
              
              // If we need to switch frames
              if (frameId !== selectedFrameId) {
                setSelectedFrameId(frameId);
              }
              
              // Set time within this frame (accounting for this frame's delay)
              // Use 2.5s delay as shown in the screenshot
              const frameDelay = 2.5;
              
              // Calculate time relative to this frame's start
              framePositionTime = newTime - frameStartTime;
              
              // If we're still in the frame's delay period, set time to 0
              // Otherwise, subtract the delay to get actual animation time
              const frameAnimationTime = Math.max(0, framePositionTime - frameDelay);
              setCurrentTime(frameAnimationTime);
              break;
            }
          }
          
          // If we somehow didn't find a frame (shouldn't happen), stop
          if (!foundCurrentFrame) {
            setIsPlaying(false);
            animationFrameIdRef.current = null;
            return;
          }
        }
        
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

  // Create a wrapper component that connects with the context
  const ExportModalWrapper = () => {
    const { frames, currentFrame, layers } = useAnimationContext();
    return (
      <ExportModal 
        onClose={() => setIsExportModalOpen(false)} 
        frames={frames}
        currentFrame={currentFrame}
        layers={layers}
      />
    );
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
            
            <div className="flex-1 flex flex-col bg-neutral-900 overflow-auto">
              <div className="min-h-[250px]">
                <PreviewCanvas 
                  selectedFrameId={selectedFrameId} 
                  currentTime={currentTime} 
                />
              </div>
              <Timeline 
                onTimeUpdate={handleTimeUpdate}
                onPlayPauseToggle={handlePlayPauseToggle}
                isPlaying={isPlaying}
                currentTime={currentTime}
                selectedFrameId={selectedFrameId}
                onDurationChange={setTimelineDuration}
                onLinkLayers={handleLinkLayers}
                onUnlinkLayer={handleUnlinkLayer}
                timelineMode={timelineMode}
                onTimelineModeChange={handleTimelineModeChange}
                onFrameSelect={handleFrameSelect}
              />
            </div>
            
            <PropertiesPanel />
          </div>

          {isExportModalOpen && <ExportModalWrapper />}

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