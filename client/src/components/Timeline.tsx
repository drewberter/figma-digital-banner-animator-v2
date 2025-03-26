import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, Clock } from 'lucide-react';
import { useAnimationContext } from '../context/AnimationContext';

const Timeline = () => {
  const { currentTime, duration, setCurrentTime, isPlaying, togglePlayback, getSelectedLayer } = useAnimationContext();
  const [isDragging, setIsDragging] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  
  // Generate time markers (every 0.5 seconds)
  const timeMarkers = [];
  const interval = 0.5; // in seconds
  for (let time = 0; time <= duration; time += interval) {
    timeMarkers.push({
      time,
      isMajor: time % 1 === 0 // Major markers at every second
    });
  }
  
  // Convert a time value to a position in the timeline
  const timeToPosition = (time: number) => {
    if (!timelineRef.current) return 0;
    const width = timelineRef.current.clientWidth - 16; // Account for playhead width
    return (time / duration) * width;
  };
  
  // Convert a position in the timeline to a time value
  const positionToTime = (position: number) => {
    if (!timelineRef.current) return 0;
    const width = timelineRef.current.clientWidth - 16; // Account for playhead width
    return Math.max(0, Math.min(duration, (position / width) * duration));
  };
  
  // Handle clicking on the timeline to set current time
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickPosition = e.clientX - rect.left;
    const newTime = positionToTime(clickPosition);
    
    setCurrentTime(newTime);
  };
  
  // Handle playhead drag start
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  // Handle playhead drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !timelineRef.current) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const mousePosition = e.clientX - rect.left;
      const newTime = positionToTime(mousePosition);
      
      setCurrentTime(newTime);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setCurrentTime]);
  
  // Get keyframes for the selected layer
  const selectedLayer = getSelectedLayer();
  const keyframes = selectedLayer?.keyframes || [];
  
  return (
    <div className="h-full bg-[#111111] flex flex-col">
      <div className="p-2 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button 
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-800"
            onClick={togglePlayback}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={16} className="text-neutral-200" /> : <Play size={16} className="text-neutral-200" />}
          </button>
          
          <button 
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-800"
            onClick={() => setCurrentTime(0)}
            title="Restart"
          >
            <SkipBack size={16} className="text-neutral-300" />
          </button>
          
          <div className="text-xs text-neutral-400 flex items-center">
            <Clock size={14} className="mr-1" />
            <span>{currentTime.toFixed(1)}s</span>
            <span className="mx-1">/</span>
            <span>{duration.toFixed(1)}s</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="text-xs text-neutral-500">
            {selectedLayer ? selectedLayer.name : 'No layer selected'}
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex p-3 relative">
        {/* Layer track */}
        <div className="w-40 flex flex-col mr-2">
          <div className="h-8 flex items-center text-xs text-neutral-400 px-2 border-b border-neutral-800">
            Layers
          </div>
          
          {selectedLayer && (
            <div className="h-10 flex items-center px-2 rounded hover:bg-neutral-800 text-sm text-neutral-300">
              {selectedLayer.name}
            </div>
          )}
        </div>
        
        {/* Timeline area */}
        <div className="flex-1 flex flex-col relative">
          {/* Time markers */}
          <div className="h-8 flex items-end border-b border-neutral-800 relative">
            {timeMarkers.map(({ time, isMajor }) => (
              <div 
                key={time}
                className="absolute bottom-0 flex flex-col items-center"
                style={{ left: `${timeToPosition(time)}px` }}
              >
                <div 
                  className={`h-${isMajor ? '4' : '2'} w-px bg-neutral-700`}
                ></div>
                {isMajor && (
                  <div className="text-xs text-neutral-500 mb-1">
                    {time}s
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Playhead */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-[#4A7CFF] z-10"
            style={{ left: `${timeToPosition(currentTime)}px` }}
            ref={playheadRef}
          >
            <div 
              className="w-4 h-4 -ml-1.5 -mt-1 bg-[#4A7CFF] rounded-full cursor-move"
              onMouseDown={handlePlayheadMouseDown}
            ></div>
          </div>
          
          {/* Timeline Track */}
          <div 
            className="flex-1 bg-neutral-900 rounded cursor-pointer relative"
            onClick={handleTimelineClick}
            ref={timelineRef}
          >
            {selectedLayer && (
              <div className="h-10 relative">
                {/* Animation blocks */}
                {selectedLayer.animations.map((animation, index) => (
                  <div 
                    key={index}
                    className="absolute h-6 top-2 rounded bg-[#2A5BFF] bg-opacity-70 border border-[#4A7CFF]"
                    style={{
                      left: `${timeToPosition(animation.startTime || 0)}px`,
                      width: `${timeToPosition(animation.duration)}px`
                    }}
                  >
                    <div className="px-2 text-xs text-white truncate">
                      {animation.type}
                    </div>
                  </div>
                ))}
                
                {/* Keyframes */}
                {keyframes.map((keyframe, index) => (
                  <div 
                    key={index}
                    className="absolute w-3 h-3 top-3.5 -ml-1.5 rounded-sm bg-yellow-500 border border-yellow-600"
                    style={{ left: `${timeToPosition(keyframe.time)}px` }}
                  ></div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;