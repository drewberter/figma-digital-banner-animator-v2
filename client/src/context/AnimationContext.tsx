import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Animation, AnimationLayer, AnimationFrame, Keyframe, LinkSyncMode } from '../types/animation';
import { useAutoSave, loadSavedData } from '../hooks/useAutoSave';
import { v4 as uuidv4 } from 'uuid';
import { 
  autoLinkLayers, 
  syncLinkedLayerAnimations, 
  setAnimationOverride,
  unlinkLayer as unlinkLayerUtil,
  setSyncMode as setSyncModeUtil 
} from '../utils/linkingUtils';

// Define the context type
interface AnimationContextType {
  layers: AnimationLayer[];
  frames: AnimationFrame[];
  selectedLayerId: string | null;
  currentFrame: AnimationFrame | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  
  // Layers
  selectLayer: (layerId: string) => void;
  getSelectedLayer: () => AnimationLayer | null;
  addLayer: (layer: AnimationLayer) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<AnimationLayer>) => void;
  toggleLayerVisibility: (layerId: string) => void;
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
import { mockFrames, mockLayers } from '../mock/animationData';

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
  const toggleLayerVisibility = useCallback((layerId: string) => {
    setLayers(prev => 
      prev.map(layer => 
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
    );
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
    // Deselect all other frames
    setFrames(prev => {
      const updatedFrames = prev.map(f => ({ ...f, selected: false }));
      return [...updatedFrames, { ...frame, selected: true }];
    });
  }, []);

  // Remove a frame
  const removeFrame = useCallback((frameId: string) => {
    setFrames(prev => {
      const frameToRemove = prev.find(f => f.id === frameId);
      const filteredFrames = prev.filter(f => f.id !== frameId);
      
      // If the frame was selected, select another frame
      if (frameToRemove?.selected && filteredFrames.length > 0) {
        filteredFrames[0].selected = true;
      }
      
      return filteredFrames;
    });
  }, []);

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

  // Manual save method (for explicit save button)
  const saveAnimationState = useCallback(() => {
    try {
      const state = {
        layers,
        frames,
        selectedLayerId,
        duration
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      console.log('Animation state manually saved');
    } catch (error) {
      console.error('Error saving animation state:', error);
    }
  }, [layers, frames, selectedLayerId, duration]);

  // Manual load method (for explicit load button)
  const loadAnimationState = useCallback(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const { layers, frames, selectedLayerId, duration } = JSON.parse(savedState);
        setLayers(layers);
        setFrames(frames);
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
    selectedLayerId,
    currentFrame,
    isPlaying,
    currentTime,
    duration,
    
    // Layer methods
    selectLayer,
    getSelectedLayer,
    addLayer,
    removeLayer,
    updateLayer,
    toggleLayerVisibility,
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