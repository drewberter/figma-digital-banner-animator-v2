import { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight, CheckSquare, Square, ChevronLeftSquare, ChevronRightSquare } from 'lucide-react';
import { getFrames, selectFrame, onPluginMessage } from '../lib/figmaPlugin';
import { usePluginContext } from '../context/PluginContext';

interface FigmaFramesSidebarProps {
  onSelectFrame: (frameId: string) => void;
}

interface FigmaFrameProps {
  id: string;
  name: string;
  dimensions: string;
  isSelected: boolean;
  onSelect: () => void;
}

interface FigmaFrameData {
  id: string;
  name: string;
  selected: boolean;
  width: number;
  height: number;
}

const FigmaFrame = ({ id, name, dimensions, isSelected, onSelect }: FigmaFrameProps) => {
  return (
    <div 
      className={`px-2 py-1 flex items-center cursor-pointer hover:bg-neutral-800 ${isSelected ? 'bg-neutral-800' : ''}`}
      onClick={onSelect}
    >
      <div className="mr-2">
        {isSelected ? (
          <CheckSquare size={16} className="text-[#4A7CFF]" />
        ) : (
          <Square size={16} className="text-neutral-500" />
        )}
      </div>
      <div className="flex-1 text-sm truncate">
        <span className={isSelected ? "text-white" : "text-neutral-300"}>
          {name}
        </span>
      </div>
      <div className="text-xs text-neutral-500">
        {dimensions}
      </div>
    </div>
  );
};

const FigmaFramesSidebar = ({ onSelectFrame }: FigmaFramesSidebarProps) => {
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [frames, setFrames] = useState<FigmaFrameData[]>([]);
  
  const { initialized, isLoading } = usePluginContext();

  // Request frames from Figma when component mounts
  useEffect(() => {
    if (initialized) {
      // Request frames from the plugin
      getFrames();
      
      // Set up listener for frames response
      const removeListener = onPluginMessage('FRAMES_RESPONSE', (data) => {
        console.log('Received frames from Figma:', data);
        if (data.frames && Array.isArray(data.frames)) {
          setFrames(data.frames);
          
          // Set selected frame ID from response
          const selectedFrame = data.frames.find((frame: FigmaFrameData) => frame.selected);
          if (selectedFrame) {
            setSelectedFrameId(selectedFrame.id);
            onSelectFrame(selectedFrame.id);
          } else if (data.frames.length > 0) {
            // If no frame is selected, select the first one
            setSelectedFrameId(data.frames[0].id);
            onSelectFrame(data.frames[0].id);
          }
        }
      });
      
      return () => {
        removeListener();
      };
    } else {
      // Use mock data when not in Figma
      const mockFrames = [
        { id: 'frame-1', name: 'Banner 300x250', selected: true, width: 300, height: 250 },
        { id: 'frame-2', name: 'Banner 728x90', selected: false, width: 728, height: 90 },
        { id: 'frame-3', name: 'Banner 320x50', selected: false, width: 320, height: 50 },
        { id: 'frame-4', name: 'Banner 160x600', selected: false, width: 160, height: 600 }
      ];
      
      setFrames(mockFrames);
      setSelectedFrameId('frame-1');
      onSelectFrame('frame-1');
    }
  }, [initialized, onSelectFrame]);

  const handleSelectFrame = (frameId: string) => {
    // Early return if already selected
    if (selectedFrameId === frameId) return;
    
    setSelectedFrameId(frameId);
    
    // Notify parent component
    onSelectFrame(frameId);
    
    // Update selection in Figma
    if (initialized) {
      selectFrame(frameId);
      
      // Update local state to reflect new selection
      setFrames(prevFrames => 
        prevFrames.map(frame => ({
          ...frame,
          selected: frame.id === frameId
        }))
      );
    }
  };

  // Toggle sidebar collapsed state
  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  // If collapsed, we show a narrow sidebar with just the collapse/expand button
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
          {frames.map((frame) => (
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
            title="Refresh Frames"
            onClick={() => initialized && getFrames()}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-64 bg-[#111111] border-r border-neutral-800 flex flex-col items-center justify-center">
        <div className="text-sm text-neutral-400">Loading frames...</div>
      </div>
    );
  }

  // Regular expanded sidebar
  return (
    <div className="w-64 bg-[#111111] border-r border-neutral-800 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-300">Frames</h3>
        <div className="flex">
          <button 
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-700 mr-1"
            onClick={toggleCollapsed}
            title="Collapse Sidebar"
          >
            <ChevronLeftSquare size={16} className="text-neutral-400" />
          </button>
          <button 
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-700"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse List" : "Expand List"}
          >
            {isExpanded ? <ChevronDown size={16} className="text-neutral-400" /> : <ChevronRight size={16} className="text-neutral-400" />}
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="flex-1 overflow-y-auto">
          {frames.length === 0 ? (
            <div className="p-4 text-sm text-neutral-500 text-center">
              No frames found. Select frames in Figma to animate.
            </div>
          ) : (
            frames.map((frame) => (
              <FigmaFrame
                key={frame.id}
                id={frame.id}
                name={frame.name}
                dimensions={`${frame.width}×${frame.height}`}
                isSelected={frame.selected}
                onSelect={() => handleSelectFrame(frame.id)}
              />
            ))
          )}
        </div>
      )}
      
      <div className="p-2 border-t border-neutral-800">
        <button 
          className="w-full py-1 text-sm text-[#4A7CFF] rounded hover:bg-neutral-800 flex items-center justify-center"
          onClick={() => initialized && getFrames()}
        >
          <Plus size={16} className="mr-1" />
          Refresh Frames
        </button>
      </div>
    </div>
  );
};

export default FigmaFramesSidebar;