import { useState, useRef, useEffect, useReducer } from 'react';
import { Play, Pause, SkipBack, Clock } from 'lucide-react';
import { Animation, AnimationType, EasingType } from '../types/animation';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { useAnimationContext } from '../context/AnimationContext';

interface TimelineProps {
  onTimeUpdate: (time: number) => void;
  onPlayPauseToggle: (playing: boolean) => void;
  isPlaying: boolean;
  currentTime: number;
  selectedFrameId?: string | null;
}

const Timeline = ({
  onTimeUpdate,
  onPlayPauseToggle,
  isPlaying,
  currentTime,
  selectedFrameId = null // Default to null if no frame ID is provided
}: TimelineProps) => {
  // Create a forceUpdate function for timeline component
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  
  // Get animation context
  const animationContext = useAnimationContext();
  const duration = animationContext.duration || 5; // Fixed duration or from context
  
  const [isDragging, setIsDragging] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  
  // Get the layers for the current frame
  const frameLayers = animationContext.layers;
  
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

  // Update selected layer in context when it changes
  useEffect(() => {
    if (selectedLayerId) {
      animationContext.selectLayer(selectedLayerId);
    }
  }, [selectedLayerId, animationContext]);
  
  // Calculate time marker positions
  const timeMarkers = [];
  const markerStep = 0.5; // Show a marker every 0.5 seconds
  for (let time = 0; time <= duration; time += markerStep) {
    timeMarkers.push({
      time,
      isMajor: time % 1 === 0 // Major marker for whole seconds
    });
  }
  
  // Generate keyframes for visualization (TODO: use actual keyframes from context)
  const keyframes = [
    { time: 0.5, properties: {} },
    { time: 2.0, properties: {} },
    { time: 3.5, properties: {} }
  ];

  // Used to convert between animation time and pixel position
  const timeToPosition = (time: number) => {
    if (!timelineRef.current) return 0;
    
    const width = timelineRef.current.clientWidth || 400; // Use fallback if not available
    return (time / duration) * width;
  };

  const positionToTime = (position: number) => {
    if (!timelineRef.current) return 0;
    
    const width = timelineRef.current.clientWidth || 400; // Use fallback if not available
    const time = (position / width) * duration;
    return Math.max(0, Math.min(duration, time)); // Clamp time between 0 and duration
  };

  // Handle clicks on the timeline to set current time
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const clickTime = positionToTime(offsetX);
    
    onTimeUpdate(clickTime);
  };

  // Handle playhead dragging
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const dragTime = positionToTime(offsetX);
      
      onTimeUpdate(dragTime);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Handle animation block dragging and resizing
  const handleAnimationDragStart = (
    e: React.MouseEvent, 
    layerId: string, 
    animIndex: number,
    action: 'move' | 'resize-left' | 'resize-right'
  ) => {
    e.stopPropagation();
    const layer = frameLayers.find(l => l.id === layerId);
    if (!layer) return;
    
    const animation = layer.animations[animIndex];
    if (!animation) return;
    
    // Set the layer as selected
    setSelectedLayerId(layerId);
    
    // Initialize drag state
    dragState.current = {
      isDraggingAnimation: action === 'move',
      isResizingLeft: action === 'resize-left',
      isResizingRight: action === 'resize-right',
      startX: e.clientX,
      originalStartTime: animation.startTime || 0,
      originalDuration: animation.duration,
      layerId,
      animationIndex: animIndex
    };
    
    const handleAnimationDragMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      const deltaX = e.clientX - dragState.current.startX;
      const pixelsPerSecond = timelineRef.current.clientWidth / duration;
      const timeDelta = deltaX / pixelsPerSecond;
      
      const { isDraggingAnimation, isResizingLeft, isResizingRight, originalStartTime, originalDuration, layerId, animationIndex } = dragState.current;
      
      if (!layerId) return;
      
      const layer = frameLayers.find(l => l.id === layerId);
      if (!layer) return;
      
      // Clone the animation for modification
      const updatedAnimation = {...layer.animations[animationIndex]};
      
      // Update the animation times based on drag operation
      if (isDraggingAnimation) {
        // Move the entire animation block
        let newStartTime = originalStartTime + timeDelta;
        
        // Clamp to ensure animation stays within bounds
        newStartTime = Math.max(0, Math.min(duration - originalDuration, newStartTime));
        
        updatedAnimation.startTime = newStartTime;
      } else if (isResizingLeft) {
        // Resize from left edge (change start time and duration)
        let newStartTime = originalStartTime + timeDelta;
        let newDuration = originalDuration - timeDelta;
        
        // Enforce minimum duration and keep within bounds
        if (newDuration < 0.1) {
          newDuration = 0.1;
          newStartTime = originalStartTime + originalDuration - 0.1;
        }
        
        // Clamp to ensure animation stays within bounds
        newStartTime = Math.max(0, newStartTime);
        
        updatedAnimation.startTime = newStartTime;
        updatedAnimation.duration = newDuration;
      } else if (isResizingRight) {
        // Resize from right edge (change duration only)
        let newDuration = originalDuration + timeDelta;
        
        // Enforce minimum duration and keep within bounds
        newDuration = Math.max(0.1, Math.min(duration - originalStartTime, newDuration));
        
        updatedAnimation.duration = newDuration;
      }
      
      // Update the animation in the context
      animationContext.updateLayerAnimation(layerId, updatedAnimation);
      
      // Force a re-render
      forceUpdate();
      
      // Update the preview with the current time to see the effect of animation changes
      onTimeUpdate(currentTime);
    };
    
    const handleAnimationDragEnd = () => {
      document.removeEventListener('mousemove', handleAnimationDragMove);
      document.removeEventListener('mouseup', handleAnimationDragEnd);
      
      // Save animation state after changes
      animationContext.saveAnimationState();
    };
    
    document.addEventListener('mousemove', handleAnimationDragMove);
    document.addEventListener('mouseup', handleAnimationDragEnd);
  };

  // Handle adding a new animation to a layer
  const handleAddAnimationToLayer = (layerId: string, type: AnimationType) => {
    const layer = frameLayers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Create a new animation
    const newAnimation: Animation = {
      type,
      startTime: 0, // Start at beginning by default
      duration: 1, // 1 second duration by default
      easing: EasingType.EaseOut, // Default easing
    };
    
    // Add the animation to the layer using context
    animationContext.updateLayerAnimation(layerId, newAnimation);
    
    // Force a re-render
    forceUpdate();
    
    // Save animation state after adding new animation
    animationContext.saveAnimationState();
  };

  // Handle deleting an animation from a layer
  const handleDeleteAnimation = (layerId: string, animIndex: number) => {
    const layer = frameLayers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Make a copy of the layer's animations array
    const updatedAnimations = [...layer.animations];
    
    // Remove the animation
    updatedAnimations.splice(animIndex, 1);
    
    // Update the layer with the modified animations array
    animationContext.updateLayer(layerId, { animations: updatedAnimations });
    
    // Force a re-render
    forceUpdate();
    
    // Save animation state after deletion
    animationContext.saveAnimationState();
  };

  // Handle changing an animation's type
  const handleChangeAnimationType = (layerId: string, animIndex: number, type: AnimationType) => {
    const layer = frameLayers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Create updated animation with new type
    const updatedAnimation = {
      ...layer.animations[animIndex],
      type
    };
    
    // Update the animation using context
    animationContext.updateLayerAnimation(layerId, updatedAnimation);
    
    // Force a re-render
    forceUpdate();
    
    // Save animation state after type change
    animationContext.saveAnimationState();
  };

  return (
    <div className="w-full h-full flex flex-col bg-neutral-900 overflow-hidden">
      {/* Top controls */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-neutral-800">
        <div className="flex items-center">
          <button 
            className="w-8 h-8 flex items-center justify-center rounded text-neutral-300 hover:bg-neutral-800"
            onClick={() => onPlayPauseToggle(!isPlaying)}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button 
            className="w-8 h-8 flex items-center justify-center rounded text-neutral-300 hover:bg-neutral-800 ml-1"
            onClick={() => onTimeUpdate(0)}
          >
            <SkipBack size={16} />
          </button>
          <div className="flex items-center ml-4 text-sm text-neutral-400">
            <Clock size={14} className="mr-1" />
            <span className="font-mono">{currentTime.toFixed(1)}</span>
            <span className="mx-1">/</span>
            <span className="font-mono">{duration.toFixed(1)}</span>
          </div>
        </div>
        
        <div className="flex items-center">
          <button className="text-sm text-blue-400 hover:text-blue-300">
            Add Keyframe
          </button>
        </div>
      </div>
      
      {/* Timeline content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Layer track names */}
        <div className="w-48 border-r border-neutral-800 flex flex-col">
          <div className="h-8 border-b border-neutral-800 bg-neutral-900 px-2 text-xs text-neutral-500 flex items-end">
            Layers
          </div>
          
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
                {/* Animation blocks with drag handles and context menu */}
                {layer.animations.map((animation, animIndex) => (
                  <ContextMenu.Root key={animIndex}>
                    <ContextMenu.Trigger asChild>
                      <div 
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
                    </ContextMenu.Trigger>

                    {/* Right-click context menu */}
                    <ContextMenu.Portal>
                      <ContextMenu.Content 
                        className="min-w-[180px] bg-neutral-800 border border-neutral-700 rounded-md shadow-lg overflow-hidden z-50"
                      >
                        <ContextMenu.Item 
                          className="text-sm text-white px-3 py-2 hover:bg-blue-600 cursor-pointer focus:outline-none focus:bg-blue-600"
                          onClick={() => handleDeleteAnimation(layer.id, animIndex)}
                        >
                          Delete Animation
                        </ContextMenu.Item>
                        
                        <ContextMenu.Separator className="h-px bg-neutral-700" />
                        
                        <ContextMenu.Sub>
                          <ContextMenu.SubTrigger className="text-sm text-white px-3 py-2 hover:bg-blue-600 cursor-pointer flex items-center justify-between focus:outline-none focus:bg-blue-600">
                            Change Type
                            <span className="text-neutral-400">▶</span>
                          </ContextMenu.SubTrigger>
                          <ContextMenu.Portal>
                            <ContextMenu.SubContent className="min-w-[180px] bg-neutral-800 border border-neutral-700 rounded-md shadow-lg overflow-hidden">
                              {Object.values(AnimationType).map((type) => (
                                <ContextMenu.Item 
                                  key={type}
                                  className={`text-sm px-3 py-2 hover:bg-blue-600 cursor-pointer focus:outline-none focus:bg-blue-600 ${animation.type === type ? 'text-blue-400' : 'text-white'}`}
                                  onClick={() => handleChangeAnimationType(layer.id, animIndex, type)}
                                >
                                  {type}
                                </ContextMenu.Item>
                              ))}
                            </ContextMenu.SubContent>
                          </ContextMenu.Portal>
                        </ContextMenu.Sub>
                      </ContextMenu.Content>
                    </ContextMenu.Portal>
                  </ContextMenu.Root>
                ))}
                
                {/* Empty layer context menu - used to add new animations */}
                <ContextMenu.Root>
                  <ContextMenu.Trigger asChild>
                    <div className="absolute inset-0 cursor-pointer"></div>
                  </ContextMenu.Trigger>
                  <ContextMenu.Portal>
                    <ContextMenu.Content 
                      className="min-w-[180px] bg-neutral-800 border border-neutral-700 rounded-md shadow-lg overflow-hidden z-50"
                    >
                      <ContextMenu.Sub>
                        <ContextMenu.SubTrigger className="text-sm text-white px-3 py-2 hover:bg-blue-600 cursor-pointer flex items-center justify-between focus:outline-none focus:bg-blue-600">
                          Add Animation
                          <span className="text-neutral-400">▶</span>
                        </ContextMenu.SubTrigger>
                        <ContextMenu.Portal>
                          <ContextMenu.SubContent className="min-w-[180px] bg-neutral-800 border border-neutral-700 rounded-md shadow-lg overflow-hidden">
                            {Object.values(AnimationType).filter(type => type !== AnimationType.None).map((type) => (
                              <ContextMenu.Item 
                                key={type}
                                className="text-sm text-white px-3 py-2 hover:bg-blue-600 cursor-pointer focus:outline-none focus:bg-blue-600"
                                onClick={() => handleAddAnimationToLayer(layer.id, type)}
                              >
                                {type}
                              </ContextMenu.Item>
                            ))}
                          </ContextMenu.SubContent>
                        </ContextMenu.Portal>
                      </ContextMenu.Sub>
                    </ContextMenu.Content>
                  </ContextMenu.Portal>
                </ContextMenu.Root>
              </div>
            ))}
            
            {/* Keyframe indicator lines */}
            {keyframes.map((keyframe) => (
              <div
                key={keyframe.time}
                className="absolute top-0 bottom-0 w-px bg-green-500 opacity-50"
                style={{ left: `${timeToPosition(keyframe.time)}px` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;