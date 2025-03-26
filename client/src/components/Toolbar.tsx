import { useState, useEffect } from 'react';
import { useAnimationContext } from '../context/AnimationContext';

interface ToolbarProps {
  onExport: () => void;
  onPreview: () => void;
}

const Toolbar = ({ onExport, onPreview }: ToolbarProps) => {
  const [zoomLevel, setZoomLevel] = useState('100%');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState('00:00:00');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  
  const { saveAnimationState } = useAnimationContext();

  // Update last saved time
  useEffect(() => {
    // Start autosave timer
    const interval = setInterval(() => {
      saveAnimationState();
      
      const now = new Date();
      const minutes = Math.floor((Date.now() - now.getTime()) / 60000);
      setLastSaved(minutes === 0 ? 'just now' : `${minutes} mins ago`);
    }, 30000); // Autosave every 30 seconds
    
    return () => clearInterval(interval);
  }, [saveAnimationState]);

  const handleUndo = () => {
    // Implement undo functionality
    console.log('Undo');
  };

  const handleRedo = () => {
    // Implement redo functionality
    console.log('Redo');
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setZoomLevel(e.target.value);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePrevFrame = () => {
    // Go to previous frame
    console.log('Previous frame');
  };

  const handleNextFrame = () => {
    // Go to next frame
    console.log('Next frame');
  };

  return (
    <div className="bg-neutral-800 border-b border-neutral-700 p-2 flex items-center space-x-2">
      <div className="flex items-center space-x-2 border-r border-neutral-700 pr-2 mr-2">
        <button 
          className="bg-primary hover:bg-secondary text-white px-3 py-1 rounded text-xs font-medium"
          onClick={onExport}
        >
          Export
        </button>
        <button 
          className="bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1 rounded text-xs flex items-center"
          onClick={onPreview}
        >
          <i className="fas fa-play mr-1 text-xs"></i> Preview
        </button>
      </div>
      
      <div className="flex items-center space-x-1 border-r border-neutral-700 pr-2 mr-2">
        <button 
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-700 text-neutral-300" 
          title="Undo"
          onClick={handleUndo}
        >
          <i className="fas fa-undo text-xs"></i>
        </button>
        <button 
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-700 text-neutral-300" 
          title="Redo"
          onClick={handleRedo}
        >
          <i className="fas fa-redo text-xs"></i>
        </button>
      </div>
      
      <div className="flex items-center space-x-2">
        <select 
          className="bg-neutral-800 border border-neutral-700 rounded text-xs p-1"
          value={zoomLevel}
          onChange={handleZoomChange}
        >
          <option>300%</option>
          <option>200%</option>
          <option>150%</option>
          <option>100%</option>
          <option>75%</option>
          <option>50%</option>
        </select>
        
        <div className="flex items-center bg-neutral-800 border border-neutral-700 rounded">
          <button 
            className="w-7 h-7 flex items-center justify-center rounded-l hover:bg-neutral-700 text-neutral-300" 
            title="Previous Frame"
            onClick={handlePrevFrame}
          >
            <i className="fas fa-step-backward text-xs"></i>
          </button>
          <button 
            className="w-7 h-7 flex items-center justify-center hover:bg-neutral-700 text-neutral-300" 
            title="Play/Pause"
            onClick={handlePlayPause}
          >
            <i className={`fas fa-${isPlaying ? 'pause' : 'play'} text-xs`}></i>
          </button>
          <button 
            className="w-7 h-7 flex items-center justify-center rounded-r hover:bg-neutral-700 text-neutral-300" 
            title="Next Frame"
            onClick={handleNextFrame}
          >
            <i className="fas fa-step-forward text-xs"></i>
          </button>
        </div>
        
        <div className="flex items-center bg-neutral-800 border border-neutral-700 rounded px-2 py-1">
          <span className="text-xs text-neutral-300 font-mono">{currentTime}</span>
        </div>
      </div>
      
      <div className="ml-auto flex items-center space-x-2">
        <div className="text-xs text-neutral-400">
          {lastSaved ? `Autosaved ${lastSaved}` : 'Autosave enabled'}
        </div>
        <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-700 text-neutral-300" title="Settings">
          <i className="fas fa-cog"></i>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
