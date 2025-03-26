import { useState, useCallback } from 'react';
import { saveToClientStorage, loadFromClientStorage } from '../lib/figmaPlugin';

// This hook manages the state persistence of animation settings
export function useAnimationState<T>(initialState: T, storageKey: string) {
  const [state, setState] = useState<T>(initialState);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Save state to Figma's clientStorage
  const saveState = useCallback(async () => {
    try {
      await saveToClientStorage(storageKey, state);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }, [state, storageKey]);
  
  // Load state from Figma's clientStorage
  const loadState = useCallback(() => {
    try {
      loadFromClientStorage(storageKey);
      // The actual state will be updated via the onPluginMessage handler in the context
    } catch (error) {
      console.error('Error loading state:', error);
    }
  }, [storageKey]);
  
  // Update state
  const updateState = useCallback((newState: Partial<T>) => {
    setState(prevState => ({ ...prevState, ...newState }));
  }, []);
  
  return {
    state,
    updateState,
    saveState,
    loadState,
    lastSaved
  };
}
