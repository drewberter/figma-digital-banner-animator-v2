import { useEffect, useRef } from 'react';

interface AutoSaveOptions {
  key: string;
  data: any;
  interval?: number;
  debounce?: number;
  onSave?: (key: string, data: any) => void;
  onError?: (error: any) => void;
}

/**
 * A hook that automatically saves data to localStorage at specified intervals
 * and when the component unmounts.
 *
 * @param options AutoSaveOptions
 * @returns void
 */
export function useAutoSave({
  key,
  data,
  interval = 5000, // Save every 5 seconds by default
  debounce = 500,  // Debounce saving for performance
  onSave,
  onError,
}: AutoSaveOptions): void {
  const timer = useRef<number | null>(null);
  const debounceTimer = useRef<number | null>(null);
  const previousData = useRef<string>('');
  
  // Save function
  const saveData = () => {
    try {
      // Only save if data has changed
      const serialized = JSON.stringify(data);
      if (serialized !== previousData.current) {
        localStorage.setItem(key, serialized);
        previousData.current = serialized;
        onSave?.(key, data);
        console.log(`Autosaved animation state for: ${key}`);
      }
    } catch (error) {
      console.error('Error saving data:', error);
      onError?.(error);
    }
  };

  // Debounced save function
  const debouncedSave = () => {
    if (debounceTimer.current) {
      window.clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = window.setTimeout(() => {
      saveData();
      debounceTimer.current = null;
    }, debounce);
  };

  // Set up interval save
  useEffect(() => {
    if (interval > 0) {
      timer.current = window.setInterval(() => {
        saveData();
      }, interval);
    }
    
    // Save on data changes with debounce
    debouncedSave();
    
    // Cleanup interval and save one last time when component unmounts
    return () => {
      if (timer.current) {
        window.clearInterval(timer.current);
      }
      if (debounceTimer.current) {
        window.clearTimeout(debounceTimer.current);
      }
      saveData();
    };
  }, [data, interval]);
}

/**
 * Load saved data from localStorage
 * 
 * @param key The key to load data from
 * @param defaultValue The default value to return if no data is found
 * @returns The parsed data or default value
 */
export function loadSavedData<T>(key: string, defaultValue: T): T {
  try {
    const storedData = localStorage.getItem(key);
    if (storedData) {
      return JSON.parse(storedData) as T;
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  return defaultValue;
}