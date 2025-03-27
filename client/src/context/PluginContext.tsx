import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface PluginContextType {
  initialized: boolean;
  figmaFrames: any[];
  figmaLayers: any[];
  isLoading: boolean;
  error: string | null;
}

const PluginContext = createContext<PluginContextType | undefined>(undefined);

export const PluginProvider = ({ children }: { children: ReactNode }) => {
  const [initialized, setInitialized] = useState(true); // Set to true for development
  const [figmaFrames, setFigmaFrames] = useState<any[]>([]);
  const [figmaLayers, setFigmaLayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate initialization
  useEffect(() => {
    // In a real plugin, we would initialize connection to Figma
    const timer = setTimeout(() => {
      setInitialized(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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