import { useRef, useEffect, useState } from 'react';
import { AnimationType, EasingType, AnimationFrame, AnimationLayer } from '../types/animation';

interface PreviewCanvasProps {
  selectedFrameId?: string | null;
  currentTime?: number;
  frames?: AnimationFrame[];
  layers?: AnimationLayer[];
}

// Mock data when props are not provided
const mockFrames: AnimationFrame[] = [
  {
    id: 'frame-1',
    name: 'Banner 300x250',
    selected: true,
    width: 300,
    height: 250
  }
];

const mockLayers: AnimationLayer[] = [
  {
    id: 'layer-1-1',
    name: 'Header Text',
    type: 'text',
    visible: true,
    locked: false,
    animations: [
      {
        type: AnimationType.Fade,
        startTime: 0.5,
        duration: 1,
        easing: EasingType.EaseOut,
        opacity: 0
      }
    ],
    keyframes: []
  },
  {
    id: 'layer-1-2',
    name: 'Button',
    type: 'button',
    visible: true,
    locked: false,
    animations: [
      {
        type: AnimationType.Scale,
        startTime: 1,
        duration: 0.8,
        easing: EasingType.EaseInOut,
        scale: 0.5
      }
    ],
    keyframes: []
  }
];

const PreviewCanvas = ({ 
  selectedFrameId = null,
  currentTime = 0,
  frames = mockFrames,
  layers = mockLayers
}: PreviewCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  
  // Find the selected frame or default to the first one
  const selectedFrame = selectedFrameId
    ? frames.find(frame => frame.id === selectedFrameId)
    : frames.find(frame => frame.selected) || frames[0] || null;
  
  // Get layers for the current frame
  const [frameLayers, setFrameLayers] = useState<AnimationLayer[]>(layers);
  
  // Set up canvas dimensions based on selected frame
  const frameWidth = selectedFrame?.width || 300;
  const frameHeight = selectedFrame?.height || 250;
  
  // Apply animations based on current time
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Reset all elements
    if (headlineRef.current) {
      headlineRef.current.style.opacity = '1';
      headlineRef.current.style.transform = 'none';
    }
    
    if (subtitleRef.current) {
      subtitleRef.current.style.opacity = '1';
      subtitleRef.current.style.transform = 'none';
    }
    
    if (buttonRef.current) {
      buttonRef.current.style.opacity = '1';
      buttonRef.current.style.transform = 'none';
    }
    
    if (logoRef.current) {
      logoRef.current.style.opacity = '1';
      logoRef.current.style.transform = 'none';
    }
    
    // Apply animations for each layer based on current time
    frameLayers.forEach(layer => {
      // Skip if layer is not visible
      if (!layer.visible) return;
      
      // Get target element based on layer type/name
      let targetElement: HTMLElement | null = null;
      
      if (layer.type === 'text' && layer.name.toLowerCase().includes('head')) {
        targetElement = headlineRef.current;
      } else if (layer.type === 'text') {
        targetElement = subtitleRef.current;
      } else if (layer.type === 'button') {
        targetElement = buttonRef.current;
      } else if (layer.type === 'image' || layer.type.toLowerCase().includes('logo')) {
        targetElement = logoRef.current;
      }
      
      if (!targetElement) return;
      
      // Apply each animation for this layer
      layer.animations.forEach(animation => {
        const startTime = animation.startTime || 0;
        const endTime = startTime + animation.duration;
        
        // Check if the animation is active at current time
        if (currentTime >= startTime && currentTime <= endTime) {
          // Calculate how far through the animation we are (0 to 1)
          const progress = (currentTime - startTime) / animation.duration;
          
          // Apply easing to the progress
          const easedProgress = applyEasing(progress, animation.easing);
          
          // Apply the animation based on its type
          switch (animation.type) {
            case AnimationType.Fade:
              const targetOpacity = animation.opacity !== undefined ? animation.opacity : 0;
              const currentOpacity = 1 - (1 - targetOpacity) * easedProgress;
              targetElement!.style.opacity = String(currentOpacity);
              break;
              
            case AnimationType.Scale:
              const targetScale = animation.scale || 0;
              const currentScale = 1 - (1 - targetScale) * easedProgress;
              targetElement!.style.transform = `scale(${currentScale})`;
              break;
              
            case AnimationType.Rotate:
              const targetRotation = animation.rotation || 0;
              const currentRotation = targetRotation * easedProgress;
              targetElement!.style.transform = `rotate(${currentRotation}deg)`;
              break;
              
            case AnimationType.Slide:
              // Simple slide from bottom
              targetElement!.style.transform = `translateY(${20 - (easedProgress * 20)}px)`;
              break;
              
            default:
              break;
          }
        }
      });
    });
  }, [currentTime, frameLayers, selectedFrameId]);
  
  // Function to apply easing to animation progress
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
        const n1 = 7.5625;
        const d1 = 2.75;
        if (progress < 1 / d1) {
          return n1 * progress * progress;
        } else if (progress < 2 / d1) {
          return n1 * (progress -= 1.5 / d1) * progress + 0.75;
        } else if (progress < 2.5 / d1) {
          return n1 * (progress -= 2.25 / d1) * progress + 0.9375;
        } else {
          return n1 * (progress -= 2.625 / d1) * progress + 0.984375;
        }
          
      default:
        return progress;
    }
  };
  
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-900 overflow-hidden">
      <div 
        ref={canvasRef}
        className="relative shadow-lg flex flex-col bg-white"
        style={{ 
          width: `${frameWidth}px`, 
          height: `${frameHeight}px`,
          overflow: 'hidden'
        }}
      >
        {/* Banner content - will be animated */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <div ref={logoRef} className="mb-4 text-blue-500">
            <div className="w-20 h-20 mx-auto rounded-full bg-blue-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          
          <h2 ref={headlineRef} className="text-2xl font-bold mb-2 text-gray-800">
            Animation Studio
          </h2>
          
          <p ref={subtitleRef} className="text-sm mb-4 text-gray-600">
            Create stunning banner animations with our powerful tools
          </p>
          
          <button
            ref={buttonRef}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-all"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviewCanvas;