import { useState, useEffect } from 'react';
import { useAnimationContext } from '../context/AnimationContext';
import { AnimationType, EasingType } from '../types/animation';

const PropertiesPanel = () => {
  const { 
    selectedLayerId, 
    getSelectedLayer, 
    updateLayerAnimation 
  } = useAnimationContext();
  
  const [animationType, setAnimationType] = useState<AnimationType>(AnimationType.None);
  const [direction, setDirection] = useState<string>('right');
  const [easing, setEasing] = useState<EasingType>(EasingType.EaseOut);
  const [duration, setDuration] = useState<number>(1.0);
  const [delay, setDelay] = useState<number>(0.2);
  const [positionOverride, setPositionOverride] = useState<boolean>(true);
  const [positionX, setPositionX] = useState<number>(20);
  const [positionY, setPositionY] = useState<number>(0);
  const [opacity, setOpacity] = useState<number>(100);
  
  const selectedLayer = getSelectedLayer();

  // When selected layer changes, update form values
  useEffect(() => {
    if (selectedLayer && selectedLayer.animations.length > 0) {
      const animation = selectedLayer.animations[0]; // Get first animation for now
      setAnimationType(animation.type);
      setDirection(animation.direction || 'right');
      setEasing(animation.easing);
      setDuration(animation.duration);
      setDelay(animation.delay);
      setPositionOverride(animation.positionOverride || false);
      setPositionX(animation.position?.x || 0);
      setPositionY(animation.position?.y || 0);
      setOpacity(animation.opacity || 100);
    } else {
      // Default values
      setAnimationType(AnimationType.None);
      setDirection('right');
      setEasing(EasingType.EaseOut);
      setDuration(1.0);
      setDelay(0.2);
      setPositionOverride(false);
      setPositionX(0);
      setPositionY(0);
      setOpacity(100);
    }
  }, [selectedLayer]);

  const handleApplyChanges = () => {
    if (selectedLayerId) {
      updateLayerAnimation(selectedLayerId, {
        type: animationType,
        direction,
        easing,
        duration,
        delay,
        positionOverride,
        position: { x: positionX, y: positionY },
        opacity
      });
    }
  };

  const handleSavePreset = () => {
    // TODO: Implement save preset functionality
    console.log('Save preset');
  };

  // Render nothing if no layer is selected
  if (!selectedLayer) {
    return (
      <div className="w-64 bg-neutral-800 border-l border-neutral-700 flex flex-col" style={{ flexShrink: 0 }}>
        <div className="border-b border-neutral-700 p-2">
          <h2 className="text-sm font-medium">Animation Properties</h2>
          <div className="text-xs text-neutral-400">No layer selected</div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-neutral-400">Select a layer to edit its animation properties</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-neutral-800 border-l border-neutral-700 flex flex-col" style={{ flexShrink: 0 }}>
      <div className="border-b border-neutral-700 p-2">
        <h2 className="text-sm font-medium">Animation Properties</h2>
        <div className="text-xs text-neutral-400">{selectedLayer.name}</div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {/* Animation Type */}
        <div>
          <label className="block text-xs font-medium mb-1">Animation Type</label>
          <select 
            className="w-full bg-neutral-700 border border-neutral-600 rounded text-xs p-1.5"
            value={animationType}
            onChange={(e) => setAnimationType(e.target.value as AnimationType)}
          >
            <option value={AnimationType.None}>None</option>
            <option value={AnimationType.Fade}>Fade</option>
            <option value={AnimationType.Slide}>Slide</option>
            <option value={AnimationType.Scale}>Scale</option>
            <option value={AnimationType.Rotate}>Rotate</option>
            <option value={AnimationType.Bounce}>Bounce</option>
            <option value={AnimationType.Pulse}>Pulse</option>
            <option value={AnimationType.Custom}>Custom</option>
          </select>
        </div>
        
        {/* Direction (only show for relevant animation types) */}
        {(animationType === AnimationType.Slide) && (
          <div>
            <label className="block text-xs font-medium mb-1">Direction</label>
            <div className="grid grid-cols-3 gap-1">
              <button 
                className={`${direction === 'up' ? 'bg-primary border-primary' : 'bg-neutral-700 hover:bg-neutral-600 border-neutral-600'} border rounded p-1 flex items-center justify-center`}
                onClick={() => setDirection('up')}
              >
                <i className="fas fa-arrow-up text-xs"></i>
              </button>
              <button 
                className={`${direction === 'right' ? 'bg-primary border-primary' : 'bg-neutral-700 hover:bg-neutral-600 border-neutral-600'} border rounded p-1 flex items-center justify-center`}
                onClick={() => setDirection('right')}
              >
                <i className="fas fa-arrow-right text-xs"></i>
              </button>
              <button 
                className={`${direction === 'down' ? 'bg-primary border-primary' : 'bg-neutral-700 hover:bg-neutral-600 border-neutral-600'} border rounded p-1 flex items-center justify-center`}
                onClick={() => setDirection('down')}
              >
                <i className="fas fa-arrow-down text-xs"></i>
              </button>
              <button 
                className={`${direction === 'left' ? 'bg-primary border-primary' : 'bg-neutral-700 hover:bg-neutral-600 border-neutral-600'} border rounded p-1 flex items-center justify-center`}
                onClick={() => setDirection('left')}
              >
                <i className="fas fa-arrow-left text-xs"></i>
              </button>
            </div>
          </div>
        )}
        
        {/* Easing */}
        <div>
          <label className="block text-xs font-medium mb-1">Easing</label>
          <select 
            className="w-full bg-neutral-700 border border-neutral-600 rounded text-xs p-1.5"
            value={easing}
            onChange={(e) => setEasing(e.target.value as EasingType)}
          >
            <option value={EasingType.Linear}>Linear</option>
            <option value={EasingType.EaseOut}>Ease Out</option>
            <option value={EasingType.EaseIn}>Ease In</option>
            <option value={EasingType.EaseInOut}>Ease In Out</option>
            <option value={EasingType.Bounce}>Bounce</option>
            <option value={EasingType.Custom}>Custom...</option>
          </select>
        </div>
        
        {/* Duration */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="block text-xs font-medium">Duration</label>
            <span className="text-xs text-neutral-300">{duration.toFixed(1)}s</span>
          </div>
          <input 
            type="range" 
            className="w-full bg-neutral-700 rounded-lg appearance-none h-2"
            min="0" 
            max="5" 
            step="0.1" 
            value={duration}
            onChange={(e) => setDuration(parseFloat(e.target.value))}
          />
        </div>
        
        {/* Delay */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="block text-xs font-medium">Delay</label>
            <span className="text-xs text-neutral-300">{delay.toFixed(1)}s</span>
          </div>
          <input 
            type="range" 
            className="w-full bg-neutral-700 rounded-lg appearance-none h-2" 
            min="0" 
            max="5" 
            step="0.1" 
            value={delay}
            onChange={(e) => setDelay(parseFloat(e.target.value))}
          />
        </div>
        
        {/* Position Override */}
        <div>
          <div className="flex items-center mb-1">
            <label className="block text-xs font-medium">Position Override</label>
            <div className="ml-auto">
              <input 
                type="checkbox" 
                className="h-3 w-3" 
                checked={positionOverride}
                onChange={(e) => setPositionOverride(e.target.checked)}
              />
            </div>
          </div>
          {positionOverride && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs mb-1">X</label>
                <input 
                  type="number" 
                  className="w-full bg-neutral-700 border border-neutral-600 rounded text-xs p-1" 
                  value={positionX} 
                  onChange={(e) => setPositionX(parseInt(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">Y</label>
                <input 
                  type="number" 
                  className="w-full bg-neutral-700 border border-neutral-600 rounded text-xs p-1" 
                  value={positionY}
                  onChange={(e) => setPositionY(parseInt(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Opacity */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="block text-xs font-medium">Opacity</label>
            <span className="text-xs text-neutral-300">{opacity}%</span>
          </div>
          <input 
            type="range" 
            className="w-full bg-neutral-700 rounded-lg appearance-none h-2" 
            min="0" 
            max="100" 
            value={opacity}
            onChange={(e) => setOpacity(parseInt(e.target.value))}
          />
        </div>
      </div>
      
      {/* Preset Buttons */}
      <div className="border-t border-neutral-700 p-2">
        <div className="flex items-center space-x-2">
          <button 
            className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white text-xs py-1.5 rounded"
            onClick={handleSavePreset}
          >
            Save Preset
          </button>
          <button 
            className="flex-1 bg-accent hover:bg-orange-600 text-white text-xs py-1.5 rounded"
            onClick={handleApplyChanges}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;
