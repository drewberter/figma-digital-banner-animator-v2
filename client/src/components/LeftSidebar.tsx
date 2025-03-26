import { useState } from 'react';
import { ChevronDown, ChevronRight, ChevronLeftSquare, ChevronRightSquare, Plus, Eye, EyeOff, Lock, Unlock, Square, CheckSquare, Image, Type, Box, Layout } from 'lucide-react';
import { mockFrames, mockLayers } from '../mock/animationData';

interface LeftSidebarProps {
  onOpenPresets: () => void;
  onSelectFrame?: (frameId: string) => void;
}

const LeftSidebar = ({ onOpenPresets, onSelectFrame }: LeftSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [frameListExpanded, setFrameListExpanded] = useState(true);
  const [layerListExpanded, setLayerListExpanded] = useState(true);
  const [selectedFrameId, setSelectedFrameId] = useState('frame-1');
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    mockLayers['frame-1']?.length > 0 ? mockLayers['frame-1'][0].id : null
  );
  
  // Get the current layers for the selected frame
  const currentLayers = mockLayers[selectedFrameId] || [];
  
  // Toggle sidebar collapsed state
  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  // Select a frame and pass the event to parent
  const handleSelectFrame = (frameId: string) => {
    console.log('Selected frame:', frameId);
    setSelectedFrameId(frameId);
    
    // Reset selected layer when changing frames
    const frameLayers = mockLayers[frameId] || [];
    if (frameLayers.length > 0) {
      setSelectedLayerId(frameLayers[0].id);
    } else {
      setSelectedLayerId(null);
    }
    
    // Update the preview via App.tsx
    if (onSelectFrame) {
      onSelectFrame(frameId);
    }
  };
  
  // Select a layer
  const handleSelectLayer = (layerId: string) => {
    console.log('Selected layer:', layerId);
    setSelectedLayerId(layerId);
  };
  
  // Toggle layer visibility
  const toggleLayerVisibility = (layerId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    // This would be handled by context in a real implementation
    console.log('Toggle visibility for layer:', layerId);
  };
  
  // Toggle layer lock
  const toggleLayerLock = (layerId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    // This would be handled by context in a real implementation
    console.log('Toggle lock for layer:', layerId);
  };
  
  // Get layer icon based on type
  function getLayerIcon(type: string) {
    switch (type.toLowerCase()) {
      case 'image':
        return <Image size={14} />;
      case 'text':
        return <Type size={14} />;
      case 'rectangle':
        return <Box size={14} />;
      case 'button':
        return <Layout size={14} />;
      default:
        return <Box size={14} />;
    }
  }
  
  // If collapsed, show a narrow sidebar with just the collapse/expand button
  if (isCollapsed) {
    return (
      <div className="w-10 bg-[#111111] border-r border-neutral-800 flex flex-col items-center">
        <div className="p-2 border-b border-neutral-800 w-full flex justify-center">
          <button 
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-700"
            onClick={toggleCollapsed}
            title="Expand Sidebar"
          >
            <ChevronRightSquare size={16} className="text-neutral-400" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center pt-2">
          {mockFrames.map((frame) => (
            <div 
              key={frame.id}
              className={`w-6 h-6 mb-1 rounded-sm flex items-center justify-center cursor-pointer ${selectedFrameId === frame.id ? 'bg-[#4A7CFF]' : 'bg-neutral-800 hover:bg-neutral-700'}`}
              onClick={() => handleSelectFrame(frame.id)}
              title={`${frame.name} (${frame.width}×${frame.height})`}
            >
              <span className="text-xs font-bold text-white">
                {frame.id.charAt(frame.id.length - 1)}
              </span>
            </div>
          ))}
        </div>
        <div className="p-2 border-t border-neutral-800 w-full flex justify-center">
          <button 
            className="w-6 h-6 flex items-center justify-center rounded text-[#4A7CFF] hover:bg-neutral-800"
            title="Add Frame"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    );
  }
  
  // Regular expanded sidebar
  return (
    <div className="w-64 bg-[#111111] border-r border-neutral-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-300">Timeline</h3>
        <div className="flex">
          <button 
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-700"
            onClick={toggleCollapsed}
            title="Collapse Sidebar"
          >
            <ChevronLeftSquare size={16} className="text-neutral-400" />
          </button>
        </div>
      </div>
      
      {/* Frames Section */}
      <div className="border-b border-neutral-800">
        <div 
          className="p-2 flex items-center justify-between cursor-pointer hover:bg-neutral-800"
          onClick={() => setFrameListExpanded(!frameListExpanded)}
        >
          {frameListExpanded ? 
            <ChevronDown size={16} className="text-neutral-400 mr-1" /> : 
            <ChevronRight size={16} className="text-neutral-400 mr-1" />
          }
          <span className="text-xs font-medium text-neutral-300 flex-1">FRAMES</span>
        </div>
        
        {frameListExpanded && (
          <div className="max-h-48 overflow-y-auto">
            {mockFrames.map((frame) => (
              <div 
                key={frame.id}
                className={`pl-4 pr-2 py-1 flex items-center cursor-pointer hover:bg-neutral-800 ${selectedFrameId === frame.id ? 'bg-neutral-800' : ''}`}
                onClick={() => handleSelectFrame(frame.id)}
              >
                <div className="mr-2">
                  {selectedFrameId === frame.id ? (
                    <CheckSquare size={16} className="text-[#4A7CFF]" />
                  ) : (
                    <Square size={16} className="text-neutral-500" />
                  )}
                </div>
                <div className="flex-1 text-sm truncate">
                  <span className={selectedFrameId === frame.id ? "text-white" : "text-neutral-300"}>
                    {frame.name}
                  </span>
                </div>
                <div className="text-xs text-neutral-500">
                  {frame.width}×{frame.height}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Layers Section */}
      <div className="flex-1 flex flex-col">
        <div 
          className="p-2 flex items-center justify-between cursor-pointer hover:bg-neutral-800"
          onClick={() => setLayerListExpanded(!layerListExpanded)}
        >
          {layerListExpanded ? 
            <ChevronDown size={16} className="text-neutral-400 mr-1" /> : 
            <ChevronRight size={16} className="text-neutral-400 mr-1" />
          }
          <span className="text-xs font-medium text-neutral-300 flex-1">LAYERS</span>
        </div>
        
        {layerListExpanded && (
          <div className="flex-1 overflow-y-auto">
            {currentLayers.map((layer) => (
              <div 
                key={layer.id}
                className={`pl-4 pr-2 py-1 flex items-center cursor-pointer hover:bg-neutral-800 ${selectedLayerId === layer.id ? 'bg-neutral-800' : ''}`}
                onClick={() => handleSelectLayer(layer.id)}
              >
                <div className="mr-2 flex items-center space-x-1">
                  <button
                    onClick={(e) => toggleLayerVisibility(layer.id, e)}
                    className="text-neutral-400 hover:text-neutral-200"
                    title={layer.visible ? "Hide Layer" : "Show Layer"}
                  >
                    {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  
                  <button
                    onClick={(e) => toggleLayerLock(layer.id, e)}
                    className="text-neutral-400 hover:text-neutral-200"
                    title={layer.locked ? "Unlock Layer" : "Lock Layer"}
                  >
                    {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                </div>
                
                <div className="flex-1 text-sm flex items-center">
                  <span className="mr-2 text-neutral-500">
                    {getLayerIcon(layer.type)}
                  </span>
                  <span className={selectedLayerId === layer.id ? "text-white" : "text-neutral-300"}>
                    {layer.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Bottom actions */}
      <div className="p-2 border-t border-neutral-800 flex flex-col space-y-1">
        <button 
          className="w-full py-1 text-sm text-[#4A7CFF] rounded hover:bg-neutral-800 flex items-center justify-center"
          onClick={onOpenPresets}
        >
          <Plus size={16} className="mr-1" />
          Add Animation
        </button>
      </div>
    </div>
  );
};

export default LeftSidebar;