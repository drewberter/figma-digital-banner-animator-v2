import { useState } from 'react';
import { X, Search, FolderOpen, Save, Sparkles } from 'lucide-react';
import { AnimationType, EasingType, Animation } from '../types/animation';
import { useAnimationContext } from '../context/AnimationContext';

interface PresetsPanelProps {
  onClose: () => void;
}

// Preset animation data
const presets = [
  {
    id: 'fade-in',
    name: 'Fade In',
    category: 'entrance',
    animation: {
      type: AnimationType.Fade,
      startTime: 0,
      duration: 1,
      easing: EasingType.EaseInOut,
      opacity: 1
    },
    icon: 'M4 15V9h8V1h8v8h8v8h-8v8h-8v-8H4z'
  },
  {
    id: 'scale-up',
    name: 'Scale Up',
    category: 'entrance',
    animation: {
      type: AnimationType.Scale,
      startTime: 0,
      duration: 1,
      easing: EasingType.EaseOut,
      scale: 1.5
    },
    icon: 'M7 17L17 7M7 7h10v10'
  },
  {
    id: 'rotate-in',
    name: 'Rotate In',
    category: 'entrance',
    animation: {
      type: AnimationType.Rotate,
      startTime: 0,
      duration: 1,
      easing: EasingType.EaseOut,
      rotation: 360
    },
    icon: 'M12 3v2m0 14v2M5.63 6.34l1.41 1.41m9.9 9.9l1.41 1.41M3 12h2m14 0h2M6.34 18.37l1.41-1.41m9.9-9.9l1.41-1.41'
  },
  {
    id: 'bounce',
    name: 'Bounce',
    category: 'emphasis',
    animation: {
      type: AnimationType.Bounce,
      startTime: 0,
      duration: 1,
      easing: EasingType.Bounce
    },
    icon: 'M7 6L17 6M12 6v12M7 18L17 18'
  },
  {
    id: 'pulse',
    name: 'Pulse',
    category: 'emphasis',
    animation: {
      type: AnimationType.Pulse,
      startTime: 0,
      duration: 1,
      easing: EasingType.EaseInOut
    },
    icon: 'M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z'
  },
  {
    id: 'fade-out',
    name: 'Fade Out',
    category: 'exit',
    animation: {
      type: AnimationType.Fade,
      startTime: 0,
      duration: 1,
      easing: EasingType.EaseInOut,
      opacity: 0
    },
    icon: 'M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z'
  }
];

const PresetsPanel = ({ onClose }: PresetsPanelProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  
  const { getSelectedLayer, updateLayerAnimation } = useAnimationContext();
  
  // Filter presets by search term and category
  const filteredPresets = presets.filter(preset => {
    const matchesSearch = preset.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || preset.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  // Apply a preset to the selected layer
  const applyPreset = (animation: Animation) => {
    const selectedLayer = getSelectedLayer();
    if (selectedLayer) {
      updateLayerAnimation(selectedLayer.id, { ...animation });
    }
  };
  
  // Save current animation as preset
  const saveAsPreset = () => {
    if (!presetName.trim()) return;
    
    // In a real app, this would save to storage
    console.log(`Saved preset: ${presetName}`);
    
    // Close save form
    setSavingPreset(false);
    setPresetName('');
  };
  
  // Category names for display
  const categories = [
    { id: 'all', name: 'All Presets' },
    { id: 'entrance', name: 'Entrance' },
    { id: 'exit', name: 'Exit' },
    { id: 'emphasis', name: 'Emphasis' },
    { id: 'custom', name: 'Custom' }
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
      <div className="bg-[#111111] rounded-lg w-[600px] max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Animation Presets</h2>
          <button 
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-800"
            onClick={onClose}
          >
            <X size={18} className="text-neutral-400" />
          </button>
        </div>
        
        <div className="p-4 border-b border-neutral-800 flex space-x-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search presets..."
              className="w-full bg-[#191919] text-neutral-200 rounded pl-9 pr-3 py-2 text-sm border border-neutral-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            className="bg-[#4A7CFF] hover:bg-[#3A6CEE] text-white rounded px-3 py-2 text-sm flex items-center"
            onClick={() => setSavingPreset(true)}
          >
            <Save size={16} className="mr-2" />
            Save Preset
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden flex">
          <div className="w-40 border-r border-neutral-800 p-3 overflow-y-auto">
            {categories.map((category) => (
              <div 
                key={category.id}
                className={`mb-1 px-3 py-2 rounded text-sm cursor-pointer ${selectedCategory === category.id ? 'bg-[#4A7CFF] text-white' : 'text-neutral-300 hover:bg-neutral-800'}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </div>
            ))}
          </div>
          
          <div className="flex-1 p-3 overflow-y-auto">
            {filteredPresets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-400 text-sm">
                <FolderOpen size={24} className="mb-2" />
                <p>No presets found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredPresets.map((preset) => (
                  <div 
                    key={preset.id}
                    className="bg-[#191919] rounded border border-neutral-700 overflow-hidden cursor-pointer hover:border-[#4A7CFF] transition-colors"
                    onClick={() => applyPreset(preset.animation)}
                  >
                    <div className="h-20 bg-[#2A2A2A] flex items-center justify-center p-4">
                      <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#4A7CFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d={preset.icon} />
                      </svg>
                    </div>
                    <div className="p-3">
                      <div className="text-sm font-medium text-neutral-200">{preset.name}</div>
                      <div className="text-xs text-neutral-400 mt-1">{preset.animation.type} • {preset.animation.duration}s</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {savingPreset && (
          <div className="p-4 border-t border-neutral-800">
            <div className="flex items-center space-x-2 mb-3">
              <Sparkles size={16} className="text-[#4A7CFF]" />
              <h3 className="text-sm font-medium text-white">Save Current Animation as Preset</h3>
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Preset name..."
                className="flex-1 bg-[#191919] text-neutral-200 rounded px-3 py-2 text-sm border border-neutral-700"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
              <button 
                className="bg-[#4A7CFF] hover:bg-[#3A6CEE] text-white rounded px-4 py-2 text-sm"
                onClick={saveAsPreset}
              >
                Save
              </button>
              <button 
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded px-4 py-2 text-sm"
                onClick={() => setSavingPreset(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PresetsPanel;