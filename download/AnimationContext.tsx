import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { 
  Animation, 
  AnimationLayer, 
  AnimationFrame, 
  Keyframe, 
  LinkSyncMode, 
  AdSize, 
  GifFrame, 
  TimelineMode,
  LinkRegistry,
  LinkedLayerInfo
} from '../types/animation';
import { RegistryMode } from '../utils/linkRegistryInterfaces';
import { useAutoSave, loadSavedData } from '../hooks/useAutoSave';
import { v4 as uuidv4 } from 'uuid';
import { 
  autoLinkLayers, 
  syncLinkedLayerAnimations, 
  setAnimationOverride,
  unlinkLayer as unlinkLayerUtil,
  setSyncMode as setSyncModeUtil,
  parseGifFrameId,
  translateLayerId,
  syncGifFrameLayerVisibility
} from '../utils/linkingUtils';
import { mockLayers, mockGifFrames, mockFrames } from '../mock/animationData';

// Import the new utilities
import { linkRegistry } from '../utils/linkRegistry';
import { syncLayersByNameSimple, hasVisibilityOverride, buildDirectLinkTable } from '../utils/directLayerLinking';
import { updateGifFrameLayerVisibility, findLayerById, setLayerOverride, hasLayerOverride } from '../utils/safeLayerOperations';
import {
  initializeLinkManager,
  toggleLayerLink,
  syncLinkedLayerVisibility,
  syncLinkedLayerAnimation,
  getRegistryModeFromTimelineMode
} from '../utils/linkSyncManager';

// Define the context type
interface AnimationContextType {
  layers: AnimationLayer[];
  frames: AnimationFrame[];
  adSizes: AdSize[];
  gifFrames: GifFrame[]; // Add gifFrames to the context
  linkRegistry: LinkRegistry; // Add linkRegistry to the context
  selectedAdSizeId: string | null;
  selectedLayerId: string | null;
  currentFrame: AnimationFrame | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  timelineMode: TimelineMode; // Add timeline mode to the context
  timelineRefreshKey: number; // Added to force re-renders of timeline when layer hierarchy changes
  visibilityUpdateCount: number; // Added to force re-renders when layer visibility changes
  
  // Ad Sizes
  addAdSize: (adSize: { name: string, width: number, height: number }) => AdSize;
  removeAdSize: (adSizeId: string) => void;
  selectAdSize: (adSizeId: string) => void;
  getSelectedAdSize: () => AdSize | null;
  
  // Layers
  selectLayer: (layerId: string) => void;
  getSelectedLayer: () => AnimationLayer | null;
  addLayer: (layer: AnimationLayer) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<AnimationLayer>) => void;
  toggleLayerVisibility: (frameId: string, layerId: string) => void;
  toggleLayerOverride: (frameId: string, layerId: string) => void; // Add override control for granular layer visibility
  toggleLayerLock: (layerId: string) => void;
  toggleLayerExpanded: (frameId: string, layerId: string) => void; // New function to toggle layer expanded state
  forceTimelineRefresh: () => void; // New function to force timeline to refresh
  
  // Timeline mode
  setTimelineMode: (mode: TimelineMode) => void; // Function to switch between animation and GIF frames modes
  
  // Frames
  addFrame: (frame: AnimationFrame) => void;
  removeFrame: (frameId: string) => void;
  selectFrame: (frameId: string) => void;
  normalizeFrameCounts: () => void; // Function to ensure all ad sizes have the same number of frames
  
  // Animation
  updateLayerAnimation: (layerId: string, animation: Animation) => void;
  addKeyframe: (layerId: string, time: number) => void;
  deleteKeyframe: (layerId: string, time: number) => void;
  setCurrentTime: (time: number) => void;
  
  // Layer Linking
  linkLayersByName: () => void;
  unlinkLayer: (layerId: string) => void;
  setSyncMode: (layerId: string, mode: LinkSyncMode) => void;
  toggleAnimationOverride: (layerId: string, animationId: string) => void;
  
  // Playback
  togglePlayback: () => void;
  
  // State persistence
  saveAnimationState: () => void;
  loadAnimationState: () => void;
}

// Helper function to create GIF frame IDs
function createGifFrameId(adSizeId: string, frameNumber: string): string {
  return `gif-frame-${adSizeId}-${frameNumber}`;
}

// Create context with default values
const AnimationContext = createContext<AnimationContextType>({} as AnimationContextType);

// Sample default frame
const defaultFrame: AnimationFrame = {
  id: 'frame-1',
  name: 'Frame 1',
  selected: true,
  width: 300,
  height: 250
};

// Sample default layer
const defaultLayer: AnimationLayer = {
  id: 'layer-1',
  name: 'Layer 1',
  type: 'rectangle',
  visible: true,
  locked: false,
  animations: [],
  keyframes: []
};

// Import mock data

// Storage keys
const STORAGE_KEY = 'figma-animation-plugin';
const AUTOSAVE_INTERVAL = 3000; // 3 seconds

// Provider component
export const AnimationProvider = ({ 
  children,
  initialTimelineMode = 'animation' 
}: { 
  children: ReactNode;
  initialTimelineMode?: TimelineMode;
}) => {
  // Load saved data or use defaults
  const savedData = loadSavedData(STORAGE_KEY, {
    layers: mockLayers['frame-1'] || [],
    frames: mockFrames,
    selectedLayerId: null,
    duration: 5
  });
  
  // State - initialize with saved or mock data
  const [layers, setLayers] = useState<AnimationLayer[]>(savedData.layers);
  const [frames, setFrames] = useState<AnimationFrame[]>(savedData.frames);
  
  // Add state for GIF frames to properly track changes
  const [gifFrames, setGifFrames] = useState<GifFrame[]>(mockGifFrames);
  
  // Use the already imported linkRegistry from the utils file
  // No need for a state variable as the imported registry is a singleton
  const linkRegistryRef = useRef(linkRegistry);
  
  // Initialize the link registry when mockGifFrames change
  useEffect(() => {
    if (mockGifFrames && mockGifFrames.length > 0) {
      console.log(`Initializing LinkRegistry with ${mockGifFrames.length} GIF frames`);
      
      // Build the direct link table for efficient name-based layer lookups
      buildDirectLinkTable(mockGifFrames);
      console.log('[AnimationContext] Built direct link table for GIF frames');
      
      // Populate basic data in the registry
      mockGifFrames.forEach(frame => {
        const { id } = frame;
        const parsed = parseGifFrameId(id);
        if (parsed.isValid) {
          // Initialize basic registry data if we need it
          // This is minimal as most functions are already implemented in the imported registry
        }
      });
    }
  }, [mockGifFrames]);
  
  // Timeline mode - animation (default) or gifFrames
  const [timelineMode, setTimelineMode] = useState<TimelineMode>(initialTimelineMode);
  
  // Update the timelineMode when initialTimelineMode prop changes
  useEffect(() => {
    console.log(`[AnimationContext] Updating timelineMode from props: ${initialTimelineMode}`);
    setTimelineMode(initialTimelineMode);
  }, [initialTimelineMode]);
  
  // Handle timeline mode changes
  const handleSetTimelineMode = useCallback((mode: TimelineMode) => {
    console.log(`Switching timeline mode to: ${mode}`);
    
    // Before changing modes, preserve the state of the current mode
    if (timelineMode === 'animation' && mode === 'gifFrames') {
      // Save animation state before switching to GIF mode
      console.log('Preserving animation state before switching to GIF mode');
      // No specific actions needed here, state is already saved
    } else if (timelineMode === 'gifFrames' && mode === 'animation') {
      // Save GIF frame state before switching to animation mode
      console.log('Preserving GIF frame state before switching to animation mode');
      // No specific actions needed here, state is already saved
    }
    
    // Update the mode
    setTimelineMode(mode);
    
    // Delay state initialization for the selected mode to ensure smooth transition
    setTimeout(() => {
      if (mode === 'gifFrames') {
        // Initialize GIF frame mode (make sure layer linking is properly set up)
        console.log('Initializing GIF frame mode');
        // Reset GIF frame-specific states if needed
      } else {
        // Initialize animation mode
        console.log('Initializing animation mode');
        // Reset animation-specific states if needed
      }
    }, 100);
  }, [timelineMode]);
  
  // Initialize AdSizes state by grouping existing frames by dimensions
  const [adSizes, setAdSizes] = useState<AdSize[]>(() => {
    // Create initial ad sizes from existing frames
    const sizeMap = new Map<string, AdSize>();
    
    savedData.frames.forEach(frame => {
      const sizeKey = `${frame.width}x${frame.height}`;
      
      if (!sizeMap.has(sizeKey)) {
        // Create a new ad size entry
        sizeMap.set(sizeKey, {
          id: `adsize-${sizeKey}`,
          name: `${frame.width} × ${frame.height}`,
          width: frame.width,
          height: frame.height,
          frames: [],
          selected: false
        });
      }
      
      // Add this frame to the appropriate ad size
      const adSize = sizeMap.get(sizeKey)!;
      adSize.frames.push({
        ...frame,
        adSizeId: adSize.id
      });
    });
    
    // Convert map to array and set the first ad size as selected
    const adSizeArray = Array.from(sizeMap.values());
    if (adSizeArray.length > 0) {
      adSizeArray[0].selected = true;
    }
    
    return adSizeArray;
  });
  
  // Track the currently selected ad size
  const [selectedAdSizeId, setSelectedAdSizeId] = useState<string | null>(
    adSizes.length > 0 ? adSizes.find(size => size.selected)?.id || adSizes[0].id : null
  );
  
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    savedData.selectedLayerId || (savedData.layers.length > 0 ? savedData.layers[0].id : null)
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(savedData.duration);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Add a state to track timeline refreshes - moved up to avoid initialization issues
  const [timelineRefreshKey, setTimelineRefreshKey] = useState<number>(0);
  
  // Add a state to track visibility updates
  const [visibilityUpdateCount, setVisibilityUpdateCount] = useState<number>(0);
  
  // Force refresh the timeline when layer hierarchy changes
  // Defined right after state declaration to ensure proper initialization order
  const forceTimelineRefresh = useCallback(() => {
    setTimelineRefreshKey(prev => prev + 1);
  }, []);
  
  // Increment visibility update counter to force re-renders when toggling layer visibility
  const incrementVisibilityCounter = useCallback(() => {
    setVisibilityUpdateCount(prev => prev + 1);
  }, []);

  // Get current frame
  const currentFrame = frames.find(frame => frame.selected) || null;
  
  // Initialize a frames-to-layers mapping for linking operations
  const [framesLayers, setFramesLayers] = useState<Record<string, AnimationLayer[]>>(() => {
    // Create mapping from mock data
    const framesToLayers: Record<string, AnimationLayer[]> = {};
    
    // Assume mockLayers already has frame IDs as keys
    Object.keys(mockLayers).forEach(frameId => {
      framesToLayers[frameId] = mockLayers[frameId];
    });
    
    return framesToLayers;
  });

  // Set up auto-save with our custom hook
  const animationState = {
    layers,
    frames,
    adSizes,
    selectedAdSizeId,
    selectedLayerId,
    duration,
    framesLayers
  };
  
  useAutoSave({
    key: STORAGE_KEY,
    data: animationState,
    interval: AUTOSAVE_INTERVAL,
    onSave: (key, data) => {
      console.log(`Animation state auto-saved to ${key}`);
    },
    onError: (error) => {
      console.error('Error auto-saving animation state:', error);
    }
  });
  
  // Track if events should be processed
  const ignoreNextStorageEvent = useRef(false);
  const lastProcessedTimestamp = useRef(0);
  
  // AutoLoading functionality without relying on PluginContext
  useEffect(() => {
    const loadData = (data: any, frameId?: string) => {
      // Ignore if this is from an internal update
      if (data._source === 'internal') {
        // Only log occasionally to reduce console spam
        if (Math.random() < 0.05) { // Only log ~5% of internal updates
          console.log('Ignoring internal update - animation state already updated');
        }
        return;
      }
      
      // Check timestamp to avoid duplicates
      if (data._timestamp && data._timestamp <= lastProcessedTimestamp.current) {
        // Only log occasionally
        if (Math.random() < 0.05) {
          console.log('Ignoring outdated or duplicate event');
        }
        return;
      }
      
      if (data._timestamp) {
        lastProcessedTimestamp.current = data._timestamp;
      }
      
      // Only log occasionally
      if (Math.random() < 0.2) { // Log ~20% of loads
        console.log(`Animation state auto-loaded for frame: ${frameId || 'unknown'}`);
      }
      
      if (data) {
        // Extract the data we need from the plugin
        const {
          layers: newLayers,
          frames: newFrames,
          duration: newDuration,
          selectedLayerId: newSelectedLayerId
        } = data;
        
        // Update our state with the loaded data
        if (newLayers) setLayers(newLayers);
        if (newFrames) setFrames(newFrames);
        if (newDuration) setDuration(newDuration);
        if (newSelectedLayerId) setSelectedLayerId(newSelectedLayerId);
        
        // If we have a specific frameId, select that frame
        if (frameId && newFrames) {
          const frameToSelect = newFrames.find((f: AnimationFrame) => f.id === frameId);
          if (frameToSelect) {
            // Update frame selection
            setFrames(prevFrames => 
              prevFrames.map(frame => ({
                ...frame,
                selected: frame.id === frameId
              }))
            );
            console.log(`Auto-selected frame: ${frameId}`);
          }
        }
        
        // Only log occasionally
        if (Math.random() < 0.2) {
          console.log('Animation state automatically loaded');
        }
      }
    };
    
    // Set up the listener for window storage events
    const handleStorageChange = (e: StorageEvent) => {
      // Check if this is an animation data change
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          // Skip if we should ignore the next event
          if (ignoreNextStorageEvent.current) {
            ignoreNextStorageEvent.current = false;
            console.log('Ignoring storage event due to flag');
            return;
          }
          
          const data = JSON.parse(e.newValue);
          loadData(data);
        } catch (error) {
          console.error('Error parsing animation data from storage event:', error);
        }
      }
    };
    
    // Add the storage event listener
    window.addEventListener('storage', handleStorageChange);
    
    // Clean up listener when component unmounts
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Select a layer
  const selectLayer = useCallback((layerId: string) => {
    setSelectedLayerId(layerId);
  }, []);

  // Get currently selected layer
  const getSelectedLayer = useCallback(() => {
    return layers.find(layer => layer.id === selectedLayerId) || null;
  }, [layers, selectedLayerId]);

  // Add a new layer
  const addLayer = useCallback((layer: AnimationLayer) => {
    setLayers(prev => [...prev, layer]);
    setSelectedLayerId(layer.id);
  }, []);

  // Remove a layer
  const removeLayer = useCallback((layerId: string) => {
    setLayers(prev => prev.filter(layer => layer.id !== layerId));
    if (selectedLayerId === layerId) {
      setSelectedLayerId(layers.length > 1 ? layers[0].id : null);
    }
  }, [layers, selectedLayerId]);

  // Update a layer
  const updateLayer = useCallback((layerId: string, updates: Partial<AnimationLayer>) => {
    setLayers(prev => 
      prev.map(layer => 
        layer.id === layerId ? { ...layer, ...updates } : layer
      )
    );
  }, []);

  // Toggle layer visibility
  const toggleLayerVisibility = useCallback((frameId: string, layerId: string) => {
    // Use the imported utils from safeLayerOperations and directLayerLinking
    
    // Use our imported direct linking system instead of the link sync manager
    // These functions are already imported at the top of the file
    
    // Check if this is a GIF frame
    if (frameId.startsWith('gif-frame-')) {
      // DETAILED LOGGING FOR DEBUGGING
      console.log(`\n\n=============================================`);
      console.log(`[AnimationContext][toggleLayerVisibility] START for layer ${layerId} in frame ${frameId}`);
      
      // Parse the frame ID for better logging
      const parsedFrameId = parseGifFrameId(frameId);
      if (parsedFrameId.isValid) {
        console.log(`[VISIBILITY DEBUG] Frame: ${parsedFrameId.frameNumber} of ad size ${parsedFrameId.adSizeId}`);
      }
      
      // Use our direct linking system for visibility toggling
      setGifFrames(prev => {
        // DEBUGGING: Let's check the expanded state of any groups in the chain
        const frameDebug = prev.find((f: GifFrame) => f.id === frameId);
        if (frameDebug && frameDebug.layers) {
          // Find the layer
          const layerDebug = findLayerById(frameDebug.layers, layerId);
          if (layerDebug) {
            // Log the layer's information
            console.log(`[AnimationContext][toggleLayerVisibility] Toggling layer: ${layerDebug.name} (${layerId})`);
            
            // If this is a child layer, check if its parent is expanded
            const findParentGroup = (layers: AnimationLayer[], childId: string): AnimationLayer | null => {
              for (const l of layers) {
                if (l.children && l.children.some(c => c.id === childId)) {
                  return l;
                }
                if (l.children) {
                  const deepParent = findParentGroup(l.children, childId);
                  if (deepParent) return deepParent;
                }
              }
              return null;
            };
            
            const parentGroup = findParentGroup(frameDebug.layers, layerId);
            if (parentGroup) {
              console.log(`[AnimationContext][toggleLayerVisibility] Layer belongs to group: ${parentGroup.name} (${parentGroup.id}), isExpanded: ${parentGroup.isExpanded}`);
            }
          }
        }
        // Get the frame being modified
        const frame = prev.find((f: GifFrame) => f.id === frameId);
        if (!frame) {
          console.error(`Frame ${frameId} not found`);
          return prev;
        }
        
        // Get the layer being toggled
        const layer = frame.layers?.find(l => l.id === layerId);
        if (!layer) {
          console.error(`Layer ${layerId} not found in frame ${frameId}`);
          return prev;
        }
        
        // Log current layer visibility state
        console.log(`[AnimationContext][toggleLayerVisibility] Current layer state:`, {
          layerId,
          layerName: layer.name,
          visible: layer.visible,
          isInHiddenLayers: frame.hiddenLayers?.includes(layerId)
        });
        
        // Calculate the new visibility state (opposite of current)
        // Be explicit about the current state for clearer debugging
        const isInHiddenLayers = frame.hiddenLayers?.includes(layerId);
        const isLayerVisible = layer.visible !== false; // Default to true if undefined
        const isCurrentlyHidden = isInHiddenLayers || !isLayerVisible;
        
        // Log the detailed visibility state for debugging
        console.log(`[VISIBILITY] Current state of layer "${layer.name}" (${layerId}):`, {
          isInHiddenLayers,
          isLayerVisible,
          isCurrentlyHidden
        });
        
        // New visibility is the opposite of current state
        const newVisibility = !isCurrentlyHidden;
        console.log(`[VISIBILITY] Setting layer "${layer.name}" to: ${newVisibility ? 'VISIBLE' : 'HIDDEN'}`);
        
        // Check if the layer has visibility overrides in this frame
        const hasOverride = frame.overrides?.layerVisibility?.[layerId]?.overridden;
        const shouldRespectOverrides = true; // This could be a user setting
        
        // If overridden, only update this specific frame
        if (hasOverride && shouldRespectOverrides) {
          console.log(`[AnimationContext][toggleLayerVisibility] Layer has override, only updating this frame`);
          
          // Make a copy of the frames to avoid mutation
          const updatedFrames = JSON.parse(JSON.stringify(prev));
          
          // Find the frame to update
          const frameIndex = updatedFrames.findIndex((f: GifFrame) => f.id === frameId);
          if (frameIndex === -1) return prev;
          
          // Update just this frame with the new layer visibility
          updatedFrames[frameIndex] = updateGifFrameLayerVisibility(
            updatedFrames[frameIndex],
            layerId,
            newVisibility
          );
          
          return updatedFrames;
        }
        
        // Not overridden, use our direct linking system
        try {
          console.log(`[AnimationContext][toggleLayerVisibility] Using direct linking system for visibility syncing`);
          
          // Always rebuild the direct link table to ensure it's up to date
          buildDirectLinkTable(prev);
          
          // Use our super simple name-based linking function to update all frames
          // Make a copy of the frames to avoid mutation
          const updatedFrames = JSON.parse(JSON.stringify(prev));
          
          // First update the source frame to give immediate feedback
          const frameIndex = updatedFrames.findIndex((f: GifFrame) => f.id === frameId);
          if (frameIndex === -1) return prev;
          
          // Update this frame with the new layer visibility
          updatedFrames[frameIndex] = updateGifFrameLayerVisibility(
            updatedFrames[frameIndex],
            layerId,
            newVisibility
          );
          
          // Now use our imported super simple linking function to propagate to other frames
          // Use the super simple approach to sync all other frames
          const finalFrames = syncLayersByNameSimple(
            layerId,
            frameId,
            updatedFrames,
            newVisibility
          );
          
          return finalFrames; // Return the frames after all updates
        } catch (error) {
          console.error('[DirectLinking] Error syncing layer visibility:', error);
          return prev;
        }
      });
      
      // Force a timeline refresh to ensure UI updates
      forceTimelineRefresh();
      
      // Increment visibility counter to force re-renders
      incrementVisibilityCounter();
      
      console.log(`[AnimationContext][toggleLayerVisibility] COMPLETE - re-render triggered`);
      
      // Early return since we've handled the GIF frame case
      return;
    } else {
      // Regular frame - update the layers with support for nested hierarchies
      // Helper function to recursively handle layer visibility toggling
      const updateLayerVisibilityWithChildren = (layers: AnimationLayer[], targetId: string): AnimationLayer[] => {
        return layers.map(layer => {
          // If this is the target layer, toggle its visibility
          if (layer.id === targetId) {
            const newVisibility = !layer.visible;
            
            // If we're hiding a group, also hide all its children
            if (!newVisibility && layer.children && layer.children.length > 0) {
              console.log(`AnimationContext: Hiding all children of group ${layer.name} (${layer.id})`);
              
              // Function to recursively hide children
              const hideChildren = (childLayers: AnimationLayer[]): AnimationLayer[] => {
                return childLayers.map(child => ({
                  ...child,
                  visible: false,
                  // Recursively process nested children
                  children: child.children && child.children.length > 0 
                    ? hideChildren(child.children) 
                    : child.children
                }));
              };
              
              return {
                ...layer,
                visible: newVisibility,
                children: hideChildren(layer.children)
              };
            }
            
            return { ...layer, visible: newVisibility };
          } 
          // If this layer has children, check them recursively
          else if (layer.children && layer.children.length > 0) {
            const updatedChildren = updateLayerVisibilityWithChildren(layer.children, targetId);
            
            // Check if we updated a child's visibility
            const childWasUpdated = JSON.stringify(updatedChildren) !== JSON.stringify(layer.children);
            
            // If a child was updated to be visible, make sure the parent is visible too
            if (childWasUpdated) {
              const childMadeVisible = updatedChildren.some(child => {
                // Direct child check
                if (child.id === targetId && child.visible) return true;
                
                // Also check nested children that might have been updated
                if (child.children) {
                  const findVisibleUpdatedChild = (children: AnimationLayer[]): boolean => {
                    return children.some(nestedChild => {
                      if (nestedChild.id === targetId && nestedChild.visible) return true;
                      return nestedChild.children ? findVisibleUpdatedChild(nestedChild.children) : false;
                    });
                  };
                  
                  return findVisibleUpdatedChild(child.children);
                }
                
                return false;
              });
              
              // If a child was made visible, ensure the parent is visible
              if (childMadeVisible && !layer.visible) {
                console.log(`AnimationContext: Making parent ${layer.name} (${layer.id}) visible because child ${targetId} is now visible`);
                return { ...layer, visible: true, children: updatedChildren };
              }
            }
            
            return { ...layer, children: updatedChildren };
          }
          
          // Not the target and no children to check
          return layer;
        });
      };
      
      // Update main layers array with hierarchy support
      setLayers(prev => updateLayerVisibilityWithChildren(prev, layerId));
      
      // Also update in framesLayers map with the same hierarchy support
      setFramesLayers(prev => {
        const updatedFramesLayers = {...prev};
        
        if (updatedFramesLayers[frameId]) {
          updatedFramesLayers[frameId] = updateLayerVisibilityWithChildren(updatedFramesLayers[frameId], layerId);
        }
        
        return updatedFramesLayers;
      });
      
      // Force re-renders with the visibility counter
      incrementVisibilityCounter();
      
      // Also refresh the timeline to ensure everything updates
      forceTimelineRefresh();
    }
  }, [timelineMode, framesLayers, forceTimelineRefresh, incrementVisibilityCounter]);

  // Toggle layer override status (to control whether a layer should use independent visibility settings)
  const toggleLayerOverride = useCallback((frameId: string, layerId: string) => {
    // Use our imported setLayerOverride and hasVisibilityOverride functions
    
    // This function only applies to GIF frames
    if (!frameId.startsWith('gif-frame-')) {
      console.log("toggleLayerOverride only applies to GIF frames");
      return;
    }

    // Use our parser to extract frame information
    const parsedFrameId = parseGifFrameId(frameId);
    if (!parsedFrameId.isValid) {
      console.error("AnimationContext - Invalid GIF frame ID format:", frameId);
      return;
    }
    
    const { adSizeId, frameNumber } = parsedFrameId;
    console.log(`AnimationContext - toggleLayerOverride for GIF frame: ${frameId}, ad size: ${adSizeId}, frame number: ${frameNumber}`);
    
    // Update the GIF frames with the layer override toggled
    setGifFrames(prev => {
      // Rebuild the direct link table to ensure it's up to date
      buildDirectLinkTable(prev);
      
      // Find the frame
      const frameIndex = prev.findIndex((f: GifFrame) => f.id === frameId);
      if (frameIndex === -1) {
        console.error(`Frame ${frameId} not found`);
        return prev;
      }
      
      const frame = prev[frameIndex];
      
      // Check the current override status using our direct linking helper
      const isCurrentlyOverridden = hasVisibilityOverride(frame, layerId);
      console.log(`[DirectLinking] Layer ${layerId} override status is currently: ${isCurrentlyOverridden}`);
      
      // Make a copy of the frames array
      const updatedFrames = [...prev];
      
      // Update the frame with the override toggled
      updatedFrames[frameIndex] = setLayerOverride(
        frame,
        layerId,
        !isCurrentlyOverridden // Toggle the override
      );
      
      console.log(`[DirectLinking] Layer ${layerId} override status is now: ${!isCurrentlyOverridden}`);
      
      return updatedFrames;
    });
    
    // Also update the main layers array for UI feedback
    setLayers(prev => 
      prev.map(layer => {
        if (layer.id === layerId) {
          // For temporary UI feedback in the main layer list
          const isCurrentlyOverridden = layer.isOverridden || false;
          return { ...layer, isOverridden: !isCurrentlyOverridden };
        }
        return layer;
      })
    );
    
    // Force a UI refresh by updating the lastToggled timestamp
    setLayers(prevLayers => {
      return prevLayers.map(layer => 
        layer.id === layerId 
          ? { ...layer, lastToggled: new Date().getTime() } 
          : layer
      );
    });
    
    // Force a timeline refresh
    forceTimelineRefresh();
    
    // Increment visibility counter to force re-renders
    incrementVisibilityCounter();
  }, [forceTimelineRefresh, incrementVisibilityCounter]);

  // Toggle layer lock
  const toggleLayerLock = useCallback((layerId: string) => {
    // Access the linkRegistry via imported variable to avoid Fast Refresh error
    const registry = linkRegistry;
    // First, check if the layer is already locked or not
    // We need to find the layer in both the main layers array and in the gifFrames
    let layer = layers.find(l => l.id === layerId);
    let foundInGifFrames = false;
    let containingFrameId: string | null = null;
    
    // If not found in main layers, check in gifFrames
    if (!layer) {
      // Search in all GIF frames
      for (const frame of gifFrames) {
        if (!frame.layers) continue;
        
        // Use helper function to recursively search through nested layers
        const findLayerById = (layers: AnimationLayer[], targetId: string): AnimationLayer | null => {
          for (const l of layers) {
            if (l.id === targetId) {
              return l;
            }
            
            // Check children if they exist
            if (l.children && l.children.length > 0) {
              const found = findLayerById(l.children, targetId);
              if (found) return found;
            }
          }
          return null;
        };
        
        const foundLayer = findLayerById(frame.layers, layerId);
        if (foundLayer) {
          layer = foundLayer;
          foundInGifFrames = true;
          containingFrameId = frame.id;
          break;
        }
      }
    }
    
    // If still not found, log error and return
    if (!layer) {
      console.error(`Layer ${layerId} not found for locking toggle`);
      return;
    }

    const newLockedState = !layer.locked;
    
    // Generate a SINGLE group ID for ALL linked layers if we're locking
    // Generate a unique group ID based on the mode to ensure proper isolation
    // GIF mode group IDs MUST start with "gif-link-" prefix for mode separation
    const sharedGroupId = newLockedState ? 
      (timelineMode === 'gifFrames' ? `gif-link-${uuidv4()}` : uuidv4()) : "";
    
    // Log what we're doing with enhanced details
    console.log(`[AnimationContext] Toggling layer lock state for ${layer.name} (${layerId}):`, {
      oldState: layer.locked,
      newState: newLockedState,
      groupId: sharedGroupId,
      timelineMode,
      hasLinkedLayer: !!layer.linkedLayer,
      linkedLayerGroupId: layer.linkedLayer?.groupId || 'none',
      linkedLayerSyncMode: layer.linkedLayer?.syncMode || 'none',
      isMain: layer.linkedLayer?.isMain || false,
      hasOverrides: layer.linkedLayer?.overrides?.length || 0,
    });
    
    // If we're in GIF frames mode, we need to link across frames
    if (timelineMode === 'gifFrames') {
      // Keep track of layer names that need to be locked/unlocked
      const layerNameToUpdate = layer.name;

      // First update all layers with the same name in the main layers array
      setLayers(prev => 
        prev.map(l => {
          // Update the clicked layer
          if (l.id === layerId) {
            // Add or remove linkedLayer property based on the new locked state
            if (newLockedState) {
              // Use the shared groupId we created at the top of the function
              console.log(`[toggleLayerLock] Adding linkedLayer to ${l.name} (${l.id}) with groupId ${sharedGroupId}`);
              
              // Also update the linkRegistry to make the link icon display correctly
              linkRegistry.linkLayers(l.name, [l.id], timelineMode === 'gifFrames' ? 'gif' : 'animation');
              
              return { 
                ...l, 
                locked: true,
                linkedLayer: {
                  groupId: sharedGroupId,
                  syncMode: LinkSyncMode.Full, // Default to full sync in GIF frame mode
                  isMain: true, // This is the main layer that was clicked
                  overrides: [] // No overrides initially
                }
              };
            } else {
              // If unlocking, remove the linkedLayer property
              const { linkedLayer, ...rest } = l;
              console.log(`[toggleLayerLock] Removing linkedLayer from ${l.name} (${l.id})`);
              return { ...rest, locked: false };
            }
          }
          // Also update any layer with the same name (cross-ad-size linking)
          if (l.name === layerNameToUpdate && l.id !== layerId) {
            console.log(`[toggleLayerLock] Also updating main layer ${l.name} (${l.id}) to locked: ${newLockedState}`);
            
            // Use the same group ID for all linked layers
            if (newLockedState) {
              // Update the linkRegistry for this linked layer too
              if (layerNameToUpdate) {
                linkRegistry.linkLayers(layerNameToUpdate, [layerId, l.id], timelineMode === 'gifFrames' ? 'gif' : 'animation');
              }
              
              return { 
                ...l, 
                locked: true,
                linkedLayer: {
                  groupId: sharedGroupId, // Use the shared groupId for consistent linking
                  syncMode: LinkSyncMode.Full,
                  isMain: false, // This is not the main layer
                  overrides: []
                }
              };
            } else {
              // If unlocking, remove the linkedLayer property
              const { linkedLayer, ...rest } = l;
              return { ...rest, locked: false };
            }
          }
          return l;
        })
      );
      
      // Find the source frame that contains this layer
      // This helps us identify the frame number for cross-ad-size syncing
      const frameContainingLayer = gifFrames.find((frame: GifFrame) => 
        frame.layers && frame.layers.some(l => l.id === layerId || 
          (l.children && JSON.stringify(l.children).includes(layerId)))
      );
      
      if (!frameContainingLayer) {
        console.warn(`Couldn't find a frame containing layer ${layerId} for lock syncing`);
      }
      
      // Parse the frame ID to get the frame number
      const parsedFrameId = frameContainingLayer ? parseGifFrameId(frameContainingLayer.id) : null;
      const frameNumber = parsedFrameId?.frameNumber;
      
      console.log(`[toggleLayerLock] Layer ${layer.name} (${layerId}) belongs to frame number ${frameNumber}`);
      
      // Now find all frames with layers having the same name as the current layer
      // and update their lock states accordingly - ACROSS AD SIZES
      setGifFrames(prev => {
        // Rebuild the direct link table to ensure it's up to date
        buildDirectLinkTable(prev);

        // Make a deep copy to avoid direct mutations
        const updatedFrames = JSON.parse(JSON.stringify(prev));
        
        // Filter only the frames with the same frame number but from DIFFERENT ad sizes
        // This ensures we only link across different ad sizes, not within the same ad size
        const sourceAdSizeId = parsedFrameId?.adSizeId;
        
        // Use the link registry to find frames with the same number
        let framesWithSameNumber: GifFrame[] = [];
        
        if (frameNumber) {
          // Get frame IDs with the same frame number from the registry
          const linkedFrameIds = linkRegistry.findFramesByNumber(frameNumber);
          console.log(`[toggleLayerLock] Link registry found ${linkedFrameIds.length} frames with number ${frameNumber}`);
          
          // Filter frames that match these IDs but are not from the source ad size
          if (linkedFrameIds.length > 0) {
            framesWithSameNumber = updatedFrames.filter((frame: GifFrame) => {
              // Include if in the linked frames list and not from the same ad size
              const parsed = parseGifFrameId(frame.id);
              return linkedFrameIds.includes(frame.id) && parsed.adSizeId !== sourceAdSizeId;
            });
          }
        }
        
        // If the registry didn't return any frames, fall back to the original filtering method
        if (framesWithSameNumber.length === 0 && frameNumber && sourceAdSizeId) {
          framesWithSameNumber = updatedFrames.filter((frame: GifFrame) => {
            const parsed = parseGifFrameId(frame.id);
            // Only include frames with the same frame number but from DIFFERENT ad sizes
            return parsed.isValid && 
                   parsed.frameNumber === frameNumber && 
                   parsed.adSizeId !== sourceAdSizeId; // This is the key difference
          });
          
          // If we found frames this way, register them in the link registry
          if (framesWithSameNumber.length > 0) {
            console.log(`[toggleLayerLock] Adding ${framesWithSameNumber.length} frames with number ${frameNumber} to registry`);
            
            // Get all frames with this number (including the source frame)
            const allFramesWithNumber = [
              ...(frameContainingLayer ? [frameContainingLayer] : []),
              ...framesWithSameNumber
            ];
            
            // Extract frame IDs
            const frameIds = allFramesWithNumber.map(frame => frame.id);
            
            // Register in the link registry
            if (frameIds.length >= 2) {
              // Add to the registry
              if (!linkRegistry.gifFrameMode.framesByNumber[frameNumber]) {
                linkRegistry.gifFrameMode.framesByNumber[frameNumber] = [];
              }
              
              // Add any missing frame IDs to the registry
              frameIds.forEach(id => {
                if (!linkRegistry.gifFrameMode.framesByNumber[frameNumber].includes(id)) {
                  linkRegistry.gifFrameMode.framesByNumber[frameNumber].push(id);
                }
              });
            }
          }
        }
        
        console.log(`[toggleLayerLock] Found ${framesWithSameNumber.length} frames with number ${frameNumber} from different ad sizes`);
        
        // Find the layers across these frames with the same name
        if (layer.name) {
          // Recursive function to find layers with a given name
          const findAndUpdateLayersByName = (layers: AnimationLayer[], name: string, locked: boolean): AnimationLayer[] => {
            return layers.map(l => {
              // If this layer has the target name, update its lock state
              if (l.name === name) {
                console.log(`[toggleLayerLock] Found matching layer ${l.name} (${l.id}), updating locked state to ${locked}`);
                return { ...l, locked };
              }
              
              // If this layer has children, process them too
              if (l.children && Array.isArray(l.children)) {
                return {
                  ...l,
                  children: findAndUpdateLayersByName(l.children, name, locked)
                };
              }
              
              return l;
            });
          };
          
          // Update only frames with the same frame number
          framesWithSameNumber.forEach((frame: GifFrame) => {
            const frameIndex = updatedFrames.findIndex((f: GifFrame) => f.id === frame.id);
            if (frameIndex !== -1 && updatedFrames[frameIndex].layers) {
              // Use the same groupId we created earlier for consistent linking
              // This ensures all layers share the same groupId
              
              // Enhanced version that adds linkedLayer property properly
              const updateLayersWithLinking = (layers: AnimationLayer[], name: string, locked: boolean): AnimationLayer[] => {
                return layers.map(l => {
                  // If this layer has the target name, update its lock state
                  if (l.name === name) {
                    console.log(`[toggleLayerLock] Found matching layer ${l.name} (${l.id}), updating locked state to ${locked}`);
                    
                    // If we're locking, add/update linkedLayer property to support animation context
                    if (locked && sharedGroupId) {
                      // Create or update the linkedLayer property
                      const linkedLayer: LinkedLayerInfo = {
                        groupId: sharedGroupId,
                        syncMode: LinkSyncMode.Full, // Default to full sync in GIF frame mode
                        isMain: false, // Not the main layer in GIF frame mode
                        overrides: [] // No overrides initially
                      };
                      
                      console.log(`[toggleLayerLock] Adding linkedLayer to ${l.name} (${l.id}) with shared groupId ${sharedGroupId}`);
                      return { ...l, locked: true, linkedLayer };
                    } 
                    else if (!locked) {
                      // If unlocking, remove the linkedLayer property
                      const { linkedLayer, ...rest } = l;
                      return { ...rest, locked: false };
                    }
                    return { ...l, locked };
                  }
                  
                  // If this layer has children, process them too
                  if (l.children && Array.isArray(l.children)) {
                    return {
                      ...l,
                      children: updateLayersWithLinking(l.children, name, locked)
                    };
                  }
                  
                  return l;
                });
              };
              
              // Use the enhanced update function
              updatedFrames[frameIndex].layers = updateLayersWithLinking(
                updatedFrames[frameIndex].layers, 
                layer.name, 
                newLockedState
              );
              console.log(`[toggleLayerLock] Updated lock state for layer ${layer.name} in frame ${frame.id}`);
            }
          });
        }
        
        return updatedFrames;
      });
      
      // Force a refresh to ensure UI updates
      forceTimelineRefresh();
      
      // Increment visibility counter to force re-renders
      incrementVisibilityCounter();
      
    } else {
      // In regular animation mode, we need to use the linkedLayer property
      
      // Find if this layer is part of a link group
      const targetLayer = layers.find(l => l.id === layerId);
      if (!targetLayer) return;
      
      console.log(`[toggleLayerLock] Animation mode: Toggling lock for layer ${targetLayer.name} (${layerId})`);
      
      if (newLockedState) {
        // If we're locking the layer, we need to create link relationships
        // Find all layers with the same name across different frames
        const layersWithSameName = layers.filter(l => 
          l.name === targetLayer.name && l.id !== layerId
        );
        
        if (layersWithSameName.length > 0) {
          console.log(`[toggleLayerLock] Animation mode: Found ${layersWithSameName.length} layers with name ${targetLayer.name} to link`);
          
          // Create a new link group
          const groupId = uuidv4();
          
          // Update all layers in this group
          setLayers(prev => 
            prev.map(layer => {
              // If this layer has the same name as the target, link it
              if (layer.name === targetLayer.name) {
                const isMain = layer.id === layerId; // First clicked layer is main
                
                // Create linkedLayer property
                const linkedLayer: LinkedLayerInfo = {
                  groupId,
                  syncMode: LinkSyncMode.Full, // Default to full sync
                  isMain, // First layer in the group is the main one
                  overrides: [] // No overrides initially
                };
                
                console.log(`[toggleLayerLock] Animation mode: Linking layer ${layer.name} (${layer.id}), isMain: ${isMain}`);
                
                return { 
                  ...layer, 
                  locked: true, // Mark as locked
                  linkedLayer // Add link info
                };
              }
              return layer;
            })
          );
        } else {
          // If no other layers to link, just toggle the locked state
          setLayers(prev => 
            prev.map(layer => 
              layer.id === layerId ? { ...layer, locked: newLockedState } : layer
            )
          );
        }
      } else {
        // If we're unlocking, check if it's part of a link group
        if (targetLayer.linkedLayer) {
          const { groupId } = targetLayer.linkedLayer;
          
          console.log(`[toggleLayerLock] Animation mode: Unlinking group ${groupId}`);
          
          // Also update the linkRegistry to reflect the unlinking
          // Use the utility function to convert from timelineMode to registryMode
          const registryMode = getRegistryModeFromTimelineMode(timelineMode);
          const layersToUnlink: string[] = [];
          
          // First collect all the layer IDs to be unlinked from this group
          layers.forEach(layer => {
            if (layer.linkedLayer && layer.linkedLayer.groupId === groupId) {
              layersToUnlink.push(layer.id);
              
              // Remove this layer from the registry
              console.log(`[toggleLayerLock] Removing layer ${layer.name} (${layer.id}) from link registry in ${registryMode} mode`);
            }
          });
          
          // Log the unlinking operation
          console.log(`[toggleLayerLock] Unlinking ${layersToUnlink.length} layers from group ${groupId} in ${registryMode} mode`);
          
          // Update the linkRegistry - unlink each layer
          layersToUnlink.forEach(id => {
            linkRegistry.unlinkLayer(id, registryMode, layers);
          });
          
          // Remove link relationships for all layers in the UI state
          setLayers(prev => 
            prev.map(layer => {
              if (layer.linkedLayer && layer.linkedLayer.groupId === groupId) {
                // Remove linkedLayer property and unlock
                const { linkedLayer, ...restLayer } = layer;
                console.log(`[toggleLayerLock] Animation mode: Unlinking layer ${layer.name} (${layer.id})`);
                return { 
                  ...restLayer, 
                  locked: false // Unlock it
                };
              }
              return layer;
            })
          );
        } else {
          // If not part of a link group, just toggle the locked state
          setLayers(prev => 
            prev.map(layer => 
              layer.id === layerId ? { ...layer, locked: newLockedState } : layer
            )
          );
        }
      }
    }
  }, [layers, timelineMode, forceTimelineRefresh, incrementVisibilityCounter, uuidv4]);
  
  // Toggle layer expanded state
  const toggleLayerExpanded = useCallback((frameId: string, layerId: string) => {
    console.log(`AnimationContext - Toggling layer ${layerId} expanded state in frame ${frameId}`);
    
    // Update the layer's expanded state directly in the layer object
    setLayers(prev => {
      return prev.map(layer => {
        if (layer.id === layerId) {
          // Toggle the isExpanded property
          const newIsExpanded = layer.isExpanded !== undefined ? !layer.isExpanded : false;
          console.log(`AnimationContext: Set layer ${layer.name} (${layer.id}) isExpanded to ${newIsExpanded}`);
          return { ...layer, isExpanded: newIsExpanded };
        } else if (layer.children) {
          // Recursively check children
          const updateChildren = (children: AnimationLayer[]): AnimationLayer[] => {
            return children.map(child => {
              if (child.id === layerId) {
                const newIsExpanded = child.isExpanded !== undefined ? !child.isExpanded : false;
                console.log(`AnimationContext: Set child layer ${child.name} (${child.id}) isExpanded to ${newIsExpanded}`);
                return { ...child, isExpanded: newIsExpanded };
              } else if (child.children) {
                return { ...child, children: updateChildren(child.children) };
              }
              return child;
            });
          };
          
          return { ...layer, children: updateChildren(layer.children) };
        }
        return layer;
      });
    });
    
    // Update framesLayers to reflect the expanded state change
    setFramesLayers(prev => {
      const updatedFramesLayers = {...prev};
      
      // Helper function to recursively find and update a layer in the tree
      const updateLayerExpanded = (layers: AnimationLayer[], targetId: string): boolean => {
        for (let i = 0; i < layers.length; i++) {
          const layer = layers[i];
          
          // Check if this is the target layer
          if (layer.id === targetId) {
            // Toggle the isExpanded property
            layer.isExpanded = !layer.isExpanded; 
            console.log(`AnimationContext: Set frameLayer ${layer.name} (${layer.id}) isExpanded to ${layer.isExpanded}`);
            return true;
          }
          
          // If this layer has children, search in them
          if (layer.children && layer.children.length > 0) {
            const found = updateLayerExpanded(layer.children, targetId);
            if (found) return true;
          }
        }
        
        return false;
      };
      
      // Apply the update only if we have layers for this frame
      if (updatedFramesLayers[frameId]) {
        updateLayerExpanded(updatedFramesLayers[frameId], layerId);
      } else {
        console.error(`No layers found for frame ${frameId}`);
      }
      
      return updatedFramesLayers;
    });
    
    // Update GIF frames as well to ensure consistent layer hierarchy
    setGifFrames(prev => {
      const updatedGifFrames = [...prev];
      
      for (let i = 0; i < updatedGifFrames.length; i++) {
        const gifFrame = updatedGifFrames[i];
        
        // Parse the GIF frame ID to get the parent ad size ID
        const parsedFrameId = parseGifFrameId(gifFrame.id);
        if (!parsedFrameId.isValid) continue;
        
        // Only process frames related to the current ad size
        if (parsedFrameId.adSizeId === frameId) {
          // If the GIF frame has layers, update them
          if (gifFrame.layers && Array.isArray(gifFrame.layers)) {
            const updateGifLayerExpanded = (layers: AnimationLayer[], targetId: string): boolean => {
              for (let j = 0; j < layers.length; j++) {
                const layer = layers[j];
                
                // Check if this is the target layer
                if (layer.id === targetId) {
                  // Toggle the isExpanded property
                  layer.isExpanded = !layer.isExpanded;
                  console.log(`AnimationContext: Updated GIF frame layer ${layer.name} (${layer.id}) isExpanded to ${layer.isExpanded}`);
                  return true;
                }
                
                // If this layer has children, search in them
                if (layer.children && layer.children.length > 0) {
                  const found = updateGifLayerExpanded(layer.children, targetId);
                  if (found) return true;
                }
              }
              
              return false;
            };
            
            // Try to update the layer in this GIF frame
            updateGifLayerExpanded(gifFrame.layers, layerId);
          }
        }
      }
      
      return updatedGifFrames;
    });
    
    // Force a timeline refresh to reflect the changes
    forceTimelineRefresh();
  }, []);

  // Add a new frame
  const addFrame = useCallback((frame: AnimationFrame) => {
    // If there's a selected ad size, associate this frame with it
    const frameWithAdSize: AnimationFrame = {
      ...frame,
      adSizeId: frame.adSizeId || (selectedAdSizeId || undefined),
      selected: true
    };
    
    // Deselect all other frames
    setFrames(prev => {
      const updatedFrames = prev.map(f => ({ ...f, selected: false }));
      return [...updatedFrames, frameWithAdSize];
    });
    
    // Also add this frame to the adSize's frames array
    if (frameWithAdSize.adSizeId) {
      setAdSizes(prev => 
        prev.map(size => {
          if (size.id === frameWithAdSize.adSizeId) {
            return {
              ...size,
              frames: [...size.frames, frameWithAdSize]
            };
          }
          return size;
        })
      );
    }
  }, [selectedAdSizeId]);

  // Remove a frame
  const removeFrame = useCallback((frameId: string) => {
    // First get the frame to be removed
    const frameToRemove = frames.find(f => f.id === frameId);
    
    // Remove from frames array
    setFrames(prev => {
      const filteredFrames = prev.filter(f => f.id !== frameId);
      
      // If the frame was selected, select another frame
      if (frameToRemove?.selected && filteredFrames.length > 0) {
        filteredFrames[0].selected = true;
      }
      
      return filteredFrames;
    });
    
    // If this frame belongs to an ad size, remove it from the ad size's frames array
    if (frameToRemove?.adSizeId) {
      setAdSizes(prev => 
        prev.map(size => {
          if (size.id === frameToRemove.adSizeId) {
            return {
              ...size,
              frames: size.frames.filter(f => f.id !== frameId)
            };
          }
          return size;
        })
      );
    }
  }, [frames]);

  // Select a frame
  const selectFrame = useCallback((frameId: string) => {
    setFrames(prev => 
      prev.map(frame => ({
        ...frame,
        selected: frame.id === frameId
      }))
    );
    
    // Update layers to display the selected frame
    if (mockLayers[frameId]) {
      setLayers(mockLayers[frameId]);
    }
  }, []);
  
  // Normalize frame counts across all ad sizes
  // This ensures all ad sizes have the same number of frames in GIF mode
  const normalizeFrameCounts = useCallback(() => {
    console.log(`[normalizeFrameCounts] Starting frame count normalization`);
    
    try {
      // Exit early if not in GIF frames mode
      if (timelineMode !== 'gifFrames') {
        console.log(`[normalizeFrameCounts] Not in GIF frames mode, skipping`);
        return;
      }
      
      // First, find the ad size with the maximum number of frames
      const adSizeFrameCounts = new Map<string, number>();
      let maxFrameCount = 0;
      let adSizeWithMaxFrames = '';
      
      // Count frames per ad size
      gifFrames.forEach(frame => {
        const parsedId = parseGifFrameId(frame.id);
        if (!parsedId.isValid) {
          console.warn(`[normalizeFrameCounts] Skipping frame with invalid ID: ${frame.id}`);
          return;
        }
        
        const { adSizeId } = parsedId;
        const currentCount = adSizeFrameCounts.get(adSizeId) || 0;
        adSizeFrameCounts.set(adSizeId, currentCount + 1);
        
        // Update max count if needed
        if (currentCount + 1 > maxFrameCount) {
          maxFrameCount = currentCount + 1;
          adSizeWithMaxFrames = adSizeId;
        }
      });
      
      console.log(`[normalizeFrameCounts] Maximum frame count: ${maxFrameCount} in ad size ${adSizeWithMaxFrames}`);
      console.log(`[normalizeFrameCounts] Ad size frame counts:`, Object.fromEntries(adSizeFrameCounts));
      
      // No need to do anything if there's only one frame
      if (maxFrameCount <= 1) {
        console.log(`[normalizeFrameCounts] Only one frame exists, no normalization needed`);
        return;
      }
      
      // Create new frames for ad sizes that have fewer frames than the maximum
      const newFramesToAdd: GifFrame[] = [];
      
      adSizeFrameCounts.forEach((frameCount, adSizeId) => {
        // Skip if this ad size already has the max number of frames
        if (frameCount >= maxFrameCount) {
          console.log(`[normalizeFrameCounts] Ad size ${adSizeId} already has ${frameCount} frames, skipping`);
          return;
        }
        
        // Find how many frames we need to add
        const framesToAdd = maxFrameCount - frameCount;
        console.log(`[normalizeFrameCounts] Adding ${framesToAdd} frames to ad size ${adSizeId}`);
        
        // Find existing frames for this ad size to use as templates
        const existingFrames = gifFrames.filter(frame => {
          const parsed = parseGifFrameId(frame.id);
          return parsed.isValid && parsed.adSizeId === adSizeId;
        });
        
        if (existingFrames.length === 0) {
          console.error(`[normalizeFrameCounts] No existing frames found for ad size ${adSizeId}`);
          return;
        }
        
        console.log(`[normalizeFrameCounts] Found ${existingFrames.length} existing frames for ad size ${adSizeId}`);
        
        // Use the first frame as a template
        const templateFrame = existingFrames[0];
        console.log(`[normalizeFrameCounts] Using template frame: ${templateFrame.id}`);
        
        // Create new frames based on the highest frame number
        for (let i = frameCount + 1; i <= maxFrameCount; i++) {
          // Find the correct new frame ID
          // For GIF frames, we need to use the format that preserves ad size ID
          const newFrameId = createGifFrameId(adSizeId, i.toString());
          
          // Deep clone the template frame and update its ID and name
          const newFrame: GifFrame = JSON.parse(JSON.stringify(templateFrame));
          newFrame.id = newFrameId;
          newFrame.name = `Frame ${i}`;
          newFrame.frameNumber = i.toString();
          newFrame.frameIndex = i - 1;
          
          newFramesToAdd.push(newFrame);
          console.log(`[normalizeFrameCounts] Created new frame ${newFrameId} with frameNumber ${i}`);
        }
      });
      
      // Add the new frames to the gif frames
      if (newFramesToAdd.length > 0) {
        setGifFrames(prev => {
          const updatedFrames = [...prev, ...newFramesToAdd];
          console.log(`[normalizeFrameCounts] Updated GIF frames, now have ${updatedFrames.length} total frames`);
          return updatedFrames;
        });
        console.log(`[normalizeFrameCounts] Added ${newFramesToAdd.length} new frames to normalize frame counts`);
        
        // Force refresh the timeline to show the new frames
        forceTimelineRefresh();
        incrementVisibilityCounter();
        
        // Alert the user about the successful operation
        alert(`Successfully normalized frame counts across all ad sizes. Added ${newFramesToAdd.length} new frames.`);
      } else {
        console.log(`[normalizeFrameCounts] No new frames needed, all ad sizes have ${maxFrameCount} frames`);
        alert(`All ad sizes already have the same number of frames (${maxFrameCount}). No changes needed.`);
      }
    } catch (error) {
      console.error(`[normalizeFrameCounts] Error during frame normalization:`, error);
      alert(`Error during frame normalization: ${error}`);
    }
  }, [gifFrames, timelineMode, forceTimelineRefresh, incrementVisibilityCounter]);

  // Update a layer's animation
  const updateLayerAnimation = useCallback((layerId: string, animation: Animation) => {
    // Ensure animation has a unique ID
    const animationWithId = animation.id ? animation : {
      ...animation,
      id: uuidv4()  // Generate a unique ID if none exists
    };
    
    setLayers(prev => 
      prev.map(layer => {
        if (layer.id !== layerId) return layer;
        
        // Find if an animation of this type already exists
        const existingIndex = layer.animations.findIndex(a => a.type === animationWithId.type);
        
        if (existingIndex >= 0) {
          // Replace existing animation, but keep the existing ID
          const updatedAnimations = [...layer.animations];
          updatedAnimations[existingIndex] = {
            ...animationWithId,
            id: layer.animations[existingIndex].id || animationWithId.id
          };
          return { ...layer, animations: updatedAnimations };
        } else {
          // Add new animation
          return { ...layer, animations: [...layer.animations, animationWithId] };
        }
      })
    );
  }, []);

  // Add a keyframe
  const addKeyframe = useCallback((layerId: string, time: number) => {
    setLayers(prev => 
      prev.map(layer => {
        if (layer.id !== layerId) return layer;
        
        // Check if keyframe at this time already exists
        const existingIndex = layer.keyframes.findIndex(k => k.time === time);
        
        if (existingIndex >= 0) {
          // Don't duplicate keyframes
          return layer;
        } else {
          // Add new keyframe
          const newKeyframe: Keyframe = {
            time,
            properties: {} // To be filled with current properties
          };
          return { ...layer, keyframes: [...layer.keyframes, newKeyframe] };
        }
      })
    );
  }, []);

  // Delete a keyframe
  const deleteKeyframe = useCallback((layerId: string, time: number) => {
    setLayers(prev => 
      prev.map(layer => {
        if (layer.id !== layerId) return layer;
        return { 
          ...layer, 
          keyframes: layer.keyframes.filter(k => k.time !== time) 
        };
      })
    );
  }, []);

  // Toggle playback
  const togglePlayback = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // Auto-advance time when playing
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const newTime = prev + 1/30; // Advance by one frame at 30fps
        if (newTime >= duration) {
          // Loop back to start
          return 0;
        }
        return newTime;
      });
    }, 1000/30); // 30fps
    
    return () => clearInterval(interval);
  }, [isPlaying, duration]);
  
  // Auto-link layers with the same name on initial load
  useEffect(() => {
    // This effect will run once when the component mounts
    console.log("Auto-linking layers with the same name on load");
    
    // First, organize layers by frame
    const frameLayersMap: Record<string, AnimationLayer[]> = {};
    
    frames.forEach(frame => {
      // For now, we'll use the mock data structure
      if (mockLayers[frame.id]) {
        frameLayersMap[frame.id] = mockLayers[frame.id];
      } else {
        // If this frame has no layers in mock data, use what's in the current layers
        const frameLayers = layers.filter(layer => {
          // This is a simplification - in real implementation, we'd have better frame-layer mapping
          return frame.selected;
        });
        frameLayersMap[frame.id] = frameLayers;
      }
    });
    
    // Auto-link layers with the same name across frames
    const linkedFramesLayers = autoLinkLayers(frameLayersMap);
    
    // Apply the links to our layers
    const newLayers = [...layers];
    Object.entries(linkedFramesLayers).forEach(([frameId, frameLayers]) => {
      frameLayers.forEach(layer => {
        const layerIndex = newLayers.findIndex(l => l.id === layer.id);
        if (layerIndex !== -1) {
          newLayers[layerIndex] = {...layer};
        }
      });
    });
    
    setLayers(newLayers);
  }, []); // Empty dependency array ensures this runs only once on mount

  // Ad Size methods
  const addAdSize = useCallback((adSizeData: { name: string, width: number, height: number }) => {
    const newAdSize: AdSize = {
      id: `adsize-${adSizeData.width}x${adSizeData.height}-${Date.now()}`,
      name: adSizeData.name || `${adSizeData.width} × ${adSizeData.height}`,
      width: adSizeData.width,
      height: adSizeData.height,
      frames: [],
      selected: false,
    };

    setAdSizes(prev => {
      // Deselect all other ad sizes
      const updatedAdSizes = prev.map(size => ({ ...size, selected: false }));
      return [...updatedAdSizes, { ...newAdSize, selected: true }];
    });
    
    // Set this as the selected ad size
    setSelectedAdSizeId(newAdSize.id);
    
    return newAdSize;
  }, []);
  
  // Remove an ad size and all its associated frames
  const removeAdSize = useCallback((adSizeId: string) => {
    setAdSizes(prev => {
      const filteredSizes = prev.filter(size => size.id !== adSizeId);
      
      // If we're removing the selected size, select the first one
      if (selectedAdSizeId === adSizeId && filteredSizes.length > 0) {
        filteredSizes[0].selected = true;
        setSelectedAdSizeId(filteredSizes[0].id);
      }
      
      return filteredSizes;
    });
    
    // Also remove all frames in this ad size
    setFrames(prev => prev.filter(frame => frame.adSizeId !== adSizeId));
  }, [selectedAdSizeId]);
  
  // Select an ad size
  const selectAdSize = useCallback((adSizeId: string) => {
    setAdSizes(prev =>
      prev.map(size => ({
        ...size,
        selected: size.id === adSizeId
      }))
    );
    
    setSelectedAdSizeId(adSizeId);
    
    // Also need to update the current frame
    const targetAdSize = adSizes.find(size => size.id === adSizeId);
    if (targetAdSize && targetAdSize.frames.length > 0) {
      selectFrame(targetAdSize.frames[0].id);
    }
  }, [adSizes, selectFrame]);
  
  // Get currently selected ad size
  const getSelectedAdSize = useCallback(() => {
    return adSizes.find(size => size.id === selectedAdSizeId) || null;
  }, [adSizes, selectedAdSizeId]);

  // Manual save method (for explicit save button)
  const saveAnimationState = useCallback(() => {
    try {
      const state = {
        layers,
        frames,
        adSizes,
        selectedAdSizeId,
        selectedLayerId,
        duration
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      console.log('Animation state manually saved');
    } catch (error) {
      console.error('Error saving animation state:', error);
    }
  }, [layers, frames, adSizes, selectedAdSizeId, selectedLayerId, duration]);

  // Manual load method (for explicit load button)
  const loadAnimationState = useCallback(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const { layers, frames, adSizes, selectedAdSizeId, selectedLayerId, duration } = JSON.parse(savedState);
        setLayers(layers);
        setFrames(frames);
        if (adSizes) setAdSizes(adSizes);
        if (selectedAdSizeId) setSelectedAdSizeId(selectedAdSizeId);
        setSelectedLayerId(selectedLayerId);
        setDuration(duration);
        console.log('Animation state loaded from storage');
      }
    } catch (error) {
      console.error('Error loading animation state:', error);
    }
  }, []);

  // Layer linking methods
  const linkLayersByName = useCallback(() => {
    // First, organize layers by frame
    const frameLayersMap: Record<string, AnimationLayer[]> = {};
    
    frames.forEach(frame => {
      const frameLayers = layers.filter(layer => {
        // This is a placeholder - in a real implementation we'd have layer-to-frame mapping
        // For now, we'll assume all layers belong to the current frame
        return frame.selected;
      });
      frameLayersMap[frame.id] = frameLayers;
    });
    
    // Auto-link layers with the same name across frames
    const linkedFramesLayers = autoLinkLayers(frameLayersMap);
    
    // Apply the links to our layers
    const newLayers = [...layers];
    Object.entries(linkedFramesLayers).forEach(([frameId, frameLayers]) => {
      frameLayers.forEach(layer => {
        const layerIndex = newLayers.findIndex(l => l.id === layer.id);
        if (layerIndex !== -1) {
          newLayers[layerIndex] = {...layer};
        }
      });
    });
    
    setLayers(newLayers);
  }, [frames, layers]);
  
  const unlinkLayer = useCallback((layerId: string) => {
    console.log("AnimationContext: Unlinking layer", layerId);
    
    // First, organize layers by frame for our utility function
    const frameLayersMap: Record<string, AnimationLayer[]> = {};
    frames.forEach(frame => {
      // Get all layers for this frame
      const frameLayers = layers.filter(layer => 
        // Extract frame ID from layer ID
        // Assuming layer IDs are in format "layer-{frameNumber}-{layerNumber}"
        // For example: "layer-1-3" belongs to "frame-1"
        layer.id.startsWith(`layer-${frame.id.split('-')[1]}`)
      );
      frameLayersMap[frame.id] = frameLayers;
    });
    
    // Log the frame layers map for debugging
    console.log("AnimationContext: Frame layers map:", Object.keys(frameLayersMap).map(frameId => ({
      frameId,
      layerCount: frameLayersMap[frameId].length,
      layerIds: frameLayersMap[frameId].map(l => l.id)
    })));
    
    // Apply the unlink operation
    const updatedFramesLayers = unlinkLayerUtil(frameLayersMap, layerId);
    
    // Log the updated frames layers
    console.log("AnimationContext: Updated frames layers:", Object.keys(updatedFramesLayers).map(frameId => ({
      frameId,
      layerCount: updatedFramesLayers[frameId].length,
      modifiedLayers: updatedFramesLayers[frameId]
        .filter(layer => {
          // Check if this is the layer we are updating
          if (layer.id === layerId) return true;
          
          // Check if this layer is linked to the layer we're updating
          if (layer.linkedLayer) {
            // Return true if this layer is in the same group
            return true;
          }
          
          return false;
        })
        .map(l => ({ 
          id: l.id, 
          hasLink: !!l.linkedLayer
        }))
    })));
    
    // Now flatten the updated frame layers back to our layer state
    const updatedLayers: AnimationLayer[] = [];
    Object.values(updatedFramesLayers).forEach(frameLayers => {
      frameLayers.forEach(layer => {
        // Only add if not already in the list (prevents duplicates)
        if (!updatedLayers.some(l => l.id === layer.id)) {
          updatedLayers.push(layer);
        }
      });
    });
    
    // Log the layers that will be updated
    console.log("AnimationContext: Updating layers:", updatedLayers.map(l => ({ 
      id: l.id, 
      linkedTo: l.linkedLayer 
    })));
    
    // Update only the layers that changed
    setLayers(prev => {
      const newLayers = prev.map(layer => {
        const updatedLayer = updatedLayers.find(l => l.id === layer.id);
        return updatedLayer || layer;
      });
      console.log("AnimationContext: Layer update complete");
      return newLayers;
    });
  }, [frames, layers]);
  
  const handleSyncModeChange = useCallback((layerId: string, mode: LinkSyncMode) => {
    // First, organize layers by frame for our utility function
    const frameLayersMap: Record<string, AnimationLayer[]> = {};
    frames.forEach(frame => {
      frameLayersMap[frame.id] = layers.filter(layer => frame.selected); // Simplification
    });
    
    // Apply the sync mode change
    const updatedFramesLayers = setSyncModeUtil(frameLayersMap, layerId, mode);
    
    // Now flatten the updated frame layers back to our layer state
    const updatedLayers: AnimationLayer[] = [];
    Object.values(updatedFramesLayers).forEach(frameLayers => {
      frameLayers.forEach(layer => {
        // Only add if not already in the list (prevents duplicates)
        if (!updatedLayers.some(l => l.id === layer.id)) {
          updatedLayers.push(layer);
        }
      });
    });
    
    // Update only the layers that changed
    setLayers(prev => 
      prev.map(layer => {
        const updatedLayer = updatedLayers.find(l => l.id === layer.id);
        return updatedLayer || layer;
      })
    );
    
    // If we're changing to Full sync, we need to synchronize animations
    if (mode === LinkSyncMode.Full) {
      // Apply the synced animations
      const syncedFramesLayers = syncLinkedLayerAnimations(frameLayersMap, layerId);
      
      // Now flatten again to get the synced layers
      const syncedLayers: AnimationLayer[] = [];
      Object.values(syncedFramesLayers).forEach(frameLayers => {
        frameLayers.forEach(layer => {
          // Only add if not already in the list (prevents duplicates)
          if (!syncedLayers.some(l => l.id === layer.id)) {
            syncedLayers.push(layer);
          }
        });
      });
      
      // Update only the layers that changed during sync
      setLayers(prev => 
        prev.map(layer => {
          const syncedLayer = syncedLayers.find(l => l.id === layer.id);
          return syncedLayer || layer;
        })
      );
    }
  }, [frames, layers]);
  
  const toggleAnimationOverride = useCallback((layerId: string, animationId: string) => {
    // First, organize layers by frame for our utility function
    const frameLayersMap: Record<string, AnimationLayer[]> = {};
    frames.forEach(frame => {
      frameLayersMap[frame.id] = layers.filter(layer => frame.selected); // Simplification
    });
    
    // Apply the animation override toggle
    const updatedFramesLayers = setAnimationOverride(frameLayersMap, layerId, animationId);
    
    // Now flatten the updated frame layers back to our layer state
    const updatedLayers: AnimationLayer[] = [];
    Object.values(updatedFramesLayers).forEach(frameLayers => {
      frameLayers.forEach(layer => {
        // Only add if not already in the list (prevents duplicates)
        if (!updatedLayers.some(l => l.id === layer.id)) {
          updatedLayers.push(layer);
        }
      });
    });
    
    // Update only the layers that changed
    setLayers(prev => 
      prev.map(layer => {
        const updatedLayer = updatedLayers.find(l => l.id === layer.id);
        return updatedLayer || layer;
      })
    );
  }, [frames, layers]);

  const contextValue: AnimationContextType = {
    layers,
    frames,
    adSizes,
    gifFrames,
    linkRegistry, // This is already the correct type as imported
    selectedAdSizeId,
    selectedLayerId,
    currentFrame,
    isPlaying,
    currentTime,
    duration,
    timelineMode,
    timelineRefreshKey,
    visibilityUpdateCount,
    
    // Ad Size methods
    addAdSize,
    removeAdSize,
    selectAdSize,
    getSelectedAdSize,
    
    // Layer methods
    selectLayer,
    getSelectedLayer,
    addLayer,
    removeLayer,
    updateLayer,
    toggleLayerVisibility,
    toggleLayerOverride,
    toggleLayerLock,
    toggleLayerExpanded,
    forceTimelineRefresh,
    
    // Frame methods
    addFrame,
    removeFrame,
    selectFrame,
    normalizeFrameCounts, // Add frame count normalization
    
    // Animation methods
    updateLayerAnimation,
    addKeyframe,
    deleteKeyframe,
    setCurrentTime,
    
    // Layer linking methods
    linkLayersByName,
    unlinkLayer,
    setSyncMode: handleSyncModeChange,
    toggleAnimationOverride,
    
    // Timeline mode
    setTimelineMode: handleSetTimelineMode,
    
    // Playback methods
    togglePlayback,
    
    // State persistence
    saveAnimationState,
    loadAnimationState
  };

  return (
    <AnimationContext.Provider value={contextValue}>
      {children}
    </AnimationContext.Provider>
  );
};

// Custom hook to use the animation context
// Export the hook with a defined return type
export function useAnimationContext(): AnimationContextType {
  const context = useContext(AnimationContext);
  // No need to check for undefined since we provided a default value
  return context;
}