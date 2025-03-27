import { useState, useRef, useEffect, useReducer } from 'react';
import { Play, Pause, SkipBack, Clock } from 'lucide-react';
import { mockLayers } from '../mock/animationData';

interface TimelineProps {
  onTimeUpdate: (time: number) => void;
  onPlayPauseToggle: (playing: boolean) => void;
  isPlaying: boolean;
  currentTime: number;
  selectedFrameId?: string;
}

const Timeline = ({
  onTimeUpdate,
  onPlayPauseToggle,
  isPlaying,
  currentTime,
  selectedFrameId = 'frame-1' // Default to frame-1 if no frame ID is provided
}: TimelineProps) => {
  // Create a forceUpdate function for timeline component
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const duration = 5; // Fixed duration for now
  
  const [isDragging, setIsDragging] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  
  // Get the layers for the current frame
  const frameLayers = mockLayers[selectedFrameId] || [];
  
  // Reference objects for drag state and positioning
  const dragState = useRef({
    isDraggingAnimation: false,
    isResizingLeft: false,
    isResizingRight: false,
    startX: 0,
    originalStartTime: 0,
    originalDuration: 0,
    layerId: null as string | null,
    animationIndex: -1
  });
  
  // Force an update after the component mounts to ensure timeline renders correctly
  useEffect(() => {
    // Give the timeline a small delay to fully render
    const timer = setTimeout(() => {
      forceUpdate();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Generate time markers (every 0.5 seconds)
  const timeMarkers = [];
  const interval = 0.5; // in seconds
  for (let time = 0; time <= duration; time += interval) {
    timeMarkers.push({
      time,
      isMajor: time % 1 === 0 // Major markers at every second
    });
  }
  
  // Convert a time value to a position in the timeline
  const timeToPosition = (time: number) => {
    if (!timelineRef.current) {
      // Use a fallback width calculation when the timeline isn't rendered yet
      // This ensures animation blocks display with reasonable sizes on initial load
      const fallbackWidth = 400 - 16; // Default width - playhead width
      return (time / duration) * fallbackWidth;
    }
    
    const width = timelineRef.current.clientWidth - 16; // Account for playhead width
    return (time / duration) * width;
  };
  
  // Convert a position in the timeline to a time value
  const positionToTime = (position: number) => {
    if (!timelineRef.current) return 0;
    const width = timelineRef.current.clientWidth - 16; // Account for playhead width
    return Math.max(0, Math.min(duration, (position / width) * duration));
  };
  
  // Handle clicking on the timeline to set current time
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickPosition = e.clientX - rect.left;
    const newTime = positionToTime(clickPosition);
    
    onTimeUpdate(newTime);
  };
  
  // Handle playhead drag start
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  // Handle animation block drag start (left resize, right resize, or move)
  const handleAnimationDragStart = (
    e: React.MouseEvent, 
    layerId: string, 
    animationIndex: number, 
    mode: 'move' | 'resize-left' | 'resize-right'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    
    const layer = frameLayers.find(l => l.id === layerId);
    if (!layer) return;
    
    const animation = layer.animations[animationIndex];
    
    // Set drag state
    dragState.current = {
      isDraggingAnimation: mode === 'move',
      isResizingLeft: mode === 'resize-left',
      isResizingRight: mode === 'resize-right',
      startX: e.clientX,
      originalStartTime: animation.startTime || 0,
      originalDuration: animation.duration,
      layerId,
      animationIndex
    };
    
    console.log(`Starting ${mode} drag for animation ${animationIndex} on layer ${layerId}`);
    
    // Add event listeners for drag and release
    document.addEventListener('mousemove', handleAnimationDragMove);
    document.addEventListener('mouseup', handleAnimationDragEnd);
  };
  
  // Handle animation drag movement
  const handleAnimationDragMove = (e: MouseEvent) => {
    const { 
      isDraggingAnimation, 
      isResizingLeft, 
      isResizingRight,
      startX, 
      originalStartTime, 
      originalDuration,
      layerId,
      animationIndex 
    } = dragState.current;
    
    // If not dragging or no ref, return
    if ((!isDraggingAnimation && !isResizingLeft && !isResizingRight) || !timelineRef.current) return;
    
    // Find the layer and animation
    const layer = frameLayers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Calculate position change
    const dx = e.clientX - startX;
    const dxTime = positionToTime(dx);
    
    // Clone the animations for immutability
    const animations = [...layer.animations];
    
    if (isDraggingAnimation) {
      // Moving the entire animation
      let newStartTime = Math.max(0, originalStartTime + dxTime);
      
      // Create a new animation object with the updated start time
      animations[animationIndex] = {
        ...animations[animationIndex],
        startTime: newStartTime
      };
      
      console.log(`Moving animation: ${layerId}, new start: ${newStartTime}`);
    } 
    else if (isResizingLeft) {
      // Resizing from the left handle
      let newStartTime = Math.max(0, originalStartTime + dxTime);
      // Make sure duration stays positive
      let newDuration = Math.max(0.1, originalDuration - (newStartTime - originalStartTime));
      
      // Create a new animation object with the updated values
      animations[animationIndex] = {
        ...animations[animationIndex],
        startTime: newStartTime,
        duration: newDuration
      };
      
      console.log(`Resizing animation start: ${layerId}, new start: ${newStartTime}, new duration: ${newDuration}`);
    }
    else if (isResizingRight) {
      // Resizing from the right handle
      let newDuration = Math.max(0.1, originalDuration + dxTime);
      
      // Create a new animation object with the updated duration
      animations[animationIndex] = {
        ...animations[animationIndex],
        duration: newDuration
      };
      
      console.log(`Resizing animation duration: ${layerId}, new duration: ${newDuration}`);
    }
    
    // Update the layer's animations
    layer.animations = animations;
    forceUpdate();
  };
  
  // Handle animation drag end
  const handleAnimationDragEnd = () => {
    console.log('Animation drag/resize ended');
    
    // Reset drag state
    dragState.current = {
      ...dragState.current,
      isDraggingAnimation: false,
      isResizingLeft: false,
      isResizingRight: false
    };
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleAnimationDragMove);
    document.removeEventListener('mouseup', handleAnimationDragEnd);
  };
  
  // Handle playhead drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !timelineRef.current) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const mousePosition = e.clientX - rect.left;
      const newTime = positionToTime(mousePosition);
      
      onTimeUpdate(newTime);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onTimeUpdate]);
  
  // Get the currently selected layer from mock data
  const getSelectedLayer = () => {
    if (!selectedLayerId) return null;
    return frameLayers.find(layer => layer.id === selectedLayerId) || null;
  };
  
  const selectedLayer = getSelectedLayer();
  const keyframes = selectedLayer?.keyframes || [];
  
  // Animation frame handling
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const isAnimatingRef = useRef<boolean>(false);
  
  // Toggle playback - useEffect will handle the animation loop
  const togglePlayback = () => {
    const newIsPlaying = !isPlaying;
    console.log(`Toggling playback to: ${newIsPlaying}`);
    onPlayPauseToggle(newIsPlaying);
  };
  
  // Handle animation playback when isPlaying changes
  useEffect(() => {
    const startAnimationLoop = () => {
      if (isAnimatingRef.current) return; // Don't start if already running
      
      console.log("Starting animation loop");
      isAnimatingRef.current = true;
      lastTimeRef.current = performance.now();
      
      // Define the animation loop function
      const animate = (now: number) => {
        if (!isAnimatingRef.current) return; // Stop if no longer animating
        
        // Calculate time difference
        const deltaTime = (now - lastTimeRef.current) / 1000; // convert to seconds
        lastTimeRef.current = now;
        
        // Update current time
        const newTime = currentTime + deltaTime;
        
        // Loop back to start if we've reached the end
        if (newTime >= duration) {
          onTimeUpdate(0);
        } else {
          onTimeUpdate(newTime);
        }
        
        // Continue the loop
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      // Start the loop
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    const stopAnimationLoop = () => {
      if (!isAnimatingRef.current) return; // Don't stop if not running
      
      console.log("Stopping animation loop");
      isAnimatingRef.current = false;
      
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
    
    // Start or stop based on isPlaying state
    if (isPlaying) {
      startAnimationLoop();
    } else {
      stopAnimationLoop();
    }

    // Clean up on unmount
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      isAnimatingRef.current = false;
    };
  }, [isPlaying, currentTime, onTimeUpdate, duration]);
  
  return (
    <div className="h-full bg-[#111111] flex flex-col">
      <div className="p-2 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button 
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-800"
            onClick={togglePlayback}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={16} className="text-neutral-200" /> : <Play size={16} className="text-neutral-200" />}
          </button>
          
          <button 
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-800"
            onClick={() => onTimeUpdate(0)}
            title="Restart"
          >
            <SkipBack size={16} className="text-neutral-300" />
          </button>
          
          <div className="text-xs text-neutral-400 flex items-center">
            <Clock size={14} className="mr-1" />
            <span>{currentTime.toFixed(1)}s</span>
            <span className="mx-1">/</span>
            <span>{duration.toFixed(1)}s</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="text-xs text-neutral-500">
            {selectedLayer ? selectedLayer.name : 'No layer selected'}
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex p-3 relative">
        {/* Layer track */}
        <div className="w-40 flex flex-col mr-2">
          <div className="h-8 flex items-center text-xs text-neutral-400 px-2 border-b border-neutral-800">
            Layers
          </div>
          
          {/* Display all layers for the current frame */}
          {frameLayers.map(layer => (
            <div 
              key={layer.id}
              onClick={() => setSelectedLayerId(layer.id)}
              className={`h-10 flex items-center px-2 rounded cursor-pointer 
                ${selectedLayerId === layer.id ? 'bg-neutral-800' : 'hover:bg-neutral-700'} 
                text-sm ${selectedLayerId === layer.id ? 'text-white' : 'text-neutral-300'}`}
            >
              {layer.name}
            </div>
          ))}
        </div>
        
        {/* Timeline area */}
        <div className="flex-1 flex flex-col relative">
          {/* Time markers */}
          <div className="h-8 flex items-end border-b border-neutral-800 relative">
            {timeMarkers.map(({ time, isMajor }) => (
              <div 
                key={time}
                className="absolute bottom-0 flex flex-col items-center"
                style={{ left: `${timeToPosition(time)}px` }}
              >
                <div 
                  className={`h-${isMajor ? '4' : '2'} w-px bg-neutral-700`}
                ></div>
                {isMajor && (
                  <div className="text-xs text-neutral-500 mb-1">
                    {time}s
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Playhead */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-[#4A7CFF] z-10"
            style={{ left: `${timeToPosition(currentTime)}px` }}
            ref={playheadRef}
          >
            <div 
              className="w-4 h-4 -ml-1.5 -mt-1 bg-[#4A7CFF] rounded-full cursor-move"
              onMouseDown={handlePlayheadMouseDown}
            ></div>
          </div>
          
          {/* Timeline Track */}
          <div 
            className="flex-1 bg-neutral-900 rounded cursor-pointer relative overflow-auto"
            style={{ minWidth: '400px', maxWidth: '100%' }} /* Ensure a reasonable size with scrolling */
            onClick={handleTimelineClick}
            ref={timelineRef}
          >
            {/* Display multiple animation tracks - one for each layer */}
            {frameLayers.map((layer, layerIndex) => (
              <div 
                key={layer.id}
                className={`h-10 relative ${selectedLayerId === layer.id ? 'bg-[#1A1A1A]' : ''}`}
              >
                {/* Animation blocks with drag handles */}
                {layer.animations.map((animation, animIndex) => (
                  <div 
                    key={animIndex}
                    className={`absolute h-6 top-2 rounded ${selectedLayerId === layer.id ? 'bg-[#2A5BFF] bg-opacity-70 border border-[#4A7CFF]' : 'bg-[#2A5BFF] bg-opacity-30 border border-[#4A7CFF]'} cursor-move`}
                    style={{
                      left: `${timeToPosition(animation.startTime || 0)}px`,
                      width: `${timeToPosition(animation.duration)}px`
                    }}
                    onMouseDown={(e) => handleAnimationDragStart(e, layer.id, animIndex, 'move')}
                  >
                    {/* Left resize handle */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize" 
                      onMouseDown={(e) => handleAnimationDragStart(e, layer.id, animIndex, 'resize-left')}
                    ></div>
                    
                    {/* Animation content */}
                    <div className="px-2 text-xs text-white truncate flex items-center justify-between w-full h-full pointer-events-none">
                      <span>{animation.type}</span>
                      {animation.duration >= 0.5 && (
                        <span className="text-xs opacity-75 ml-1">
                          {animation.duration.toFixed(1)}s
                        </span>
                      )}
                    </div>
                    
                    {/* Right resize handle */}
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize" 
                      onMouseDown={(e) => handleAnimationDragStart(e, layer.id, animIndex, 'resize-right')}
                    ></div>
                  </div>
                ))}
                
                {/* Only show keyframes for selected layer */}
                {selectedLayerId === layer.id && keyframes.map((keyframe, keyIndex) => (
                  <div 
                    key={keyIndex}
                    className="absolute w-3 h-3 top-3.5 -ml-1.5 rounded-sm bg-yellow-500 border border-yellow-600"
                    style={{ left: `${timeToPosition(keyframe.time)}px` }}
                  ></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;