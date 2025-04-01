import { useState, useEffect, useRef } from "react";
import Toolbar from "./components/Toolbar";
import LeftSidebar from "./components/LeftSidebar";
import PreviewCanvas from "./components/PreviewCanvas";
import Timeline from "./components/Timeline";
import PropertiesPanel from "./components/PropertiesPanel";
import ExportModal from "./components/ExportModal";

import AutoSaveIndicator from "./components/AutoSaveIndicator";
import SyncDebugPanel from "./components/SyncDebugPanel";
import { AnimationProvider, useAnimationContext } from "./context/AnimationContext";
import { TimelineMode } from "./types/animation";
import { mockGifFrames, generateGifFramesForAdSize } from "./mock/animationData";
import { DEBUG_SYNC } from "./utils/syncLogger";
import { Toaster } from "./components/ui/toaster";
import { testLayerLinking, verifyContainerLinkDisplay } from "./utils/directLayerLinkingTest";

// Import test utilities
import { initializeTestUtilities } from "./utils/testInit";
import { runLayerLinkingTests } from "./utils/layerLinkingTest";

// Import animations CSS
import "./styles/animations.css";

function App() {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  // This is for selecting which ad size to preview
  const [selectedAdSizeId, setSelectedAdSizeId] = useState('frame-1');
  
  // This is for selecting which GIF frame to focus on in GifFrames mode
  const [selectedGifFrameId, setSelectedGifFrameId] = useState('gif-frame-1');
  
  // Current frame ID based on the current mode - for timeline, preview, etc.
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineDuration, setTimelineDuration] = useState(5); // Default 5 seconds
  
  // State for preview canvas height
  const [previewHeight, setPreviewHeight] = useState(() => {
    const savedHeight = localStorage.getItem('previewCanvasHeight');
    return savedHeight ? parseInt(savedHeight, 10) : 350; // Default height
  });
  const [isResizingPreview, setIsResizingPreview] = useState(false);
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('animation');
  
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
  
  // Handle frame selection from left sidebar (ad size selection)
  const handleFrameSelect = (frameId: string) => {
    console.log('App: Selected ad size:', frameId);
    setSelectedAdSizeId(frameId);
    
    // If we're in GIF Frames mode, generate new GIF frames for this ad size
    if (timelineMode === 'gifFrames') {
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
  
  // We'll obtain the animation context methods inside components that are wrapped by AnimationProvider
  
  // Handle layer linking through Timeline component
  const handleLinkLayers = () => {
    console.log("App: Linking layers by name");
    
    // The actual linking is done in TimelineWrapper with AnimationContext
    
    // Indicate saving is in progress
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setLastSaved(new Date());
      console.log("App: Layer link operation completed");
    }, 500);
  };
  
  // Handler for unlinking layers
  const handleUnlinkLayer = (layerId: string) => {
    console.log("App: Unlinking layer", layerId);

    if (layerId) {
      try {
        console.log("App: Processing unlink request for layer", layerId);
        
        // Indicate saving is in progress
        setSaving(true);
        setTimeout(() => {
          setSaving(false);
          setLastSaved(new Date());
          console.log("App: Layer unlink operation completed");
        }, 500);
      } catch (error) {
        console.error("Error processing layer unlink:", error);
      }
    } else {
      console.warn("App: Cannot unlink layer - no layer ID provided");
    }
  };
  
  // Handle timeline mode changes
  const handleTimelineModeChange = (mode: TimelineMode) => {
    console.log(`App: Switching to ${mode} mode`);
    setTimelineMode(mode);
    
    // If switching to GIF Frames mode, initialize the frames
    if (mode === 'gifFrames') {
      // Store the current selectedAdSizeId to use for GIF frames
      const currentAdSizeId = selectedAdSizeId;
      
      // Generate GIF frames for the current ad size if needed
      const gifFrames = generateGifFramesForAdSize(currentAdSizeId);
      
      // The AnimationContext will be informed of the mode change through props
      
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
    } else if (mode === 'animation') {
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
  
  // Initialize test utilities for global access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Add getter for GIF frames for existing tests
      (window as any).getGifFrames = () => {
        // Mock frames - these would actually come from the animation context
        return mockGifFrames;
      };
      console.log("Added global getGifFrames function for layer linking test utility");
      
      // Initialize new automated test utilities
      try {
        initializeTestUtilities();
        console.log("🧪 Layer linking test utilities initialized - run in console with window.runLayerLinkingTests()");
        
        // Add global link testing function for easier debugging
        (window as any).testLayerLinking = (layerName: string) => {
          console.log(`Testing layer linking for "${layerName}"...`);
          
          // Generate deterministic ID using the same algorithm
          const normalizedName = layerName.toLowerCase();
          const layerHash = normalizedName.split('').reduce(
            (hash, char) => char.charCodeAt(0) + ((hash << 5) - hash), 
            0
          );
          const seedValue = Math.abs(layerHash % 1000);
          const animationGroupId = `link-group-${layerHash}-${seedValue}a`;
          const gifGroupId = `link-group-${layerHash}-${seedValue}g`;
          
          console.log(`Deterministic IDs for "${layerName}":`);
          console.log(`- Animation mode: ${animationGroupId}`);
          console.log(`- GIF frame mode: ${gifGroupId}`);
          
          // Additional checks can be added here...
        };
      } catch (error) {
        console.error("Failed to load layer linking test utility:", error);
      }
    }
  }, []);

  // Initialize or update frame sequence data when frames or mode changes
  // This will be updated in wrapped Timeline component
  useEffect(() => {
    // Only update in GIF Frames mode - this will now get data from mock objects instead of context
    if (timelineMode !== 'gifFrames') return;
    
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
        if (timelineMode === 'animation') {
          // Standard animation mode - plays a single animation
          const newTime = initialTime + elapsed;
          
          // If we reach the end of the timeline, stop playing
          if (newTime >= timelineDuration) {
            setCurrentTime(timelineDuration);
            setIsPlaying(false);
            animationFrameIdRef.current = null;
            
            // Force a rerender of the animation state to show final state
            setTimeout(() => {
              // Reset to beginning for next play
              setCurrentTime(0);
            }, 500);
            
            return;
          }
          
          // Update time at 60fps for smoother animation
          setCurrentTime(newTime);
          
          // Force update to ensure animations are applied correctly
          if (Math.floor(newTime * 10) % 2 === 0) {
            // Add a slight random variation to avoid React batching updates
            setCurrentTime(prevTime => prevTime + 0.0001);
          }
        } 
        else if (timelineMode === 'gifFrames') {
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
  
  // Handle preview canvas resize
  useEffect(() => {
    // Event handlers for preview canvas resize
    const handlePreviewResizeStart = (e: CustomEvent<{clientY: number}>) => {
      setIsResizingPreview(true);
      
      // Initial position
      const startY = e.detail.clientY;
      const startHeight = previewHeight;
      
      // Handler for mouse movement during resize
      const handleMouseMove = (moveEvent: MouseEvent) => {
        // Calculate new height based on mouse movement
        // When dragging down, increase height; when dragging up, decrease height
        const deltaY = moveEvent.clientY - startY;
        const newHeight = Math.max(150, startHeight + deltaY); // Min height 150px
        setPreviewHeight(newHeight);
      };
      
      // Handler for releasing mouse button
      const handleMouseUp = () => {
        // Save the current height to localStorage
        localStorage.setItem('previewCanvasHeight', previewHeight.toString());
        
        // Clean up resize state and event listeners
        setIsResizingPreview(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      // Add event listeners
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };
    
    // Add resize event listeners
    window.addEventListener('preview-resize-start', handlePreviewResizeStart as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('preview-resize-start', handlePreviewResizeStart as EventListener);
    };
  }, [previewHeight, isResizingPreview]);

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  // Create a wrapper component for the export modal
  const ExportModalWrapper = () => {
    // We don't have access to animation context here anymore
    // Pass minimal props and handle context access inside ExportModal
    return (
      <ExportModal 
        onClose={() => setIsExportModalOpen(false)} 
      />
    );
  };

  return (
    <AnimationProvider initialTimelineMode={timelineMode}>
      <div className="bg-[#0A0A0A] text-white h-screen flex flex-col">
        <Toolbar onExport={handleExport} />
        
        <div className="flex-1 flex overflow-hidden">
          <LeftSidebar 
            onSelectFrame={handleFrameSelect}
            selectedAdSizeId={timelineMode === 'animation' ? selectedAdSizeId : 
              // In GIF Frames mode, extract the ad size ID from the selected GIF frame
              (selectedGifFrameId && selectedGifFrameId.startsWith('gif-frame-') ? 
                (() => {
                  const parts = selectedGifFrameId.split('-');
                  if (parts.length >= 4) {
                    if (parts[2] === 'frame') {
                      return `${parts[2]}-${parts[3]}`;
                    } else {
                      return parts[2].startsWith('frame') ? parts[2] : `frame-${parts[2]}`;
                    }
                  } else if (parts.length === 4) {
                    return `frame-${parts[2]}`;
                  }
                  return selectedAdSizeId;
                })() 
              : selectedAdSizeId)
            }
          />
          
          <div className="flex-1 flex flex-col bg-neutral-900 overflow-auto">
            <div className="min-h-[150px]" style={{ height: previewHeight }}>
              <PreviewCanvas 
                selectedFrameId={timelineMode === 'gifFrames' ? selectedGifFrameId : selectedAdSizeId} 
                currentTime={currentTime}
                timelineMode={timelineMode}
              />
            </div>
            <Timeline 
              onTimeUpdate={handleTimeUpdate}
              onPlayPauseToggle={handlePlayPauseToggle}
              isPlaying={isPlaying}
              currentTime={currentTime}
              selectedFrameId={timelineMode === 'gifFrames' ? selectedGifFrameId : selectedAdSizeId}
              onDurationChange={setTimelineDuration}
              onLinkLayers={handleLinkLayers}
              onUnlinkLayer={handleUnlinkLayer}
              timelineMode={timelineMode}
              onTimelineModeChange={handleTimelineModeChange}
              onFrameSelect={timelineMode === 'gifFrames' ? handleGifFrameSelect : handleFrameSelect}
            />
          </div>
        </div>

        {isExportModalOpen && <ExportModalWrapper />}
        
        {/* Auto-save indicator */}
        <AutoSaveIndicator saving={saving} lastSaved={lastSaved} />
        
        {/* Sync debugging panel - only show when DEBUG_SYNC is true */}
        {DEBUG_SYNC && <SyncDebugPanel />}
        
        {/* Toast notifications */}
        <Toaster />
      </div>
    </AnimationProvider>
  );
}

export default App;