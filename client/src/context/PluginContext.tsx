import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { onPluginMessage, MessageType } from '../lib/figmaPlugin';

interface PluginContextType {
  initialized: boolean;
  figmaFrames: any[];
  figmaLayers: any[];
  isLoading: boolean;
  error: string | null;
}

const PluginContext = createContext<PluginContextType | undefined>(undefined);

export const PluginProvider = ({ children }: { children: ReactNode }) => {
  const [initialized, setInitialized] = useState(false);
  const [figmaFrames, setFigmaFrames] = useState<any[]>([]);
  const [figmaLayers, setFigmaLayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen for plugin messages
  useEffect(() => {
    // Handler for READY_RESPONSE
    const readyHandler = onPluginMessage('READY_RESPONSE', () => {
      console.log('Plugin connection established');
      setInitialized(true);
      setIsLoading(false);
    });

    // Handler for FRAMES_RESPONSE
    const framesHandler = onPluginMessage('FRAMES_RESPONSE', (data) => {
      if (data.frames && Array.isArray(data.frames)) {
        console.log('Received frames:', data.frames);
        setFigmaFrames(data.frames);
      }
      setIsLoading(false);
    });

    // Handler for LAYERS_RESPONSE
    const layersHandler = onPluginMessage('LAYERS_RESPONSE', (data) => {
      if (data.layers && Array.isArray(data.layers)) {
        console.log('Received layers:', data.layers);
        setFigmaLayers(data.layers);
      }
      setIsLoading(false);
    });

    // Handler for ERROR messages
    const errorHandler = onPluginMessage('ERROR', (data) => {
      console.error('Figma plugin error:', data.message);
      setError(data.message || 'Unknown error from Figma plugin');
      setIsLoading(false);
    });

    // Handler for STATE_LOADED messages
    const stateLoadedHandler = onPluginMessage('STATE_LOADED', (data) => {
      console.log('Loaded state from Figma:', data);
      // You can update more state here if needed
      setIsLoading(false);
    });

    // Detect if we're not in Figma environment after some timeout
    const timeoutId = setTimeout(() => {
      if (!initialized) {
        console.warn('Not in Figma environment or plugin connection failed');
        // We set initialized to true anyway to allow mock UI to work
        setInitialized(true);
        setIsLoading(false);
      }
    }, 3000);

    // Clean up effect
    return () => {
      clearTimeout(timeoutId);
      readyHandler();
      framesHandler();
      layersHandler();
      errorHandler();
      stateLoadedHandler();
    };
  }, [initialized]);

  const contextValue: PluginContextType = {
    initialized,
    figmaFrames,
    figmaLayers,
    isLoading,
    error
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