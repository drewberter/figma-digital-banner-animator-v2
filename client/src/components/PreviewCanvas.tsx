import { useRef, useEffect, useState } from 'react';
import { useAnimationContext } from '../context/AnimationContext';
// Import our custom Lottie utility
import { getLottie, initLottie, convertAnimationToLottie } from '../utils/lottieUtils';
// Import default Lottie as fallback
import lottieDefault from 'lottie-web';
// Import icons
import { HandIcon, ZoomIn, ZoomOut, Maximize, MonitorPlay } from 'lucide-react';

const PreviewCanvas = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<any>(null);
  const { currentFrame, isPlaying, currentTime, duration } = useAnimationContext();
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);

  // State for renderer selection
  const [renderer, setRenderer] = useState<'svg' | 'canvas' | 'worker'>('svg');
  
  // Initialize animation preview
  useEffect(() => {
    // Initialize Lottie with selected renderer
    initLottie(renderer);
    
    // Get sample animation data (simple rectangle)
    const defaultAnimationData = {
      v: '5.7.4',
      fr: 30,
      ip: 0,
      op: 30,
      w: 300,
      h: 250,
      nm: 'Default Animation',
      ddd: 0,
      assets: [],
      layers: [{
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: 'Empty Layer',
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          p: { a: 0, k: [150, 125, 0] }
        },
        ao: 0,
        shapes: [{
          ty: 'rc',
          p: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 0 }
        }],
        ip: 0,
        op: 30,
        st: 0
      }],
      markers: []
    };

    if (canvasRef.current) {
      // Clear the container first
      canvasRef.current.innerHTML = '';
      
      try {
        // Get the appropriate Lottie instance
        const lottie = getLottie();
        
        // Initialize Lottie animation
        animationRef.current = lottie.loadAnimation({
          container: canvasRef.current,
          renderer: renderer,
          loop: true,
          autoplay: false,
          animationData: defaultAnimationData
        });
      } catch (error) {
        console.error('Error initializing Lottie animation:', error);
      }
    }

    return () => {
      if (animationRef.current) {
        try {
          animationRef.current.destroy();
        } catch (error) {
          console.error('Error destroying Lottie animation:', error);
        }
      }
    };
  }, [renderer]);

  // Update animation playback state
  useEffect(() => {
    if (animationRef.current) {
      try {
        if (isPlaying) {
          animationRef.current.play();
        } else {
          animationRef.current.pause();
        }
      } catch (error) {
        console.error('Error controlling animation playback:', error);
      }
    }
  }, [isPlaying]);

  // Update animation frame when time changes
  useEffect(() => {
    if (animationRef.current && duration > 0) {
      try {
        // Safely access totalFrames property
        const totalFrames = animationRef.current.totalFrames;
        if (totalFrames) {
          const framePos = (currentTime / duration) * totalFrames;
          animationRef.current.goToAndStop(framePos, true);
        }
      } catch (error) {
        console.error('Error updating animation frame:', error);
      }
    }
  }, [currentTime, duration]);

  const handlePanStart = () => {
    setIsPanning(true);
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  const handlePan = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanPosition(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetView = () => {
    setPanPosition({ x: 0, y: 0 });
    setZoomLevel(1);
  };

  return (
    <div 
      className="flex-1 bg-neutral-900 overflow-hidden relative"
      onMouseMove={handlePan}
      onMouseUp={handlePanEnd}
      onMouseLeave={handlePanEnd}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className="bg-white rounded-sm overflow-hidden" 
          style={{ 
            width: 300, 
            height: 250,
            transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`
          }}
        >
          <div 
            ref={canvasRef} 
            className="w-full h-full flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100 relative"
          >
            {/* Lottie animation will be rendered here */}
          </div>
        </div>
      </div>
      
      {/* Canvas Controls */}
      <div className="absolute top-2 right-2 flex items-center space-x-1 bg-neutral-800 bg-opacity-80 rounded p-1">
        <button 
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-700 text-neutral-300" 
          title="Pan"
          onMouseDown={handlePanStart}
        >
          <HandIcon size={16} />
        </button>
        <button 
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-700 text-neutral-300" 
          title="Zoom In"
          onClick={handleZoomIn}
        >
          <ZoomIn size={16} />
        </button>
        <button 
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-700 text-neutral-300" 
          title="Zoom Out"
          onClick={handleZoomOut}
        >
          <ZoomOut size={16} />
        </button>
        <button 
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-700 text-neutral-300" 
          title="Reset View"
          onClick={handleResetView}
        >
          <Maximize size={16} />
        </button>
      </div>
      
      {/* Renderer Selection */}
      <div className="absolute bottom-2 right-2 flex items-center space-x-1 bg-neutral-800 bg-opacity-80 rounded p-1">
        <select 
          className="text-xs bg-neutral-700 text-neutral-200 rounded p-1 border-none"
          value={renderer}
          onChange={(e) => setRenderer(e.target.value as any)}
        >
          <option value="svg">SVG Renderer</option>
          <option value="canvas">Canvas Renderer</option>
          <option value="worker">WebWorker (High Performance)</option>
        </select>
        <button 
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-700 text-neutral-300" 
          title="Preview Animation"
          onClick={() => animationRef.current?.play()}
        >
          <MonitorPlay size={16} />
        </button>
      </div>
    </div>
  );
};

export default PreviewCanvas;
