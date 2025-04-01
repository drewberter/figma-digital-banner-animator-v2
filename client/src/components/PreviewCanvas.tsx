import { useRef, useEffect, useState } from 'react';
import { mockFrames, mockLayers, mockGifFrames } from '../mock/animationData';
import { 
  AnimationType, 
  EasingType, 
  AnimationMode, 
  TimelineMode, 
  Animation, 
  AnimationLayer, 
  AnimationFrame 
} from '../types/animation';

interface PreviewCanvasProps {
  selectedFrameId?: string;
  currentTime?: number;
  timelineMode?: TimelineMode;
  // We don't need to pass height as a prop since the parent div has the height styling
}

const PreviewCanvas = ({ 
  selectedFrameId = 'frame-1',
  currentTime = 0,
  timelineMode = 'animation'
}: PreviewCanvasProps): JSX.Element => {
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
  
  // State to track user resize with localStorage persistence
  const [userResizeHeight, setUserResizeHeight] = useState<number | null>(() => {
    const savedHeight = localStorage.getItem('previewCanvasHeight');
    return savedHeight ? parseInt(savedHeight, 10) : null;
  });
  const [isResizing, setIsResizing] = useState(false);
  
  // Find the selected frame or default to the first one
  // If it's a GIF frame ID, we need to extract the parent ad size and use that
  const isGifFrame = selectedFrameId && selectedFrameId.startsWith('gif-frame-');
  
  // Extract ad size ID from GIF frame if needed
  let effectiveFrameId = selectedFrameId;
  if (isGifFrame) {
    const parts = selectedFrameId.split('-');
    if (parts.length >= 4) {
      if (parts[2] === 'frame') {
        // Format is gif-frame-frame-X-Y, so adSizeId is "frame-X"
        effectiveFrameId = `${parts[2]}-${parts[3]}`;
      } else {
        // Format is gif-frame-X-Y, determine if X is a frame number or part of the ad size ID
        effectiveFrameId = parts[2].startsWith('frame') ? parts[2] : `frame-${parts[2]}`;
      }
    } else if (parts.length === 4) {
      // Old format: gif-frame-1-1
      effectiveFrameId = `frame-${parts[2]}`;
    }

  }
  
  // Now get the actual frame data from mockFrames using the effective ID
  const selectedFrame = mockFrames.find(frame => frame.id === effectiveFrameId) || mockFrames[0];
  
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
  // For GIF frames, we need to use the parent ad size's layers
  const frameLayers = mockLayers[effectiveFrameId] || [];
  
  // Get the hidden layers for the current frame
  const hiddenLayerIds = selectedFrame.hiddenLayers || [];
  
  // Helper function to recursively find a layer by name in nested hierarchy
  const findLayerByName = (layers: any[], layerNames: string[], hiddenIds: string[] = []): any => {
    // First try to find a direct layer match
    const directLayer = layers.find(layer => 
      layerNames.includes(layer.name) && 
      layer.visible !== false && 
      !hiddenIds.includes(layer.id)
    );
    
    if (directLayer) return directLayer;
    
    // If not found, search inside visible containers (groups or frames)
    for (const layer of layers) {
      // Skip if this layer is hidden 
      if (!layer.visible || hiddenIds.includes(layer.id)) continue;
      
      // Check if this is a container (group or frame) with children
      const isContainer = (
        (layer.isGroup || layer.type === 'group' || layer.isFrame || layer.type === 'frame') &&
        layer.children && 
        Array.isArray(layer.children)
      );
      
      if (isContainer) {
        // Search inside container
        
        // Search recursively in the container's children
        const nestedResult = findLayerByName(layer.children, layerNames, hiddenIds);
        if (nestedResult) return nestedResult;
      }
    }
    
    return null;
  };

  // Find animation layers that correspond to our preview elements - with support for nested groups
  const backgroundLayer = findLayerByName(frameLayers, ['Background'], hiddenLayerIds);
  const headlineLayer = findLayerByName(frameLayers, ['Headline', 'Title'], hiddenLayerIds);
  const subtitleLayer = findLayerByName(frameLayers, ['Subhead', 'Tagline', 'Description'], hiddenLayerIds);
  const buttonLayer = findLayerByName(frameLayers, ['CTA Button', 'Button'], hiddenLayerIds);
  const logoLayer = findLayerByName(frameLayers, ['Logo'], hiddenLayerIds);
  
  // Store references to all the layers we found
  
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
    const sortedAnimations = layer.animations ? [...layer.animations].sort((a, b) => {
      const startA = a.startTime || 0;
      const startB = b.startTime || 0;
      return startA - startB;
    }) : [];
    
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
      
      // Get the animation duration and ensure it's properly respected
      const animationDuration = Math.max(0.1, activeAnimation.duration || 1);
      
      // Calculate progress based on current time relative to animation duration
      // Clamped between 0 and 1 to prevent values outside the valid range
      const rawProgress = Math.min(1, Math.max(0, (currentTime - startTime) / animationDuration));
      
      // Apply easing to get the final progress value
      const easedProgress = applyEasing(rawProgress, activeAnimation.easing);
      
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
      } else if (activeAnimation.type === AnimationType.CircleIn || 
                activeAnimation.type === AnimationType.CircleInTop || 
                activeAnimation.type === AnimationType.CircleInBottom || 
                activeAnimation.type === AnimationType.CircleInLeft || 
                activeAnimation.type === AnimationType.CircleInRight) {
        // Circle reveal animations using clip-path
        let origin = 'center';
        
        if (activeAnimation.type === AnimationType.CircleInTop) {
          origin = 'top center';
        } else if (activeAnimation.type === AnimationType.CircleInBottom) {
          origin = 'bottom center';
        } else if (activeAnimation.type === AnimationType.CircleInLeft) {
          origin = 'left center';
        } else if (activeAnimation.type === AnimationType.CircleInRight) {
          origin = 'right center';
        }
        
        const circleSize = isExit 
          ? (150 - easedProgress * 150) 
          : (easedProgress * 150);
        
        element.style.clipPath = `circle(${circleSize}% at ${origin})`;
        element.style.opacity = isExit ? `${animationProgress}` : '1';
        animationApplied = true;
      } else if (activeAnimation.type === AnimationType.CircleOut) {
        // Circle out animation
        const circleSize = isExit 
          ? (easedProgress * 150)
          : (150 - easedProgress * 150);
        
        element.style.clipPath = `circle(${circleSize}% at center)`;
        element.style.opacity = isExit ? `${animationProgress}` : '1';
        animationApplied = true;
      } else if (activeAnimation.type === AnimationType.PuffInCenter || 
                activeAnimation.type === AnimationType.PuffOutCenter) {
        // Puff effect using scale and blur
        const isPuffOut = activeAnimation.type === AnimationType.PuffOutCenter;
        const scale = isPuffOut
          ? 1 + easedProgress
          : 2 - easedProgress;
        
        const blur = isPuffOut
          ? easedProgress * 2
          : (1 - easedProgress) * 2;
          
        element.style.transform = `scale(${scale})`;
        element.style.filter = `blur(${blur}px)`;
        element.style.opacity = isExit || isPuffOut ? `${1 - easedProgress}` : `${easedProgress}`;
        animationApplied = true;
      } else if (activeAnimation.type === AnimationType.RotateScale) {
        // Combined rotation and scale effect
        const rotation = isExit
          ? (easedProgress * -180)
          : ((1 - easedProgress) * -180);
          
        const scale = isExit
          ? (1 - easedProgress)
          : easedProgress;
          
        element.style.transform = `rotate(${rotation}deg) scale(${scale})`;
        element.style.opacity = isExit ? `${animationProgress}` : `${easedProgress}`;
        animationApplied = true;
      } else if (activeAnimation.type === AnimationType.SlideLeft) {
        // Slide from left
        const offset = isExit
          ? (easedProgress * -100) + '%'
          : ((1 - easedProgress) * -100) + '%';
          
        element.style.transform = `translateX(${offset})`;
        element.style.opacity = isExit ? `${animationProgress}` : '1';
        animationApplied = true;
      } else if (activeAnimation.type === AnimationType.SlideRight) {
        // Slide from right
        const offset = isExit
          ? (easedProgress * 100) + '%'
          : ((1 - easedProgress) * 100) + '%';
          
        element.style.transform = `translateX(${offset})`;
        element.style.opacity = isExit ? `${animationProgress}` : '1';
        animationApplied = true;
      } else if (activeAnimation.type === AnimationType.Flicker3) {
        // Flicker 3 times effect
        const flickerStage = Math.floor(easedProgress * 6);
        const isVisible = flickerStage % 2 === 0;
        element.style.opacity = isVisible ? '1' : '0';
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
        } else if (finalAnimation.type === AnimationType.CircleIn || 
                  finalAnimation.type === AnimationType.CircleInTop || 
                  finalAnimation.type === AnimationType.CircleInBottom || 
                  finalAnimation.type === AnimationType.CircleInLeft || 
                  finalAnimation.type === AnimationType.CircleInRight) {
          element.style.clipPath = 'circle(150% at center)';
          element.style.opacity = '1';
        } else if (finalAnimation.type === AnimationType.CircleOut) {
          element.style.clipPath = 'circle(0% at center)';
          element.style.opacity = '0';
        } else if (finalAnimation.type === AnimationType.PuffInCenter) {
          element.style.transform = 'scale(1)';
          element.style.filter = 'blur(0)';
          element.style.opacity = '1';
        } else if (finalAnimation.type === AnimationType.PuffOutCenter) {
          element.style.transform = 'scale(2)';
          element.style.filter = 'blur(2px)';
          element.style.opacity = '0';
        } else if (finalAnimation.type === AnimationType.RotateScale) {
          element.style.transform = 'rotate(0) scale(1)';
          element.style.opacity = '1';
        } else if (finalAnimation.type === AnimationType.SlideLeft || 
                  finalAnimation.type === AnimationType.SlideRight) {
          element.style.transform = 'translateX(0)';
          element.style.opacity = '1';
        } else if (finalAnimation.type === AnimationType.Flicker3) {
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
  
  // Handle mouse events for resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    
    // Get container position info
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calculate new height based on mouse position relative to container top
    const newHeight = Math.max(200, e.clientY - containerRect.top);
    
    // Update user resize height
    setUserResizeHeight(newHeight);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // Save the height preference to localStorage when the user finishes resizing
    if (userResizeHeight) {
      localStorage.setItem('previewCanvasHeight', userResizeHeight.toString());
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
          // If user has manually resized, use that height, otherwise use default
          height: userResizeHeight || Math.max(rect.height, window.innerHeight * 0.6) || 400
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
      // Also clean up any lingering resize event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [userResizeHeight]);
  
  // Update animations when currentTime changes (for Animation mode)
  useEffect(() => {
    // Only apply animation effects in Animation mode
    if (timelineMode !== 'animation') return;

    // Use requestAnimationFrame to batch DOM updates
    // This helps avoid layout thrashing and improves performance
    let animationFrameId: number;
    
    const updateAnimations = () => {
      // Determine if we have any animations at all for each element
      const hasHeadlineAnimations = headlineLayer && headlineLayer.animations && headlineLayer.animations.length > 0;
      const hasSubtitleAnimations = subtitleLayer && subtitleLayer.animations && subtitleLayer.animations.length > 0;
      const hasButtonAnimations = buttonLayer && buttonLayer.animations && buttonLayer.animations.length > 0;
      const hasLogoAnimations = logoLayer && logoLayer.animations && logoLayer.animations.length > 0;
      
      // Process animations for each element
      // Only use '0' opacity for elements that have animations
      // For elements with no animations, use '1' to show them by default
      processAnimations(headlineRef.current, headlineLayer, hasHeadlineAnimations ? '0' : '1', 'translateY(0)');
      processAnimations(subtitleRef.current, subtitleLayer, hasSubtitleAnimations ? '0' : '1', 'translateY(0)');
      processAnimations(buttonRef.current, buttonLayer, hasButtonAnimations ? '0' : '1', 'scale(1)');
      processAnimations(logoRef.current, logoLayer, hasLogoAnimations ? '0' : '1', 'rotate(0deg)');
    };
    
    // Schedule animation updates using requestAnimationFrame for better performance
    animationFrameId = requestAnimationFrame(updateAnimations);
    
    // Clean up function to cancel any pending animation frame
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [currentTime, headlineLayer, subtitleLayer, buttonLayer, logoLayer, timelineMode]);
  
  // Handle GIF frame mode visibility settings
  useEffect(() => {
    // Only apply in GIF frame mode or when not in animation mode
    if (timelineMode === 'animation') return;
    
    // Get the current GIF frame to read its layer visibility settings
    if (isGifFrame) {
      const currentGifFrame = mockGifFrames.find(f => f.id === selectedFrameId);
      if (currentGifFrame) {
        // Apply the frame's delay setting (for preview purposes)
        const frameDelay = currentGifFrame.delay || 1.0;
        
        // Helper function to check if a layer or any of its parents are hidden
        // This function handles nested layer hierarchies correctly
        const isLayerOrParentHidden = (layerName: string, currentGifFrame: any) => {
          // Make sure hiddenLayers exists and is an array
          const hiddenLayers = Array.isArray(currentGifFrame.hiddenLayers) 
            ? currentGifFrame.hiddenLayers 
            : [];
          
          // First check if the layer itself is hidden directly
          const directLayerHidden = hiddenLayers.some((id: string) => 
            id.includes(layerName) || (layerName === 'Headline' && id.endsWith('-2')) ||
            (layerName === 'Subhead' && id.endsWith('-3')) ||
            (layerName === 'CTA Button' && id.endsWith('-4')) ||
            (layerName === 'Logo' && id.endsWith('-5'))
          );
          
          if (directLayerHidden) return true;
          
          // Then check if the layer might be within a Content Group or Call to Action container that's hidden
          const contentGroupHidden = hiddenLayers.some((id: string) => 
            id.includes('Content Group') || id.includes('group-')
          );
          
          const callToActionHidden = hiddenLayers.some((id: string) => 
            id.includes('Call to Action') || id === 'frame-1-inner'
          );
          
          // If any container is hidden, its children should be hidden too
          if (contentGroupHidden) {
            // When Content Group is hidden, we need to check if this specific layer is within it
            // For this demo, we know that Headline and Subhead are typically in Content Group
            if (layerName === 'Headline' || layerName === 'Subhead') {
              return true;
            }
          }
          
          // Check for CTA Button inside Call to Action frame
          if (callToActionHidden && layerName === 'CTA Button') {
            return true;
          }
          
          return false;
        };
        
        // Apply more accurate detection of hidden layers with nested structure awareness
        const isHeadlineHidden = isLayerOrParentHidden('Headline', currentGifFrame);
        const isSubheadHidden = isLayerOrParentHidden('Subhead', currentGifFrame);
        const isButtonHidden = isLayerOrParentHidden('CTA Button', currentGifFrame);
        const isLogoHidden = isLayerOrParentHidden('Logo', currentGifFrame);
        
        // Apply visibility to each element
        if (headlineRef.current) {
          headlineRef.current.style.opacity = isHeadlineHidden ? '0' : '1';
          headlineRef.current.style.transform = 'translateY(0)';
        }
        if (subtitleRef.current) {
          subtitleRef.current.style.opacity = isSubheadHidden ? '0' : '1';
          subtitleRef.current.style.transform = 'translateY(0)';
        }
        if (buttonRef.current) {
          buttonRef.current.style.opacity = isButtonHidden ? '0' : '1';
          buttonRef.current.style.transform = 'scale(1)';
        }
        if (logoRef.current) {
          logoRef.current.style.opacity = isLogoHidden ? '0' : '1';
          logoRef.current.style.transform = 'rotate(0deg)';
        }
      } else {
        // If we can't find the GIF frame, make all elements visible
        if (headlineRef.current) headlineRef.current.style.opacity = '1';
        if (subtitleRef.current) subtitleRef.current.style.opacity = '1';
        if (buttonRef.current) buttonRef.current.style.opacity = '1';
        if (logoRef.current) logoRef.current.style.opacity = '1';
      }
    } else {
      // Default behavior - show all elements
      if (headlineRef.current) {
        headlineRef.current.style.opacity = '1';
        headlineRef.current.style.transform = 'translateY(0)';
      }
      if (subtitleRef.current) {
        subtitleRef.current.style.opacity = '1';
        subtitleRef.current.style.transform = 'translateY(0)';
      }
      if (buttonRef.current) {
        buttonRef.current.style.opacity = '1';
        buttonRef.current.style.transform = 'scale(1)';
      }
      if (logoRef.current) {
        logoRef.current.style.opacity = '1';
        logoRef.current.style.transform = 'rotate(0deg)';
      }
    }
  }, [selectedFrameId, timelineMode, isGifFrame]);

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
  
  // Function to get active animations for each element
  // Check if any animations are currently running
  const isAnimationRunning = () => {
    // Get all layers that potentially have animations
    const animatedLayers = [headlineLayer, subtitleLayer, buttonLayer, logoLayer];
    
    // For each layer, check if it has an active animation at the current time
    return animatedLayers.some(layer => {
      return layer?.animations?.some((animation: Animation) => {
        const start = animation.startTime || 0;
        return start <= currentTime && (start + animation.duration) >= currentTime;
      });
    });
  };
  
  // Simplified animation status for display
  const animationsRunning = isAnimationRunning();

  // Main return statement with performance optimizations
  return (
    <div 
      ref={containerRef}
      className="bg-neutral-900 flex items-center justify-center overflow-hidden relative"
      style={{ 
        height: '100%', // Using parent controlled height now
        // Add optimizations for smooth animations and performance
        transform: 'translateZ(0)', // Force GPU acceleration
        willChange: isResizing ? 'height, transform' : 'transform',
        backfaceVisibility: 'hidden',
        transition: isResizing ? 'none' : 'height 0.2s ease-in-out'
      }}
    >
      <div className="flex flex-col items-center w-full max-w-[800px]">
        <div className="w-full max-w-[400px] mb-4">
          <div className="text-sm text-neutral-500 mb-1 flex justify-between">
            <span>Time: {currentTime.toFixed(1)}s</span>
            <span>{animationsRunning ? "Animating..." : "Idle"}</span>
          </div>
        </div>
        
        {/* Canvas preview area with scaling - using fixed height/width to prevent layout thrashing */}
        <div className="relative" style={{ 
          width: `${frameWidth * scaleFactor}px`, 
          height: `${frameHeight * scaleFactor}px`,
          transform: 'translateZ(0)', /* Force GPU acceleration */
          willChange: 'transform', /* Hint to browser that this element will animate */
          perspective: '1000px', /* Creates a 3D rendering context */
          backfaceVisibility: 'hidden' /* Reduce visual glitches */
        }}>
          <div
            ref={canvasRef}
            className="bg-white rounded shadow-lg overflow-hidden"
            style={{
              width: `${frameWidth}px`,
              height: `${frameHeight}px`,
              transform: `scale(${scaleFactor})`,
              transformOrigin: 'top left',
              willChange: 'transform, opacity' /* Optimize animations */
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
                  <h2 
                    ref={headlineRef} 
                    className="text-white text-2xl font-bold mb-2 transition-all duration-300"
                    style={{
                      willChange: 'transform, opacity',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }}
                  >
                    {selectedFrame.headlineText || "Amazing Offer"}
                  </h2>
                )}
                
                {subtitleLayer && subtitleLayer.visible && (
                  <p 
                    ref={subtitleRef} 
                    className="text-white text-sm transition-all duration-300"
                    style={{
                      willChange: 'transform, opacity',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }}
                  >
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
                    style={{
                      willChange: 'transform, opacity',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }}
                  >
                    {selectedFrame.buttonText || "Shop Now"}
                  </button>
                )}
              </div>
              
              {/* Logo - only show if visible */}
              <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                {logoLayer && logoLayer.visible && (
                  <div 
                    ref={logoRef} 
                    className="text-white text-xs bg-white text-black px-2 py-1 rounded-full transition-all duration-300"
                    style={{
                      willChange: 'transform, opacity',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }}
                  >
                    {selectedFrame.logoText || "LOGO"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-neutral-400 relative">
          {selectedFrame.width} × {selectedFrame.height}
          
          {/* Visual indicator when resizing from Timeline handle */}
          {isResizing && (
            <div className="absolute bottom-[-20px] left-0 right-0 text-[10px] text-blue-400 text-center">
              {Math.round(userResizeHeight || 0)}px
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewCanvas;