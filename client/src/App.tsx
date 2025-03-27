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
import { mockGifFrames, generateGifFramesForAdSize } from "./mock/animationData";

function App() {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPresetsPanelOpen, setIsPresetsPanelOpen] = useState(false);
  // This is for selecting which ad size to preview
  const [selectedAdSizeId, setSelectedAdSizeId] = useState('frame-1');
  
  // This is for selecting which GIF frame to focus on in GifFrames mode
  const [selectedGifFrameId, setSelectedGifFrameId] = useState('gif-frame-1');
  
  // Current frame ID based on the current mode - for timeline, preview, etc.
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
  
  // Handle frame selection from left sidebar (ad size selection)
  const handleFrameSelect = (frameId: string) => {
    console.log('App: Selected ad size:', frameId);
    setSelectedAdSizeId(frameId);
    
    // If we're in GIF Frames mode, generate new GIF frames for this ad size
    if (timelineMode === TimelineMode.GifFrames) {
      // Get the first GIF frame for this ad size
      const newGifFrames = generateGifFramesForAdSize(frameId);
      if (newGifFrames.length > 0) {
        // Select the first GIF frame from the new set
        setSelectedGifFrameId(newGifFrames[0].id);
      }
    }
  };
  
  // Handle GIF frame selection in GIF frames mode
  const handleGifFrameSelect = (frameId: string) => {
    console.log('App: Selected GIF frame:', frameId);
    setSelectedGifFrameId(frameId);
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
    
    // If switching to GIF Frames mode, initialize the frames
    if (mode === TimelineMode.GifFrames) {
      // Store the current selectedAdSizeId to use for GIF frames
      const currentAdSizeId = selectedAdSizeId;
      
      // Generate GIF frames for the current ad size
      const gifFrames = generateGifFramesForAdSize(currentAdSizeId);
      
      // If frames were generated successfully, select the first one
      if (gifFrames.length > 0) {
        console.log("TimelineModeChange: Generated GIF frames for ad size", currentAdSizeId, "first frame:", gifFrames[0].id);
        setSelectedGifFrameId(gifFrames[0].id);
        
        // Important: when in GIF frames mode, selected frame id is the GIF frame id
        // We don't need to set selectedAdSizeId here as it's preserved
        console.log("App: Selected GIF frame:", gifFrames[0].id);
      } else {
        console.warn("App: No GIF frames were generated for ad size", currentAdSizeId);
      }
    } else if (mode === TimelineMode.Animation) {
      // When switching back to Animation mode, select the ad size that was previously used for GIF frames
      // Extract the ad size ID from the current GIF frame ID
      if (selectedGifFrameId && selectedGifFrameId.startsWith('gif-frame-')) {
        const parts = selectedGifFrameId.split('-');
        let adSizeId = 'frame-1'; // Default fallback
        
        if (parts.length >= 4) {
          if (parts[2] === 'frame') {
            // Format is gif-frame-frame-X-Y, so adSizeId is "frame-X"
            adSizeId = `${parts[2]}-${parts[3]}`;
          } else {
            // Format is gif-frame-X-Y, determine if X is a frame number or part of the ad size ID
            adSizeId = parts[2].startsWith('frame') ? parts[2] : `frame-${parts[2]}`;
          }
        } else if (parts.length === 4) {
          // Old format: gif-frame-1-1
          adSizeId = `frame-${parts[2]}`;
        }
        
        console.log("App: Switching back to Animation mode, selected ad size:", adSizeId);
        setSelectedAdSizeId(adSizeId);
      }
    }
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
    
    // Generate frames for the current ad size
    // Extract the parent ad size from the GIF frame ID or use the currently selected ad size
    let adSizeId = selectedAdSizeId;
    
    // If we have a selected GIF frame, extract the ad size from it using consistent extraction logic
    if (selectedGifFrameId && selectedGifFrameId.startsWith('gif-frame-')) {
      const parts = selectedGifFrameId.split('-');
      
      if (parts.length >= 4) {
        if (parts[2] === 'frame') {
          // Format is gif-frame-frame-X-Y, so adSizeId is "frame-X"
          adSizeId = `${parts[2]}-${parts[3]}`;
        } else {
          // Format is gif-frame-X-Y, determine if X is a frame number or part of the ad size ID
          adSizeId = parts[2].startsWith('frame') ? parts[2] : `frame-${parts[2]}`;
        }
      } else if (parts.length === 4) {
        // Old format: gif-frame-1-1
        adSizeId = `frame-${parts[2]}`;
      }
      
      console.log("App useEffect: Extracted adSizeId from GIF frame:", selectedGifFrameId, "->", adSizeId);
    }
      
    // Generate current GIF frames specifically for this ad size
    const currentGifFrames = generateGifFramesForAdSize(adSizeId);
    
    // Use the current GIF frames for this specific ad size
    const frameIds = currentGifFrames.map(frame => frame.id);
    
    // Calculate frame durations including their delay
    const frameTotalDurations = new Map<string, number>();
    const frameStartTimes = new Map<string, number>();
    
    let cumulativeTime = 0;
    frameIds.forEach(frameId => {
      // Get the delay from the current GIF frames data
      const gifFrame = currentGifFrames.find(frame => frame.id === frameId);
      const frameDelay = gifFrame ? gifFrame.delay : 2.5; // Use frame delay or fallback to 2.5s
      
      // Start time is the cumulative time before this frame
      frameStartTimes.set(frameId, cumulativeTime);
      
      // Each frame plays for its delay plus the animation duration
      const frameTotalDuration = frameDelay + timelineDuration;
      frameTotalDurations.set(frameId, frameTotalDuration);
      
      // Add this frame's duration to the cumulative time
      cumulativeTime += frameTotalDuration;
    });
    
    setFrameSequenceData({
      currentFrameIndex: frameIds.indexOf(selectedGifFrameId),
      frameIds,
      frameTotalDurations,
      frameStartTimes
    });
    
  }, [timelineMode, selectedGifFrameId, selectedAdSizeId, timelineDuration]);

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
            setSelectedGifFrameId(frameIds[0]);
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
              if (frameId !== selectedGifFrameId) {
                setSelectedGifFrameId(frameId);
              }
              
              // Set time within this frame (accounting for this frame's delay)
              // Get the parent ad size ID from the GIF frame ID 
              // Could be either format: "gif-frame-1-1" (old) or "gif-frame-frameX-Y" (new)
              let adSizeId = 'frame-1'; // Default fallback
              const parts = frameId.split('-');
              
              if (parts.length > 2) {
                // Check if the third part is numeric or starts with "frame"
                if (parts[2] === '1' || parts[2] === '2' || parts[2] === '3' || parts[2] === '4') {
                  // Old format: gif-frame-1-1 (where 1 is the frame number)
                  adSizeId = `frame-${parts[2]}`;
                } else {
                  // New format: gif-frame-frameX-Y
                  adSizeId = parts[2];
                }
              }
              
              console.log("App: Extracting adSizeId from GIF frame:", frameId, "->", adSizeId);
              
              // Get frames for this ad size
              const relevantFrames = generateGifFramesForAdSize(adSizeId);
              
              // Find the specific frame
              const gifFrame = relevantFrames.find(frame => frame.id === frameId);
              const frameDelay = gifFrame ? gifFrame.delay : 2.5; // Use frame delay or fallback to 2.5s
              
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
              selectedAdSizeId={selectedAdSizeId}
            />
            
            <div className="flex-1 flex flex-col bg-neutral-900 overflow-auto">
              <div className="min-h-[250px]">
                <PreviewCanvas 
                  selectedFrameId={timelineMode === TimelineMode.GifFrames ? selectedGifFrameId : selectedAdSizeId} 
                  currentTime={currentTime} 
                />
              </div>
              <Timeline 
                onTimeUpdate={handleTimeUpdate}
                onPlayPauseToggle={handlePlayPauseToggle}
                isPlaying={isPlaying}
                currentTime={currentTime}
                selectedFrameId={timelineMode === TimelineMode.GifFrames ? selectedGifFrameId : selectedAdSizeId}
                onDurationChange={setTimelineDuration}
                onLinkLayers={handleLinkLayers}
                onUnlinkLayer={handleUnlinkLayer}
                timelineMode={timelineMode}
                onTimelineModeChange={handleTimelineModeChange}
                onFrameSelect={timelineMode === TimelineMode.GifFrames ? handleGifFrameSelect : handleFrameSelect}
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