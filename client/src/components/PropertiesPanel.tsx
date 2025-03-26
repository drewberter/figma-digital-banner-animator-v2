import { useState } from 'react';
import { useAnimationContext } from '../context/AnimationContext';
import { AnimationType, EasingType } from '../types/animation';

const PropertiesPanel = () => {
  const { getSelectedLayer, updateLayerAnimation } = useAnimationContext();
  const selectedLayer = getSelectedLayer();
  
  // Default animation values
  const defaultAnimation = {
    type: AnimationType.Fade,
    startTime: 0,
    duration: 1,
    easing: EasingType.EaseInOut,
    opacity: 1
  };
  
  // Get existing animation or use default
  const existingAnimation = selectedLayer?.animations[0] || defaultAnimation;
  
  // State for animation properties
  const [animationType, setAnimationType] = useState<AnimationType>(existingAnimation.type);
  const [startTime, setStartTime] = useState(existingAnimation.startTime || 0);
  const [duration, setDuration] = useState(existingAnimation.duration);
  const [easing, setEasing] = useState<EasingType>(existingAnimation.easing);
  const [opacity, setOpacity] = useState(existingAnimation.opacity || 1);
  const [scale, setScale] = useState(existingAnimation.scale || 1);
  const [rotation, setRotation] = useState(existingAnimation.rotation || 0);

  // Apply animation changes
  const handleApplyAnimation = () => {
    if (!selectedLayer) return;
    
    const animation = {
      type: animationType,
      startTime,
      duration,
      easing,
      opacity: animationType === AnimationType.Fade ? opacity : undefined,
      scale: animationType === AnimationType.Scale ? scale : undefined,
      rotation: animationType === AnimationType.Rotate ? rotation : undefined
    };
    
    updateLayerAnimation(selectedLayer.id, animation);
  };

  return (
    <div className="w-72 bg-[#111111] border-l border-neutral-800 overflow-y-auto">
      <div className="p-4 border-b border-neutral-800">
        <h3 className="text-sm font-medium text-neutral-300">Properties</h3>
      </div>
      
      {!selectedLayer ? (
        <div className="p-4 text-sm text-neutral-400">
          No layer selected. Select a layer to edit properties.
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Layer</label>
            <div className="text-sm text-neutral-200">{selectedLayer.name}</div>
          </div>
          
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Animation Type</label>
            <select
              className="w-full bg-[#191919] text-neutral-200 rounded px-2 py-1 text-sm border border-neutral-700"
              value={animationType}
              onChange={(e) => setAnimationType(e.target.value as AnimationType)}
            >
              {Object.values(AnimationType).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Start Time (s)</label>
              <input
                type="number"
                className="w-full bg-[#191919] text-neutral-200 rounded px-2 py-1 text-sm border border-neutral-700"
                value={startTime}
                onChange={(e) => setStartTime(parseFloat(e.target.value))}
                step={0.1}
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Duration (s)</label>
              <input
                type="number"
                className="w-full bg-[#191919] text-neutral-200 rounded px-2 py-1 text-sm border border-neutral-700"
                value={duration}
                onChange={(e) => setDuration(parseFloat(e.target.value))}
                step={0.1}
                min={0.1}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Easing</label>
            <select
              className="w-full bg-[#191919] text-neutral-200 rounded px-2 py-1 text-sm border border-neutral-700"
              value={easing}
              onChange={(e) => setEasing(e.target.value as EasingType)}
            >
              {Object.values(EasingType).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          {animationType === AnimationType.Fade && (
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Opacity Target (0-1)</label>
              <input
                type="number"
                className="w-full bg-[#191919] text-neutral-200 rounded px-2 py-1 text-sm border border-neutral-700"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                step={0.1}
                min={0}
                max={1}
              />
            </div>
          )}
          
          {animationType === AnimationType.Scale && (
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Scale Target (0-2)</label>
              <input
                type="number"
                className="w-full bg-[#191919] text-neutral-200 rounded px-2 py-1 text-sm border border-neutral-700"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                step={0.1}
                min={0}
                max={2}
              />
            </div>
          )}
          
          {animationType === AnimationType.Rotate && (
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Rotation (degrees)</label>
              <input
                type="number"
                className="w-full bg-[#191919] text-neutral-200 rounded px-2 py-1 text-sm border border-neutral-700"
                value={rotation}
                onChange={(e) => setRotation(parseFloat(e.target.value))}
                step={15}
              />
            </div>
          )}
          
          <button
            className="w-full bg-[#4A7CFF] hover:bg-[#3A6CEE] text-white py-2 rounded text-sm"
            onClick={handleApplyAnimation}
          >
            Apply Animation
          </button>
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;