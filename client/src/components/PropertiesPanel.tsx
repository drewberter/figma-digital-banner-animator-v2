import { useState } from 'react';
import { ChevronLeftSquare, ChevronRightSquare, Clock, Zap, Palette, LogIn, LogOut } from 'lucide-react';
import { AnimationType, EasingType, AnimationMode } from '../types/animation';

interface PropertiesPanelProps {
  isInSidebar?: boolean;
}

const PropertiesPanel = ({ isInSidebar = false }: PropertiesPanelProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Define a local interface for the animation state
  interface AnimationState {
    type: AnimationType;
    mode: AnimationMode;
    startTime: number;
    duration: number;
    easing: EasingType;
    opacity: number;
    scale: number;
    rotation: number;
  }
  
  // Local state for the animation properties
  const [animation, setAnimation] = useState<AnimationState>({
    type: AnimationType.Fade,
    mode: AnimationMode.Entrance,
    startTime: 0,
    duration: 1,
    easing: EasingType.EaseInOut,
    opacity: 1,
    scale: 1,
    rotation: 0
  });
  
  // Update animation properties
  const handleChange = (key: string, value: any) => {
    const newAnimation = { ...animation, [key]: value };
    setAnimation(newAnimation);
    console.log('Properties Panel: Animation updated', newAnimation);
  };
  
  // Toggle collapsed state
  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  // Animation properties content - shared between sidebar and panel
  const renderAnimationProperties = () => (
    <>
      {/* Animation Mode Toggle */}
      <div className="mb-4">
        <label className="block text-xs text-neutral-400 mb-1">Animation Mode</label>
        <div className="flex bg-[#191919] rounded border border-neutral-700 overflow-hidden">
          <button
            className={`flex-1 py-1.5 text-sm flex items-center justify-center
              ${animation.mode !== AnimationMode.Exit ? 'bg-blue-600 text-white' : 'text-neutral-300'}`}
            onClick={() => handleChange('mode', AnimationMode.Entrance)}
          >
            <LogIn size={14} className="mr-1" />
            Entrance
          </button>
          <button
            className={`flex-1 py-1.5 text-sm flex items-center justify-center
              ${animation.mode === AnimationMode.Exit ? 'bg-red-600 text-white' : 'text-neutral-300'}`}
            onClick={() => handleChange('mode', AnimationMode.Exit)}
          >
            <LogOut size={14} className="mr-1" />
            Exit
          </button>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-xs text-neutral-400 mb-1">Animation Type</label>
        <select
          className="w-full bg-[#191919] text-neutral-200 rounded px-2 py-1.5 text-sm border border-neutral-700"
          value={animation.type}
          onChange={(e) => handleChange('type', e.target.value as AnimationType)}
        >
          {Object.values(AnimationType).map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>
      
      <div className="mb-4">
        <label className="block text-xs text-neutral-400 mb-1">Start Time (s)</label>
        <input
          type="number"
          className="w-full bg-[#191919] text-neutral-200 rounded px-2 py-1.5 text-sm border border-neutral-700"
          value={animation.startTime}
          min={0}
          step={0.1}
          onChange={(e) => handleChange('startTime', parseFloat(e.target.value))}
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-xs text-neutral-400 mb-1">Duration (s)</label>
        <input
          type="number"
          className="w-full bg-[#191919] text-neutral-200 rounded px-2 py-1.5 text-sm border border-neutral-700"
          value={animation.duration}
          min={0.1}
          step={0.1}
          onChange={(e) => handleChange('duration', parseFloat(e.target.value))}
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-xs text-neutral-400 mb-1">Easing</label>
        <select
          className="w-full bg-[#191919] text-neutral-200 rounded px-2 py-1.5 text-sm border border-neutral-700"
          value={animation.easing}
          onChange={(e) => handleChange('easing', e.target.value as EasingType)}
        >
          {Object.values(EasingType).map(easing => (
            <option key={easing} value={easing}>{easing}</option>
          ))}
        </select>
      </div>
      
      {(animation.type === AnimationType.Fade) && (
        <div className="mb-4">
          <label className="block text-xs text-neutral-400 mb-1">Opacity (0-1)</label>
          <input
            type="range"
            className="w-full"
            min="0"
            max="1"
            step="0.01"
            value={animation.opacity}
            onChange={(e) => handleChange('opacity', parseFloat(e.target.value))}
          />
          <div className="flex justify-between text-xs text-neutral-500">
            <span>0</span>
            <span className="text-neutral-300">{animation.opacity.toFixed(2)}</span>
            <span>1</span>
          </div>
        </div>
      )}
      
      {(animation.type === AnimationType.Scale) && (
        <div className="mb-4">
          <label className="block text-xs text-neutral-400 mb-1">Scale (0-2)</label>
          <input
            type="range"
            className="w-full"
            min="0"
            max="2"
            step="0.01"
            value={animation.scale}
            onChange={(e) => handleChange('scale', parseFloat(e.target.value))}
          />
          <div className="flex justify-between text-xs text-neutral-500">
            <span>0</span>
            <span className="text-neutral-300">{animation.scale.toFixed(2)}</span>
            <span>2</span>
          </div>
        </div>
      )}
      
      {(animation.type === AnimationType.Rotate) && (
        <div className="mb-4">
          <label className="block text-xs text-neutral-400 mb-1">Rotation (degrees)</label>
          <input
            type="range"
            className="w-full"
            min="0"
            max="360"
            step="1"
            value={animation.rotation}
            onChange={(e) => handleChange('rotation', parseInt(e.target.value))}
          />
          <div className="flex justify-between text-xs text-neutral-500">
            <span>0°</span>
            <span className="text-neutral-300">{animation.rotation}°</span>
            <span>360°</span>
          </div>
        </div>
      )}
      
      {/* Developer Info Section */}
      <div className="mt-6 pt-4 border-t border-neutral-800">
        <div className="text-xs text-neutral-500">
          <p className="mb-1">Note: Properties Panel is currently in development mode.</p>
          <p className="mb-1">Changes are tracked but not connected to the timeline yet.</p>
        </div>
      </div>
    </>
  );
  
  // If collapsed, show just a narrow panel with the expand button
  if (isCollapsed && !isInSidebar) {
    return (
      <div className="w-10 bg-[#111111] border-l border-neutral-800 flex flex-col items-center">
        <div className="p-2 border-b border-neutral-800 w-full flex justify-center">
          <button 
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-700"
            onClick={toggleCollapsed}
            title="Expand Properties Panel"
          >
            <ChevronLeftSquare size={16} className="text-neutral-400" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center pt-2">
          <div className="w-6 h-6 mb-2 rounded-sm flex items-center justify-center bg-neutral-800">
            <Clock size={14} className="text-neutral-400" />
          </div>
          <div className="w-6 h-6 mb-2 rounded-sm flex items-center justify-center bg-neutral-800">
            <Zap size={14} className="text-neutral-400" />
          </div>
          <div className="w-6 h-6 mb-2 rounded-sm flex items-center justify-center bg-neutral-800">
            <Palette size={14} className="text-neutral-400" />
          </div>
        </div>
      </div>
    );
  }
  
  // When displayed in sidebar, don't show border or header with collapse button
  if (isInSidebar) {
    return (
      <div className="w-full bg-[#111111] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-2">
          {renderAnimationProperties()}
        </div>
      </div>
    );
  }
  
  // Regular standalone panel
  return (
    <div className="w-64 bg-[#111111] border-l border-neutral-800 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-300">Properties</h3>
        <button 
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-700"
          onClick={toggleCollapsed}
          title="Collapse Properties Panel"
        >
          <ChevronRightSquare size={16} className="text-neutral-400" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3">
        {renderAnimationProperties()}
      </div>
    </div>
  );
};

export default PropertiesPanel;