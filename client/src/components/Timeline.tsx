import React, { useState, useRef, useEffect, useReducer } from 'react';
import { Play, Pause, SkipBack, Clock, LogIn, LogOut, Eye, EyeOff, Layers, Zap, Plus } from 'lucide-react';
import { mockLayers, mockFrames, mockGifFrames, generateGifFramesForAdSize } from '../mock/animationData';
import FrameEditDialog from './FrameEditDialog';
import FrameCardGrid from './FrameCardGrid';
import { 
  Animation, 
  AnimationType, 
  EasingType, 
  AnimationMode,
  TimelineMode,
  AnimationFrame,
  AnimationLayer,
  GifFrame
} from '../types/animation';
import * as ContextMenu from '@radix-ui/react-context-menu';
import * as Tabs from '@radix-ui/react-tabs';
import { autoLinkLayers, syncLinkedLayerAnimations, unlinkLayer } from '../utils/linkingUtils';

interface TimelineProps {
  onTimeUpdate: (time: number) => void;
  onPlayPauseToggle: (playing: boolean) => void;
  isPlaying: boolean;
  currentTime: number;
  selectedFrameId?: string;
  onDurationChange?: (duration: number) => void;
  onLinkLayers?: () => void;
  onUnlinkLayer?: (layerId: string) => void;
  timelineMode?: TimelineMode;
  onTimelineModeChange?: (mode: TimelineMode) => void;
  onFrameSelect?: (frameId: string) => void; // Callback for frame selection
}

const Timeline = ({
  onTimeUpdate,
  onPlayPauseToggle,
  isPlaying,
  currentTime,
  selectedFrameId = 'frame-1', // Default to frame-1 if no frame ID is provided
  onDurationChange,
  onLinkLayers,
  onUnlinkLayer,
  timelineMode = TimelineMode.Animation, // Default to Animation mode
  onTimelineModeChange,
  onFrameSelect
}: TimelineProps) => {
  // Create a forceUpdate function for timeline component
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const [localSelectedFrameId, setSelectedFrameId] = useState<string>(selectedFrameId);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  
  // Handle mode changes
  const handleTimelineModeChange = (mode: TimelineMode) => {
    if (onTimelineModeChange) {
      onTimelineModeChange(mode);
      
      // If switching to GIF frames mode, ensure we have proper GIF frames for the current ad size
      if (mode === TimelineMode.GifFrames) {
        // Extract the ad size ID if we're looking at a GIF frame already
        let adSizeId = localSelectedFrameId;
        
        // If it's a GIF frame ID, extract the parent ad size using our improved extraction logic
        if (localSelectedFrameId.startsWith('gif-frame-')) {
          console.log("TimelineModeChange: Extracting ad size ID from GIF frame:", localSelectedFrameId);
          
          // Extract ad size ID using more robust logic
          const parts = localSelectedFrameId.split('-');
          
          if (parts.length >= 4) {
            if (parts[2] === 'frame') {
              // Format is gif-frame-frame-X-Y, so adSizeId is "frame-X"
              adSizeId = `${parts[2]}-${parts[3]}`;
            } else {
              // Format is gif-frame-X-Y, so we need to determine if X is a frame number or part of the ad size ID
              adSizeId = parts[2].startsWith('frame') ? parts[2] : `frame-${parts[2]}`;
            }
          } else if (parts.length === 4) {
            // Old style - number-based
            adSizeId = `frame-${parts[2]}`;
          } else {
            // Fallback
            adSizeId = 'frame-1';
          }
          
          console.log("TimelineModeChange: Extracted adSizeId:", adSizeId);
        }
        
        // Check if the extracted adSizeId exists in mockLayers
        if (!mockLayers[adSizeId]) {
          console.warn("TimelineModeChange: Ad size not found in mockLayers:", adSizeId);
          adSizeId = 'frame-1'; // Fallback to default frame
        }
        
        // Generate GIF frames for the current ad size
        const gifFrames = generateGifFramesForAdSize(adSizeId);
        
        if (gifFrames.length === 0) {
          console.warn("TimelineModeChange: No GIF frames were generated for ad size", adSizeId);
        } else {
          console.log("TimelineModeChange: Generated GIF frames for ad size", adSizeId, "first frame:", gifFrames[0].id);
        }
        
        // If frames were generated, select the first one
        if (gifFrames.length > 0 && onFrameSelect) {
          onFrameSelect(gifFrames[0].id);
        }
      }
    }
  };
  
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
  const [isFrameDialogOpen, setIsFrameDialogOpen] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  
  // Update local selected frame ID when the prop changes
  useEffect(() => {
    setSelectedFrameId(selectedFrameId);
  }, [selectedFrameId]);
  
  // Auto link layers on component mount
  useEffect(() => {
    console.log("Auto-linking layers with the same name on load");
    // Use auto-linking utility to connect layers across frames
    const linkedFrames = autoLinkLayers(mockLayers);
    // This is a workaround in the mock version
    // In a real implementation, this would update the global state via context
    Object.keys(linkedFrames).forEach(frameId => {
      mockLayers[frameId] = linkedFrames[frameId];
    });
    forceUpdate(); // Force a re-render after linking
  }, []);
  
  // Handle unlinking a layer
  const handleUnlinkLayer = (layerId: string) => {
    console.log("Timeline: Unlinking layer", layerId);
    // Use unlinking utility
    const updatedLayers = unlinkLayer(mockLayers, layerId);
    // Update mock layers
    Object.keys(updatedLayers).forEach(frameId => {
      mockLayers[frameId] = updatedLayers[frameId];
    });
    // Notify parent component
    if (onUnlinkLayer) {
      onUnlinkLayer(layerId);
    }
    forceUpdate(); // Force a re-render after unlinking
  };
  
  // Handle toggling layer visibility in the current frame
  const handleToggleLayerVisibility = (layerId: string) => {
    console.log("Toggling visibility for layer", layerId, "in frame", localSelectedFrameId);
    
    // Find the current frame
    const currentFrameIndex = Object.keys(mockLayers).findIndex(frameId => frameId === localSelectedFrameId);
    if (currentFrameIndex === -1) return;
    
    const frame = mockLayers[localSelectedFrameId];
    const layerIndex = frame.findIndex(l => l.id === layerId);
    if (layerIndex === -1) return;
    
    // Toggle the layer's visibility
    frame[layerIndex].visible = !frame[layerIndex].visible;
    
    // Update the layers for the current frame
    mockLayers[localSelectedFrameId] = [...frame];
    
    // Force a re-render
    forceUpdate();
  };

  // Handle toggling layer visibility in a specific frame
  const handleToggleLayerVisibilityInFrame = (frameId: string, layerId: string) => {
    console.log("Toggling visibility for layer", layerId, "in frame", frameId);
    
    // If this is a GIF frame, we need to handle it differently
    if (frameId.startsWith('gif-frame-')) {
      // Extract the parent ad size ID
      let adSizeId = '';
      const parts = frameId.split('-');
      
      if (parts.length >= 4) {
        if (parts[2] === 'frame') {
          // Format is gif-frame-frame-X-Y, so adSizeId is "frame-X"
          adSizeId = `${parts[2]}-${parts[3]}`;
        } else {
          // Format is gif-frame-X-Y
          adSizeId = parts[2].startsWith('frame') ? parts[2] : `frame-${parts[2]}`;
        }
      } else if (parts.length === 4) {
        // Old format: gif-frame-1-1
        adSizeId = `frame-${parts[2]}`;
      }
      
      console.log("Toggling visibility in GIF frame. Using parent ad size:", adSizeId);
      
      // Find the GIF frame
      let gifFrameIndex = mockGifFrames.findIndex(frame => frame.id === frameId);
      
      // If the frame doesn't exist, let's create it first
      if (gifFrameIndex === -1) {
        console.warn("GIF frame not found:", frameId, "- recreating it");
        
        // Parse the ID to extract the parent ad size and frame index
        const parts = frameId.split('-');
        let frameIndex = 1;
        
        if (parts.length >= 5 && parts[2] === 'frame') {
          // Format: gif-frame-frame-X-Y where Y is the frame index
          frameIndex = parseInt(parts[4]) || 1;
        } else if (parts.length >= 4) {
          // Format: gif-frame-X-Y where Y is the frame index
          frameIndex = parseInt(parts[3]) || 1;
        }
        
        // Create a new GIF frame
        const newGifFrame: GifFrame = {
          id: frameId,
          name: `Frame ${frameIndex}`,
          selected: true,
          delay: 1,
          adSizeId,
          hiddenLayers: [],
          visibleLayerCount: mockLayers[adSizeId]?.length || 0,
          frameIndex: frameIndex - 1
        };
        
        // Add the new frame to the array
        mockGifFrames.push(newGifFrame);
        gifFrameIndex = mockGifFrames.length - 1;
      }
      
      const gifFrame = mockGifFrames[gifFrameIndex];
      
      // Update the hiddenLayers array in the GIF frame
      const newHiddenLayers = [...gifFrame.hiddenLayers];
      
      if (newHiddenLayers.includes(layerId)) {
        // Make the layer visible by removing it from hiddenLayers
        const index = newHiddenLayers.indexOf(layerId);
        newHiddenLayers.splice(index, 1);
      } else {
        // Hide the layer by adding it to hiddenLayers
        newHiddenLayers.push(layerId);
      }
      
      // Create a new GIF frame object with updated hiddenLayers to ensure reactivity
      const updatedGifFrame = {
        ...gifFrame,
        hiddenLayers: newHiddenLayers
      };
      
      // Update the visibleLayerCount
      const totalLayers = mockLayers[adSizeId]?.length || 0;
      updatedGifFrame.visibleLayerCount = totalLayers - updatedGifFrame.hiddenLayers.length;
      
      // Replace the frame in the array
      mockGifFrames[gifFrameIndex] = updatedGifFrame;
      
      console.log("Updated GIF frame:", updatedGifFrame);
      
      // Force a re-render to ensure the UI updates
      forceUpdate();
    } else {
      // Regular ad size frame - toggle layer visibility directly
      // Find the frame
      const frame = mockLayers[frameId];
      if (!frame) {
        console.error("Frame layers not found:", frameId);
        return;
      }
      
      const layerIndex = frame.findIndex(l => l.id === layerId);
      if (layerIndex === -1) {
        console.error("Layer not found:", layerId, "in frame", frameId);
        return;
      }
      
      // Toggle the layer's visibility
      frame[layerIndex].visible = !frame[layerIndex].visible;
      
      // Update the layers for the frame
      mockLayers[frameId] = [...frame];
    }
    
    // Force a re-render
    forceUpdate();
  };
  
  // Get the layers for the current frame
  const frameLayers = mockLayers[localSelectedFrameId] || [];
  
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
      console.log("Timeline rerendering for frame:", localSelectedFrameId);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [localSelectedFrameId]);
  
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
      mockLayers[localSelectedFrameId] = updatedLayers;
      
      // Force a re-render
      forceUpdate();
      
      // Update the preview with the current time to see the effect of animation changes
      onTimeUpdate(currentTime);
    };
    
    const handleAnimationDragEnd = () => {
      document.removeEventListener('mousemove', handleAnimationDragMove);
      document.removeEventListener('mouseup', handleAnimationDragEnd);
      
      // After dragging completes, sync changes to linked layers
      if (dragState.current.layerId) {
        // Sync changes to any linked layers
        const updatedLayers = syncLinkedLayerAnimations(mockLayers, dragState.current.layerId);
        
        // Update all frames with synced changes
        Object.keys(updatedLayers).forEach(frameId => {
          mockLayers[frameId] = updatedLayers[frameId];
        });
        
        // Force re-render
        forceUpdate();
      }
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
    
    // Create a new animation with unique ID
    const newAnimation: Animation = {
      id: `anim-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, // Generate unique ID
      type,
      mode,
      startTime: defaultStartTime,
      duration: 1, // 1 second duration by default
      easing: EasingType.EaseOut, // Default easing
    };
    
    // Add the animation to the layer
    layer.animations.push(newAnimation);
    
    // Sync to linked layers if this layer is linked
    if (layer.linkedLayer) {
      const updatedLayers = syncLinkedLayerAnimations(mockLayers, layerId);
      Object.keys(updatedLayers).forEach(frameId => {
        mockLayers[frameId] = updatedLayers[frameId];
      });
    }
    
    // Force a re-render
    forceUpdate();
  };

  // Handle deleting an animation from a layer
  const handleDeleteAnimation = (layerId: string, animIndex: number) => {
    const layer = frameLayers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Remove the animation
    layer.animations.splice(animIndex, 1);
    
    // Sync to linked layers if this layer is linked
    if (layer.linkedLayer) {
      const updatedLayers = syncLinkedLayerAnimations(mockLayers, layerId);
      Object.keys(updatedLayers).forEach(frameId => {
        mockLayers[frameId] = updatedLayers[frameId];
      });
    }
    
    // Force a re-render
    forceUpdate();
  };

  // Handle changing an animation's type
  const handleChangeAnimationType = (layerId: string, animIndex: number, type: AnimationType) => {
    const layer = frameLayers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Update the animation type
    layer.animations[animIndex].type = type;
    
    // Sync to linked layers if this layer is linked
    if (layer.linkedLayer) {
      const updatedLayers = syncLinkedLayerAnimations(mockLayers, layerId);
      Object.keys(updatedLayers).forEach(frameId => {
        mockLayers[frameId] = updatedLayers[frameId];
      });
    }
    
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
    
    // Sync to linked layers if this layer is linked
    if (layer.linkedLayer) {
      const updatedLayers = syncLinkedLayerAnimations(mockLayers, layerId);
      Object.keys(updatedLayers).forEach(frameId => {
        mockLayers[frameId] = updatedLayers[frameId];
      });
    }
    
    // Force a re-render
    forceUpdate();
  };
  
  // Handle adding a new frame
  const handleAddFrame = (frameData: { 
    name: string, 
    headlineText: string, 
    description?: string, 
    hiddenLayers?: string[],
    width?: number,
    height?: number
  }) => {
    // Get existing frame count to generate sequential frame number
    const existingFrameCount = Object.keys(mockLayers).length;
    const frameNumber = existingFrameCount + 1;
    
    // Create new frame with unique ID and sequential name
    const newFrameId = `frame-${Date.now()}`;
    
    // Clone the layers from the first frame
    const baseFrame = Object.values(mockLayers)[0] || [];
    mockLayers[newFrameId] = JSON.parse(JSON.stringify(baseFrame)); // Deep clone
    
    // Find a mock frame to use as a source for dimensions (default to first one)
    const sourceFrame = mockFrames.find((f: AnimationFrame) => f.id === Object.keys(mockLayers)[0]) || mockFrames[0];
    
    // Create the frame object with frameData properties
    const frameObjects = Object.keys(mockLayers).reduce((acc, frameId) => {
      // Use the data from mockFrames for existing frames
      const mockFrame = mockFrames.find((f: AnimationFrame) => f.id === frameId);
      
      // For existing frames, use their properties
      if (mockFrame) {
        acc[frameId] = {
          id: frameId,
          name: mockFrame.name,
          selected: frameId === localSelectedFrameId,
          width: mockFrame.width,
          height: mockFrame.height,
          delay: mockFrame.delay || 2.5,
          headlineText: mockFrame.headlineText,
          description: mockFrame.description,
          buttonText: mockFrame.buttonText,
          logoText: mockFrame.logoText
        };
      }
      // For the new frame, use the provided data
      else if (frameId === newFrameId) {
        acc[frameId] = {
          id: frameId,
          name: frameData.name,
          selected: true, // Make the new frame selected
          width: frameData.width || sourceFrame.width || 300,
          height: frameData.height || sourceFrame.height || 250,
          delay: 2.5,
          headlineText: frameData.headlineText,
          description: frameData.description,
          buttonText: 'Shop Now',
          logoText: 'LOGO',
          hiddenLayers: frameData.hiddenLayers || []
        };
      }
      
      return acc;
    }, {} as Record<string, AnimationFrame>);
    
    // Force a re-render
    forceUpdate();
    
    // Close the dialog
    setIsFrameDialogOpen(false);
  };
  
  // Handle adding a blank frame
  const handleAddBlankFrame = () => {
    console.log("handleAddBlankFrame called with timelineMode:", timelineMode);
    
    // Different behavior based on the timeline mode
    if (timelineMode === TimelineMode.Animation) {
      // In Animation mode, add a new ad size
      const frameCount = Object.keys(mockLayers).length;
      const newFrameNumber = frameCount + 1;
      
      console.log("Adding new animation frame (ad size):", `Frame ${newFrameNumber}`);
      
      handleAddFrame({
        name: `Frame ${newFrameNumber}`,
        headlineText: `Frame ${newFrameNumber} Headline`,
        description: `Description for frame ${newFrameNumber}`
      });
    } else if (timelineMode === TimelineMode.GifFrames) {
      // In GIF Frames mode, add a new GIF frame to the current ad size
      console.log("Adding new GIF frame. Current selection:", localSelectedFrameId);
      
      // Get the selected ad size ID (using the "frame-X" format)
      // This is the parent ad size for which we want to add a GIF frame
      let selectedAdSizeId = localSelectedFrameId;
      
      // If it's already a GIF frame ID, extract the parent ad size
      if (localSelectedFrameId.startsWith('gif-frame-')) {
        console.log("Extracting ad size ID from GIF frame:", localSelectedFrameId);
        
        // More robust extraction logic
        // Format could be either:
        // 1. gif-frame-frame-1-1 (new format: gif-frame-[adSizeId]-[frameNumber])
        // 2. gif-frame-1-1 (old format: gif-frame-[frameNumber]-[frameNumber])
        
        const parts = localSelectedFrameId.split('-');
        console.log("Parts from split:", parts);
        
        if (parts.length >= 4) { // New format: gif-frame-frame-1-1
          if (parts[2] === 'frame') {
            // Format is gif-frame-frame-X-Y, so adSizeId is "frame-X"
            selectedAdSizeId = `${parts[2]}-${parts[3]}`;
          } else {
            // Format is gif-frame-X-Y, so we need to determine if X is a frame number or part of the ad size ID
            selectedAdSizeId = parts[2].startsWith('frame') ? parts[2] : `frame-${parts[2]}`;
          }
        } else if (parts.length === 4) { // Old format: gif-frame-1-1
          // Old style - number-based
          selectedAdSizeId = `frame-${parts[2]}`;
        } else {
          // If we can't determine the format, use frame-1 as fallback
          console.warn("Could not parse GIF frame ID format:", localSelectedFrameId);
          selectedAdSizeId = 'frame-1';
        }
        
        console.log("Extracted ad size ID:", selectedAdSizeId);
      }
      
      console.log("Adding new GIF frame for ad size:", selectedAdSizeId);
      console.log("Available mockLayers keys:", Object.keys(mockLayers));
      
      // Get current GIF frames for this ad size
      const currentGifFrames = generateGifFramesForAdSize(selectedAdSizeId);
      console.log("Current GIF frames for this ad size:", currentGifFrames);
      
      // Create a new GIF frame
      const newGifFrameNumber = currentGifFrames.length + 1;
      const newGifFrameId = `gif-frame-${selectedAdSizeId}-${newGifFrameNumber}`;
      console.log("New GIF frame ID:", newGifFrameId);
      
      // Check if the selected ad size exists in mockLayers first
      if (!mockLayers[selectedAdSizeId]) {
        console.error("Could not find ad size in mockLayers:", selectedAdSizeId);
        
        // Emergency fallback - use the first available ad size
        const availableAdSizes = Object.keys(mockLayers);
        if (availableAdSizes.length > 0) {
          selectedAdSizeId = availableAdSizes[0];
          console.log("Using fallback ad size:", selectedAdSizeId);
        } else {
          console.error("No available ad sizes found in mockLayers");
          return;
        }
      }
      
      // Optionally also check in mockFrames
      const adSize = mockFrames.find(f => f.id === selectedAdSizeId);
      if (!adSize) {
        console.log("Ad size not found in mockFrames, but exists in mockLayers:", selectedAdSizeId);
        // We can still continue since we have the layers
      }
      
      // Get layers for this ad size
      const layers = mockLayers[selectedAdSizeId] || [];
      console.log("Layers for this ad size:", layers.length);
      
      // Create the new GIF frame
      const newGifFrame: GifFrame = {
        id: newGifFrameId,
        name: `GIF Frame ${newGifFrameNumber}`,
        selected: false,
        delay: 2.5, // Default delay
        adSizeId: selectedAdSizeId,
        hiddenLayers: [], // All layers visible by default
        visibleLayerCount: layers.length,
        frameIndex: currentGifFrames.length
      };
      
      console.log("Created new GIF frame:", newGifFrame);
      
      // Add the new GIF frame to the mock data
      mockGifFrames.push(newGifFrame);
      console.log("Added new GIF frame to mockGifFrames. Current count:", mockGifFrames.length);
      
      // If frames were generated, select the new one
      if (onFrameSelect) {
        console.log("Selecting new GIF frame:", newGifFrameId);
        onFrameSelect(newGifFrameId);
      } else {
        console.warn("onFrameSelect callback is not available");
      }
      
      // Force a re-render
      forceUpdate();
    } else {
      console.error("Unknown timeline mode:", timelineMode);
    }
  };
  
  // Handle duplicating a frame and its layers
  const handleDuplicateFrame = (frameId: string) => {
    // Different behavior based on timeline mode and frame type
    if (frameId.startsWith('gif-frame-')) {
      // Duplicating a GIF frame
      console.log("Duplicating GIF frame:", frameId);
      
      // Find the source frame in mockGifFrames
      const sourceGifFrame = mockGifFrames.find(frame => frame.id === frameId);
      if (!sourceGifFrame) {
        console.error("Source GIF frame not found:", frameId);
        
        // If we can't find the frame, try to extract the ad size ID from the frame ID
        const parts = frameId.split('-');
        let adSizeId = '';
        
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
        
        if (!adSizeId) {
          console.error("Could not extract ad size ID from frame ID:", frameId);
          return;
        }
        
        // Generate a new GIF frame from the ad size
        console.log("Creating new frame for ad size instead:", adSizeId);
        const gifFrames = generateGifFramesForAdSize(adSizeId);
        if (gifFrames.length === 0) {
          console.error("Failed to generate GIF frames for ad size:", adSizeId);
          return;
        }
        
        // Select the first frame
        if (onFrameSelect) {
          onFrameSelect(gifFrames[0].id);
        }
        
        return;
      }
      
      // Extract the parent ad size and frame count
      const adSizeId = sourceGifFrame.adSizeId;
      
      // Get all existing GIF frames for this ad size
      const existingGifFrames = mockGifFrames.filter(frame => frame.adSizeId === adSizeId);
      
      // Create a new GIF frame with the next frame number
      const newGifFrameNumber = existingGifFrames.length + 1;
      const newGifFrameId = `gif-frame-${adSizeId}-${newGifFrameNumber}`;
      
      console.log("Creating new GIF frame with ID:", newGifFrameId);
      
      // Clone the source GIF frame
      const newGifFrame: GifFrame = {
        ...JSON.parse(JSON.stringify(sourceGifFrame)), // Deep clone
        id: newGifFrameId,
        name: `GIF Frame ${newGifFrameNumber}`,
        selected: false,
        frameIndex: existingGifFrames.length
      };
      
      // Add the new GIF frame to mockGifFrames
      mockGifFrames.push(newGifFrame);
      console.log("Added new GIF frame. Total frames:", mockGifFrames.length);
      
      // Select the new frame
      if (onFrameSelect) {
        onFrameSelect(newGifFrameId);
      }
      
      // Force a re-render
      forceUpdate();
    } else {
      // Duplicating an ad size (animation frame)
      // Clone the selected frame's layers
      const sourceLayers = mockLayers[frameId];
      if (!sourceLayers) return;
      
      // Get the number of existing frames to create a sequential frame number
      const frameCount = Object.keys(mockLayers).length;
      const newFrameNumber = frameCount + 1;
      
      // Create new frame with a user-friendly ID (still unique but more readable)
      const newFrameId = `frame-${newFrameNumber}`;
      
      // Deep clone the layers
      mockLayers[newFrameId] = JSON.parse(JSON.stringify(sourceLayers));
      
      // Copy over frame properties when generating frames in FrameCardGrid
      // This will make sure delay is properly copied
      const frameObjects = Object.keys(mockLayers).reduce((acc, frameId) => {
        // Get the original frame if it exists
        const existingFrame = Object.values(acc).find(f => f.id === frameId);
        
        // Use the delay from the existing frame, or default to 2.5s
        const frameDelay = existingFrame ? existingFrame.delay : 2.5;
        
        // Find the actual frame in mockFrames to get the correct dimensions
        const mockFrame = mockFrames.find((f: AnimationFrame) => f.id === frameId);
        
        acc[frameId] = {
          id: frameId,
          name: mockFrame?.name || `Frame ${frameId.split('-')[1] || ''}`, // Use actual name if available
          selected: frameId === localSelectedFrameId,
          width: mockFrame?.width || 300, // Use actual width if available
          height: mockFrame?.height || 250, // Use actual height if available
          delay: frameDelay, // Copy the delay from source frame
          headlineText: mockFrame?.headlineText,
          description: mockFrame?.description,
          buttonText: mockFrame?.buttonText,
          logoText: mockFrame?.logoText
        };
        return acc;
      }, {} as Record<string, AnimationFrame>);
      
      // Set the same delay for the new frame as the source frame
      if (frameObjects[frameId]) {
        frameObjects[newFrameId] = {
          ...frameObjects[newFrameId],
          delay: frameObjects[frameId].delay,
        };
      }
      
      // Force a re-render
      forceUpdate();
    }
  };
  
  // Handle deleting a frame
  const handleDeleteFrame = (frameId: string) => {
    // Different behavior based on frame type
    if (frameId.startsWith('gif-frame-')) {
      // Deleting a GIF frame
      console.log("Deleting GIF frame:", frameId);
      
      // Create a new array without the frame to be deleted (immutable approach)
      const frameToDelete = mockGifFrames.find(frame => frame.id === frameId);
      if (!frameToDelete) {
        console.error("Could not find GIF frame to delete:", frameId);
        return;
      }
      
      // Create a copy of the array without the frame to delete
      const updatedFrames = mockGifFrames.filter(frame => frame.id !== frameId);
      
      // Update the global array with the new filtered array
      mockGifFrames.length = 0; // Clear the array
      mockGifFrames.push(...updatedFrames); // Add the updated frames
      
      console.log("GIF frame deleted. Remaining frames:", mockGifFrames.length);
      
      // If this was the last gif frame in this ad size, we need to select another ad size
      const remainingGifFrames = mockGifFrames.filter(f => f.adSizeId === frameToDelete.adSizeId);
      
      // Choose a new frame to select
      if (remainingGifFrames.length > 0) {
        // Select the first remaining frame in this ad size
        if (onFrameSelect) {
          onFrameSelect(remainingGifFrames[0].id);
        }
      } else {
        // No more GIF frames for this ad size, select the ad size itself
        if (onFrameSelect) {
          onFrameSelect(frameToDelete.adSizeId);
          
          // Also switch back to Animation mode if no more frames
          if (onTimelineModeChange) {
            onTimelineModeChange(TimelineMode.Animation);
          }
        }
      }
    } else {
      // Deleting an animation frame (ad size)
      console.log("Deleting regular ad size frame:", frameId);
      
      // Make sure this isn't the last frame
      if (Object.keys(mockLayers).length <= 1) {
        console.error("Cannot delete the last frame");
        return;
      }
      
      // Remove the frame from mockLayers
      delete mockLayers[frameId];
      
      // Also remove the frame from mockFrames array
      const frameIndex = mockFrames.findIndex(f => f.id === frameId);
      if (frameIndex !== -1) {
        mockFrames.splice(frameIndex, 1);
      }
      
      // Remove any associated GIF frames that use this ad size
      const updatedGifFrames = mockGifFrames.filter(frame => frame.adSizeId !== frameId);
      mockGifFrames.length = 0; // Clear the array
      mockGifFrames.push(...updatedGifFrames); // Add the updated frames
      
      // Choose the next frame to select
      const remainingFrameIds = Object.keys(mockLayers);
      if (remainingFrameIds.length > 0 && onFrameSelect) {
        onFrameSelect(remainingFrameIds[0]);
      }
    }
    
    // Force a re-render
    forceUpdate();
  };
  
  // Render the animation block with drag handles
  const renderAnimationBlock = (layer: AnimationLayer, animation: Animation, animIndex: number) => {
    // Animation start time (default to 0 if undefined)
    const startTime = animation.startTime || 0;
    
    // For entrance animations, use blue color
    // For exit animations, use red color
    const isExit = animation.mode === AnimationMode.Exit;
    const blockColor = isExit ? 'bg-red-500' : 'bg-blue-500';
    const blockBorder = isExit ? 'border-red-600' : 'border-blue-600';
    
    // Apply opacity if the animation is overridden in a linked layer
    const isOverridden = animation.isOverridden;
    const blockOpacity = isOverridden ? 'opacity-40' : '';
    
    return (
      <div 
        key={animIndex}
        className={`absolute h-6 rounded flex items-center ${blockColor} ${blockBorder} ${blockOpacity} cursor-move border text-xs text-white overflow-hidden`}
        style={{
          left: `${timeToPosition(startTime)}px`,
          width: `${timeToPosition(animation.duration)}px`,
          top: '8px'
        }}
        onMouseDown={(e) => handleAnimationDragStart(e, layer.id, animIndex, 'move')}
      >
        {/* Left resize handle */}
        <div 
          className="w-2 h-full cursor-w-resize"
          onMouseDown={(e) => handleAnimationDragStart(e, layer.id, animIndex, 'resize-left')}
        />
        
        {/* Animation label */}
        <div className="flex-1 px-1 whitespace-nowrap overflow-hidden">
          {animation.type}
          {animation.mode === AnimationMode.Exit && <span className="ml-1 text-xs">(exit)</span>}
        </div>
        
        {/* Right resize handle */}
        <div 
          className="w-2 h-full cursor-e-resize"
          onMouseDown={(e) => handleAnimationDragStart(e, layer.id, animIndex, 'resize-right')}
        />
      </div>
    );
  };
  
  return (
    <div className="flex flex-col h-full bg-black text-white border-t border-neutral-800">
      {/* Timeline Controls */}
      <div className="flex justify-between items-center p-2 border-b border-neutral-800">
        {/* Mode Toggle */}
        <div className="flex space-x-2">
          <Tabs.Root defaultValue="animation" onValueChange={(value) => handleTimelineModeChange(value === 'animation' ? TimelineMode.Animation : TimelineMode.GifFrames)}>
            <Tabs.List className="flex p-1 bg-neutral-800 rounded-md" aria-label="Timeline Mode">
              <Tabs.Trigger
                value="animation"
                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                          ${timelineMode === TimelineMode.Animation ? 'bg-blue-600 text-white' : 'text-neutral-300 hover:text-white'}`}
              >
                <Zap className="w-4 h-4 mr-1.5" />
                Animation
              </Tabs.Trigger>
              <Tabs.Trigger
                value="frameStyle"
                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                          ${timelineMode === TimelineMode.GifFrames ? 'bg-blue-600 text-white' : 'text-neutral-300 hover:text-white'}`}
              >
                <Layers className="w-4 h-4 mr-1.5" />
                GIF Frames
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        </div>
        
        {/* Action Buttons based on mode */}
        <div className="flex space-x-2">
          {timelineMode === TimelineMode.Animation ? (
            // Animation mode controls
            <>
              {/* Playback controls */}
              <div className="flex rounded-md bg-neutral-800 overflow-hidden">
                <button 
                  className="p-2 hover:bg-neutral-700 text-neutral-300 hover:text-white"
                  onClick={() => onTimeUpdate(0)}
                  title="Reset timeline to start"
                >
                  <SkipBack size={16} />
                </button>
                <button 
                  className="p-2 hover:bg-neutral-700 text-neutral-300 hover:text-white"
                  onClick={() => onPlayPauseToggle(!isPlaying)}
                  title={isPlaying ? "Pause animation" : "Play animation"}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
              </div>
              
              {/* Duration control */}
              <div className="flex items-center rounded-md bg-neutral-800 px-2 text-sm">
                {showDurationInput ? (
                  <input 
                    type="number" 
                    value={duration}
                    min={1}
                    max={30}
                    className="w-12 bg-neutral-900 text-white border border-neutral-700 rounded px-1"
                    onChange={(e) => {
                      const newDuration = Math.max(1, Math.min(30, Number(e.target.value)));
                      setDuration(newDuration);
                    }}
                    onBlur={() => setShowDurationInput(false)}
                    autoFocus
                  />
                ) : (
                  <div 
                    className="flex items-center gap-1 cursor-pointer" 
                    onClick={() => setShowDurationInput(true)}
                    title="Click to edit duration"
                  >
                    <Clock size={14} className="text-neutral-400" />
                    <span>{duration}s</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            // GIF Frames mode controls
            <div className="flex space-x-2">
              <button 
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-md flex items-center text-sm font-medium"
                onClick={handleAddBlankFrame} // Call handleAddBlankFrame directly instead of opening the dialog
                title="Add new GIF frame"
              >
                <Plus size={16} className="mr-1" />
                Add GIF Frame
              </button>
              <button 
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-md flex items-center text-sm font-medium"
                onClick={() => onPlayPauseToggle(!isPlaying)}
                title={isPlaying ? "Pause sequence" : "Play sequence"}
              >
                {isPlaying ? <Pause size={16} className="mr-1" /> : <Play size={16} className="mr-1" />}
                {isPlaying ? "Pause" : "Play"}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Timeline content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Layer track names - only show in Animation mode */}
        {timelineMode === TimelineMode.Animation && (
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
                  {/* Show different icons based on timeline mode */}
                  {timelineMode === TimelineMode.Animation ? (
                    // Link indicator for Animation mode
                    <span 
                      className={`mr-2 flex items-center ${layer.linkedLayer 
                        ? (layer.linkedLayer.isMain ? 'text-blue-400 bg-blue-900' : 'text-blue-300 bg-blue-800') 
                        : 'text-neutral-600'
                      } ${layer.linkedLayer ? 'bg-opacity-60 px-1 py-0.5 rounded-sm cursor-pointer hover:bg-opacity-80' : 'cursor-pointer hover:text-neutral-400'}`}
                      title={layer.linkedLayer 
                        ? `Click to unlink (${layer.linkedLayer.isMain ? 'Main' : 'Secondary'}) - ${layer.linkedLayer.syncMode} sync` 
                        : 'Not linked'
                      }
                      onClick={(e) => {
                        e.stopPropagation(); 
                        handleUnlinkLayer(layer.id);
                      }}
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
                  ) : (
                    // Visibility toggle for GifFrames mode
                    <span 
                      className={`mr-2 flex items-center ${layer.visible 
                        ? 'text-green-400 hover:text-green-300' 
                        : 'text-neutral-500 hover:text-neutral-400'
                      } cursor-pointer`}
                      title={layer.visible ? 'Layer is visible (click to hide)' : 'Layer is hidden (click to show)'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleLayerVisibility(layer.id);
                      }}
                    >
                      {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </span>
                  )}
                  
                  {/* Layer name */}
                  {layer.name}
                </div>
                
                {/* Right side icons based on mode */}
                {timelineMode === TimelineMode.Animation ? (
                  // Animation mode - show layer sync status
                  layer.linkedLayer && (
                    <div className="flex space-x-1">
                      <span className="text-xs text-blue-300 px-1 py-0.5 rounded-sm bg-blue-900 bg-opacity-30">
                        {layer.linkedLayer.syncMode}
                      </span>
                    </div>
                  )
                ) : (
                  // GIF Frames mode - show visibility toggle
                  <button
                    className={`p-1 rounded ${layer.visible ? 'text-green-400 hover:bg-neutral-700' : 'text-neutral-500 hover:bg-neutral-700'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleLayerVisibility(layer.id);
                    }}
                    title={layer.visible ? 'Hide layer' : 'Show layer'}
                  >
                    {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Timeline area */}
        <div className="flex-1 flex flex-col relative">
          {/* Only show time markers in Animation mode */}
          {timelineMode === TimelineMode.Animation && (
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
          )}
          
          {/* Playhead - only show in Animation mode */}
          {timelineMode === TimelineMode.Animation && (
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
          )}
          
          {/* Timeline Track or Frame Cards */}
          <div 
            className="flex-1 bg-neutral-900 rounded cursor-pointer relative overflow-auto"
            style={{ minWidth: '400px', maxWidth: '100%' }}
            onClick={timelineMode === TimelineMode.Animation ? handleTimelineClick : undefined}
            ref={timelineRef}
          >
            {timelineMode === TimelineMode.Animation ? (
              // Animation Mode - Show animation tracks
              frameLayers.map((layer) => (
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
              ))
            ) : (
              // GIF Frames Mode - Show card grid for frame management
              <FrameCardGrid
                frames={(() => {
                  // Get the selected ad size ID (using the "frame-X" format)
                  // This is the parent ad size for which we want to show GIF frames
                  let selectedAdSizeId = localSelectedFrameId;
                  
                  // If it's a GIF frame ID, extract the ad size ID using the same robust logic as in handleAddBlankFrame
                  if (localSelectedFrameId.startsWith('gif-frame-')) {
                    const parts = localSelectedFrameId.split('-');
                    
                    if (parts.length >= 4) { 
                      if (parts[2] === 'frame') {
                        // Format is gif-frame-frame-X-Y, so adSizeId is "frame-X"
                        selectedAdSizeId = `${parts[2]}-${parts[3]}`;
                      } else {
                        // Format is gif-frame-X-Y, so determine if X is a frame number or part of the ad size ID
                        selectedAdSizeId = parts[2].startsWith('frame') ? parts[2] : `frame-${parts[2]}`;
                      }
                    } else if (parts.length === 4) { 
                      // Old format: gif-frame-1-1
                      selectedAdSizeId = `frame-${parts[2]}`;
                    } else {
                      // Fallback
                      selectedAdSizeId = 'frame-1';
                    }
                    console.log("FrameCardGrid - Extracted adSizeId from GIF frame:", selectedAdSizeId);
                  }
                  
                  // If we're in GIF frames mode but don't have a valid ad size selected yet,
                  // generate frames for this ad size
                  const relevantGifFrames = generateGifFramesForAdSize(selectedAdSizeId);
                  
                  // Convert GifFrames to AnimationFrames for compatibility with FrameCardGrid
                  return relevantGifFrames.reduce((acc, gifFrame) => {
                    // Convert GifFrame to AnimationFrame for compatibility with FrameCardGrid
                    const adSize = mockFrames.find(f => f.id === gifFrame.adSizeId);
                    acc[gifFrame.id] = {
                      id: gifFrame.id,
                      name: gifFrame.name,
                      selected: gifFrame.id === localSelectedFrameId,
                      width: adSize ? adSize.width : 300, // Use parent ad size dimensions
                      height: adSize ? adSize.height : 250,
                      delay: gifFrame.delay,
                      hiddenLayers: gifFrame.hiddenLayers
                    };
                    return acc;
                  }, {} as Record<string, AnimationFrame>);
                })()}
                layers={mockLayers}
                selectedFrameId={localSelectedFrameId}
                onFrameSelect={(frameId) => {
                  // Update the selected frame ID
                  setSelectedFrameId(frameId);
                  
                  // Also inform the parent component about the selection change
                  if (onFrameSelect) {
                    onFrameSelect(frameId);
                  }
                }}
                onToggleLayerVisibility={handleToggleLayerVisibilityInFrame}
                onAddFrame={handleAddBlankFrame}
                onDuplicateFrame={handleDuplicateFrame}
                onDeleteFrame={handleDeleteFrame}
                onDelayChange={(frameId, delay) => {
                  console.log(`Setting delay for frame ${frameId} to ${delay}s`);
                  // This would update the frame's delay in a real implementation 
                }}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Frame Edit Dialog */}
      <FrameEditDialog
        isOpen={isFrameDialogOpen}
        onClose={() => setIsFrameDialogOpen(false)}
        onSave={handleAddFrame}
        isEditing={false}
        availableLayers={frameLayers}
        timelineMode={timelineMode}
      />
    </div>
  );
};

export default Timeline;