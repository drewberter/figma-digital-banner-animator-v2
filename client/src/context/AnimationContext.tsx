import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { 
  AnimationLayer, 
  AnimationFrame, 
  Keyframe, 
  Animation,
  AnimationType,
  EasingType
} from '../types/animation';
import { saveToClientStorage, loadFromClientStorage } from '../lib/figmaPlugin';

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

// Create the context with default values
const AnimationContext = createContext<AnimationContextType>({
  layers: [],
  frames: [],
  selectedLayerId: null,
  currentFrame: null,
  isPlaying: false,
  currentTime: 0,
  duration: 3,
  
  selectLayer: () => {},
  getSelectedLayer: () => null,
  addLayer: () => {},
  removeLayer: () => {},
  updateLayer: () => {},
  toggleLayerVisibility: () => {},
  toggleLayerLock: () => {},
  
  addFrame: () => {},
  removeFrame: () => {},
  selectFrame: () => {},
  
  updateLayerAnimation: () => {},
  addKeyframe: () => {},
  deleteKeyframe: () => {},
  setCurrentTime: () => {},
  
  togglePlayback: () => {},
  
  saveAnimationState: () => {},
  loadAnimationState: () => {}
});

// Create a provider component
export const AnimationProvider = ({ children }: { children: ReactNode }) => {
  const [layers, setLayers] = useState<AnimationLayer[]>([
    // Default test layers
    {
      id: 'layer1',
      name: 'Hero Banner',
      type: 'image',
      visible: true,
      locked: false,
      animations: [],
      keyframes: []
    },
    {
      id: 'layer2',
      name: 'Main Heading',
      type: 'text',
      visible: true,
      locked: false,
      animations: [],
      keyframes: []
    },
    {
      id: 'layer3',
      name: 'CTA Button',
      type: 'shape',
      visible: true,
      locked: false,
      animations: [
        {
          type: AnimationType.Slide,
          startTime: 0.5,
          duration: 1,
          delay: 0.2,
          easing: EasingType.EaseOut,
          direction: 'right'
        }
      ],
      keyframes: [
        { time: 0.5, properties: {} },
        { time: 1.5, properties: {} }
      ]
    },
    {
      id: 'layer4',
      name: 'Background',
      type: 'rectangle',
      visible: true,
      locked: false,
      animations: [],
      keyframes: []
    },
    {
      id: 'layer5',
      name: 'Product Image',
      type: 'image',
      visible: true,
      locked: false,
      animations: [],
      keyframes: []
    }
  ]);
  
  const [frames, setFrames] = useState<AnimationFrame[]>([
    // Default test frames
    {
      id: 'frame1',
      name: 'Frame 1',
      selected: true,
      width: 300,
      height: 250
    },
    {
      id: 'frame2',
      name: 'Frame 2',
      selected: false,
      width: 300,
      height: 250
    },
    {
      id: 'frame3',
      name: 'Frame 3',
      selected: false,
      width: 300,
      height: 250
    }
  ]);
  
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>('layer3'); // Default to CTA Button
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(3.0); // Default animation duration in seconds
  
  // Auto-save timer
  useEffect(() => {
    const autosaveInterval = setInterval(() => {
      saveAnimationState();
    }, 60000); // Auto-save every minute
    
    return () => clearInterval(autosaveInterval);
  }, []);
  
  // Layer management
  const selectLayer = useCallback((layerId: string) => {
    setSelectedLayerId(layerId);
  }, []);
  
  const getSelectedLayer = useCallback(() => {
    if (!selectedLayerId) return null;
    return layers.find(layer => layer.id === selectedLayerId) || null;
  }, [layers, selectedLayerId]);
  
  const addLayer = useCallback((layer: AnimationLayer) => {
    setLayers(prev => [...prev, layer]);
  }, []);
  
  const removeLayer = useCallback((layerId: string) => {
    setLayers(prev => prev.filter(layer => layer.id !== layerId));
  }, []);
  
  const updateLayer = useCallback((layerId: string, updates: Partial<AnimationLayer>) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, ...updates } : layer
    ));
  }, []);
  
  const toggleLayerVisibility = useCallback((layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
    ));
  }, []);
  
  const toggleLayerLock = useCallback((layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, locked: !layer.locked } : layer
    ));
  }, []);
  
  // Frame management
  const addFrame = useCallback((frame: AnimationFrame) => {
    setFrames(prev => [...prev, frame]);
  }, []);
  
  const removeFrame = useCallback((frameId: string) => {
    setFrames(prev => prev.filter(frame => frame.id !== frameId));
  }, []);
  
  const selectFrame = useCallback((frameId: string) => {
    setFrames(prev => prev.map(frame => ({
      ...frame,
      selected: frame.id === frameId
    })));
  }, []);
  
  // Get current frame
  const currentFrame = frames.find(frame => frame.selected) || null;
  
  // Animation management
  const updateLayerAnimation = useCallback((layerId: string, animation: Animation) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id === layerId) {
        // If there are existing animations, update the first one, otherwise add a new one
        const animations = layer.animations.length > 0 
          ? layer.animations.map((anim, index) => index === 0 ? { ...anim, ...animation } : anim)
          : [{ ...animation, startTime: 0 }];
        
        return { ...layer, animations };
      }
      return layer;
    }));
  }, []);
  
  const addKeyframe = useCallback((layerId: string, time: number) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id === layerId) {
        // Check if a keyframe already exists at this time
        const existingKeyframeIndex = layer.keyframes.findIndex(kf => Math.abs(kf.time - time) < 0.1);
        
        if (existingKeyframeIndex >= 0) {
          return layer; // Keyframe already exists, don't add a duplicate
        }
        
        const newKeyframes = [...layer.keyframes, { time, properties: {} }];
        // Sort keyframes by time
        newKeyframes.sort((a, b) => a.time - b.time);
        
        return { ...layer, keyframes: newKeyframes };
      }
      return layer;
    }));
  }, []);
  
  const deleteKeyframe = useCallback((layerId: string, time: number) => {
    setLayers(prev => prev.map(layer => {
      if (layer.id === layerId) {
        return {
          ...layer,
          keyframes: layer.keyframes.filter(kf => Math.abs(kf.time - time) >= 0.1)
        };
      }
      return layer;
    }));
  }, []);
  
  // Playback controls
  const togglePlayback = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);
  
  // State persistence
  const saveAnimationState = useCallback(() => {
    const state = {
      layers,
      frames,
      selectedLayerId,
      currentTime,
      duration
    };
    
    saveToClientStorage('animationState', state);
  }, [layers, frames, selectedLayerId, currentTime, duration]);
  
  const loadAnimationState = useCallback(() => {
    loadFromClientStorage('animationState');
  }, []);
  
  // Update duration based on keyframes
  useEffect(() => {
    let maxDuration = 3.0; // Default minimum duration
    
    // Check all layers for animations and keyframes
    layers.forEach(layer => {
      layer.animations.forEach(anim => {
        const animEndTime = anim.startTime + anim.duration + (anim.delay || 0);
        if (animEndTime > maxDuration) {
          maxDuration = animEndTime;
        }
      });
      
      layer.keyframes.forEach(keyframe => {
        if (keyframe.time > maxDuration) {
          maxDuration = keyframe.time;
        }
      });
    });
    
    // Add a bit of buffer
    setDuration(maxDuration + 0.5);
  }, [layers]);

  // Run animation when playing
  useEffect(() => {
    if (!isPlaying) return;
    
    let animationFrame: number;
    let lastTimestamp: number;
    
    const animate = (timestamp: number) => {
      if (!lastTimestamp) {
        lastTimestamp = timestamp;
        animationFrame = requestAnimationFrame(animate);
        return;
      }
      
      const deltaTime = (timestamp - lastTimestamp) / 1000; // Convert to seconds
      lastTimestamp = timestamp;
      
      setCurrentTime(prev => {
        const newTime = prev + deltaTime;
        if (newTime >= duration) {
          // Loop animation
          return 0;
        }
        return newTime;
      });
      
      animationFrame = requestAnimationFrame(animate);
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, duration]);

  return (
    <AnimationContext.Provider 
      value={{
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
      }}
    >
      {children}
    </AnimationContext.Provider>
  );
};

// Create a hook to use the animation context
export const useAnimationContext = () => {
  const context = useContext(AnimationContext);
  if (context === undefined) {
    throw new Error('useAnimationContext must be used within an AnimationProvider');
  }
  return context;
};
