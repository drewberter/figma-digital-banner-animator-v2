import { useRef, useState } from 'react';
import { mockFrames } from '../mock/animationData';

interface PreviewCanvasProps {
  selectedFrameId?: string;
}

const PreviewCanvas = ({ selectedFrameId = 'frame-1' }: PreviewCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Find the selected frame or default to the first one
  const selectedFrame = mockFrames.find(frame => frame.id === selectedFrameId) || mockFrames[0];
  
  // Set up canvas dimensions based on selected frame
  const frameWidth = selectedFrame?.width || 300;
  const frameHeight = selectedFrame?.height || 250;

  return (
    <div className="h-full bg-neutral-900 flex items-center justify-center overflow-hidden">
      <div className="flex flex-col items-center">
        <div className="mb-4 text-sm text-neutral-500">
          Time: {currentTime.toFixed(1)}s
        </div>
        
        {/* Canvas preview area */}
        <div
          ref={canvasRef}
          className="bg-white rounded shadow-lg overflow-hidden"
          style={{
            width: `${frameWidth}px`,
            height: `${frameHeight}px`
          }}
        >
          {/* Demo content showing a typical banner structure */}
          <div className="relative w-full h-full bg-gradient-to-br from-blue-500 to-indigo-700">
            {/* Headline text */}
            <div className="absolute top-10 left-0 right-0 text-center">
              <h2 className="text-white text-2xl font-bold mb-2">Amazing Offer</h2>
              <p className="text-white text-sm">Limited time only!</p>
            </div>
            
            {/* CTA Button */}
            <div className="absolute bottom-12 left-0 right-0 flex justify-center">
              <button className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded font-medium">
                Shop Now
              </button>
            </div>
            
            {/* Logo */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center">
              <div className="text-white text-xs opacity-75">LOGO</div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-neutral-400">
          {selectedFrame.width} × {selectedFrame.height}
        </div>
      </div>
    </div>
  );
};

export default PreviewCanvas;