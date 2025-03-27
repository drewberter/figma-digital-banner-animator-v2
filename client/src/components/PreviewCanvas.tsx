import { useRef, useEffect, useState } from 'react';
import { mockFrames, mockLayers } from '../mock/animationData';
import { AnimationType, EasingType, AnimationMode } from '../types/animation';

interface PreviewCanvasProps {
  selectedFrameId?: string;
  currentTime?: number;
}

const PreviewCanvas = ({ 
  selectedFrameId = 'frame-1',
  currentTime = 0
}: PreviewCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  
  // State to track container dimensions
  const [containerDimensions, setContainerDimensions] = useState({
    width: 500,
    height: 400
  });
  
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
  
  // Get the hidden layers for the current frame
  const hiddenLayerIds = selectedFrame.hiddenLayers || [];
  
  // Find animation layers that correspond to our preview elements
  // Filter out layers that are hidden for this specific frame
  const backgroundLayer = frameLayers.find(layer => 
    layer.name === 'Background' && !hiddenLayerIds.includes(layer.id));
  const headlineLayer = frameLayers.find(layer => 
    (layer.name === 'Headline' || layer.name === 'Title') && !hiddenLayerIds.includes(layer.id));
  const subtitleLayer = frameLayers.find(layer => 
    (layer.name === 'Subhead' || layer.name === 'Tagline' || layer.name === 'Description') && !hiddenLayerIds.includes(layer.id));
  const buttonLayer = frameLayers.find(layer => 
    layer.name === 'CTA Button' && !hiddenLayerIds.includes(layer.id));
  const logoLayer = frameLayers.find(layer => 
    layer.name === 'Logo' && !hiddenLayerIds.includes(layer.id));
  
  // Helper function to find and apply animations for a layer
  const processAnimations = (
    element: HTMLElement | null,
    layer: typeof headlineLayer,
    defaultOpacity = '0',
    defaultTransform = ''
  ) => {
    if (!element || !layer) return;
    
    // Find the active animation if any
    let activeAnimation = null;
    let finalAnimation = null;
    let animationApplied = false;
    
    // Sort animations by start time to ensure they're processed in order
    const sortedAnimations = [...layer.animations].sort((a, b) => {
      const startA = a.startTime || 0;
      const startB = b.startTime || 0;
      return startA - startB;
    });
    
    // Reset styles to default initially
    element.style.opacity = defaultOpacity;
    if (defaultTransform) element.style.transform = defaultTransform;
    
    // Find the active animation
    for (const animation of sortedAnimations) {
      const startTime = animation.startTime || 0;
      const endTime = startTime + animation.duration;
      
      // Active animation takes precedence
      if (currentTime >= startTime && currentTime <= endTime) {
        activeAnimation = animation;
        break;
      }
      // Keep track of the latest animation we've passed
      else if (currentTime > endTime) {
        finalAnimation = animation;
      }
    }
    
    // Apply active animation if found
    if (activeAnimation) {
      const startTime = activeAnimation.startTime || 0;
      const progress = (currentTime - startTime) / activeAnimation.duration;
      const easedProgress = applyEasing(progress, activeAnimation.easing);
      
      // Check if this is an exit animation
      const isExit = activeAnimation.mode === AnimationMode.Exit;
      
      // For exit animations, we invert the progress (1 - easedProgress)
      // This way elements fade/scale/slide out instead of in
      const animationProgress = isExit ? (1 - easedProgress) : easedProgress;
      
      // Apply different animation types
      if (activeAnimation.type === AnimationType.Fade) {
        // For entrance animations, we want 0->1 opacity
        // For exit animations, we want 1->0 opacity (handled by animationProgress)
        if (isExit) {
          element.style.opacity = `${animationProgress}`;
        } else {
          // For entrance, start at 0 and fade in
          element.style.opacity = `${easedProgress}`;
        }
        animationApplied = true;
      } else if (activeAnimation.type === AnimationType.Scale) {
        // For entrance: 0.8 to 1.2, for exit: 1.2 to 0.8
        const scale = isExit 
          ? (1.2 - (easedProgress * 0.4)) 
          : (0.8 + (easedProgress * 0.4));
        element.style.transform = `scale(${scale})`;
        element.style.opacity = isExit ? `${animationProgress}` : '1';
        animationApplied = true;
      } else if (activeAnimation.type === AnimationType.Slide) {
        const direction = activeAnimation.direction || 'right';
        
        // For entrance: 20px to 0px, for exit: 0px to 20px
        let offset = isExit 
          ? (easedProgress * 20) 
          : (20 - (easedProgress * 20));
        
        if (direction === 'right') {
          element.style.transform = `translateX(${-offset}px)`;
        } else if (direction === 'left') {
          element.style.transform = `translateX(${offset}px)`;
        } else if (direction === 'top') {
          element.style.transform = `translateY(${offset}px)`;
        } else if (direction === 'bottom') {
          element.style.transform = `translateY(${-offset}px)`;
        }
        
        element.style.opacity = isExit ? `${animationProgress}` : '1';
        animationApplied = true;
      } else if (activeAnimation.type === AnimationType.Rotate) {
        // For entrance: 0 to rotation, for exit: rotation to 0
        const rotationAmount = activeAnimation.rotation || 360;
        const rotation = isExit 
          ? ((1 - easedProgress) * rotationAmount) 
          : (easedProgress * rotationAmount);
        element.style.transform = `rotate(${rotation}deg)`;
        element.style.opacity = isExit ? `${animationProgress}` : '1';
        animationApplied = true;
      } else if (activeAnimation.type === AnimationType.Bounce) {
        // Simple bounce effect 
        const bounceScale = isExit
          ? (1 - (easedProgress * 0.2) + (Math.sin(easedProgress * Math.PI * 2) * 0.1))
          : (1 + (Math.sin(easedProgress * Math.PI * 2) * 0.1));
        element.style.transform = `scale(${bounceScale})`;
        element.style.opacity = isExit ? `${animationProgress}` : '1';
        animationApplied = true;
      } else if (activeAnimation.type === AnimationType.Pulse) {
        // Simple pulse effect - opacity pulsing
        const basePulse = isExit ? animationProgress : 0.7;
        const pulseAmount = isExit ? 0.2 : 0.3;
        const pulseOpacity = basePulse + (Math.sin(easedProgress * Math.PI * 2) * pulseAmount);
        element.style.opacity = `${pulseOpacity}`;
        animationApplied = true;
      }
    } 
    // If no active animation but we've passed one, show the final state
    else if (finalAnimation) {
      // Check if the final animation is an exit animation
      const isExit = finalAnimation.mode === AnimationMode.Exit;
      
      // If it's an exit animation that has completed, hide the element
      if (isExit) {
        element.style.opacity = '0';
      } else {
        // For entrance animations that have completed, show the element
        if (finalAnimation.type === AnimationType.Fade) {
          element.style.opacity = '1';
        } else if (finalAnimation.type === AnimationType.Scale) {
          element.style.transform = 'scale(1.2)';
          element.style.opacity = '1';
        } else if (finalAnimation.type === AnimationType.Slide) {
          element.style.transform = 'translateY(0)';
          element.style.opacity = '1';
        } else if (finalAnimation.type === AnimationType.Rotate) {
          element.style.transform = `rotate(${finalAnimation.rotation || 360}deg)`;
          element.style.opacity = '1';
        } else if (finalAnimation.type === AnimationType.Bounce || 
                  finalAnimation.type === AnimationType.Pulse) {
          element.style.transform = 'scale(1)';
          element.style.opacity = '1';
        }
      }
      animationApplied = true;
    }
    
    // If no animation applied, keep element in default state
    if (!animationApplied) {
      element.style.opacity = defaultOpacity;
      if (defaultTransform) element.style.transform = defaultTransform;
    }
  };
  
  // Effect to handle resize events
  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        // Get the actual size of the container
        const rect = containerRef.current.getBoundingClientRect();
        setContainerDimensions({
          width: rect.width || 500,
          height: Math.max(rect.height, window.innerHeight * 0.6) || 400 // At least 60% of window height
        });
      }
    };
    
    // Initial update
    updateContainerSize();
    
    // Add event listener for window resize
    window.addEventListener('resize', updateContainerSize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', updateContainerSize);
    };
  }, []);
  
  // Update animations when currentTime changes
  useEffect(() => {
    // Process animations for each element
    // Use '1' as the default opacity to make elements visible by default
    processAnimations(headlineRef.current, headlineLayer, '1', 'translateY(0)');
    processAnimations(subtitleRef.current, subtitleLayer, '1', 'translateY(0)');
    processAnimations(buttonRef.current, buttonLayer, '1', 'scale(1)');
    processAnimations(logoRef.current, logoLayer, '1', 'rotate(0deg)');
  }, [currentTime, selectedFrameId]);

  // Calculate scaling factor to fit the frame within the preview area
  const calculateScaleFactor = () => {
    // Use container dimensions for more responsive scaling
    const containerWidth = containerDimensions.width;
    const containerHeight = containerDimensions.height;
    
    // Calculate scaling factors for both dimensions
    const widthScale = containerWidth / frameWidth;
    const heightScale = containerHeight / frameHeight;
    
    // Use the smaller scaling factor to ensure the frame fits within the preview area
    // Apply a small buffer (0.95) to ensure there's some margin
    return Math.min(widthScale, heightScale, 1) * 0.95; 
  };
  
  const scaleFactor = calculateScaleFactor();
  
  return (
    <div 
      ref={containerRef}
      className="h-full bg-neutral-900 flex items-center justify-center overflow-hidden"
    >
      <div className="flex flex-col items-center">
        <div className="mb-4 text-sm text-neutral-500">
          Time: {currentTime.toFixed(1)}s
        </div>
        
        {/* Canvas preview area with scaling */}
        <div className="relative" style={{ 
          width: `${frameWidth * scaleFactor}px`, 
          height: `${frameHeight * scaleFactor}px` 
        }}>
          <div
            ref={canvasRef}
            className="bg-white rounded shadow-lg overflow-hidden"
            style={{
              width: `${frameWidth}px`,
              height: `${frameHeight}px`,
              transform: `scale(${scaleFactor})`,
              transformOrigin: 'top left'
            }}
          >
            {/* Dynamic content based on visible layers */}
            <div className="relative w-full h-full">
              {/* Background - only show if visible */}
              {backgroundLayer && backgroundLayer.visible && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-700"></div>
              )}
              
              {/* Headline text - only show if visible */}
              <div className="absolute top-10 left-0 right-0 text-center">
                {headlineLayer && headlineLayer.visible && (
                  <h2 ref={headlineRef} className="text-white text-2xl font-bold mb-2 transition-all duration-300">
                    {selectedFrame.headlineText || "Amazing Offer"}
                  </h2>
                )}
                
                {subtitleLayer && subtitleLayer.visible && (
                  <p ref={subtitleRef} className="text-white text-sm transition-all duration-300">
                    {selectedFrame.description || "Limited time only!"}
                  </p>
                )}
              </div>
              
              {/* CTA Button - only show if visible */}
              <div className="absolute bottom-12 left-0 right-0 flex justify-center">
                {buttonLayer && buttonLayer.visible && (
                  <button 
                    ref={buttonRef}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded font-medium transition-all duration-300"
                  >
                    {selectedFrame.buttonText || "Shop Now"}
                  </button>
                )}
              </div>
              
              {/* Logo - only show if visible */}
              <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                {logoLayer && logoLayer.visible && (
                  <div ref={logoRef} className="text-white text-xs bg-white text-black px-2 py-1 rounded-full transition-all duration-300">
                    {selectedFrame.logoText || "LOGO"}
                  </div>
                )}
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