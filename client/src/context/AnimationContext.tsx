import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Animation, AnimationLayer, AnimationFrame, Keyframe, AnimationType, EasingType } from '../types/animation';
import { useAutoSave, loadSavedData } from '../hooks/useAutoSave';

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

// Create context with undefined initial value
const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

// Sample default frame
const defaultFrame: AnimationFrame = {
  id: 'frame-1',
  name: 'Banner 300x250',
  selected: true,
  width: 300,
  height: 250
};

// Helper function to create default layers for a frame
const createDefaultLayersForFrame = (frameId: string): AnimationLayer[] => {
  const frameNumber = frameId.split('-')[1];
  return [
    {
      id: `layer-${frameNumber}-1`,
      name: 'Background',
      type: 'rectangle',
      visible: true,
      locked: false,
      animations: [{
        type: AnimationType.Fade,
        startTime: 0,
        duration: 0.8,
        easing: EasingType.EaseOut,
        opacity: 1
      }],
      keyframes: []
    },
    {
      id: `layer-${frameNumber}-2`,
      name: 'Headline',
      type: 'text',
      visible: true,
      locked: false,
      animations: [{
        type: AnimationType.Scale,
        startTime: 0.3,
        duration: 0.7,
        easing: EasingType.EaseOut,
        scale: 1.2
      }, {
        type: AnimationType.Pulse,
        startTime: 2.5,
        duration: 0.5,
        easing: EasingType.EaseInOut
      }],
      keyframes: []
    },
    {
      id: `layer-${frameNumber}-3`,
      name: 'Subhead',
      type: 'text',
      visible: true,
      locked: false,
      animations: [{
        type: AnimationType.Slide,
        startTime: 0.6,
        duration: 0.7,
        easing: EasingType.EaseOut,
        direction: 'right'
      }],
      keyframes: []
    },
    {
      id: `layer-${frameNumber}-4`,
      name: 'CTA Button',
      type: 'button',
      visible: true,
      locked: false,
      animations: [{
        type: AnimationType.Fade,
        startTime: 1,
        duration: 0.8,
        easing: EasingType.EaseOut,
        opacity: 1
      }, {
        type: AnimationType.Bounce,
        startTime: 2,
        duration: 0.6,
        easing: EasingType.Bounce
      }],
      keyframes: []
    },
    {
      id: `layer-${frameNumber}-5`,
      name: 'Logo',
      type: 'logo',
      visible: true,
      locked: false,
      animations: [{
        type: AnimationType.Fade,
        startTime: 1.2,
        duration: 0.5,
        easing: EasingType.EaseOut,
        opacity: 1
      }, {
        type: AnimationType.Rotate,
        startTime: 1.2,
        duration: 0.8,
        easing: EasingType.EaseOut,
        rotation: 360
      }],
      keyframes: []
    }
  ];
};

// Create default layers for all frames
const defaultLayers: AnimationLayer[] = [
  ...createDefaultLayersForFrame('frame-1'),
  ...createDefaultLayersForFrame('frame-2'),
  ...createDefaultLayersForFrame('frame-3'),
  ...createDefaultLayersForFrame('frame-4')
];

// Default frames for initial load
const defaultFrames: AnimationFrame[] = [
  {
    id: 'frame-1',
    name: 'Banner 300x250',
    selected: true,
    width: 300,
    height: 250
  },
  {
    id: 'frame-2',
    name: 'Banner 728x90',
    selected: false,
    width: 728,
    height: 90
  },
  {
    id: 'frame-3',
    name: 'Banner 320x50',
    selected: false,
    width: 320,
    height: 50
  },
  {
    id: 'frame-4',
    name: 'Banner 160x600',
    selected: false,
    width: 160,
    height: 600
  }
];

// Storage keys
const STORAGE_KEY = 'figma-animation-plugin';
const AUTOSAVE_INTERVAL = 3000; // 3 seconds

// Provider component
export const AnimationProvider = ({ children }: { children: ReactNode }) => {
  // Load saved data or use defaults
  const savedData = loadSavedData(STORAGE_KEY, {
    layers: defaultLayers,
    frames: defaultFrames,
    selectedLayerId: null,
    duration: 5
  });
  
  // State - initialize with saved or default data
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

  // Set up auto-save with our custom hook
  const animationState = {
    layers,
    frames,
    selectedLayerId,
    duration
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
    if (!selectedLayerId) return null;
    return layers.find(layer => layer.id === selectedLayerId) || null;
  }, [layers, selectedLayerId]);

  // Add a new layer
  const addLayer = useCallback((layer: AnimationLayer) => {
    setLayers(prevLayers => [...prevLayers, layer]);
  }, []);

  // Remove a layer
  const removeLayer = useCallback((layerId: string) => {
    setLayers(prevLayers => prevLayers.filter(layer => layer.id !== layerId));
  }, []);

  // Update a layer
  const updateLayer = useCallback((layerId: string, updates: Partial<AnimationLayer>) => {
    setLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.id === layerId 
          ? { ...layer, ...updates } 
          : layer
      )
    );
  }, []);

  // Toggle layer visibility
  const toggleLayerVisibility = useCallback((layerId: string) => {
    setLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.id === layerId 
          ? { ...layer, visible: !layer.visible } 
          : layer
      )
    );
  }, []);

  // Toggle layer lock
  const toggleLayerLock = useCallback((layerId: string) => {
    setLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.id === layerId 
          ? { ...layer, locked: !layer.locked } 
          : layer
      )
    );
  }, []);

  // Add a new frame
  const addFrame = useCallback((frame: AnimationFrame) => {
    setFrames(prevFrames => [...prevFrames, frame]);
  }, []);

  // Remove a frame
  const removeFrame = useCallback((frameId: string) => {
    setFrames(prevFrames => prevFrames.filter(frame => frame.id !== frameId));
  }, []);

  // Select a frame
  const selectFrame = useCallback((frameId: string) => {
    setFrames(prevFrames => 
      prevFrames.map(frame => ({
        ...frame,
        selected: frame.id === frameId
      }))
    );
  }, []);

  // Update a layer's animation
  const updateLayerAnimation = useCallback((layerId: string, animation: Animation) => {
    setLayers(prevLayers => {
      return prevLayers.map(layer => {
        if (layer.id !== layerId) return layer;
        
        // Check if an animation of this type already exists
        const existingIndex = layer.animations.findIndex(
          anim => anim.type === animation.type
        );
        
        if (existingIndex !== -1) {
          // Update existing animation
          const updatedAnimations = [...layer.animations];
          updatedAnimations[existingIndex] = animation;
          return { ...layer, animations: updatedAnimations };
        } else {
          // Add new animation
          return { ...layer, animations: [...layer.animations, animation] };
        }
      });
    });
  }, []);

  // Add a keyframe
  const addKeyframe = useCallback((layerId: string, time: number) => {
    setLayers(prevLayers => {
      return prevLayers.map(layer => {
        if (layer.id !== layerId) return layer;
        
        // Default keyframe properties
        const newKeyframe: Keyframe = {
          time,
          properties: {}
        };
        
        return {
          ...layer,
          keyframes: [...layer.keyframes, newKeyframe]
        };
      });
    });
  }, []);

  // Delete a keyframe
  const deleteKeyframe = useCallback((layerId: string, time: number) => {
    setLayers(prevLayers => {
      return prevLayers.map(layer => {
        if (layer.id !== layerId) return layer;
        
        return {
          ...layer,
          keyframes: layer.keyframes.filter(kf => kf.time !== time)
        };
      });
    });
  }, []);

  // Toggle playback
  const togglePlayback = useCallback(() => {
    setIsPlaying(prevState => !prevState);
  }, []);

  // Save animation state
  const saveAnimationState = useCallback(() => {
    const state = {
      layers,
      frames,
      selectedLayerId,
      duration
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      console.log('Animation state saved');
    } catch (error) {
      console.error('Error saving animation state:', error);
    }
  }, [layers, frames, selectedLayerId, duration]);

  // Load animation state
  const loadAnimationState = useCallback(() => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const state = JSON.parse(storedData);
        setLayers(state.layers || defaultLayers);
        setFrames(state.frames || defaultFrames);
        setSelectedLayerId(state.selectedLayerId || null);
        setDuration(state.duration || 5);
        console.log('Animation state loaded');
      }
    } catch (error) {
      console.error('Error loading animation state:', error);
    }
  }, []);

  // Handle playback timer
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setCurrentTime(prevTime => {
        const newTime = prevTime + 0.1;
        if (newTime >= duration) {
          setIsPlaying(false);
          return 0;
        }
        return newTime;
      });
    }, 100);
    
    return () => clearInterval(timer);
  }, [isPlaying, duration]);

  // Combine all context values
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
    
    // Playback methods
    togglePlayback,
    
    // State methods
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