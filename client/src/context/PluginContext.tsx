import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initializePlugin, onPluginMessage, MessageType } from '../lib/figmaPlugin';

// Define the plugin context type
interface PluginContextType {
  initialized: boolean;
  figmaFrames: any[];
  figmaLayers: any[];
  isLoading: boolean;
  error: string | null;
}

// Create the context
const PluginContext = createContext<PluginContextType>({
  initialized: false,
  figmaFrames: [],
  figmaLayers: [],
  isLoading: false,
  error: null
});

// Create a provider component
export const PluginProvider = ({ children }: { children: ReactNode }) => {
  const [initialized, setInitialized] = useState(false);
  const [figmaFrames, setFigmaFrames] = useState<any[]>([]);
  const [figmaLayers, setFigmaLayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize plugin when component mounts
  useEffect(() => {
    // Register event listener for when plugin is ready
    const unsubscribeReady = onPluginMessage('READY_RESPONSE', () => {
      setInitialized(true);
    });
    
    // Register event listener for frames
    const unsubscribeFrames = onPluginMessage('FRAMES_RESPONSE', (data) => {
      setFigmaFrames(data.frames || []);
      setIsLoading(false);
    });
    
    // Register event listener for layers
    const unsubscribeLayers = onPluginMessage('LAYERS_RESPONSE', (data) => {
      setFigmaLayers(data.layers || []);
      setIsLoading(false);
    });
    
    // Register event listener for errors
    const unsubscribeError = onPluginMessage('ERROR', (data) => {
      setError(data.message || 'Unknown error');
      setIsLoading(false);
    });
    
    // Register event listener for saved state
    const unsubscribeState = onPluginMessage('STATE_LOADED', (data) => {
      // This will be handled by the AnimationContext
      console.log('State loaded:', data);
    });
    
    // Initialize plugin communication
    initializePlugin();
    
    // Cleanup function
    return () => {
      unsubscribeReady();
      unsubscribeFrames();
      unsubscribeLayers();
      unsubscribeError();
      unsubscribeState();
    };
  }, []);

  return (
    <PluginContext.Provider
      value={{
        initialized,
        figmaFrames,
        figmaLayers,
        isLoading,
        error
      }}
    >
      {children}
    </PluginContext.Provider>
  );
};

// Create a hook to use the plugin context
export const usePluginContext = () => {
  const context = useContext(PluginContext);
  if (context === undefined) {
    throw new Error('usePluginContext must be used within a PluginProvider');
  }
  return context;
};
