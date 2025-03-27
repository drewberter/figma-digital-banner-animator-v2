import { useRef, useEffect } from 'react';
import { mockFrames, mockLayers } from '../mock/animationData';
import { AnimationType, EasingType } from '../types/animation';

interface PreviewCanvasProps {
  selectedFrameId?: string;
  currentTime?: number;
}

const PreviewCanvas = ({ 
  selectedFrameId = 'frame-1',
  currentTime = 0
}: PreviewCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  
  // Find the selected frame or default to the first one
  const selectedFrame = mockFrames.find(frame => frame.id === selectedFrameId) || mockFrames[0];
  
  // Set up canvas dimensions based on selected frame
  const frameWidth = selectedFrame?.width || 300;
  const frameHeight = selectedFrame?.height || 250;
  
  // Apply easing function to progress
  const applyEasing = (progress: number, easingType: EasingType): number => {
    switch (easingType) {
      case EasingType.Linear:
        return progress;
      case EasingType.EaseIn:
        return progress * progress;
      case EasingType.EaseOut:
        return progress * (2 - progress);
      case EasingType.EaseInOut:
        return progress < 0.5 
          ? 2 * progress * progress 
          : -1 + (4 - 2 * progress) * progress;
      case EasingType.Bounce:
        if (progress < 1/2.75) {
          return 7.5625 * progress * progress;
        } else if (progress < 2/2.75) {
          const adjusted = progress - 1.5/2.75;
          return 7.5625 * adjusted * adjusted + 0.75;
        } else if (progress < 2.5/2.75) {
          const adjusted = progress - 2.25/2.75;
          return 7.5625 * adjusted * adjusted + 0.9375;
        } else {
          const adjusted = progress - 2.625/2.75;
          return 7.5625 * adjusted * adjusted + 0.984375;
        }
      default:
        return progress;
    }
  };

  // Update animations when currentTime changes
  useEffect(() => {
    // Simplified example: animate different elements with a timeline approach
    // In a real implementation, this would follow the animation data from context
    
    // Headline animation - fade in
    if (headlineRef.current) {
      if (currentTime < 0.5) {
        const progress = currentTime / 0.5;
        const easedProgress = applyEasing(progress, EasingType.EaseOut);
        headlineRef.current.style.opacity = `${easedProgress}`;
        headlineRef.current.style.transform = `translateY(${20 - (easedProgress * 20)}px)`;
      } else {
        headlineRef.current.style.opacity = '1';
        headlineRef.current.style.transform = 'translateY(0)';
      }
    }
    
    // Subtitle animation - fade in with delay
    if (subtitleRef.current) {
      if (currentTime < 0.7) {
        subtitleRef.current.style.opacity = '0';
      } else if (currentTime < 1.2) {
        const progress = (currentTime - 0.7) / 0.5;
        const easedProgress = applyEasing(progress, EasingType.EaseOut);
        subtitleRef.current.style.opacity = `${easedProgress}`;
      } else {
        subtitleRef.current.style.opacity = '1';
      }
    }
    
    // Button animation - scale in
    if (buttonRef.current) {
      if (currentTime < 1.0) {
        buttonRef.current.style.opacity = '0';
        buttonRef.current.style.transform = 'scale(0.8)';
      } else if (currentTime < 1.5) {
        const progress = (currentTime - 1.0) / 0.5;
        const easedProgress = applyEasing(progress, EasingType.Bounce);
        buttonRef.current.style.opacity = `${easedProgress}`;
        buttonRef.current.style.transform = `scale(${0.8 + (0.2 * easedProgress)})`;
      } else {
        buttonRef.current.style.opacity = '1';
        buttonRef.current.style.transform = 'scale(1)';
      }
    }
    
    // Logo animation - fade in last
    if (logoRef.current) {
      if (currentTime < 1.5) {
        logoRef.current.style.opacity = '0';
      } else if (currentTime < 2.0) {
        const progress = (currentTime - 1.5) / 0.5;
        const easedProgress = applyEasing(progress, EasingType.EaseInOut);
        logoRef.current.style.opacity = `${easedProgress}`;
      } else {
        logoRef.current.style.opacity = '1';
      }
    }
  }, [currentTime]);

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
              <h2 ref={headlineRef} className="text-white text-2xl font-bold mb-2 transition-all duration-300">
                Amazing Offer
              </h2>
              <p ref={subtitleRef} className="text-white text-sm transition-all duration-300">
                Limited time only!
              </p>
            </div>
            
            {/* CTA Button */}
            <div className="absolute bottom-12 left-0 right-0 flex justify-center">
              <button 
                ref={buttonRef}
                className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded font-medium transition-all duration-300"
              >
                Shop Now
              </button>
            </div>
            
            {/* Logo */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center">
              <div ref={logoRef} className="text-white text-xs opacity-75 transition-all duration-300">
                LOGO
              </div>
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