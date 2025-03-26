import { useState } from 'react';
import { Plus, File, ChevronDown, ChevronRight, CheckSquare, Square } from 'lucide-react';

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
  const [selectedFrameId, setSelectedFrameId] = useState<string>('frame-1');
  const [isExpanded, setIsExpanded] = useState(true);

  // Sample frames data
  const frames = [
    { id: 'frame-1', name: 'Banner 300x250', dimensions: '300×250' },
    { id: 'frame-2', name: 'Banner 728x90', dimensions: '728×90' },
    { id: 'frame-3', name: 'Banner 320x50', dimensions: '320×50' },
    { id: 'frame-4', name: 'Banner 160x600', dimensions: '160×600' }
  ];

  const handleSelectFrame = (frameId: string) => {
    setSelectedFrameId(frameId);
    onSelectFrame(frameId);
  };

  return (
    <div className="w-64 bg-[#111111] border-r border-neutral-800 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-300">Frames</h3>
        <button 
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-700"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronDown size={16} className="text-neutral-400" /> : <ChevronRight size={16} className="text-neutral-400" />}
        </button>
      </div>
      
      {isExpanded && (
        <div className="flex-1 overflow-y-auto">
          {frames.map((frame) => (
            <FigmaFrame
              key={frame.id}
              id={frame.id}
              name={frame.name}
              dimensions={frame.dimensions}
              isSelected={selectedFrameId === frame.id}
              onSelect={() => handleSelectFrame(frame.id)}
            />
          ))}
        </div>
      )}
      
      <div className="p-2 border-t border-neutral-800">
        <button className="w-full py-1 text-sm text-[#4A7CFF] rounded hover:bg-neutral-800 flex items-center justify-center">
          <Plus size={16} className="mr-1" />
          Add Frame
        </button>
      </div>
    </div>
  );
};

export default FigmaFramesSidebar;