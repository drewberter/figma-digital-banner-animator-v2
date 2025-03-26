import { useRef, useState, useEffect } from 'react';
import { useAnimationContext } from '../context/AnimationContext';
import { calculateTimeFromPosition, calculatePositionFromTime } from '../utils/timelineUtils';

const Timeline = () => {
  const trackContainerRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [timelineScale, setTimelineScale] = useState(100); // percentage
  
  const { 
    layers, 
    currentTime,
    duration,
    selectedLayerId,
    setCurrentTime,
    addKeyframe,
    deleteKeyframe,
    selectLayer
  } = useAnimationContext();

  // Generate ruler ticks based on duration and scale
  const rulerTicks = Array.from({ length: Math.ceil(duration) * 2 + 1 }, (_, i) => {
    const time = i / 2; // Every 0.5 seconds
    return {
      position: calculatePositionFromTime(time, duration, timelineScale),
      label: time.toFixed(1) + 's'
    };
  });

  // Handle playhead drag
  useEffect(() => {
    if (!trackContainerRef.current || !playheadRef.current) return;
    
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingPlayhead) {
        const trackRect = trackContainerRef.current!.getBoundingClientRect();
        const offsetX = e.clientX - trackRect.left;
        const containerWidth = trackRect.width;
        
        // Constrain to track boundaries
        const boundedOffset = Math.max(0, Math.min(offsetX, containerWidth));
        
        // Calculate time based on position
        const newTime = calculateTimeFromPosition(boundedOffset, containerWidth, duration);
        setCurrentTime(newTime);
      }
    };
    
    const onMouseUp = () => {
      setIsDraggingPlayhead(false);
    };
    
    if (isDraggingPlayhead) {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDraggingPlayhead, duration, setCurrentTime]);

  // Update playhead position based on currentTime
  useEffect(() => {
    if (playheadRef.current && trackContainerRef.current && !isDraggingPlayhead) {
      const containerWidth = trackContainerRef.current.clientWidth;
      const position = calculatePositionFromTime(currentTime, duration, timelineScale);
      playheadRef.current.style.left = `${position}px`;
    }
  }, [currentTime, duration, isDraggingPlayhead, timelineScale]);

  const handleAddKeyframe = () => {
    if (selectedLayerId) {
      addKeyframe(selectedLayerId, currentTime);
    }
  };

  const handleDeleteKeyframe = () => {
    if (selectedLayerId) {
      deleteKeyframe(selectedLayerId, currentTime);
    }
  };

  const handleTimelineScaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimelineScale(parseInt(e.target.value));
  };

  const handlePlayheadMouseDown = () => {
    setIsDraggingPlayhead(true);
  };

  return (
    <div className="h-64 border-t border-neutral-700 flex flex-col bg-neutral-800">
      {/* Timeline Controls */}
      <div className="border-b border-neutral-700 p-1 flex items-center space-x-2">
        <button 
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-700 text-neutral-300" 
          title="Add Keyframe"
          onClick={handleAddKeyframe}
        >
          <i className="fas fa-plus text-xs"></i>
        </button>
        <button 
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-700 text-neutral-300" 
          title="Delete Keyframe"
          onClick={handleDeleteKeyframe}
        >
          <i className="fas fa-minus text-xs"></i>
        </button>
        <span className="border-r border-neutral-700 h-4 mx-1"></span>
        <select 
          className="bg-neutral-800 border border-neutral-700 rounded text-xs p-1"
          value={timelineScale.toString()}
          onChange={handleTimelineScaleChange}
        >
          <option value="50">50%</option>
          <option value="100">100%</option>
          <option value="150">150%</option>
          <option value="200">200%</option>
        </select>
        <span className="border-r border-neutral-700 h-4 mx-1"></span>
        <button className="px-2 py-1 text-xs rounded hover:bg-neutral-700 text-neutral-300 flex items-center" title="Auto Keyframe">
          <i className="fas fa-magic text-xs mr-1"></i> Auto
        </button>
        <div className="ml-auto text-xs text-neutral-400">Duration: {duration.toFixed(1)}s</div>
      </div>
      
      {/* Timeline Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Layer Names Column */}
        <div className="w-56 border-r border-neutral-700 bg-neutral-800 overflow-y-auto custom-scrollbar" style={{ flexShrink: 0 }}>
          <div className="timeline-track flex items-center pl-2">
            <div className="flex-1"></div>
          </div>
          {layers.map(layer => (
            <div 
              key={layer.id}
              className={`timeline-track flex items-center px-2 ${selectedLayerId === layer.id ? 'bg-neutral-700' : ''}`}
              onClick={() => selectLayer(layer.id)}
            >
              <div className={`text-xs ${selectedLayerId === layer.id ? 'text-white' : 'text-neutral-300'} truncate`}>
                {layer.name}
              </div>
            </div>
          ))}
        </div>
        
        {/* Timeline Tracks */}
        <div 
          ref={trackContainerRef}
          className="flex-1 overflow-x-auto custom-scrollbar relative"
        >
          {/* Ruler */}
          <div className="timeline-ruler">
            {rulerTicks.map((tick, index) => (
              <div key={index} className="ruler-tick" style={{ left: `${tick.position}px` }}>
                <div className="ruler-tick-label">{tick.label}</div>
              </div>
            ))}
          </div>
          
          {/* Playhead */}
          <div 
            ref={playheadRef}
            className="playhead" 
            style={{ left: `${calculatePositionFromTime(currentTime, duration, timelineScale)}px` }}
            onMouseDown={handlePlayheadMouseDown}
          ></div>
          
          {/* Tracks */}
          <div className="timeline-track"></div>
          {layers.map(layer => (
            <div 
              key={layer.id}
              className={`timeline-track relative ${selectedLayerId === layer.id ? 'bg-neutral-700' : ''}`}
            >
              {/* Animation Segments */}
              {layer.animations.map((anim, animIndex) => (
                <div 
                  key={animIndex}
                  className="absolute top-0 left-0 h-full bg-primary bg-opacity-20"
                  style={{ 
                    width: `${calculatePositionFromTime(anim.duration, duration, timelineScale)}px`,
                    left: `${calculatePositionFromTime(anim.startTime, duration, timelineScale)}px`
                  }}
                ></div>
              ))}
              
              {/* Keyframes */}
              {layer.keyframes.map((keyframe, kfIndex) => (
                <div 
                  key={kfIndex}
                  className="keyframe"
                  style={{ 
                    left: `${calculatePositionFromTime(keyframe.time, duration, timelineScale)}px`,
                    backgroundColor: selectedLayerId === layer.id ? '#FF8C00' : '#0078D4' 
                  }}
                ></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
