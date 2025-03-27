import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, Clock } from 'lucide-react';
import { mockLayers } from '../mock/animationData';

interface TimelineProps {
  onTimeUpdate: (time: number) => void;
  onPlayPauseToggle: (playing: boolean) => void;
  isPlaying: boolean;
  currentTime: number;
}

const Timeline = ({
  onTimeUpdate,
  onPlayPauseToggle,
  isPlaying,
  currentTime
}: TimelineProps) => {
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const duration = 5; // Fixed duration for now
  
  const [isDragging, setIsDragging] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  
  // Get the layers for the current frame
  const selectedFrameId = 'frame-1';
  const frameLayers = mockLayers[selectedFrameId] || [];
  
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
    if (!timelineRef.current) return 0;
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
  
  // Toggle playback with animation loop
  const togglePlayback = () => {
    const newIsPlaying = !isPlaying;
    onPlayPauseToggle(newIsPlaying);
    
    if (newIsPlaying) {
      // Start animation frame loop
      lastTimeRef.current = performance.now();
      startAnimationLoop();
    } else {
      // Stop animation frame loop
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  };
  
  // Animation loop function
  const startAnimationLoop = () => {
    const animate = (now: number) => {
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
  
  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
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
            className="flex-1 bg-neutral-900 rounded cursor-pointer relative"
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
                {layer.animations.map((animation: any, index: number) => {
                  // Track dragging state for each animation
                  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
                  const [isDraggingRight, setIsDraggingRight] = useState(false);
                  const [isDraggingBlock, setIsDraggingBlock] = useState(false);
                  
                  // References to track mouse positions during drag
                  const startPositionRef = useRef(0);
                  const originalStartTimeRef = useRef(0);
                  const originalDurationRef = useRef(0);
                  
                  // Handle start drag for left resize handle
                  const handleLeftDragStart = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    setIsDraggingLeft(true);
                    startPositionRef.current = e.clientX;
                    originalStartTimeRef.current = animation.startTime || 0;
                    originalDurationRef.current = animation.duration;
                    
                    // Add event listeners for drag and release
                    document.addEventListener('mousemove', handleLeftDragMove);
                    document.addEventListener('mouseup', handleLeftDragEnd);
                  };
                  
                  // Handle drag move for left resize handle
                  const handleLeftDragMove = (e: MouseEvent) => {
                    if (!isDraggingLeft || !timelineRef.current) return;
                    
                    const rect = timelineRef.current.getBoundingClientRect();
                    const dx = e.clientX - startPositionRef.current;
                    const dxTime = positionToTime(dx);
                    
                    // Calculate new start time and duration
                    let newStartTime = Math.max(0, originalStartTimeRef.current + dxTime);
                    let newDuration = Math.max(0.1, originalDurationRef.current - (newStartTime - originalStartTimeRef.current));
                    
                    // Update the animation on the layer
                    if (layer && layer.id) {
                      console.log(`Resizing animation start: ${layer.id}, new start: ${newStartTime}, new duration: ${newDuration}`);
                      // This would update the animation in the context in a real implementation
                      animation.startTime = newStartTime;
                      animation.duration = newDuration;
                      // Force a re-render
                      forceUpdate();
                    }
                  };
                  
                  // Handle drag end for left resize handle
                  const handleLeftDragEnd = () => {
                    setIsDraggingLeft(false);
                    document.removeEventListener('mousemove', handleLeftDragMove);
                    document.removeEventListener('mouseup', handleLeftDragEnd);
                  };
                  
                  // Handle start drag for right resize handle
                  const handleRightDragStart = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    setIsDraggingRight(true);
                    startPositionRef.current = e.clientX;
                    originalDurationRef.current = animation.duration;
                    
                    // Add event listeners for drag and release
                    document.addEventListener('mousemove', handleRightDragMove);
                    document.addEventListener('mouseup', handleRightDragEnd);
                  };
                  
                  // Handle drag move for right resize handle
                  const handleRightDragMove = (e: MouseEvent) => {
                    if (!isDraggingRight || !timelineRef.current) return;
                    
                    const rect = timelineRef.current.getBoundingClientRect();
                    const dx = e.clientX - startPositionRef.current;
                    const dxTime = positionToTime(dx);
                    
                    // Calculate new duration
                    let newDuration = Math.max(0.1, originalDurationRef.current + dxTime);
                    
                    // Update the animation on the layer
                    if (layer && layer.id) {
                      console.log(`Resizing animation duration: ${layer.id}, new duration: ${newDuration}`);
                      // This would update the animation in the context in a real implementation
                      animation.duration = newDuration;
                      // Force a re-render
                      forceUpdate();
                    }
                  };
                  
                  // Handle drag end for right resize handle
                  const handleRightDragEnd = () => {
                    setIsDraggingRight(false);
                    document.removeEventListener('mousemove', handleRightDragMove);
                    document.removeEventListener('mouseup', handleRightDragEnd);
                  };
                  
                  // Handle block drag for moving the entire animation
                  const handleBlockDragStart = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    setIsDraggingBlock(true);
                    startPositionRef.current = e.clientX;
                    originalStartTimeRef.current = animation.startTime || 0;
                    
                    // Add event listeners for drag and release
                    document.addEventListener('mousemove', handleBlockDragMove);
                    document.addEventListener('mouseup', handleBlockDragEnd);
                  };
                  
                  // Handle drag move for moving the entire animation
                  const handleBlockDragMove = (e: MouseEvent) => {
                    if (!isDraggingBlock || !timelineRef.current) return;
                    
                    const rect = timelineRef.current.getBoundingClientRect();
                    const dx = e.clientX - startPositionRef.current;
                    const dxTime = positionToTime(dx);
                    
                    // Calculate new start time, ensuring it doesn't go below 0
                    let newStartTime = Math.max(0, originalStartTimeRef.current + dxTime);
                    
                    // Update the animation on the layer
                    if (layer && layer.id) {
                      console.log(`Moving animation: ${layer.id}, new start: ${newStartTime}`);
                      // This would update the animation in the context in a real implementation
                      animation.startTime = newStartTime;
                      // Force a re-render
                      forceUpdate();
                    }
                  };
                  
                  // Handle drag end for moving the entire animation
                  const handleBlockDragEnd = () => {
                    setIsDraggingBlock(false);
                    document.removeEventListener('mousemove', handleBlockDragMove);
                    document.removeEventListener('mouseup', handleBlockDragEnd);
                  };
                  
                  // Force update utility
                  const [, updateState] = useState({});
                  const forceUpdate = () => updateState({});
                  
                  return (
                    <div 
                      key={index}
                      className={`absolute h-6 top-2 rounded ${selectedLayerId === layer.id ? 'bg-[#2A5BFF] bg-opacity-70 border border-[#4A7CFF]' : 'bg-[#2A5BFF] bg-opacity-30 border border-[#4A7CFF]'} cursor-move`}
                      style={{
                        left: `${timeToPosition(animation.startTime || 0)}px`,
                        width: `${timeToPosition(animation.duration)}px`
                      }}
                      onMouseDown={handleBlockDragStart}
                    >
                      {/* Left resize handle */}
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize" 
                        onMouseDown={handleLeftDragStart}
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
                        onMouseDown={handleRightDragStart}
                      ></div>
                    </div>
                  );
                })}
                
                {/* Only show keyframes for selected layer */}
                {selectedLayerId === layer.id && keyframes.map((keyframe: any, index: number) => (
                  <div 
                    key={index}
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