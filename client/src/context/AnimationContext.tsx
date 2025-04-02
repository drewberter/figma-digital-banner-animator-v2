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
import { useAutoSave, loadSavedData } from '../hooks/useAutoSave';
import { v4 as uuidv4 } from 'uuid';
import { 
  parseGifFrameId,
  autoLinkLayers
} from '../utils/linkingUtils';
import { 
  syncLinkedLayerAnimations,
  syncAllLinkedLayerAnimations,
  setAnimationOverride
} from '../utils/animationSyncUtils';
import { mockLayers, mockGifFrames, mockFrames } from '../mock/animationData';

// Import the new utilities
import { linkRegistry } from '../utils/linkRegistry';
import { toast } from '../hooks/use-toast';
import { AnimationLayerWithUI } from '../types/animationExtensions';
import { setupHiddenInTimelineTest } from '../utils/hiddenInTimelineTest';
import { toggleLayerVisibility as toggleAnimationLayerVisibility } from '../utils/animation-visibility-fix';

// Import the enhanced layer visibility utilities
import {
  setLayerVisibilityConsistent,
  syncLayersByNameConsistent,
  toggleLayerVisibility as toggleLayerVisibilityUtil,
  findLayerById as findLayerByIdInUtils,
  hasVisibilityOverride as hasVisibilityOverrideInUtils
} from '../utils/layerVisibilityUtils';

// Import utilities from directLayerLinking
import { 
  buildDirectLinkTable,
  findLayerById,
  hasVisibilityOverride,
  resetLayerLinkData,
  syncLayersByName,
  setLayerVisibility,
  toggleLayerVisibilityOverride
} from '../utils/directLayerLinking-fixed';

// Add imports for our new utilities at the top of the file
import { 
  setLayerLinkProperties, 
  generateLinkGroupId, 
  findLayerById as findLayerByIdUtil,
  isGifModeLink,
  isAnimationModeLink
} from '../utils/layerLinkUtils';

// Helper function to safely handle hiddenInTimeline property
function toggleHiddenProperty(layer: AnimationLayer): AnimationLayer {
  // Cast to extended type to access hiddenInTimeline
  const layerWithUI = layer as AnimationLayerWithUI;
  const isCurrentlyHidden = layerWithUI.hiddenInTimeline === true;
  
  // Create a new object with updated property
  return {
    ...layer,
    hiddenInTimeline: !isCurrentlyHidden
  } as AnimationLayer;
}

// Import from directLayerLinking-fixed is already done above
// Removed duplicate imports

// Import test utilities
import {
  verifyContainerLinkDisplay
} from '../utils/directLayerLinkingTest';
import { testBackgroundLayerHandling } from '../utils/backgroundLayerTest';

// Import layer utilities
import { isLayerOrChildrenLinked } from '../utils/layerUtils';

// Helper function to get registry mode equivalent from timeline mode
// This handles the compatibility between 'gifFrames' timeline mode and 'gif' registry mode
function getRegistryMode(mode: TimelineMode): 'animation' | 'gif' {
  // Return the compatible mode for registry operations
  return mode === 'animation' ? 'animation' : 'gif';
}

interface AnimationContextType {
  selectedLayerId: string | null;
  currentFrame: AnimationFrame | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  timelineMode: TimelineMode; // Add timeline mode to the context
  timelineRefreshKey: number; // Added to force re-renders of timeline when layer hierarchy changes
  visibilityUpdateCount: number; // Added to force re-renders when layer visibility changes
  frames: AnimationFrame[]; // Expose frames to components
  
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
  toggleLayerHiddenInTimeline: (frameId: string, layerId: string) => void; // New function to hide layer in UI only
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
  resetGifFrameLayerLinks: () => void; // Function to reset all GIF frame layer linking data
  
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
  parentId: null,
  isLinked: false,
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
  
  // Timeline mode - animation (default) or gifFrames
  const [timelineMode, setTimelineMode] = useState<TimelineMode>(initialTimelineMode);
  
  // Add a state to track timeline refreshes
  const [timelineRefreshKey, setTimelineRefreshKey] = useState<number>(0);
  
  // Add a state to track visibility updates
  const [visibilityUpdateCount, setVisibilityUpdateCount] = useState<number>(0);
  
  // Force refresh the timeline when layer hierarchy changes
  const forceTimelineRefresh = useCallback(() => {
    setTimelineRefreshKey(prev => prev + 1);
  }, []);
  
  // Increment visibility update counter to force re-renders when toggling layer visibility
  const incrementVisibilityCounter = useCallback(() => {
    setVisibilityUpdateCount(prev => prev + 1);
  }, []);
  
  // Function to reset all layer linking data for GIF frames
  const resetGifFrameLayerLinks = useCallback(() => {
    console.log('[AnimationContext] Resetting all GIF frame layer linking data');
    
    // Use the imported resetLayerLinkData function
    setGifFrames(prev => {
      // This creates a clean slate with all layer linking data reset
      const updatedFrames = resetLayerLinkData([...prev]);
      
      // Rebuild the direct link table after resetting
      buildDirectLinkTable(updatedFrames);
      console.log('[AnimationContext] Reset complete, rebuilt direct link table');
      
      return updatedFrames;
    });
    
    // Force a UI refresh
    forceTimelineRefresh();
    incrementVisibilityCounter();
    
    // Show toast notification for user feedback
    // In production, you would import the toast function
    console.log('[AnimationContext] Layer linking data has been reset');
  }, [forceTimelineRefresh, incrementVisibilityCounter]);
  
  // Expose gifFrames to window for testing purposes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).getGifFrames = () => {
        console.log('[LayerSync] Providing GIF frames for testing utility');
        
        // Log some stats about the frames for debugging
        if (gifFrames && gifFrames.length > 0) {
          // Count the layers with the same name
          const layerNameCounts: Record<string, number> = {};
          
          const countLayers = (layers: AnimationLayer[] | undefined) => {
            if (!layers) return;
            
            layers.forEach(layer => {
              if (layer.name) {
                const normalizedName = layer.name.toLowerCase();
                
                if (!layerNameCounts[normalizedName]) {
                  layerNameCounts[normalizedName] = 0;
                }
                
                layerNameCounts[normalizedName]++;
              }
              
              // Process children
              if (layer.children) {
                countLayers(layer.children);
              }
            });
          };
          
          // Count layers in all frames
          gifFrames.forEach(frame => {
            countLayers(frame.layers);
          });
          
          // Log the top 3 most common layer names
          const topLayerNames = Object.entries(layerNameCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
            
          topLayerNames.forEach(([name, count]) => {
            console.log('[LayerSync]', `Sample entry: "${name}" appears in ${count} frames`);
          });
        }
        
        return gifFrames;
      };
      
      console.log('Added global testLayerLinking function to window. Call window.testLayerLinking("layer name") to analyze layer linking');
    }
  }, [gifFrames]);
  
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
      
      // Make gifFrames available for the global test function
      if (typeof window !== 'undefined') {
        (window as any).getGifFrames = () => {
          return gifFrames;
        };
        
        // Create a simple global test function since the imported one isn't working
        // Import our test utility function dynamically
        import('../utils/layerLinkingTest').then(module => {
          // Assign the function to the window object
          (window as any).testLayerLinking = (layerName?: string) => {
            // Call our utility function with the current gifFrames
            module.testLayerLinking(gifFrames, layerName);
          };
          
          console.log('Added global testLayerLinking function to window. Call window.testLayerLinking("layer name") to analyze layer linking');
        }).catch(error => {
          console.error('Failed to load layer linking test utility:', error);
          
          // Fallback to a simple test function
          (window as any).testLayerLinking = (layerName?: string) => {
            // Simple test function that logs frames and layer info
            console.log('==== SIMPLE LAYER LINKING TEST ====');
            console.log(`Testing ${gifFrames.length} GIF frames`);
            
            if (layerName) {
              console.log(`Filtering for layers named "${layerName}"`);
              
              // Find all layers with this name across frames
              let matchingLayers = [];
              
              gifFrames.forEach(frame => {
                const findLayersWithName = (layers: AnimationLayer[], path = '') => {
                  layers.forEach(layer => {
                    if (layer.name === layerName) {
                      matchingLayers.push({
                        frameId: frame.id, 
                        layerId: layer.id,
                        visible: layer.visible,
                        path: path ? `${path} > ${layer.name}` : layer.name
                      });
                    }
                    
                    if (layer.children?.length) {
                      findLayersWithName(layer.children, path ? `${path} > ${layer.name}` : layer.name);
                    }
                  });
                };
                
                findLayersWithName(frame.layers);
              });
              
              console.log(`Found ${matchingLayers.length} layers named "${layerName}":`, matchingLayers);
            } else {
              console.log('No layer name specified, showing frame summary:');
              gifFrames.forEach(frame => {
                console.log(`Frame ${frame.id}: ${frame.layers.length} layers`);
              });
            }
          };
        });
        
        console.log('Added global testLayerLinking function to window. Call window.testLayerLinking("layer name") to analyze layer linking');
        
        // Initialize the test utilities
        setupHiddenInTimelineTest();
        
        // Set up background layer test utility
        (window as any).testBackgroundLayerHandling = () => {
          testBackgroundLayerHandling(gifFrames);
        };
      }
    }
  }, [mockGifFrames, gifFrames]);
  
  // Update the timelineMode when initialTimelineMode prop changes
  useEffect(() => {
    console.log(`[AnimationContext] Updating timelineMode from props: ${initialTimelineMode}`);
    setTimelineMode(initialTimelineMode);
  }, [initialTimelineMode]);
  
  // Add effect to ensure the link table is built when frames change
  useEffect(() => {
    if (timelineMode === 'gifFrames' && gifFrames && gifFrames.length > 0) {
      // Only build link table in GIF frame mode to avoid interference with animation mode
      buildDirectLinkTable(gifFrames);
      console.log('[AnimationContext] Built direct link table for GIF frames');
    }
  }, [gifFrames, timelineMode]);

  // Add effect to reset link data when switching modes
  useEffect(() => {
    // When switching to GIF frame mode, rebuild the link table
    if (timelineMode === 'gifFrames') {
      if (gifFrames && gifFrames.length > 0) {
        buildDirectLinkTable(gifFrames);
        console.log('[AnimationContext] Built link table for GIF frames after mode switch');
      }
    }
  }, [timelineMode, gifFrames]);
  
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
          frameIds: [],
          frames: [], // For backward compatibility
          selected: false
        });
      }
      
      // Add this frame to the appropriate ad size
      const adSize = sizeMap.get(sizeKey)!;
      // Add frame ID to frameIds array
      adSize.frameIds.push(frame.id);
      
      // Also add to frames array for backward compatibility
      if (adSize.frames) {
        adSize.frames.push({
          ...frame,
          adSizeId: adSize.id
        });
      }
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

  // Auto-link layers in animation mode when frames or timelineMode changes
  useEffect(() => {
    if (timelineMode === 'animation' && framesLayers && Object.keys(framesLayers).length > 0) {
      // Find all layers with the same name across frames and automatically link them
      console.log('[AnimationContext] Auto-linking layers in animation mode');
      
      // Create a map of layer names to arrays of layer IDs and frame IDs
      const layersByName: Record<string, Array<{layerId: string, frameId: string}>> = {};
      
      // Process all layers in all frames
      Object.entries(framesLayers).forEach(([frameId, frameLayers]) => {
        // Process all layers in this frame
        const processLayersRecursive = (layers: AnimationLayer[]) => {
          layers.forEach(layer => {
            if (layer.name) {
              // Normalize the name for case-insensitive matching
              const normalizedName = layer.name.toLowerCase();
              
              if (!layersByName[normalizedName]) {
                layersByName[normalizedName] = [];
              }
              
              // Add this layer to our collection
              layersByName[normalizedName].push({
                layerId: layer.id,
                frameId
              });
              
              // Process children if any
              if (layer.children && layer.children.length > 0) {
                processLayersRecursive(layer.children);
              }
            }
          });
        };
        
        if (frameLayers) {
          processLayersRecursive(frameLayers);
        }
      });
      
      // Link layers with the same name using the registry
      Object.entries(layersByName).forEach(([layerName, layerInstances]) => {
        // Only link if there are at least 2 instances of this layer name
        if (layerInstances.length >= 2) {
          console.log(`[AnimationContext] Auto-linking ${layerInstances.length} instances of layer "${layerName}"`);
          
          // Extract just the layer IDs for linking
          const layerIds = layerInstances.map(instance => instance.layerId);
          
          // Create a group ID for this link group
          const groupId = `auto-link-${layerName.replace(/[^a-z0-9]/gi, '-')}-${uuidv4().substring(0, 8)}`;
          
          // Link the layers in the registry
          linkRegistry.linkLayers(layerName, layerIds, 'animation');
          
          // Update the layers with isLinked and locked properties
          setFramesLayers(prevFramesLayers => {
            const updatedFramesLayers = { ...prevFramesLayers };
            
            // Update each layer instance
            layerInstances.forEach((instance, index) => {
              const { layerId, frameId } = instance;
              
              // Get the frame layers
              const frameLayers = updatedFramesLayers[frameId];
              if (!frameLayers) return;
              
              // Helper function to find and update a layer
              const updateLayerRecursive = (layers: AnimationLayer[]): AnimationLayer[] => {
                return layers.map(layer => {
                  if (layer.id === layerId) {
                    // Add the linked properties
                    const isMain = index === 0; // First layer is considered the main one
                    
                    return {
                      ...layer,
                      isLinked: true,
                      locked: true,
                      linkedLayer: {
                        layerId: layer.id,
                        frameId: frameId,
                        name: layer.name || '',
                        hasOverride: false,
                        groupId,
                        syncMode: LinkSyncMode.Full,
                        isMain,
                        overrides: []
                      }
                    };
                  }
                  
                  // Process children if any
                  if (layer.children && layer.children.length > 0) {
                    return {
                      ...layer,
                      children: updateLayerRecursive(layer.children)
                    };
                  }
                  
                  return layer;
                });
              };
              
              // Update the frame layers
              updatedFramesLayers[frameId] = updateLayerRecursive(frameLayers);
            });
            
            return updatedFramesLayers;
          });
        }
      });
      
      // Force a refresh to ensure UI updates
      forceTimelineRefresh();
    }
  }, [framesLayers, timelineMode, forceTimelineRefresh]);

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

  // Toggle layer visibility - improved implementation that uses directLayerLinking-fixed
  const toggleLayerVisibility = useCallback((frameId: string, layerId: string) => {
    console.log(`[AnimationContext][toggleLayerVisibility] Toggling layer ${layerId} visibility in frame ${frameId}, mode: ${timelineMode}`);
    
    // Check if this is a GIF frame - complete isolation from Animation Mode
    if (frameId.startsWith('gif-frame-') && timelineMode === 'gifFrames') {
      console.log(`[AnimationContext][toggleLayerVisibility] Using enhanced layer visibility utils for GIF frames`);
      
      // Parse the frame ID for better logging
      const parsedFrameId = parseGifFrameId(frameId);
      if (parsedFrameId.isValid) {
        console.log(`[VISIBILITY DEBUG] Frame: ${parsedFrameId.frameNumber} of ad size ${parsedFrameId.adSizeId}`);
      }
      
      // Build the direct link table to ensure it's up to date
      buildDirectLinkTable(gifFrames);
      
      setGifFrames(prev => {
        // Find the frame being modified
        const frame = prev.find((f: GifFrame) => f.id === frameId);
        if (!frame) {
          console.error(`Frame ${frameId} not found`);
          return prev;
        }
        
        // Find the layer being toggled
        const layer = frame.layers ? findLayerById(frame.layers, layerId) : null;
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
        
        // Check if the layer has visibility overrides in this frame
        const hasOverride = hasVisibilityOverride(frame, layerId);
        
        try {
          // Use our new enhanced toggleLayerVisibility utility
          // This handles all the complexity of:
          // 1. Getting current visibility state
          // 2. Properly handling background layers
          // 3. Ensuring state consistency
          // 4. Syncing across frames when appropriate
          
          const result = toggleLayerVisibilityUtil(
            frame,
            layerId,
            !hasOverride, // Only sync across frames if there's no override
            prev // Pass all frames for syncing
          );
          
          // The result could be a single updated frame (for override case)
          // or an array of updated frames (for sync case)
          if (Array.isArray(result)) {
            // If array, it's the full set of updated frames
            return result;
          } else {
            // If single frame, we need to update just this one
            // Create a deep copy first to avoid mutation
            const updatedFrames = JSON.parse(JSON.stringify(prev));
            
            // Find the frame to update
            const frameIndex = updatedFrames.findIndex((f: GifFrame) => f.id === frameId);
            if (frameIndex === -1) return prev;
            
            // Update that frame with the result
            updatedFrames[frameIndex] = result;
            return updatedFrames;
          }
        } catch (error) {
          console.error('[AnimationContext] Error toggling layer visibility:', error);
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
      console.log(`[AnimationContext][toggleLayerVisibility] Regular frame - toggling layer ${layerId} in frame ${frameId}`);
      // Regular frame - update the layers with support for nested hierarchies
      // Helper function to recursively handle layer visibility toggling
      const updateLayerVisibilityWithChildren = (layers: AnimationLayer[], targetId: string): AnimationLayer[] => {
        return layers.map(layer => {
          // If this is the target layer, toggle its visibility
          if (layer.id === targetId) {
            const newVisibility = !layer.visible;
            
            // Log the visibility change for debugging
            console.log(`[AnimationContext] Toggle visibility for ${layer.name} (${layer.id}): ${layer.visible} -> ${newVisibility}`);
            
            // If we're hiding a group, also hide all its children
            if (!newVisibility && layer.children && layer.children.length > 0) {
              console.log(`[AnimationContext] Hiding all children of group ${layer.name} (${layer.id})`);
              
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
            
            // Simple case - just toggle visibility with clear logging
            return { 
              ...layer, 
              visible: newVisibility,
              lastUpdated: Date.now() // Add timestamp to force React to detect the change
            };
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
  }, [timelineMode, framesLayers, forceTimelineRefresh, incrementVisibilityCounter, buildDirectLinkTable]);

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
      
      // Update the frame with the override toggled
      // Use the enhanced toggleLayerVisibilityOverride function from directLayerLinking-fixed.ts
      const updatedFrames = toggleLayerVisibilityOverride(
        [...prev], // Create a copy of the frames array
        frameId,
        layerId
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

  // Toggle layer hidden in timeline (UI-only, doesn't affect animation)
  const toggleLayerHiddenInTimeline = useCallback((frameId: string, layerId: string) => {
    console.log(`[AnimationContext][toggleLayerHiddenInTimeline] Toggling layer ${layerId} hidden in timeline for ${frameId}`);
    
    // Find the layer in the appropriate state based on mode
    if (timelineMode === 'animation') {
      // For animation mode, just toggle the hiddenInTimeline property
      setLayers(prev => {
        return prev.map(layer => {
          if (layer.id === layerId) {
            // Use our helper function to safely toggle hiddenInTimeline
            const updatedLayer = toggleHiddenProperty(layer);
            const layerWithUI = updatedLayer as AnimationLayerWithUI;
            console.log(`[AnimationContext] Setting layer "${layer.name}" hiddenInTimeline to ${layerWithUI.hiddenInTimeline}`);
            return updatedLayer;
          } else if (layer.children && layer.children.length > 0) {
            // Recursively check children - ensure we handle undefined arrays
            const updateChildren = (children: AnimationLayer[]): AnimationLayer[] => {
              return children.map(child => {
                if (child.id === layerId) {
                  // Use our helper function to safely toggle hiddenInTimeline
                  const updatedChild = toggleHiddenProperty(child);
                  const childWithUI = updatedChild as AnimationLayerWithUI;
                  console.log(`[AnimationContext] Setting child layer "${child.name}" hiddenInTimeline to ${childWithUI.hiddenInTimeline}`);
                  return updatedChild;
                } else if (child.children && child.children.length > 0) {
                  return { 
                    ...child, 
                    children: updateChildren(child.children) 
                  };
                }
                return child;
              });
            };
            
            return { 
              ...layer, 
              children: updateChildren(layer.children) 
            };
          }
          return layer;
        });
      });
    } else if (timelineMode === 'gifFrames') {
      // For GIF frame mode, find the layer in the gifFrames
      setGifFrames(prev => {
        // Create a deep copy to avoid mutation
        const updatedFrames = JSON.parse(JSON.stringify(prev));
        
        // Find the frame containing the layer
        const frame = updatedFrames.find((f: GifFrame) => f.id === frameId);
        if (!frame) {
          console.error(`Frame ${frameId} not found in GIF frames`);
          return prev;
        }
        
        // Find and update the layer
        const updateLayerInFrame = (layers: AnimationLayer[], layerId: string): boolean => {
          for (let i = 0; i < layers.length; i++) {
            if (layers[i].id === layerId) {
              // Cast to our UI extension type for proper handling
              const layerWithUI = layers[i] as AnimationLayerWithUI;
              // Use explicit boolean check to handle undefined/null
              const isCurrentlyHidden = layerWithUI.hiddenInTimeline === true;
              console.log(`[AnimationContext] Setting GIF frame layer "${layers[i].name}" hiddenInTimeline to ${!isCurrentlyHidden}`);
              // Update property safely
              layerWithUI.hiddenInTimeline = !isCurrentlyHidden;
              layers[i] = layerWithUI as AnimationLayer;
              return true;
            }
            
            // Check children if this is a container - handle possible undefined
            const children = layers[i].children;
            if (children && Array.isArray(children) && children.length > 0) {
              if (updateLayerInFrame(children, layerId)) {
                return true;
              }
            }
          }
          
          return false;
        };
        
        // Try to update the layer - ensure layers array is valid
        const layerUpdated = frame.layers && Array.isArray(frame.layers) 
          ? updateLayerInFrame(frame.layers, layerId) 
          : false;
        
        if (!layerUpdated) {
          console.error(`Layer ${layerId} not found in frame ${frameId}`);
        }
        
        return updatedFrames;
      });
    }
    
    // Force a timeline refresh
    forceTimelineRefresh();
    
  }, [timelineMode, forceTimelineRefresh]);
  
  // Toggle layer lock
  const toggleLayerLock = useCallback((layerId: string) => {
    console.log(`toggleLayerLock CALLED for layerId: ${layerId}`);
    
    // Access the linkRegistry via imported variable to avoid Fast Refresh error
    const registry = linkRegistry;
    
    // First, find the layer in the correct location
    let layer: AnimationLayer | null = null;
    let foundInGifFrames = false;
    let containingFrameId: string | null = null;
    
    // Try to find in main layers first
    layer = findLayerByIdUtil(layers, layerId);
    
    // If not found, check in gifFrames
    if (!layer) {
      console.log(`[toggleLayerLock] Layer ${layerId} not found in main layers, checking GIF frames...`);
      
      // Search in all GIF frames
      for (const frame of gifFrames) {
        if (!frame.layers) continue;
        
        const foundLayer = findLayerByIdUtil(frame.layers, layerId);
        if (foundLayer) {
          layer = foundLayer;
          foundInGifFrames = true;
          containingFrameId = frame.id;
          console.log(`[toggleLayerLock] Found layer ${layerId} in GIF frame ${frame.id}`);
          break;
        }
      }
    }
    
    // If still not found, check all frames in animation mode
    if (!layer && !foundInGifFrames && timelineMode === 'animation') {
      for (const frameId in framesLayers) {
        const frameLayers = framesLayers[frameId];
        if (!frameLayers) continue;
        
        const foundLayer = findLayerByIdUtil(frameLayers, layerId);
        if (foundLayer) {
          layer = foundLayer;
          containingFrameId = frameId;
          console.log(`[toggleLayerLock] Found layer ${layerId} in animation frame ${frameId}`);
          break;
        }
      }
    }
    
    // If still not found, log error and return
    if (!layer) {
      console.error(`Layer ${layerId} not found for locking toggle`);
      return;
    }

    // Determine if we're linking or unlinking
    const isUnlinking = !!layer.linkedLayer;
    const newLockedState = isUnlinking ? false : !layer.locked;
    
    // Generate a consistent group ID
    const sharedGroupId = newLockedState ? generateLinkGroupId(layer.name, timelineMode) : "";
    
    // Log what we're doing with enhanced details
    console.log(`[AnimationContext] Toggling layer lock state for ${layer.name} (${layerId}):`, {
      oldState: layer.locked,
      newState: newLockedState,
      isUnlinking,
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
            // Use our utility function to set all link properties consistently
            return setLayerLinkProperties(
              l, 
              newLockedState, 
              timelineMode, 
              sharedGroupId, 
              true,
              containingFrameId || ''
            );
          }
          
          // Also update any layer with the same name
          if (l.name === layerNameToUpdate && l.id !== layerId) {
            // Use our utility function
            return setLayerLinkProperties(
              l, 
              newLockedState, 
              timelineMode, 
              sharedGroupId, 
              false,
              containingFrameId || ''
            );
          }
          
          return l;
        })
      );
      
      // Find the source frame that contains this layer
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
        const sourceAdSizeId = parsedFrameId?.adSizeId;
        
        // Use the link registry to find frames with the same number
        let framesWithSameNumber: GifFrame[] = [];
        
        if (frameNumber) {
          // Get frame IDs with the same frame number from the registry
          const linkedFrameIds = linkRegistry.findFramesByNumber(gifFrames, String(frameNumber));
          console.log(`[toggleLayerLock] Link registry found ${linkedFrameIds.length} frames with number ${frameNumber}`);
          
          // Filter frames that match these IDs but are not from the source ad size
          if (linkedFrameIds.length > 0) {
            framesWithSameNumber = updatedFrames.filter((frame: GifFrame) => {
              // Include if in the linked frames list and not from the same ad size
              const parsed = parseGifFrameId(frame.id);
              // Need to check if the frame's ID is in the linkedFrameIds array
              const isFrameIdIncluded = linkedFrameIds.some(linkedFrame => linkedFrame.id === frame.id);
              return isFrameIdIncluded && parsed.adSizeId !== sourceAdSizeId;
            });
          }
        }
        
        // If no frames found, fall back to original filtering
        if (framesWithSameNumber.length === 0 && frameNumber && sourceAdSizeId) {
          framesWithSameNumber = updatedFrames.filter((frame: GifFrame) => {
            const parsed = parseGifFrameId(frame.id);
            // Only include frames with the same frame number but from DIFFERENT ad sizes
            return parsed.isValid && 
                   parsed.frameNumber === frameNumber && 
                   parsed.adSizeId !== sourceAdSizeId;
          });
          
          // Register frames in registry if found
          if (framesWithSameNumber.length > 0) {
            console.log(`[toggleLayerLock] Adding ${framesWithSameNumber.length} frames with number ${frameNumber} to registry`);
            
            // Get all frames with this number
            const allFramesWithNumber = [
              ...(frameContainingLayer ? [frameContainingLayer] : []),
              ...framesWithSameNumber
            ];
            
            // Extract frame IDs
            const frameIds = allFramesWithNumber.map(frame => frame.id);
            
            // Register in the link registry
            if (frameIds.length >= 2) {
              // Add to the registry
              const frameHelper = linkRegistry.gifFrameMode(true);
            }
          }
        }
        
        console.log(`[toggleLayerLock] Found ${framesWithSameNumber.length} frames with number ${frameNumber} from different ad sizes`);
        
        // Find the layers across these frames with the same name
        if (layer.name) {
          // Recursive function to find and update layers
          const updateLayersWithLinking = (layers: AnimationLayer[], name: string): AnimationLayer[] => {
            return layers.map(l => {
              // If this layer has the target name, update its link state
              if (l.name === name) {
                console.log(`[toggleLayerLock] Found matching layer ${l.name} (${l.id}), updating link state to ${newLockedState}`);
                
                // Use our utility function to update consistently
                return setLayerLinkProperties(
                  l, 
                  newLockedState, 
                  timelineMode, 
                  sharedGroupId, 
                  false,
                  containingFrameId || ''
                );
              }
              
              // Process children recursively
              if (l.children && Array.isArray(l.children)) {
                return {
                  ...l,
                  children: updateLayersWithLinking(l.children, name)
                };
              }
              
              return l;
            });
          };
          
          // Update only frames with the same frame number
          framesWithSameNumber.forEach((frame: GifFrame) => {
            const frameIndex = updatedFrames.findIndex((f: GifFrame) => f.id === frame.id);
            if (frameIndex !== -1 && updatedFrames[frameIndex].layers) {
              // Use our recursive update function
              updatedFrames[frameIndex].layers = updateLayersWithLinking(
                updatedFrames[frameIndex].layers, 
                layer.name
              );
              console.log(`[toggleLayerLock] Updated link state for layer ${layer.name} in frame ${frame.id}`);
            }
          });
        }
        
        return updatedFrames;
      });
    } else {
      // In regular animation mode, we need to use the linkedLayer property
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
          
          // Register in linkRegistry first
          const allLayerIds = [layerId, ...layersWithSameName.map(l => l.id)];
          linkRegistry.linkLayers(targetLayer.name, allLayerIds, 'animation', layerId);
          
          // Update all layers
          setLayers(prev => 
            prev.map(layer => {
              // If this layer has the same name as the target, link it
              if (layer.name === targetLayer.name) {
                const isMain = layer.id === layerId; // First clicked layer is main
                
                // Use our utility function
                return setLayerLinkProperties(
                  layer,
                  true,
                  timelineMode,
                  sharedGroupId,
                  isMain,
                  ''
                );
              }
              return layer;
            })
          );
        } else {
          // If no other layers to link, just toggle the locked state
          setLayers(prev => 
            prev.map(layer => 
              layer.id === layerId 
                ? setLayerLinkProperties(layer, true, timelineMode, sharedGroupId, true, '')
                : layer
            )
          );
        }
      } else {
        // If we're unlinking, check if it's part of a link group
        if (targetLayer.linkedLayer) {
          const { groupId } = targetLayer.linkedLayer;
          
          console.log(`[toggleLayerLock] Animation mode: Unlinking group ${groupId}`);
          
          // Find all layers in this group
          const registryMode = getRegistryMode(timelineMode);
          const layersToUnlink: string[] = [];
          
          // Collect layer IDs to unlink
          layers.forEach(layer => {
            if (layer.linkedLayer && layer.linkedLayer.groupId === groupId) {
              layersToUnlink.push(layer.id);
              console.log(`[toggleLayerLock] Removing layer ${layer.name} (${layer.id}) from link registry in ${registryMode} mode`);
            }
          });
          
          console.log(`[toggleLayerLock] Unlinking ${layersToUnlink.length} layers from group ${groupId} in ${registryMode} mode`);
          
          // Prepare data for registry update
          const layersRecord: Record<string, AnimationLayer[]> = { animation: layers };
          
          // Unlink each layer
          layersToUnlink.forEach(id => {
            linkRegistry.unlinkLayer(layersRecord, id, registryMode);
          });
          
          // Update UI state
          setLayers(prev => 
            prev.map(layer => {
              if (layer.linkedLayer && layer.linkedLayer.groupId === groupId) {
                // Use our utility function
                return setLayerLinkProperties(layer, false, timelineMode, '', false, '');
              }
              return layer;
            })
          );
        } else {
          // If not part of a link group, just toggle the locked state
          setLayers(prev => 
            prev.map(layer => 
              layer.id === layerId 
                ? setLayerLinkProperties(layer, false, timelineMode, '', false, '')
                : layer
            )
          );
        }
      }
    }
    
    // Force a refresh to ensure UI updates
    forceTimelineRefresh();
    
    // Increment visibility counter to force re-renders
    incrementVisibilityCounter();
  }, [layers, gifFrames, timelineMode, framesLayers, forceTimelineRefresh, incrementVisibilityCounter, parseGifFrameId, getRegistryMode, buildDirectLinkTable]);
  
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
    console.log(`Updating animation for layer ${layerId}:`, animation);
    
    // Ensure animation has a unique ID
    const animationWithId = animation.id ? animation : {
      ...animation,
      id: uuidv4()  // Generate a unique ID if none exists
    };
    
    // Check if this layer is linked to other layers
    const linkGroup = linkRegistry.getLayerGroup(layerId);
    const isLinked = !!linkGroup;
    
    if (isLinked) {
      console.log(`Layer ${layerId} is linked to other layers in group: ${linkGroup.name}`);
      console.log(`Link group contains ${linkGroup.layerIds.length} layers`);
    }
    
    // First update this specific layer
    setLayers(prev => {
      const updatedLayers = prev.map(layer => {
        if (layer.id !== layerId) return layer;
        
        // Find if an animation of this type already exists
        const existingIndex = layer.animations.findIndex(a => a.type === animationWithId.type);
        
        if (existingIndex >= 0) {
          // Replace existing animation, but keep the existing ID
          const updatedAnimations = [...layer.animations];
          
          // Keep track of the existing animation ID for syncing
          const existingId = layer.animations[existingIndex].id || animationWithId.id;
          
          updatedAnimations[existingIndex] = {
            ...animationWithId,
            id: existingId
          };
          return { ...layer, animations: updatedAnimations };
        } else {
          // Add new animation
          return { ...layer, animations: [...layer.animations, animationWithId] };
        }
      });
      
      // If this layer is linked and we need to sync animations
      if (isLinked) {
        console.log(`Syncing animation across ${linkGroup.layerIds.length} linked layers`);
        
        // Organize layers by frameId for our syncLinkedLayerAnimations function
        const frameLayersMap: Record<string, AnimationLayer[]> = {};
        
        // For each layer, determine its frame and organize accordingly
        updatedLayers.forEach(layer => {
          // Try to extract frame ID from layer ID or check linked layer info
          let frameId = '';
          
          // First, try to extract frame ID from linkedLayer property
          if (layer.linkedLayer && layer.linkedLayer.frameId) {
            frameId = layer.linkedLayer.frameId;
          } 
          // Fallback: try to derive from layer ID (layer-frameNum-layerNum)
          else {
            const parts = layer.id.split('-');
            if (parts.length >= 2) {
              // Assuming format "layer-1-2" where "1" is the frame number
              const frameNum = parts[1];
              frameId = `frame-${frameNum}`;
            }
          }
          
          // Only proceed if we have a valid frame ID
          if (frameId) {
            if (!frameLayersMap[frameId]) {
              frameLayersMap[frameId] = [];
            }
            frameLayersMap[frameId].push(layer);
          }
        });
        
        // Find our updated source layer
        const sourceLayer = updatedLayers.find(l => l.id === layerId);
        
        if (sourceLayer) {
          // Find the updated animation
          const updatedAnimation = sourceLayer.animations.find(a => 
            a.type === animationWithId.type
          );
          
          if (updatedAnimation) {
            // Sync this specific animation to all linked layers
            const syncedFrameLayers = syncLinkedLayerAnimations(frameLayersMap, layerId, updatedAnimation);
            
            // Now we need to merge the synced layers back into our updatedLayers
            let finalLayers = [...updatedLayers];
            
            // For each frame, merge its layers back
            Object.values(syncedFrameLayers).forEach(frameLayers => {
              frameLayers.forEach(syncedLayer => {
                // Skip the source layer which was already updated
                if (syncedLayer.id === layerId) return;
                
                // Find and replace this layer in our finalLayers array
                const layerIndex = finalLayers.findIndex(l => l.id === syncedLayer.id);
                if (layerIndex !== -1) {
                  finalLayers[layerIndex] = syncedLayer;
                }
              });
            });
            
            // Return the fully updated layers with synced animations
            return finalLayers;
          }
        }
      }
      
      // If no linking or sync needed, just return the updated layers
      return updatedLayers;
    });
    
    // Force timeline refresh
    forceTimelineRefresh();
  }, [linkRegistry, forceTimelineRefresh]);

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
      frameIds: [],
      frames: [], // For backward compatibility
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
    if (targetAdSize) {
      // If frameIds is available, use it
      if (targetAdSize.frameIds && targetAdSize.frameIds.length > 0) {
        selectFrame(targetAdSize.frameIds[0]);
      } 
      // Backward compatibility
      else if (targetAdSize.frames && targetAdSize.frames.length > 0) {
        selectFrame(targetAdSize.frames[0].id);
      }
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
    console.log("Auto-linking layers with the same name on load");
    
    // First, organize layers by frame
    const frameLayersMap: Record<string, AnimationLayer[]> = {};
    
    // Helper function to recursively process layers including nested children
    const processLayers = (layer: AnimationLayer, frame: AnimationFrame) => {
      // Process this layer
      if (!frameLayersMap[frame.id]) {
        frameLayersMap[frame.id] = [];
      }
      
      // Store a reference to this layer in the frame
      frameLayersMap[frame.id].push(layer);
      
      // Process children recursively
      if (layer.children && layer.children.length > 0) {
        layer.children.forEach(child => processLayers(child, frame));
      }
    };
    
    // Create the mapping of layers by frame
    frames.forEach(frame => {
      // Get only the layers that belong to this frame
      const frameLayers = layers.filter(layer => {
        // For now, we'll assign layers to the selected frame
        // In a more complex implementation, we'd use a proper frame-to-layer mapping
        return frame.selected;
      });
      
      // Process all top-level layers and their children
      frameLayers.forEach(layer => processLayers(layer, frame));
    });
    
    // For debugging - show the frame-to-layer mapping
    Object.keys(frameLayersMap).forEach(frameId => {
      const frameLayers = frameLayersMap[frameId];
      console.log(`Frame ${frameId} has ${frameLayers.length} layers (including nested children)`);
    });
    
    // Create a map of layer names to their occurrences for linking
    interface LayerOccurrence {
      name: string;
      frameId: string;
      layerId: string;
      layer: AnimationLayer;
    }
    
    const layerNameMap: Record<string, LayerOccurrence[]> = {};
    
    // Collect all layers by name
    Object.entries(frameLayersMap).forEach(([frameId, frameLayers]) => {
      frameLayers.forEach(layer => {
        if (!layer.name) return;
        
        // Normalize name for case-insensitive matching
        const normalizedName = layer.name.toLowerCase();
        
        // Initialize array if needed
        if (!layerNameMap[normalizedName]) {
          layerNameMap[normalizedName] = [];
        }
        
        // Add this occurrence
        layerNameMap[normalizedName].push({
          name: layer.name,
          frameId,
          layerId: layer.id,
          layer
        });
      });
    });
    
    // Now link layers with the same name across frames
    Object.entries(layerNameMap).forEach(([normalizedName, occurrences]) => {
      // Skip if there's only one layer with this name
      if (occurrences.length <= 1) return;
      
      // Log the layers being linked
      console.log(`Found ${occurrences.length} layers named "${normalizedName}" for linking:`);
      occurrences.forEach(({ frameId, layerId }) => {
        console.log(`  - Layer ${layerId} in frame ${frameId}`);
      });
      
      // Skip creating our own groupId - let the linkRegistry's createGroup method handle it
      // First register the group with the link registry using linkLayers
      const mainLayerId = occurrences[0].layerId;
      const allLayerIds = occurrences.map(o => o.layerId);
      
      // Create a deterministic group ID that matches what linkRegistry creates internally
      const layerHash = normalizedName.toLowerCase().split('').reduce((hash, char) => char.charCodeAt(0) + ((hash << 5) - hash), 0);
      const seedValue = Math.abs(layerHash % 1000);
      const modeIndicator = 'a'; // animation mode
      const groupId = `link-group-${layerHash}-${seedValue}${modeIndicator}`;
      
      // Register the group and add all layers to it
      linkRegistry.linkLayers(normalizedName, allLayerIds, 'animation', mainLayerId);
      
      console.log(`Using deterministic group ID for "${normalizedName}": ${groupId}`);
      
      // Set up linking properties on each layer
      occurrences.forEach((occurrence, index) => {
        // The first layer is the main one
        const isMain = index === 0;
        
        // Update the layer with linking properties
        occurrence.layer.linkedLayer = {
          groupId,
          isMain,
          syncMode: LinkSyncMode.Full,
          overrides: [],
          frameId: occurrence.frameId
        };
        
        // Set the isLinked flag
        occurrence.layer.isLinked = true;
        
        // No need to register with the link registry again, linkLayers already did this
      });
    });
    
    // Apply the updated layers with linking properties back to our main state
    const updatedLayers = [...layers];
    
    // Update each layer in place
    Object.entries(frameLayersMap).forEach(([frameId, frameLayers]) => {
      frameLayers.forEach(updatedLayer => {
        // Find the corresponding layer in our main layers array
        const index = updatedLayers.findIndex(l => l.id === updatedLayer.id);
        if (index !== -1) {
          // Update with the new linking properties
          updatedLayers[index] = {
            ...updatedLayers[index],
            linkedLayer: updatedLayer.linkedLayer,
            isLinked: updatedLayer.isLinked
          };
        }
      });
    });
    
    // Update the state with our linked layers
    setLayers(updatedLayers);
    
    // Force timeline refresh to update UI
    forceTimelineRefresh();
  }, [frames, layers, linkRegistry, forceTimelineRefresh]);
  
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
      // Create a placeholder animation object for syncing purposes
      const placeholderAnimation: Animation = {
        id: `sync-placeholder-${Date.now()}`,
        type: 'sync',
        duration: 0,
        delay: 0,
        startTime: 0,
        easing: 'linear'
      };
      
      const syncedFramesLayers = syncLinkedLayerAnimations(frameLayersMap, layerId, placeholderAnimation);
      
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
    selectedLayerId,
    currentFrame,
    isPlaying,
    currentTime,
    duration,
    timelineMode,
    timelineRefreshKey,
    visibilityUpdateCount,
    frames,
    
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
    toggleLayerHiddenInTimeline,
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
    resetGifFrameLayerLinks,
    
    // Timeline mode
    setTimelineMode: handleSetTimelineMode,
    
    // Playback methods
    togglePlayback,
    
    // State persistence
    saveAnimationState,
    loadAnimationState
  };

  // Make debugging context available for our testing utilities
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore - this is for debugging only
      window.__DEBUG_ANIMATION_CONTEXT = {
        layers,
        frames,
        adSizes,
        gifFrames,
        linkRegistry,
        selectedLayerId
      };
      
      // Add a special layer linking test helper directly to the window object
      // @ts-ignore - for debugging
      window.testLinking = (layerName: string) => {
        console.log(`Testing layer linking for "${layerName}"...`);
        // @ts-ignore - import from linkingUtils
        if (typeof window.testLayerLinking === 'function') {
          // @ts-ignore - import from linkingUtils
          window.testLayerLinking(layerName);
        } else {
          console.error('testLayerLinking function not available');
        }
      };
    }
  }, [layers, frames, adSizes, gifFrames, linkRegistry, selectedLayerId]);

  // Add import for validation tools
  import { exposeValidationTools } from '../utils/linkValidation';

  // ... other existing imports ...

  // In useEffect for exposing testing tools, add call to expose validation tools
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Expose existing test functions
      (window as any).getGifFrames = () => {
        console.log('[LayerSync] Providing GIF frames for testing utility');
        return gifFrames;
      };

      // Expose our new layer link validation tools
      exposeValidationTools();
        
      console.log('Testing utilities exposed to window object. Try window.checkLayerLinking(window.getGifFrames(), "gifFrames")');
    }
  }, [gifFrames]);

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