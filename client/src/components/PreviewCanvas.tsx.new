import { useRef, useEffect } from 'react';
import { AnimationType, EasingType } from '../types/animation';
import { useAnimationContext } from '../context/AnimationContext';

interface PreviewCanvasProps {
  selectedFrameId?: string | null;
  currentTime?: number;
}

const PreviewCanvas = ({ 
  selectedFrameId = null,
  currentTime = 0
}: PreviewCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  
  // Get animation context
  const animationContext = useAnimationContext();
  
  // Find the selected frame from context or default to the first one
  const selectedFrame = selectedFrameId
    ? animationContext.frames.find(frame => frame.id === selectedFrameId)
    : animationContext.frames.find(frame => frame.selected) || null;
  
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

  // Get the animation data from context
  const frameLayers = animationContext.layers;
  
  // Find animation layers that correspond to our preview elements
  const backgroundLayer = frameLayers.find(layer => layer.name === 'Background');
  const headlineLayer = frameLayers.find(layer => layer.name === 'Headline' || layer.name === 'Title');
  const subtitleLayer = frameLayers.find(layer => layer.name === 'Subhead' || layer.name === 'Tagline' || layer.name === 'Description');
  const buttonLayer = frameLayers.find(layer => layer.name === 'CTA Button');
  const logoLayer = frameLayers.find(layer => layer.name === 'Logo');
  
  // Helper function to find and apply animations for a layer
  const processAnimations = (
    element: HTMLElement | null,
    layer: any,
    currentTime: number
  ) => {
    if (!element || !layer) return;
    
    // Reset element styles
    element.style.opacity = '1';
    element.style.transform = 'none';
    
    // Process each animation
    for (const animation of layer.animations) {
      const { type, startTime = 0, duration, easing } = animation;
      
      // Calculate progress (0-1) based on current time, start time, and duration
      const animationEndTime = startTime + duration;
      
      // Skip if animation hasn't started yet or is already complete
      if (currentTime < startTime || currentTime > animationEndTime) {
        // For fade animations that haven't started yet, set initial opacity to 0
        if (type === AnimationType.Fade && currentTime < startTime) {
          element.style.opacity = '0';
        }
        continue;
      }
      
      const rawProgress = (currentTime - startTime) / duration;
      const progress = applyEasing(rawProgress, easing as EasingType);
      
      // Apply animation effect based on type
      switch (type) {
        case AnimationType.Fade:
          element.style.opacity = progress.toString();
          break;
          
        case AnimationType.Scale:
          const scale = 1 + (animation.scale ? (animation.scale - 1) * progress : progress);
          element.style.transform = `${element.style.transform} scale(${scale})`;
          break;
          
        case AnimationType.Slide:
          const direction = animation.direction || 'left';
          let translateX = 0;
          let translateY = 0;
          
          // Calculate the slide distance as % of container
          const distance = 100 * (1 - progress);
          
          switch (direction) {
            case 'left':
              translateX = -distance;
              break;
            case 'right':
              translateX = distance;
              break;
            case 'up':
              translateY = -distance;
              break;
            case 'down':
              translateY = distance;
              break;
          }
          
          element.style.transform = `${element.style.transform} translate(${translateX}%, ${translateY}%)`;
          break;
          
        case AnimationType.Rotate:
          const rotation = (animation.rotation || 360) * progress;
          element.style.transform = `${element.style.transform} rotate(${rotation}deg)`;
          break;
          
        case AnimationType.Bounce:
          // Apply a bouncing effect at the end of the animation
          if (progress > 0.8) {
            const bounce = Math.sin((progress - 0.8) * Math.PI * 5) * 0.2;
            element.style.transform = `${element.style.transform} translateY(${-bounce * 20}px)`;
          }
          break;
          
        case AnimationType.Pulse:
          // Scale up and down based on sine wave
          const pulse = 1 + Math.sin(progress * Math.PI * 2) * 0.1;
          element.style.transform = `${element.style.transform} scale(${pulse})`;
          break;
      }
    }
  };
  
  // Apply animations on each render based on current time
  useEffect(() => {
    processAnimations(canvasRef.current, backgroundLayer, currentTime);
    processAnimations(headlineRef.current, headlineLayer, currentTime);
    processAnimations(subtitleRef.current, subtitleLayer, currentTime);
    processAnimations(buttonRef.current, buttonLayer, currentTime);
    processAnimations(logoRef.current, logoLayer, currentTime);
  }, [currentTime, backgroundLayer, headlineLayer, subtitleLayer, buttonLayer, logoLayer]);
  
  // Get all appropriate classes based on frame size
  const getFrameClasses = () => {
    let classes = 'bg-white flex flex-col items-center justify-between p-4 overflow-hidden';
    
    // Add specific sizing classes
    if (frameWidth === 300 && frameHeight === 250) {
      classes += ' relative'; // Medium Rectangle has headline/subtitle centered
    } else if (frameWidth === 728 && frameHeight === 90) {
      classes += ' flex-row'; // Leaderboard uses row layout instead of column
    } else if (frameWidth === 320 && frameHeight === 50) {
      classes += ' flex-row items-center justify-between'; // Mobile leaderboard
    } else if (frameWidth === 160 && frameHeight === 600) {
      classes += ' justify-start'; // Skyscraper
    }
    
    return classes;
  };
  
  // Handle different layouts based on frame dimensions
  if (frameWidth === 728 && frameHeight === 90) {
    // Leaderboard layout (horizontal)
    return (
      <div 
        className="w-full h-full flex items-center justify-center bg-neutral-800 p-4 overflow-auto"
      >
        <div 
          ref={canvasRef}
          className={getFrameClasses()}
          style={{ 
            width: `${frameWidth}px`, 
            height: `${frameHeight}px`,
            backgroundColor: '#f0f0f0'
          }}
        >
          <div className="flex-1 flex items-center">
            <div ref={logoRef} className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl mr-6">
              Logo
            </div>
            <div className="flex-1">
              <h2 ref={headlineRef} className="text-xl font-bold text-gray-800">Experience Amazing Products</h2>
              <p ref={subtitleRef} className="text-sm text-gray-600">Limited time offer - Act now!</p>
            </div>
          </div>
          <button 
            ref={buttonRef}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
          >
            Shop Now
          </button>
        </div>
      </div>
    );
  } else if (frameWidth === 320 && frameHeight === 50) {
    // Mobile leaderboard (small horizontal)
    return (
      <div 
        className="w-full h-full flex items-center justify-center bg-neutral-800 p-4 overflow-auto"
      >
        <div 
          ref={canvasRef}
          className={getFrameClasses()}
          style={{ 
            width: `${frameWidth}px`, 
            height: `${frameHeight}px`,
            backgroundColor: '#f0f0f0' 
          }}
        >
          <div ref={logoRef} className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
            Logo
          </div>
          <div className="flex-1 mx-2 overflow-hidden">
            <h2 ref={headlineRef} className="text-sm font-bold text-gray-800 truncate">Experience Amazing</h2>
            <p ref={subtitleRef} className="text-xs text-gray-600 truncate">Limited time offer!</p>
          </div>
          <button 
            ref={buttonRef}
            className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 whitespace-nowrap"
          >
            Shop
          </button>
        </div>
      </div>
    );
  } else if (frameWidth === 160 && frameHeight === 600) {
    // Skyscraper (vertical)
    return (
      <div 
        className="w-full h-full flex items-center justify-center bg-neutral-800 p-4 overflow-auto"
      >
        <div 
          ref={canvasRef}
          className={getFrameClasses()}
          style={{ 
            width: `${frameWidth}px`, 
            height: `${frameHeight}px`,
            backgroundColor: '#f0f0f0' 
          }}
        >
          <div ref={logoRef} className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl mt-4 mb-8">
            Logo
          </div>
          <div className="text-center mb-8">
            <h2 ref={headlineRef} className="text-xl font-bold text-gray-800 mb-2">Experience Amazing</h2>
            <p ref={subtitleRef} className="text-sm text-gray-600">Limited time offer - Act now and save!</p>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <button 
              ref={buttonRef}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
            >
              Shop Now
            </button>
          </div>
        </div>
      </div>
    );
  } else {
    // Default layout (medium rectangle)
    return (
      <div 
        className="w-full h-full flex items-center justify-center bg-neutral-800 p-4 overflow-auto"
      >
        <div 
          ref={canvasRef}
          className={getFrameClasses()}
          style={{ 
            width: `${frameWidth}px`, 
            height: `${frameHeight}px`,
            backgroundColor: '#f0f0f0' 
          }}
        >
          <div ref={logoRef} className="absolute top-4 right-4 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
            Logo
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            <h2 ref={headlineRef} className="text-2xl font-bold text-gray-800 text-center mb-2">Experience Amazing</h2>
            <p ref={subtitleRef} className="text-base text-gray-600 text-center mb-6">Limited time offer - Act now!</p>
            <button 
              ref={buttonRef}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
            >
              Shop Now
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default PreviewCanvas;