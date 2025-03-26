import { useState, useEffect } from 'react';
import { ChevronLeftSquare, ChevronRightSquare, Clock, Zap, Palette } from 'lucide-react';
import { AnimationType, EasingType } from '../types/animation';
import { useAnimationContext } from '../context/AnimationContext';

const PropertiesPanel = () => {
  const { getSelectedLayer, updateLayerAnimation } = useAnimationContext();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const [animation, setAnimation] = useState<{
    type: AnimationType,
    startTime: number,
    duration: number,
    easing: EasingType,
    opacity: number,
    scale?: number,
    rotation?: number
  }>({
    type: AnimationType.Fade,
    startTime: 0,
    duration: 1,
    easing: EasingType.EaseInOut,
    opacity: 1
  });
  
  // Get selected layer's animation data
  useEffect(() => {
    const selectedLayer = getSelectedLayer();
    if (selectedLayer && selectedLayer.animations.length > 0) {
      setAnimation({
        ...selectedLayer.animations[0],
        scale: selectedLayer.animations[0].scale || 1,
        rotation: selectedLayer.animations[0].rotation || 0
      });
    }
  }, [getSelectedLayer]);
  
  // Update animation
  const handleChange = (key: string, value: any) => {
    const newAnimation = { ...animation, [key]: value };
    setAnimation(newAnimation);
    
    const selectedLayer = getSelectedLayer();
    if (selectedLayer) {
      updateLayerAnimation(selectedLayer.id, newAnimation);
    }
  };
  
  // Toggle collapsed state
  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  // If collapsed, show just a narrow panel with the expand button
  if (isCollapsed) {
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
        <div className="mb-4">
          <label className="block text-xs text-neutral-400 mb-1">Animation Type</label>
          <select
            className="w-full bg-[#191919] text-neutral-200 rounded px-2 py-1.5 text-sm border border-neutral-700"
            value={animation.type}
            onChange={(e) => handleChange('type', e.target.value)}
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
            onChange={(e) => handleChange('easing', e.target.value)}
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
              <span className="text-neutral-300">{animation.scale?.toFixed(2)}</span>
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
      </div>
    </div>
  );
};

export default PropertiesPanel;