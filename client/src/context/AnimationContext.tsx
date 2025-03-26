import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Animation, AnimationLayer, AnimationFrame, Keyframe } from '../types/animation';

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
  name: 'Background',
  type: 'rectangle',
  visible: true,
  locked: false,
  animations: [],
  keyframes: []
};

// Import mock data
import { mockFrames, mockLayers } from '../mock/animationData';

// Provider component
export const AnimationProvider = ({ children }: { children: ReactNode }) => {
  // Get initial layers for the first frame
  const initialLayers = mockLayers['frame-1'] || [];
  
  // State - initialize with mock data
  const [layers, setLayers] = useState<AnimationLayer[]>(initialLayers);
  const [frames, setFrames] = useState<AnimationFrame[]>(mockFrames);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(initialLayers.length > 0 ? initialLayers[0].id : null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(5); // seconds
  const [isPlaying, setIsPlaying] = useState(false);

  // Get current frame
  const currentFrame = frames.find(frame => frame.selected) || null;

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
    // Deselect all existing frames
    const updatedFrames = frames.map(f => ({ ...f, selected: false }));
    // Add new frame with selected=true
    setFrames([...updatedFrames, { ...frame, selected: true }]);
  }, [frames]);

  // Remove a frame
  const removeFrame = useCallback((frameId: string) => {
    const frameToRemove = frames.find(f => f.id === frameId);
    if (!frameToRemove) return;

    const newFrames = frames.filter(f => f.id !== frameId);
    
    // If we're removing the selected frame, select another one
    if (frameToRemove.selected && newFrames.length > 0) {
      newFrames[0].selected = true;
    }
    
    setFrames(newFrames);
  }, [frames]);

  // Select a frame
  const selectFrame = useCallback((frameId: string) => {
    setFrames(prev => 
      prev.map(frame => ({ 
        ...frame, 
        selected: frame.id === frameId 
      }))
    );
  }, []);

  // Update layer animation
  const updateLayerAnimation = useCallback((layerId: string, animation: Animation) => {
    setLayers(prev => 
      prev.map(layer => {
        if (layer.id !== layerId) return layer;
        
        // Check if animation with same type exists
        const existingIndex = layer.animations.findIndex(a => a.type === animation.type);
        
        if (existingIndex >= 0) {
          // Replace existing animation
          const updatedAnimations = [...layer.animations];
          updatedAnimations[existingIndex] = animation;
          return { ...layer, animations: updatedAnimations };
        } else {
          // Add new animation
          return { ...layer, animations: [...layer.animations, animation] };
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

  // Save animation state to localStorage
  const saveAnimationState = useCallback(() => {
    try {
      const state = {
        layers,
        frames,
        selectedLayerId,
        duration
      };
      localStorage.setItem('animation-state', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving animation state:', error);
    }
  }, [layers, frames, selectedLayerId, duration]);

  // Load animation state from localStorage
  const loadAnimationState = useCallback(() => {
    try {
      const savedState = localStorage.getItem('animation-state');
      if (savedState) {
        const { layers, frames, selectedLayerId, duration } = JSON.parse(savedState);
        setLayers(layers);
        setFrames(frames);
        setSelectedLayerId(selectedLayerId);
        setDuration(duration);
      }
    } catch (error) {
      console.error('Error loading animation state:', error);
    }
  }, []);

  // Auto-save state on changes
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      saveAnimationState();
    }, 1000);
    
    return () => clearTimeout(saveTimeout);
  }, [layers, frames, selectedLayerId, duration, saveAnimationState]);

  // Load state on initial mount
  useEffect(() => {
    loadAnimationState();
  }, [loadAnimationState]);

  const contextValue: AnimationContextType = {
    layers,
    frames,
    selectedLayerId,
    currentFrame,
    isPlaying,
    currentTime,
    duration,
    selectLayer,
    getSelectedLayer,
    addLayer,
    removeLayer,
    updateLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    addFrame,
    removeFrame,
    selectFrame,
    updateLayerAnimation,
    addKeyframe,
    deleteKeyframe,
    setCurrentTime,
    togglePlayback,
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
    throw new Error('useAnimationContext must be used within an AnimationProvider');
  }
  return context;
};