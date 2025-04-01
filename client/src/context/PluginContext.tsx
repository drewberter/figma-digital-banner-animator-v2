import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { initializePlugin, onPluginMessage } from '../lib/figmaPlugin';

interface PluginContextType {
  initialized: boolean;
  figmaFrames: any[];
  figmaLayers: any[];
  isLoading: boolean;
  error: string | null;
  // Add state change event
  onStateLoaded: (data: any, frameId?: string) => void;
}

// Create a event bus for state loading
const stateLoadedListeners: ((data: any, frameId?: string) => void)[] = [];

const PluginContext = createContext<PluginContextType | undefined>(undefined);

export const PluginProvider = ({ children }: { children: ReactNode }) => {
  const [initialized, setInitialized] = useState(false); 
  const [figmaFrames, setFigmaFrames] = useState<any[]>([]);
  const [figmaLayers, setFigmaLayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Figma plugin connection
  useEffect(() => {
    // Initialize the plugin connection
    initializePlugin();
    setInitialized(true);
    console.log('Figma plugin connection initialized');
    
    // Listen for STATE_LOADED messages from the plugin
    const unsubscribe = onPluginMessage('STATE_LOADED', (data) => {
      console.log('Received STATE_LOADED message from plugin:', data);
      
      // Notify any listeners that state has been loaded
      stateLoadedListeners.forEach(listener => {
        listener(data.data, data.frameId);
      });
    });
    
    // Cleanup listener when component unmounts
    return () => {
      unsubscribe();
    };
  }, []);

  // Add a listener for state changes
  const onStateLoaded = (callback: (data: any, frameId?: string) => void) => {
    stateLoadedListeners.push(callback);
    
    // Return a function to remove the listener
    return () => {
      const index = stateLoadedListeners.indexOf(callback);
      if (index !== -1) {
        stateLoadedListeners.splice(index, 1);
      }
    };
  };

  const contextValue: PluginContextType = {
    initialized,
    figmaFrames,
    figmaLayers,
    isLoading,
    error,
    onStateLoaded
  };

  return (
    <PluginContext.Provider value={contextValue}>
      {children}
    </PluginContext.Provider>
  );
};

export const usePluginContext = () => {
  const context = useContext(PluginContext);
  if (context === undefined) {
    throw new Error('usePluginContext must be used within a PluginProvider');
  }
  return context;
};