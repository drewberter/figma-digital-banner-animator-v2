import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Animation, AnimationLayer, AnimationFrame, Keyframe, LinkSyncMode, AdSize, GifFrame } from '../types/animation';
import { useAutoSave, loadSavedData } from '../hooks/useAutoSave';
import { v4 as uuidv4 } from 'uuid';
import { 
  autoLinkLayers, 
  syncLinkedLayerAnimations, 
  setAnimationOverride,
  unlinkLayer as unlinkLayerUtil,
  setSyncMode as setSyncModeUtil 
} from '../utils/linkingUtils';
import { mockLayers, mockGifFrames, mockFrames } from '../mock/animationData';

// Define the context type
interface AnimationContextType {
  layers: AnimationLayer[];
  frames: AnimationFrame[];
  adSizes: AdSize[];
  selectedAdSizeId: string | null;
  selectedLayerId: string | null;
  currentFrame: AnimationFrame | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  
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
  
  // Frames
  addFrame: (frame: AnimationFrame) => void;
  removeFrame: (frameId: string) => void;
  selectFrame: (frameId: string) => void;
  
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

// Create context with default values
const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

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
export const AnimationProvider = ({ children }: { children: ReactNode }) => {
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
    // Check if this is a GIF frame
    if (frameId.startsWith('gif-frame-')) {
      // Extract the parent ad size ID from the GIF frame ID
      const parts = frameId.split('-');
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
      
      console.log("AnimationContext - For GIF frame:", frameId, "using parent ad size:", adSizeId);
      
      // Find the GIF frame index
      const gifFrameIndex = mockGifFrames.findIndex((f: GifFrame) => f.id === frameId);
      if (gifFrameIndex !== -1) {
        // Create a copy of the frame
        const updatedGifFrame = { ...mockGifFrames[gifFrameIndex] };
        
        // Update the hiddenLayers array
        const hiddenIndex = updatedGifFrame.hiddenLayers.indexOf(layerId);
        if (hiddenIndex >= 0) {
          // Layer is hidden, make it visible by removing from hiddenLayers
          updatedGifFrame.hiddenLayers = updatedGifFrame.hiddenLayers.filter(id => id !== layerId);
        } else {
          // Layer is visible, hide it by adding to hiddenLayers
          updatedGifFrame.hiddenLayers = [...updatedGifFrame.hiddenLayers, layerId];
        }
        
        // Update the visibleLayerCount
        const totalLayers = mockLayers[adSizeId]?.length || 0;
        updatedGifFrame.visibleLayerCount = totalLayers - updatedGifFrame.hiddenLayers.length;
        
        // Replace the frame in the array (this modifies the mock data directly)
        mockGifFrames[gifFrameIndex] = updatedGifFrame;
        
        console.log("Updated GIF frame:", updatedGifFrame);
        
        // DO NOT update the parent ad size's layer visibility
        // Just update the current visible layers for UI purposes
        setLayers(prev => [...prev]);
      } else {
        console.error("GIF frame not found:", frameId);
      }
    } else {
      // Regular frame - update the layers directly
      // This works with linked layers
      setLayers(prev => 
        prev.map(layer => 
          layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
        )
      );
      
      // Also update in framesLayers map
      setFramesLayers(prev => {
        const updatedFramesLayers = {...prev};
        
        if (updatedFramesLayers[frameId]) {
          updatedFramesLayers[frameId] = updatedFramesLayers[frameId].map(layer => 
            layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
          );
        }
        
        return updatedFramesLayers;
      });
    }
  }, []);

  // Toggle layer override status (to control whether a layer should use independent visibility settings)
  const toggleLayerOverride = useCallback((frameId: string, layerId: string) => {
    // This function only applies to GIF frames
    if (!frameId.startsWith('gif-frame-')) {
      console.log("toggleLayerOverride only applies to GIF frames");
      return;
    }

    // Extract the parent ad size ID from the GIF frame ID
    const parts = frameId.split('-');
    let adSizeId = 'frame-1'; // Default fallback
    
    if (parts.length >= 4) {
      if (parts[2] === 'frame') {
        // Format is gif-frame-frame-X-Y, so adSizeId is "frame-X"
        adSizeId = `${parts[2]}-${parts[3]}`;
      } else {
        // Format is gif-frame-X-Y, determine if X is a frame number or part of the ad size ID
        adSizeId = parts[2].startsWith('frame') ? parts[2] : `frame-${parts[2]}`;
      }
    }
    
    console.log("AnimationContext - toggleLayerOverride for GIF frame:", frameId, "layer:", layerId);
    
    // Find the GIF frame index
    const gifFrameIndex = mockGifFrames.findIndex((f: GifFrame) => f.id === frameId);
    if (gifFrameIndex !== -1) {
      // Create a copy of the frame
      const updatedGifFrame = { ...mockGifFrames[gifFrameIndex] };
      
      // Initialize overrides.layerVisibility object if not present
      if (!updatedGifFrame.overrides) {
        updatedGifFrame.overrides = { layerVisibility: {} };
      }
      if (!updatedGifFrame.overrides.layerVisibility) {
        updatedGifFrame.overrides.layerVisibility = {};
      }
      
      // Get current visibility state
      const isHidden = updatedGifFrame.hiddenLayers.includes(layerId);
      
      // Toggle override status for this layer
      if (updatedGifFrame.overrides.layerVisibility[layerId]) {
        // Layer already has an override - toggle it off
        const currentOverride = updatedGifFrame.overrides.layerVisibility[layerId];
        currentOverride.overridden = !currentOverride.overridden;
        
        // If we're turning off override, update the hidden state from the parent layer
        if (!currentOverride.overridden) {
          // Get parent layer visibility
          const parentLayers = mockLayers[adSizeId] || [];
          const parentLayer = parentLayers.find(layer => layer.id === layerId);
          
          if (parentLayer) {
            // If parent layer is visible, remove from hiddenLayers
            // If parent layer is hidden, add to hiddenLayers
            if (parentLayer.visible && isHidden) {
              // Make visible
              updatedGifFrame.hiddenLayers = updatedGifFrame.hiddenLayers.filter(id => id !== layerId);
            } else if (!parentLayer.visible && !isHidden) {
              // Make hidden
              updatedGifFrame.hiddenLayers = [...updatedGifFrame.hiddenLayers, layerId];
            }
          }
        }
      } else {
        // Layer doesn't have an override yet - create one
        updatedGifFrame.overrides.layerVisibility[layerId] = {
          overridden: true,
          hidden: isHidden
        };
      }
      
      // Mark all affected layers as having override changes
      setLayers(prev => 
        prev.map(layer => {
          if (layer.id === layerId) {
            // For temporary UI feedback
            return { ...layer, isOverridden: updatedGifFrame.overrides.layerVisibility[layerId]?.overridden || false };
          }
          return layer;
        })
      );
      
      // Update the GIF frame (this modifies the mock data directly)
      mockGifFrames[gifFrameIndex] = updatedGifFrame;
      console.log("Updated GIF frame with layer override:", updatedGifFrame);
    } else {
      console.error("GIF frame not found:", frameId);
    }
  }, []);

  // Toggle layer lock
  const toggleLayerLock = useCallback((layerId: string) => {
    setLayers(prev => 
      prev.map(layer => 
        layer.id === layerId ? { ...layer, locked: !layer.locked } : layer
      )
    );
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
    // First, organize layers by frame for our utility function
    const frameLayersMap: Record<string, AnimationLayer[]> = {};
    frames.forEach(frame => {
      frameLayersMap[frame.id] = layers.filter(layer => frame.selected); // Simplification
    });
    
    // Apply the unlink operation
    const updatedFramesLayers = unlinkLayerUtil(frameLayersMap, layerId);
    
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
    selectedAdSizeId,
    selectedLayerId,
    currentFrame,
    isPlaying,
    currentTime,
    duration,
    
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
    
    // Frame methods
    addFrame,
    removeFrame,
    selectFrame,
    
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
export const useAnimationContext = () => {
  const context = useContext(AnimationContext);
  if (context === undefined) {
    throw new Error('useAnimationContext must be used within a AnimationProvider');
  }
  return context;
};