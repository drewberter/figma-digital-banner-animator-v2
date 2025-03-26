import { useState, useRef, useEffect } from 'react';
import { useAnimationContext } from '../context/AnimationContext';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';

const Timeline = () => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [selectedKeyframeTime, setSelectedKeyframeTime] = useState<number | null>(null);

  const { 
    currentTime, 
    setCurrentTime, 
    duration, 
    isPlaying, 
    togglePlayback, 
    getSelectedLayer,
    addKeyframe,
    deleteKeyframe
  } = useAnimationContext();

  // Calculate playhead position from current time
  const getPlayheadPosition = (time: number) => {
    if (!timelineRef.current) return 0;
    const timelineWidth = timelineRef.current.clientWidth - 12; // Accounting for padding
    return (time / duration) * timelineWidth;
  };

  // Calculate time from position
  const getTimeFromPosition = (position: number) => {
    if (!timelineRef.current) return 0;
    const timelineWidth = timelineRef.current.clientWidth - 12; // Accounting for padding
    return Math.max(0, Math.min(duration, (position / timelineWidth) * duration));
  };

  // Generate time markers
  const generateTimeMarkers = () => {
    const markers = [];
    const interval = duration <= 5 ? 0.5 : 1; // Every half second for shorter durations
    
    for (let i = 0; i <= duration; i += interval) {
      const position = getPlayheadPosition(i);
      const isFullSecond = i % 1 === 0;
      
      markers.push(
        <div 
          key={i} 
          className={`absolute h-${isFullSecond ? '4' : '2'} bg-neutral-600 w-px`}
          style={{ 
            left: `${position}px`, 
            top: isFullSecond ? '0px' : '4px'
          }}
        >
          {isFullSecond && (
            <div className="absolute top-4 text-[10px] text-neutral-400 transform -translate-x-1/2">
              {i}s
            </div>
          )}
        </div>
      );
    }
    
    return markers;
  };

  // Handle playhead drag start
  const handlePlayheadDragStart = (e: React.MouseEvent) => {
    if (isPlaying) togglePlayback();
    setIsDragging(true);
    document.addEventListener('mousemove', handlePlayheadDrag);
    document.addEventListener('mouseup', handlePlayheadDragEnd);
  };

  // Handle playhead drag
  const handlePlayheadDrag = (e: MouseEvent) => {
    if (!timelineRef.current || !isDragging) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const position = e.clientX - rect.left;
    const newTime = getTimeFromPosition(position);
    
    setCurrentTime(newTime);
  };

  // Handle playhead drag end
  const handlePlayheadDragEnd = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handlePlayheadDrag);
    document.removeEventListener('mouseup', handlePlayheadDragEnd);
  };

  // Handle timeline click
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const position = e.clientX - rect.left;
    const newTime = getTimeFromPosition(position);
    
    setCurrentTime(newTime);
  };

  // Handle timeline hover
  const handleTimelineHover = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const position = e.clientX - rect.left;
    const time = getTimeFromPosition(position);
    
    setHoverTime(time);
  };

  // Handle keyframe add
  const handleAddKeyframe = () => {
    const selectedLayer = getSelectedLayer();
    if (selectedLayer) {
      addKeyframe(selectedLayer.id, currentTime);
    }
  };

  // Handle keyframe delete
  const handleDeleteKeyframe = () => {
    const selectedLayer = getSelectedLayer();
    if (selectedLayer && selectedKeyframeTime !== null) {
      deleteKeyframe(selectedLayer.id, selectedKeyframeTime);
      setSelectedKeyframeTime(null);
    }
  };

  // Cleanup event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handlePlayheadDrag);
      document.removeEventListener('mouseup', handlePlayheadDragEnd);
    };
  }, []);

  // Get keyframes for the selected layer
  const selectedLayer = getSelectedLayer();
  const keyframes = selectedLayer ? [...selectedLayer.keyframes] : [];
  keyframes.sort((a, b) => a.time - b.time);

  return (
    <div className="bg-[#111111] border-t border-neutral-800 h-32 flex flex-col">
      {/* Timeline Controls */}
      <div className="h-10 border-b border-neutral-800 flex items-center px-3 justify-between">
        <div className="flex items-center gap-2">
          <button 
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-700 text-neutral-300" 
            onClick={togglePlayback}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <span className="text-sm text-neutral-400">
            {currentTime.toFixed(2)}s / {duration.toFixed(1)}s
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-700 text-neutral-300"
            onClick={handleAddKeyframe}
            title="Add Keyframe"
          >
            +
          </button>
          <button 
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-700 text-neutral-300 disabled:opacity-50 disabled:hover:bg-transparent"
            onClick={handleDeleteKeyframe}
            disabled={selectedKeyframeTime === null}
            title="Delete Keyframe"
          >
            -
          </button>
          <button 
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-700 text-neutral-300"
            title="Previous Keyframe"
          >
            <ChevronLeft size={14} />
          </button>
          <button 
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-700 text-neutral-300"
            title="Next Keyframe"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      
      {/* Timeline Ruler */}
      <div className="h-6 border-b border-neutral-800 relative px-3">
        <div className="absolute inset-0 px-3">
          {generateTimeMarkers()}
        </div>
      </div>
      
      {/* Timeline Tracks */}
      <div className="flex-1 relative">
        {/* Vertical time indicator for current position */}
        <div 
          className="absolute h-full w-px bg-[#4A7CFF] z-10 pointer-events-none"
          style={{ left: `${getPlayheadPosition(currentTime) + 12}px` }}
        ></div>
        
        {/* Timeline Area */}
        <div 
          ref={timelineRef}
          className="absolute inset-0 px-3"
          onClick={handleTimelineClick}
          onMouseMove={handleTimelineHover}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Playhead handle */}
          <div 
            ref={playheadRef}
            className="absolute top-0 w-5 h-5 bg-[#4A7CFF] rounded-full transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
            style={{ left: `${getPlayheadPosition(currentTime) + 12}px` }}
            onMouseDown={handlePlayheadDragStart}
          ></div>
          
          {/* Keyframes */}
          {keyframes.map((keyframe, index) => (
            <div 
              key={`keyframe-${index}`}
              className={`absolute w-3 h-3 rounded transform -translate-x-1/2 -translate-y-1/2 cursor-pointer border ${selectedKeyframeTime === keyframe.time ? 'border-white' : 'border-yellow-500'} ${selectedKeyframeTime === keyframe.time ? 'bg-yellow-500' : 'bg-yellow-400'}`}
              style={{ 
                left: `${getPlayheadPosition(keyframe.time) + 12}px`,
                top: '20px' 
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedKeyframeTime(keyframe.time);
                setCurrentTime(keyframe.time);
              }}
            ></div>
          ))}
          
          {/* Time hover indicator */}
          {isHovering && (
            <div 
              className="absolute h-full w-px bg-neutral-500 opacity-50 pointer-events-none"
              style={{ left: `${getPlayheadPosition(hoverTime) + 12}px` }}
            >
              <div className="absolute top-0 transform -translate-x-1/2 -translate-y-full bg-neutral-800 text-neutral-300 px-1 py-0.5 text-[10px] rounded">
                {hoverTime.toFixed(2)}s
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Timeline;