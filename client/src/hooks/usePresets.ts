import { useState, useEffect, useCallback } from 'react';
import { useAnimationContext } from '../context/AnimationContext';
import { 
  AnimationType, 
  EasingType,
  Preset,
  Animation
} from '../types/animation';

// Predefined animation presets
const defaultPresets: Preset[] = [
  // Entrance animations
  {
    id: 'fade-in',
    name: 'Fade In',
    category: 'entrance',
    animation: {
      type: AnimationType.Fade,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseOut,
      opacity: 100
    },
    icon: '<path d="M24 12C17.373 12 12 17.373 12 24C12 30.627 17.373 36 24 36C30.627 36 36 30.627 36 24C36 17.373 30.627 12 24 12ZM24 32C19.582 32 16 28.418 16 24C16 19.582 19.582 16 24 16C28.418 16 32 19.582 32 24C32 28.418 28.418 32 24 32Z" fill="#0078D4" fill-opacity="0.5"/><path d="M24 8C15.163 8 8 15.163 8 24C8 32.837 15.163 40 24 40C32.837 40 40 32.837 40 24C40 15.163 32.837 8 24 8ZM24 36C17.373 36 12 30.627 12 24C12 17.373 17.373 12 24 12C30.627 12 36 17.373 36 24C36 30.627 30.627 36 24 36Z" fill="#0078D4"/>'
  },
  {
    id: 'fade-in-right',
    name: 'Fade In Right',
    category: 'entrance',
    animation: {
      type: AnimationType.Slide,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseOut,
      direction: 'right',
      opacity: 100
    },
    icon: '<path d="M8 24H40" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M32 16L40 24L32 32" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="12" y="20" width="16" height="8" rx="2" fill="#0078D4" fill-opacity="0.5"/>'
  },
  {
    id: 'bounce-in',
    name: 'Bounce In',
    category: 'entrance',
    animation: {
      type: AnimationType.Scale,
      startTime: 0,
      duration: 1,
      delay: 0,
      easing: EasingType.Bounce,
      scale: 1
    },
    icon: '<circle cx="24" cy="24" r="12" fill="#0078D4"/><path d="M24 36V42" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M24 12V6" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M36 24H42" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M12 24H6" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/>'
  },
  
  // Exit animations
  {
    id: 'fade-out',
    name: 'Fade Out',
    category: 'exit',
    animation: {
      type: AnimationType.Fade,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseIn,
      opacity: 0
    },
    icon: '<path d="M24 12C17.373 12 12 17.373 12 24C12 30.627 17.373 36 24 36C30.627 36 36 30.627 36 24C36 17.373 30.627 12 24 12ZM24 32C19.582 32 16 28.418 16 24C16 19.582 19.582 16 24 16C28.418 16 32 19.582 32 24C32 28.418 28.418 32 24 32Z" fill="#0078D4" fill-opacity="0.2"/><path d="M24 8C15.163 8 8 15.163 8 24C8 32.837 15.163 40 24 40C32.837 40 40 32.837 40 24C40 15.163 32.837 8 24 8ZM24 36C17.373 36 12 30.627 12 24C12 17.373 17.373 12 24 12C30.627 12 36 17.373 36 24C36 30.627 30.627 36 24 36Z" fill="#0078D4" fill-opacity="0.5"/>'
  },
  
  // Emphasis animations
  {
    id: 'pulse',
    name: 'Pulse',
    category: 'emphasis',
    animation: {
      type: AnimationType.Pulse,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseInOut,
      intensity: 1.1
    },
    icon: '<circle cx="24" cy="24" r="8" fill="#0078D4"/><circle cx="24" cy="24" r="16" stroke="#0078D4" stroke-width="2" stroke-dasharray="4 4"/>'
  },
  {
    id: 'shake',
    name: 'Shake',
    category: 'emphasis',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 0.5,
      delay: 0,
      easing: EasingType.Linear,
      customData: {
        keyframes: [
          { offset: 0, transform: 'translateX(0)' },
          { offset: 0.1, transform: 'translateX(-5px)' },
          { offset: 0.3, transform: 'translateX(5px)' },
          { offset: 0.5, transform: 'translateX(-5px)' },
          { offset: 0.7, transform: 'translateX(5px)' },
          { offset: 0.9, transform: 'translateX(-5px)' },
          { offset: 1, transform: 'translateX(0)' }
        ]
      }
    },
    icon: '<rect x="16" y="16" width="16" height="16" fill="#0078D4"/><path d="M12 24H8" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M40 24H36" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/>'
  },
  
  // Text animations
  {
    id: 'text-character',
    name: 'Character by Character',
    category: 'text',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 1.2,
      delay: 0,
      easing: EasingType.Linear,
      customData: {
        textAnimation: 'character'
      }
    },
    icon: '<path d="M12 16H36" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M12 24H28" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M12 32H22" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/>'
  }
];

// Custom hook for managing animation presets
export function usePresets() {
  const [presets, setPresets] = useState<Preset[]>(defaultPresets);
  const [customPresets, setCustomPresets] = useState<Preset[]>([]);
  const { updateLayerAnimation } = useAnimationContext();
  
  // Load custom presets from localStorage
  useEffect(() => {
    const storedPresets = localStorage.getItem('customPresets');
    if (storedPresets) {
      try {
        const parsedPresets = JSON.parse(storedPresets);
        setCustomPresets(parsedPresets);
      } catch (error) {
        console.error('Error parsing custom presets:', error);
      }
    }
  }, []);
  
  // Combine default and custom presets
  useEffect(() => {
    setPresets([...defaultPresets, ...customPresets]);
  }, [customPresets]);
  
  // Save a custom preset
  const saveCustomPreset = useCallback((name: string, animation: Animation, category: string = 'custom') => {
    const newPreset: Preset = {
      id: `custom-${Date.now()}`,
      name,
      category,
      animation,
      icon: '<rect x="16" y="16" width="16" height="16" fill="#0078D4"/>' // Default icon
    };
    
    setCustomPresets(prev => {
      const updatedPresets = [...prev, newPreset];
      localStorage.setItem('customPresets', JSON.stringify(updatedPresets));
      return updatedPresets;
    });
    
    return newPreset.id;
  }, []);
  
  // Apply a preset to a layer
  const applyPreset = useCallback((layerId: string, presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      updateLayerAnimation(layerId, preset.animation);
      return true;
    }
    return false;
  }, [presets, updateLayerAnimation]);
  
  // Delete a custom preset
  const deleteCustomPreset = useCallback((presetId: string) => {
    setCustomPresets(prev => {
      const updatedPresets = prev.filter(p => p.id !== presetId);
      localStorage.setItem('customPresets', JSON.stringify(updatedPresets));
      return updatedPresets;
    });
  }, []);
  
  return {
    presets,
    saveCustomPreset,
    applyPreset,
    deleteCustomPreset
  };
}
