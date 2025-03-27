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

  // Get the animation data for the current frame
  const frameLayers = mockLayers[selectedFrameId] || [];
  
  // Find animation layers that correspond to our preview elements
  const backgroundLayer = frameLayers.find(layer => layer.name === 'Background');
  const headlineLayer = frameLayers.find(layer => layer.name === 'Headline' || layer.name === 'Title');
  const subtitleLayer = frameLayers.find(layer => layer.name === 'Subhead' || layer.name === 'Tagline' || layer.name === 'Description');
  const buttonLayer = frameLayers.find(layer => layer.name === 'CTA Button');
  const logoLayer = frameLayers.find(layer => layer.name === 'Logo');
  
  // Update animations when currentTime changes
  useEffect(() => {
    // Apply animation updates based on the current time and animation data from mockLayers
    
    // Process headline animations
    if (headlineRef.current && headlineLayer) {
      // Reset styles to default
      headlineRef.current.style.opacity = '0';
      headlineRef.current.style.transform = 'translateY(0)';
      
      // Apply each animation in sequence
      headlineLayer.animations.forEach(animation => {
        const startTime = animation.startTime || 0;
        const endTime = startTime + animation.duration;
        
        // If current time is within this animation's timeframe
        if (currentTime >= startTime && currentTime <= endTime) {
          // Calculate progress for this animation
          const progress = (currentTime - startTime) / animation.duration;
          const easedProgress = applyEasing(progress, animation.easing);
          
          // Apply different animation types
          if (animation.type === AnimationType.Fade) {
            headlineRef.current!.style.opacity = `${easedProgress}`;
          } else if (animation.type === AnimationType.Scale) {
            const scale = 0.8 + (easedProgress * 0.4); // Scale from 0.8 to 1.2
            headlineRef.current!.style.transform = `scale(${scale})`;
            headlineRef.current!.style.opacity = '1';
          } else if (animation.type === AnimationType.Slide) {
            const offset = 20 - (easedProgress * 20); // Start 20px offset, end at 0
            headlineRef.current!.style.transform = `translateY(${offset}px)`;
            headlineRef.current!.style.opacity = '1';
          } else if (animation.type === AnimationType.Rotate) {
            const rotation = easedProgress * (animation.rotation || 360);
            headlineRef.current!.style.transform = `rotate(${rotation}deg)`;
            headlineRef.current!.style.opacity = '1';
          }
        } 
        // If we've passed this animation and it's the last one
        else if (currentTime > endTime) {
          // Set final state of the animation
          if (animation.type === AnimationType.Fade) {
            headlineRef.current!.style.opacity = '1';
          } else if (animation.type === AnimationType.Scale) {
            headlineRef.current!.style.transform = 'scale(1.2)';
            headlineRef.current!.style.opacity = '1';
          } else if (animation.type === AnimationType.Slide) {
            headlineRef.current!.style.transform = 'translateY(0)';
            headlineRef.current!.style.opacity = '1';
          } else if (animation.type === AnimationType.Rotate) {
            headlineRef.current!.style.transform = `rotate(${animation.rotation || 360}deg)`;
            headlineRef.current!.style.opacity = '1';
          }
        }
      });
    }
    
    // Process subtitle animations
    if (subtitleRef.current && subtitleLayer) {
      // Reset styles to default
      subtitleRef.current.style.opacity = '0';
      subtitleRef.current.style.transform = 'translateY(0)';
      
      // Apply each animation in sequence
      subtitleLayer.animations.forEach(animation => {
        const startTime = animation.startTime || 0;
        const endTime = startTime + animation.duration;
        
        // If current time is within this animation's timeframe
        if (currentTime >= startTime && currentTime <= endTime) {
          // Calculate progress for this animation
          const progress = (currentTime - startTime) / animation.duration;
          const easedProgress = applyEasing(progress, animation.easing);
          
          // Apply different animation types
          if (animation.type === AnimationType.Fade) {
            subtitleRef.current!.style.opacity = `${easedProgress}`;
          } else if (animation.type === AnimationType.Slide) {
            const offset = 20 - (easedProgress * 20); // Start 20px offset, end at 0
            subtitleRef.current!.style.transform = `translateY(${offset}px)`;
            subtitleRef.current!.style.opacity = '1';
          }
        } 
        // If we've passed this animation and it's the last one
        else if (currentTime > endTime) {
          // Set final state
          if (animation.type === AnimationType.Fade) {
            subtitleRef.current!.style.opacity = '1';
          } else if (animation.type === AnimationType.Slide) {
            subtitleRef.current!.style.transform = 'translateY(0)';
            subtitleRef.current!.style.opacity = '1';
          }
        }
      });
    }
    
    // Process button animations
    if (buttonRef.current && buttonLayer) {
      // Reset styles to default
      buttonRef.current.style.opacity = '0';
      buttonRef.current.style.transform = 'scale(0.8)';
      
      // Apply each animation in sequence
      buttonLayer.animations.forEach(animation => {
        const startTime = animation.startTime || 0;
        const endTime = startTime + animation.duration;
        
        // If current time is within this animation's timeframe
        if (currentTime >= startTime && currentTime <= endTime) {
          // Calculate progress for this animation
          const progress = (currentTime - startTime) / animation.duration;
          const easedProgress = applyEasing(progress, animation.easing);
          
          // Apply different animation types
          if (animation.type === AnimationType.Fade) {
            buttonRef.current!.style.opacity = `${easedProgress}`;
          } else if (animation.type === AnimationType.Scale) {
            const scale = 0.8 + (easedProgress * 0.2); // Scale from 0.8 to 1.0
            buttonRef.current!.style.transform = `scale(${scale})`;
            buttonRef.current!.style.opacity = '1';
          } else if (animation.type === AnimationType.Bounce) {
            buttonRef.current!.style.transform = 'scale(1)';
            buttonRef.current!.style.opacity = '1';
          }
        } 
        // If we've passed this animation
        else if (currentTime > endTime) {
          // Set final state
          if (animation.type === AnimationType.Fade || 
              animation.type === AnimationType.Scale || 
              animation.type === AnimationType.Bounce) {
            buttonRef.current!.style.opacity = '1';
            buttonRef.current!.style.transform = 'scale(1)';
          }
        }
      });
    }
    
    // Process logo animations
    if (logoRef.current && logoLayer) {
      // Reset styles to default
      logoRef.current.style.opacity = '0';
      logoRef.current.style.transform = 'rotate(0deg)';
      
      // Apply each animation in sequence
      logoLayer.animations.forEach(animation => {
        const startTime = animation.startTime || 0;
        const endTime = startTime + animation.duration;
        
        // If current time is within this animation's timeframe
        if (currentTime >= startTime && currentTime <= endTime) {
          // Calculate progress for this animation
          const progress = (currentTime - startTime) / animation.duration;
          const easedProgress = applyEasing(progress, animation.easing);
          
          // Apply different animation types
          if (animation.type === AnimationType.Fade) {
            logoRef.current!.style.opacity = `${easedProgress}`;
          } else if (animation.type === AnimationType.Rotate) {
            const rotation = easedProgress * (animation.rotation || 360);
            logoRef.current!.style.transform = `rotate(${rotation}deg)`;
            logoRef.current!.style.opacity = '1';
          }
        } 
        // If we've passed this animation
        else if (currentTime > endTime) {
          // Set final state
          if (animation.type === AnimationType.Fade) {
            logoRef.current!.style.opacity = '1';
          } else if (animation.type === AnimationType.Rotate) {
            logoRef.current!.style.transform = `rotate(${animation.rotation || 360}deg)`;
            logoRef.current!.style.opacity = '1';
          }
        }
      });
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