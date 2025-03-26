import { useState } from 'react';
import { useAnimationContext } from '../context/AnimationContext';
import { usePresets } from '../hooks/usePresets';

interface PresetsPanelProps {
  onClose: () => void;
}

type PresetCategory = 'all' | 'entrance' | 'exit' | 'emphasis' | 'path' | 'text' | 'custom';

const PresetsPanel = ({ onClose }: PresetsPanelProps) => {
  const [activeCategory, setActiveCategory] = useState<PresetCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { presets, applyPreset } = usePresets();
  const { selectedLayerId } = useAnimationContext();

  // Filter presets based on active category and search query
  const filteredPresets = presets.filter(preset => {
    // Filter by category
    if (activeCategory !== 'all' && preset.category !== activeCategory) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery && !preset.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const handleApplyPreset = (presetId: string) => {
    if (selectedLayerId) {
      applyPreset(selectedLayerId, presetId);
      onClose();
    } else {
      alert('Please select a layer to apply the preset to');
    }
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full bg-neutral-900 flex flex-col z-10">
      <div className="bg-neutral-800 border-b border-neutral-700 p-3 flex items-center justify-between">
        <h2 className="font-medium">Animation Presets</h2>
        <button 
          className="text-neutral-400 hover:text-white"
          onClick={onClose}
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        {/* Categories */}
        <div className="mb-4">
          <div className="flex space-x-2 overflow-x-auto pb-2 custom-scrollbar">
            <button 
              className={`px-3 py-1 text-xs ${activeCategory === 'all' ? 'bg-primary' : 'bg-neutral-800 hover:bg-neutral-700'} rounded-full ${activeCategory === 'all' ? 'text-white' : 'text-neutral-300'} whitespace-nowrap`}
              onClick={() => setActiveCategory('all')}
            >
              All Presets
            </button>
            <button 
              className={`px-3 py-1 text-xs ${activeCategory === 'entrance' ? 'bg-primary' : 'bg-neutral-800 hover:bg-neutral-700'} rounded-full ${activeCategory === 'entrance' ? 'text-white' : 'text-neutral-300'} whitespace-nowrap`}
              onClick={() => setActiveCategory('entrance')}
            >
              Entrance
            </button>
            <button 
              className={`px-3 py-1 text-xs ${activeCategory === 'exit' ? 'bg-primary' : 'bg-neutral-800 hover:bg-neutral-700'} rounded-full ${activeCategory === 'exit' ? 'text-white' : 'text-neutral-300'} whitespace-nowrap`}
              onClick={() => setActiveCategory('exit')}
            >
              Exit
            </button>
            <button 
              className={`px-3 py-1 text-xs ${activeCategory === 'emphasis' ? 'bg-primary' : 'bg-neutral-800 hover:bg-neutral-700'} rounded-full ${activeCategory === 'emphasis' ? 'text-white' : 'text-neutral-300'} whitespace-nowrap`}
              onClick={() => setActiveCategory('emphasis')}
            >
              Emphasis
            </button>
            <button 
              className={`px-3 py-1 text-xs ${activeCategory === 'path' ? 'bg-primary' : 'bg-neutral-800 hover:bg-neutral-700'} rounded-full ${activeCategory === 'path' ? 'text-white' : 'text-neutral-300'} whitespace-nowrap`}
              onClick={() => setActiveCategory('path')}
            >
              Path Based
            </button>
            <button 
              className={`px-3 py-1 text-xs ${activeCategory === 'text' ? 'bg-primary' : 'bg-neutral-800 hover:bg-neutral-700'} rounded-full ${activeCategory === 'text' ? 'text-white' : 'text-neutral-300'} whitespace-nowrap`}
              onClick={() => setActiveCategory('text')}
            >
              Text
            </button>
            <button 
              className={`px-3 py-1 text-xs ${activeCategory === 'custom' ? 'bg-primary' : 'bg-neutral-800 hover:bg-neutral-700'} rounded-full ${activeCategory === 'custom' ? 'text-white' : 'text-neutral-300'} whitespace-nowrap`}
              onClick={() => setActiveCategory('custom')}
            >
              Custom
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <input 
              type="text" 
              className="w-full bg-neutral-800 border border-neutral-700 rounded pl-8 pr-3 py-2 text-sm" 
              placeholder="Search presets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute left-2.5 top-2.5 text-neutral-500">
              <i className="fas fa-search text-xs"></i>
            </div>
          </div>
        </div>
        
        {/* Preset Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPresets.map((preset) => (
            <div 
              key={preset.id}
              className="bg-neutral-800 border border-neutral-700 rounded overflow-hidden hover:border-primary cursor-pointer"
              onClick={() => handleApplyPreset(preset.id)}
            >
              <div className="h-24 bg-neutral-700 flex items-center justify-center">
                {/* Animation Preview SVG Icon */}
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {preset.icon}
                </svg>
              </div>
              <div className="p-2">
                <div className="text-xs font-medium">{preset.name}</div>
                <div className="text-xs text-neutral-400">{getCategoryName(preset.category)}</div>
              </div>
            </div>
          ))}

          {filteredPresets.length === 0 && (
            <div className="col-span-4 flex items-center justify-center py-8">
              <p className="text-neutral-400 text-sm">No presets found matching your criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to get user-friendly category names
function getCategoryName(category: string): string {
  switch (category) {
    case 'entrance': return 'Entrance';
    case 'exit': return 'Exit';
    case 'emphasis': return 'Emphasis';
    case 'path': return 'Path Based';
    case 'text': return 'Text';
    case 'custom': return 'Custom';
    default: return 'General';
  }
}

export default PresetsPanel;
