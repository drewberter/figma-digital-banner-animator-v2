import { useState, useRef, useEffect, useReducer } from 'react';
import { Play, Pause, SkipBack, Clock, LogIn, LogOut } from 'lucide-react';
import { mockLayers } from '../mock/animationData';
import { Animation, AnimationType, EasingType, AnimationMode } from '../types/animation';
import * as ContextMenu from '@radix-ui/react-context-menu';

interface TimelineProps {
  onTimeUpdate: (time: number) => void;
  onPlayPauseToggle: (playing: boolean) => void;
  isPlaying: boolean;
  currentTime: number;
  selectedFrameId?: string;
  onDurationChange?: (duration: number) => void;
  onLinkLayers?: () => void;
  onUnlinkLayer?: (layerId: string) => void;
}

const Timeline = ({
  onTimeUpdate,
  onPlayPauseToggle,
  isPlaying,
  currentTime,
  selectedFrameId = 'frame-1', // Default to frame-1 if no frame ID is provided
  onDurationChange,
  onLinkLayers,
  onUnlinkLayer
}: TimelineProps) => {
  // Create a forceUpdate function for timeline component
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  
  // Duration state
  const [duration, setDuration] = useState(5); // Default duration of 5 seconds
  
  // When duration changes externally, update the callback
  useEffect(() => {
    if (onDurationChange) {
      onDurationChange(duration);
    }
  }, [duration, onDurationChange]);
  const [showDurationInput, setShowDurationInput] = useState(false);
  
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
      console.log("Timeline rerendering for frame:", selectedFrameId);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [selectedFrameId]);
  
  // Calculate time marker positions
  const timeMarkers = [];
  const markerStep = 0.5; // Show a marker every 0.5 seconds
  for (let time = 0; time <= duration; time += markerStep) {
    timeMarkers.push({
      time,
      isMajor: time % 1 === 0 // Major marker for whole seconds
    });
  }
  
  // Generate keyframes for visualization (dummy keyframes)
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
    e.preventDefault(); // Prevent context menu from showing up
    
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
      
      const { isDraggingAnimation, isResizingLeft, isResizingRight, originalStartTime, originalDuration } = dragState.current;
      
      // Clone the layers for modification
      const updatedLayers = [...frameLayers];
      const layerIndex = updatedLayers.findIndex(l => l.id === dragState.current.layerId);
      if (layerIndex === -1) return;
      
      // Update the animation times based on drag operation
      if (isDraggingAnimation) {
        // Move the entire animation block
        let newStartTime = originalStartTime + timeDelta;
        
        // Clamp to ensure animation stays within bounds
        newStartTime = Math.max(0, Math.min(duration - originalDuration, newStartTime));
        
        updatedLayers[layerIndex].animations[dragState.current.animationIndex].startTime = newStartTime;
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
        
        updatedLayers[layerIndex].animations[dragState.current.animationIndex].startTime = newStartTime;
        updatedLayers[layerIndex].animations[dragState.current.animationIndex].duration = newDuration;
      } else if (isResizingRight) {
        // Resize from right edge (change duration only)
        let newDuration = originalDuration + timeDelta;
        
        // Enforce minimum duration and keep within bounds
        newDuration = Math.max(0.1, Math.min(duration - originalStartTime, newDuration));
        
        updatedLayers[layerIndex].animations[dragState.current.animationIndex].duration = newDuration;
      }
      
      // Update mockLayers with the change
      mockLayers[selectedFrameId] = updatedLayers;
      
      // Force a re-render
      forceUpdate();
      
      // Update the preview with the current time to see the effect of animation changes
      onTimeUpdate(currentTime);
    };
    
    const handleAnimationDragEnd = () => {
      document.removeEventListener('mousemove', handleAnimationDragMove);
      document.removeEventListener('mouseup', handleAnimationDragEnd);
    };
    
    document.addEventListener('mousemove', handleAnimationDragMove);
    document.addEventListener('mouseup', handleAnimationDragEnd);
  };

  // Handle adding a new animation to a layer
  const handleAddAnimationToLayer = (layerId: string, type: AnimationType, mode: AnimationMode = AnimationMode.Entrance) => {
    const layer = frameLayers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Calculate a default start time based on the mode
    const defaultStartTime = mode === AnimationMode.Entrance 
      ? 0 // Entrance animations start at beginning
      : 3; // Exit animations start later (adjust as needed)
    
    // Create a new animation
    const newAnimation: Animation = {
      type,
      mode,
      startTime: defaultStartTime,
      duration: 1, // 1 second duration by default
      easing: EasingType.EaseOut, // Default easing
    };
    
    // Add the animation to the layer
    layer.animations.push(newAnimation);
    
    // Force a re-render
    forceUpdate();
  };

  // Handle deleting an animation from a layer
  const handleDeleteAnimation = (layerId: string, animIndex: number) => {
    const layer = frameLayers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Remove the animation
    layer.animations.splice(animIndex, 1);
    
    // Force a re-render
    forceUpdate();
  };

  // Handle changing an animation's type
  const handleChangeAnimationType = (layerId: string, animIndex: number, type: AnimationType) => {
    const layer = frameLayers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Update the animation type
    layer.animations[animIndex].type = type;
    
    // Force a re-render
    forceUpdate();
  };
  
  // Handle toggling an animation between entrance and exit
  const handleToggleAnimationMode = (layerId: string, animIndex: number) => {
    const layer = frameLayers.find(l => l.id === layerId);
    if (!layer) return;
    
    const animation = layer.animations[animIndex];
    if (!animation) return;
    
    // Toggle between entrance and exit
    const currentMode = animation.mode || AnimationMode.Entrance;
    const newMode = currentMode === AnimationMode.Entrance 
      ? AnimationMode.Exit 
      : AnimationMode.Entrance;
    
    // Update the animation mode
    animation.mode = newMode;
    
    // If switching to exit, move it to a later time if it's at the beginning
    if (newMode === AnimationMode.Exit && (animation.startTime === 0 || animation.startTime === undefined)) {
      animation.startTime = Math.max(0, Math.min(duration - animation.duration, 3));
    }
    
    // Force a re-render
    forceUpdate();
  };

  // Render animation block with drag handles
  const renderAnimationBlock = (layer: any, animation: any, animIndex: number) => {
    // Determine if this is an entrance or exit animation
    const isExit = animation.mode === AnimationMode.Exit;
    const blockColor = isExit 
      ? 'bg-[#FF5A5A] hover:bg-[#FF6A6A]' // Red for exit animations
      : 'bg-[#2A5BFF] hover:bg-[#3A6BFF]'; // Blue for entrance animations
    const borderColor = isExit ? 'border-[#FF7A7A]' : 'border-[#4A7CFF]';
    
    return (
      <div 
        key={animIndex}
        className={`absolute h-6 top-2 rounded
          ${selectedLayerId === layer.id 
            ? `${blockColor} bg-opacity-70 border ${borderColor}` 
            : `${blockColor} bg-opacity-30 border ${borderColor}`
          } 
          cursor-move`}
        style={{
          left: `${timeToPosition(animation.startTime || 0)}px`,
          width: `${timeToPosition(animation.duration)}px`
        }}
        onMouseDown={(e) => handleAnimationDragStart(e, layer.id, animIndex, 'move')}
      >
        {/* Left resize handle */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize hover:bg-opacity-70" 
          onMouseDown={(e) => handleAnimationDragStart(e, layer.id, animIndex, 'resize-left')}
        ></div>
        
        {/* Animation content */}
        <div className="px-2 text-xs text-white truncate flex items-center justify-between w-full h-full pointer-events-none">
          <span className="flex items-center">
            {isExit ? <LogOut size={12} className="mr-1" /> : <LogIn size={12} className="mr-1" />}
            {animation.type}
          </span>
          {animation.duration >= 0.5 && (
            <span className="text-xs opacity-75 ml-1">
              {animation.duration.toFixed(1)}s
            </span>
          )}
        </div>
        
        {/* Right resize handle */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-opacity-70" 
          onMouseDown={(e) => handleAnimationDragStart(e, layer.id, animIndex, 'resize-right')}
        ></div>
      </div>
    );
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
            
            {/* Duration display/edit control */}
            {showDurationInput ? (
              <input
                type="number"
                className="w-12 bg-neutral-800 text-white font-mono text-sm rounded px-1 py-0.5 border border-neutral-700"
                value={duration}
                min={1}
                max={30}
                step={1}
                autoFocus
                onChange={(e) => {
                  const newDuration = Math.max(1, Math.min(30, Number(e.target.value)));
                  setDuration(newDuration);
                  // Call the parent component's onDurationChange callback if provided
                  if (onDurationChange) {
                    onDurationChange(newDuration);
                  }
                }}
                onBlur={() => setShowDurationInput(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setShowDurationInput(false);
                  }
                }}
              />
            ) : (
              <span 
                className="font-mono cursor-pointer hover:text-white hover:underline" 
                onClick={() => setShowDurationInput(true)}
                title="Click to change duration"
              >
                {duration.toFixed(1)}s
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="text-sm text-blue-400 hover:text-blue-300">
            Add Keyframe
          </button>
          <button 
            className="text-sm flex items-center rounded px-2 py-1 bg-blue-700 text-white hover:bg-blue-600"
            onClick={() => {
              if (onLinkLayers) {
                onLinkLayers();
              } else {
                // Fallback if no handler is provided
                alert('Auto-linking layers with the same name across frames');
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            <span className="ml-1.5">Auto-Link Layers</span>
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
              className={`h-10 flex items-center justify-between px-2 rounded cursor-pointer 
                ${selectedLayerId === layer.id ? 'bg-neutral-800' : 'hover:bg-neutral-700'} 
                text-sm ${selectedLayerId === layer.id ? 'text-white' : 'text-neutral-300'}
                ${layer.linkedLayer ? 'border-l-2 border-blue-500' : ''}`}
            >
              <div className="flex items-center">
                {/* Layer name with linked indicator */}
                <span className="flex items-center">
                  {/* Link indicator - always show but style differently if linked */}
                  <span 
                    className={`mr-2 flex items-center ${layer.linkedLayer 
                      ? (layer.linkedLayer.isMain ? 'text-blue-400 bg-blue-900' : 'text-blue-300 bg-blue-800') 
                      : 'text-neutral-600'
                    } ${layer.linkedLayer ? 'bg-opacity-60 px-1 py-0.5 rounded-sm' : ''}`}
                    title={layer.linkedLayer 
                      ? `Linked layer (${layer.linkedLayer.isMain ? 'Main' : 'Secondary'}) - ${layer.linkedLayer.syncMode} sync` 
                      : 'Not linked'
                    }
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="14" 
                      height="14" 
                      viewBox="0 0 24 24" 
                      fill={layer.linkedLayer ? "#3B82F6" : "none"} 
                      stroke={layer.linkedLayer ? "#3B82F6" : "currentColor"} 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                    
                    {/* Only show label if actually linked */}
                    {layer.linkedLayer && (
                      <span className="ml-1 text-xs font-bold">
                        {layer.linkedLayer.isMain ? 'M' : 'L'}
                      </span>
                    )}
                  </span>
                  {layer.name}
                </span>
              </div>
              
              {/* Layer link status indicators & actions */}
              {layer.linkedLayer && (
                <div className="flex space-x-1">
                  <button
                    className="flex items-center text-xs px-1 py-0.5 rounded-sm bg-opacity-20 bg-red-500 text-red-300 hover:bg-opacity-40 hover:text-white"
                    title="Unlink layer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onUnlinkLayer) {
                        onUnlinkLayer(layer.id);
                      } else {
                        // Fallback if no handler is provided
                        alert(`Unlinking layer: ${layer.name}`);
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"></path>
                      <path d="m6 6 12 12"></path>
                    </svg>
                    <span className="ml-1 text-xs">Unlink</span>
                  </button>
                </div>
              )}
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
            {frameLayers.map((layer) => (
              <ContextMenu.Root key={layer.id}>
                <ContextMenu.Trigger asChild>
                  <div 
                    className={`h-10 relative ${selectedLayerId === layer.id ? 'bg-[#1A1A1A]' : ''}`}
                  >
                    {/* Animation blocks with drag handles */}
                    {layer.animations.map((animation, animIndex) => (
                      <ContextMenu.Root key={animIndex}>
                        <ContextMenu.Trigger asChild>
                          {renderAnimationBlock(layer, animation, animIndex)}
                        </ContextMenu.Trigger>
                        
                        {/* Context menu for individual animation blocks */}
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
                            
                            <ContextMenu.Separator className="h-px bg-neutral-700 my-1" />
                            
                            <ContextMenu.Item 
                              className="text-sm text-white px-3 py-2 hover:bg-blue-600 cursor-pointer focus:outline-none focus:bg-blue-600"
                              onClick={() => handleToggleAnimationMode(layer.id, animIndex)}
                            >
                              {animation.mode === AnimationMode.Exit 
                                ? 'Convert to Entrance' 
                                : 'Convert to Exit'}
                            </ContextMenu.Item>
                            
                            <ContextMenu.Separator className="h-px bg-neutral-700 my-1" />
                            
                            <ContextMenu.Sub>
                              <ContextMenu.SubTrigger className="text-sm text-white px-3 py-2 flex items-center justify-between hover:bg-blue-600 cursor-pointer focus:outline-none focus:bg-blue-600">
                                <span>Change Type</span>
                                <span>▶</span>
                              </ContextMenu.SubTrigger>
                              <ContextMenu.Portal>
                                <ContextMenu.SubContent className="min-w-[160px] bg-neutral-800 border border-neutral-700 rounded-md shadow-lg overflow-hidden z-50">
                                  {Object.values(AnimationType).filter(type => type !== AnimationType.None).map((type) => (
                                    <ContextMenu.Item 
                                      key={type}
                                      className="text-sm text-white px-3 py-2 hover:bg-blue-600 cursor-pointer focus:outline-none focus:bg-blue-600"
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
                    
                    {/* Only show keyframes for selected layer */}
                    {selectedLayerId === layer.id && keyframes.map((keyframe, keyIndex) => (
                      <div 
                        key={keyIndex}
                        className="absolute w-3 h-3 top-3.5 -ml-1.5 rounded-sm bg-yellow-500 border border-yellow-600"
                        style={{ left: `${timeToPosition(keyframe.time)}px` }}
                      ></div>
                    ))}
                  </div>
                </ContextMenu.Trigger>
                
                {/* Context menu for layer track (empty area) */}
                <ContextMenu.Portal>
                  <ContextMenu.Content 
                    className="min-w-[180px] bg-neutral-800 border border-neutral-700 rounded-md shadow-lg overflow-hidden z-50"
                  >
                    <ContextMenu.Sub>
                      <ContextMenu.SubTrigger className="text-sm text-white px-3 py-2 flex items-center justify-between hover:bg-blue-600 cursor-pointer focus:outline-none focus:bg-blue-600">
                        <span className="flex items-center">
                          <LogIn size={14} className="mr-1.5" />
                          Add Entrance Animation
                        </span>
                        <span>▶</span>
                      </ContextMenu.SubTrigger>
                      <ContextMenu.Portal>
                        <ContextMenu.SubContent className="min-w-[160px] bg-neutral-800 border border-neutral-700 rounded-md shadow-lg overflow-hidden z-50">
                          {Object.values(AnimationType).filter(type => type !== AnimationType.None).map((type) => (
                            <ContextMenu.Item 
                              key={type}
                              className="text-sm text-white px-3 py-2 hover:bg-blue-600 cursor-pointer focus:outline-none focus:bg-blue-600"
                              onClick={() => handleAddAnimationToLayer(layer.id, type, AnimationMode.Entrance)}
                            >
                              {type}
                            </ContextMenu.Item>
                          ))}
                        </ContextMenu.SubContent>
                      </ContextMenu.Portal>
                    </ContextMenu.Sub>
                    
                    <ContextMenu.Sub>
                      <ContextMenu.SubTrigger className="text-sm text-white px-3 py-2 flex items-center justify-between hover:bg-blue-600 cursor-pointer focus:outline-none focus:bg-blue-600">
                        <span className="flex items-center">
                          <LogOut size={14} className="mr-1.5" />
                          Add Exit Animation
                        </span>
                        <span>▶</span>
                      </ContextMenu.SubTrigger>
                      <ContextMenu.Portal>
                        <ContextMenu.SubContent className="min-w-[160px] bg-neutral-800 border border-neutral-700 rounded-md shadow-lg overflow-hidden z-50">
                          {Object.values(AnimationType).filter(type => type !== AnimationType.None).map((type) => (
                            <ContextMenu.Item 
                              key={type}
                              className="text-sm text-white px-3 py-2 hover:bg-blue-600 cursor-pointer focus:outline-none focus:bg-blue-600"
                              onClick={() => handleAddAnimationToLayer(layer.id, type, AnimationMode.Exit)}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;