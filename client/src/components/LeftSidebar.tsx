import { useState } from 'react';
import { useAnimationContext } from '../context/AnimationContext';

interface LeftSidebarProps {
  onOpenPresets: () => void;
}

const LeftSidebar = ({ onOpenPresets }: LeftSidebarProps) => {
  const [activeTab, setActiveTab] = useState<'layers' | 'presets'>('layers');
  const { layers, frames, selectedLayerId, selectLayer, toggleLayerVisibility, toggleLayerLock } = useAnimationContext();

  return (
    <div className="w-56 bg-neutral-800 border-r border-neutral-700 flex flex-col">
      {/* Tabs for Layers and Presets */}
      <div className="flex border-b border-neutral-700">
        <button 
          className={`flex-1 py-2 text-xs font-medium ${activeTab === 'layers' ? 'bg-neutral-700 text-white border-b-2 border-primary' : 'text-neutral-400 hover:text-white'}`}
          onClick={() => setActiveTab('layers')}
        >
          Layers
        </button>
        <button 
          className={`flex-1 py-2 text-xs font-medium ${activeTab === 'presets' ? 'bg-neutral-700 text-white border-b-2 border-primary' : 'text-neutral-400 hover:text-white'}`}
          onClick={onOpenPresets}
        >
          Presets
        </button>
      </div>
      
      {/* Layers Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {layers.map((layer) => (
          <div 
            key={layer.id}
            className={`px-1 py-1 border-b border-neutral-800 hover:bg-neutral-700 cursor-pointer ${selectedLayerId === layer.id ? 'bg-neutral-700' : ''}`}
            onClick={() => selectLayer(layer.id)}
          >
            <div className="flex items-center">
              <div className="w-5 h-5 flex items-center justify-center text-xs">
                <i className={`fas fa-${getLayerIcon(layer.type)} ${selectedLayerId === layer.id ? 'text-blue-400' : 'text-neutral-400'}`}></i>
              </div>
              <div className={`ml-1 text-xs ${selectedLayerId === layer.id ? 'text-white' : 'text-neutral-200'} truncate flex-1`}>
                {layer.name}
              </div>
              <div className="flex items-center">
                <button 
                  className={`w-5 h-5 flex items-center justify-center rounded hover:bg-neutral-600 text-xs ${layer.visible ? (selectedLayerId === layer.id ? 'text-neutral-100' : 'text-neutral-400') : 'text-neutral-600'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerVisibility(layer.id);
                  }}
                >
                  <i className={`fas fa-${layer.visible ? 'eye' : 'eye-slash'}`}></i>
                </button>
                <button 
                  className={`w-5 h-5 flex items-center justify-center rounded hover:bg-neutral-600 text-xs ml-1 ${layer.locked ? 'text-neutral-100' : (selectedLayerId === layer.id ? 'text-neutral-100' : 'text-neutral-400')}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerLock(layer.id);
                  }}
                >
                  <i className={`fas fa-${layer.locked ? 'lock' : 'lock-open'}`}></i>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Frames Section */}
      <div className="border-t border-neutral-700">
        <div className="py-2 px-2 flex justify-between items-center">
          <h3 className="text-xs font-medium">Frames</h3>
          <button className="w-5 h-5 flex items-center justify-center rounded hover:bg-neutral-700 text-neutral-400 text-xs">
            <i className="fas fa-plus"></i>
          </button>
        </div>
        
        <div className="px-2 pb-2 flex space-x-2 overflow-x-auto custom-scrollbar">
          {frames.map((frame, index) => (
            <div 
              key={frame.id}
              className={`w-16 h-16 bg-neutral-700 rounded border ${frame.selected ? 'border-primary' : 'border-neutral-600'} flex items-center justify-center text-xs relative`}
            >
              <span className={`absolute bottom-0 left-0 right-0 ${frame.selected ? 'bg-primary' : 'bg-neutral-600'} text-center text-[10px] py-0.5`}>
                Frame {index + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper function to get the appropriate icon based on layer type
function getLayerIcon(type: string): string {
  switch (type) {
    case 'text':
      return 'font';
    case 'image':
      return 'image';
    case 'vector':
      return 'bezier-curve';
    case 'shape':
      return 'shapes';
    case 'rectangle':
      return 'square';
    default:
      return 'object-group';
  }
}

export default LeftSidebar;
