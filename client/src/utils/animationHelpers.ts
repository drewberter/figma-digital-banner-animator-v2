import { gsap } from 'gsap';
import { AnimationType, EasingType } from '../types/animation';

// Convert easing type to GSAP easing
export function getGsapEasing(easing: EasingType): string {
  switch (easing) {
    case EasingType.Linear:
      return 'none';
    case EasingType.EaseIn:
      return 'power2.in';
    case EasingType.EaseOut:
      return 'power2.out';
    case EasingType.EaseInOut:
      return 'power2.inOut';
    case EasingType.Bounce:
      return 'bounce.out';
    case EasingType.Custom:
      return 'power2.out'; // Default for custom
    default:
      return 'power2.out';
  }
}

// Create a GSAP timeline for an animation
export function createAnimation(
  element: HTMLElement,
  type: AnimationType,
  duration: number,
  options: Record<string, any> = {}
): gsap.core.Timeline {
  const timeline = gsap.timeline({
    paused: true,
    delay: options.delay || 0
  });
  
  const easing = getGsapEasing(options.easing || EasingType.EaseOut);
  
  switch (type) {
    case AnimationType.Fade:
      timeline.fromTo(element, 
        { opacity: options.fadeFrom || 0 }, 
        { 
          opacity: options.fadeTo || 1, 
          duration, 
          ease: easing 
        }
      );
      break;
    
    case AnimationType.Slide:
      // Get the direction from options or default to "right"
      const direction = options.direction || 'right';
      
      // Use distance option or default to element width/height or 100px
      let distanceX = options.distanceX || null;
      let distanceY = options.distanceY || null;
      let fromX = 0, fromY = 0, fromRotation = 0;
      let opacity = options.opacity !== undefined ? options.opacity : 0;
      
      // Set default distance if not provided
      if (distanceX === null) {
        // Try to use element width or default to 100
        distanceX = element.offsetWidth > 0 ? element.offsetWidth : 100;
      }
      
      if (distanceY === null) {
        // Try to use element height or default to 100
        distanceY = element.offsetHeight > 0 ? element.offsetHeight : 100;
      }
      
      // Apply a slight rotation based on direction for more dynamic feel
      const applyRotation = options.rotation !== false;
      const rotationAmount = options.rotationAmount || 5;
      
      // Determine animation starting position and rotation based on direction
      switch (direction) {
        case 'left':
          fromX = -distanceX;
          if (applyRotation) fromRotation = -rotationAmount;
          break;
        case 'right':
          fromX = distanceX;
          if (applyRotation) fromRotation = rotationAmount;
          break;
        case 'up':
          fromY = -distanceY;
          if (applyRotation) fromRotation = rotationAmount;
          break;
        case 'down':
          fromY = distanceY;
          if (applyRotation) fromRotation = -rotationAmount;
          break;
        case 'top-left':
          fromX = -distanceX;
          fromY = -distanceY;
          if (applyRotation) fromRotation = -rotationAmount;
          break;
        case 'top-right':
          fromX = distanceX;
          fromY = -distanceY;
          if (applyRotation) fromRotation = rotationAmount;
          break;
        case 'bottom-left':
          fromX = -distanceX;
          fromY = distanceY;
          if (applyRotation) fromRotation = -rotationAmount;
          break;
        case 'bottom-right':
          fromX = distanceX;
          fromY = distanceY;
          if (applyRotation) fromRotation = rotationAmount;
          break;
        // Add special slide effects
        case 'spring-right':
          timeline.fromTo(element, 
            { 
              x: distanceX, 
              y: 0, 
              rotation: rotationAmount,
              opacity: opacity 
            }, 
            { 
              x: 0, 
              y: 0, 
              rotation: 0,
              opacity: 1, 
              duration, 
              ease: 'elastic.out(1,0.4)' 
            }
          );
          return timeline; // Return early since we've already set up the animation
        case 'spring-left':
          timeline.fromTo(element, 
            { 
              x: -distanceX, 
              y: 0, 
              rotation: -rotationAmount,
              opacity: opacity 
            }, 
            { 
              x: 0, 
              y: 0, 
              rotation: 0,
              opacity: 1, 
              duration, 
              ease: 'elastic.out(1,0.4)' 
            }
          );
          return timeline; // Return early since we've already set up the animation
        case 'bounce-in':
          timeline.fromTo(element, 
            { 
              scale: 0.7,
              opacity: opacity 
            }, 
            { 
              scale: 1,
              opacity: 1, 
              duration, 
              ease: 'bounce.out' 
            }
          );
          return timeline; // Return early since we've already set up the animation
        case 'swing':
          timeline.fromTo(element, 
            { 
              rotation: direction === 'left' ? -40 : 40,
              x: direction === 'left' ? -distanceX : distanceX,
              opacity: opacity,
              transformOrigin: 'top center'
            }, 
            { 
              rotation: 0,
              x: 0,
              opacity: 1, 
              duration, 
              ease: 'back.out(1.7)' 
            }
          );
          return timeline; // Return early since we've already set up the animation
      }
      
      // Standard slide animation with optional rotation
      timeline.fromTo(element, 
        { 
          x: fromX, 
          y: fromY,
          rotation: fromRotation,
          opacity: opacity 
        }, 
        { 
          x: 0, 
          y: 0,
          rotation: 0,
          opacity: 1, 
          duration, 
          ease: easing 
        }
      );
      break;
    
    case AnimationType.Scale:
      timeline.fromTo(element, 
        { 
          scale: options.scaleFrom || 0, 
          opacity: options.opacity !== undefined ? options.opacity : 0 
        }, 
        { 
          scale: options.scaleTo || 1, 
          opacity: 1, 
          duration, 
          ease: easing 
        }
      );
      break;
    
    case AnimationType.Rotate:
      timeline.fromTo(element, 
        { 
          rotation: options.rotateFrom || -90, 
          opacity: options.opacity !== undefined ? options.opacity : 0 
        }, 
        { 
          rotation: options.rotateTo || 0, 
          opacity: 1, 
          duration, 
          ease: easing 
        }
      );
      break;
    
    case AnimationType.Bounce:
      timeline.fromTo(element, 
        { 
          scale: options.scaleFrom || 0, 
          opacity: options.opacity !== undefined ? options.opacity : 0 
        }, 
        { 
          scale: options.scaleTo || 1, 
          opacity: 1, 
          duration, 
          ease: 'bounce.out' 
        }
      );
      break;
    
    case AnimationType.Pulse:
      timeline.to(element, { 
        scale: options.intensity || 1.2, 
        duration: duration / 2, 
        ease: 'power2.inOut' 
      })
      .to(element, { 
        scale: 1, 
        duration: duration / 2, 
        ease: 'power2.inOut' 
      });
      break;
      
    // New rotation and flip animations
    case AnimationType.Rotate90:
      timeline.fromTo(element,
        {
          rotation: options.rotateFrom || 0,
          opacity: options.opacity !== undefined ? options.opacity : 0
        },
        {
          rotation: 90,
          opacity: 1,
          duration,
          ease: easing
        }
      );
      break;
    
    case AnimationType.RotateMinus90:
      timeline.fromTo(element,
        {
          rotation: options.rotateFrom || 0,
          opacity: options.opacity !== undefined ? options.opacity : 0
        },
        {
          rotation: -90,
          opacity: 1,
          duration,
          ease: easing
        }
      );
      break;

    case AnimationType.FlipVertical:
      timeline.fromTo(element,
        {
          scaleY: 1,
          rotationX: 0,
          opacity: options.opacity !== undefined ? options.opacity : 1
        },
        {
          rotationX: 180,
          opacity: 1,
          duration,
          ease: easing
        }
      );
      break;
    
    case AnimationType.FlipHorizontal:
      timeline.fromTo(element,
        {
          scaleX: 1,
          rotationY: 0,
          opacity: options.opacity !== undefined ? options.opacity : 1
        },
        {
          rotationY: 180,
          opacity: 1,
          duration,
          ease: easing
        }
      );
      break;
    
    // Attention seekers
    case AnimationType.Blink:
      timeline.to(element, {
        keyframes: [
          { opacity: 1, duration: 0 },
          { opacity: 0, duration: duration / 4 },
          { opacity: 1, duration: duration / 4 },
          { opacity: 0, duration: duration / 4 },
          { opacity: 1, duration: duration / 4 }
        ],
        ease: 'none',
        duration
      });
      break;
    
    case AnimationType.BounceTop:
      timeline.to(element, {
        keyframes: [
          { y: 0, duration: 0 },
          { y: -15, duration: duration / 2, ease: 'power2.out' },
          { y: 0, duration: duration / 2, ease: 'bounce.out' }
        ],
        duration
      });
      break;
    
    case AnimationType.BounceRight:
      timeline.to(element, {
        keyframes: [
          { x: 0, duration: 0 },
          { x: 15, duration: duration / 2, ease: 'power2.out' },
          { x: 0, duration: duration / 2, ease: 'bounce.out' }
        ],
        duration
      });
      break;
    
    case AnimationType.BounceBottom:
      timeline.to(element, {
        keyframes: [
          { y: 0, duration: 0 },
          { y: 15, duration: duration / 2, ease: 'power2.out' },
          { y: 0, duration: duration / 2, ease: 'bounce.out' }
        ],
        duration
      });
      break;
    
    case AnimationType.BounceLeft:
      timeline.to(element, {
        keyframes: [
          { x: 0, duration: 0 },
          { x: -15, duration: duration / 2, ease: 'power2.out' },
          { x: 0, duration: duration / 2, ease: 'bounce.out' }
        ],
        duration
      });
      break;
    
    case AnimationType.Flicker:
      timeline.to(element, {
        keyframes: [
          { opacity: 1, duration: 0 },
          { opacity: 0, duration: duration * 0.1 },
          { opacity: 1, duration: duration * 0.1 },
          { opacity: 0, duration: duration * 0.1 },
          { opacity: 1, duration: duration * 0.1 },
          { opacity: 1, duration: duration * 0.3 },
          { opacity: 0, duration: duration * 0.1 },
          { opacity: 1, duration: duration * 0.1 },
          { opacity: 1, duration: duration * 0.1 }
        ],
        ease: 'none',
        duration
      });
      break;
    
    case AnimationType.FlickerFade:
      timeline.to(element, {
        keyframes: [
          { opacity: 0.2, duration: 0 },
          { opacity: 1, duration: duration * 0.1 },
          { opacity: 0.2, duration: duration * 0.1 },
          { opacity: 1, duration: duration * 0.1 },
          { opacity: 0.2, duration: duration * 0.2 },
          { opacity: 1, duration: duration * 0.1 },
          { opacity: 0.2, duration: duration * 0.2 },
          { opacity: 1, duration: duration * 0.1 },
          { opacity: 0.2, duration: duration * 0.1 }
        ],
        ease: 'none',
        duration
      });
      break;
    
    case AnimationType.JelloHorizontal:
      timeline.to(element, {
        keyframes: [
          { transform: 'scale3d(1, 1, 1)', duration: 0 },
          { transform: 'scale3d(1.25, 0.75, 1)', duration: duration * 0.3 },
          { transform: 'scale3d(0.75, 1.25, 1)', duration: duration * 0.1 },
          { transform: 'scale3d(1.15, 0.85, 1)', duration: duration * 0.1 },
          { transform: 'scale3d(0.95, 1.05, 1)', duration: duration * 0.15 },
          { transform: 'scale3d(1.05, 0.95, 1)', duration: duration * 0.1 },
          { transform: 'scale3d(1, 1, 1)', duration: duration * 0.25 }
        ],
        duration
      });
      break;
    
    case AnimationType.JelloVertical:
      timeline.to(element, {
        keyframes: [
          { transform: 'scale3d(1, 1, 1)', duration: 0 },
          { transform: 'scale3d(0.75, 1.25, 1)', duration: duration * 0.3 },
          { transform: 'scale3d(1.25, 0.75, 1)', duration: duration * 0.1 },
          { transform: 'scale3d(0.85, 1.15, 1)', duration: duration * 0.1 },
          { transform: 'scale3d(1.05, 0.95, 1)', duration: duration * 0.15 },
          { transform: 'scale3d(0.95, 1.05, 1)', duration: duration * 0.1 },
          { transform: 'scale3d(1, 1, 1)', duration: duration * 0.25 }
        ],
        duration
      });
      break;

    case AnimationType.Heartbeat:
      timeline.to(element, {
        keyframes: [
          { scale: 1, duration: 0 },
          { scale: 1.3, duration: duration * 0.14 },
          { scale: 1, duration: duration * 0.14 },
          { scale: 1.3, duration: duration * 0.14 },
          { scale: 1, duration: duration * 0.28 },
          { scale: 1, duration: duration * 0.3 }
        ],
        duration
      });
      break;
    
    case AnimationType.ShakeHorizontal:
      timeline.to(element, {
        keyframes: [
          { x: 0, duration: 0 },
          { x: -8, duration: duration * 0.1 },
          { x: 8, duration: duration * 0.1 },
          { x: -8, duration: duration * 0.1 },
          { x: 8, duration: duration * 0.1 },
          { x: -8, duration: duration * 0.1 },
          { x: 8, duration: duration * 0.1 },
          { x: -8, duration: duration * 0.1 },
          { x: 8, duration: duration * 0.1 },
          { x: -8, duration: duration * 0.1 },
          { x: 0, duration: duration * 0.1 }
        ],
        duration
      });
      break;
    
    case AnimationType.ShakeLeft:
      timeline.to(element, {
        keyframes: [
          { x: 0, duration: 0 },
          { x: -10, duration: duration * 0.2 },
          { x: -5, duration: duration * 0.2 },
          { x: -8, duration: duration * 0.2 },
          { x: -3, duration: duration * 0.2 },
          { x: 0, duration: duration * 0.2 }
        ],
        duration
      });
      break;
    
    case AnimationType.ShakeTop:
      timeline.to(element, {
        keyframes: [
          { y: 0, duration: 0 },
          { y: -8, duration: duration * 0.1 },
          { y: 0, duration: duration * 0.1 },
          { y: -8, duration: duration * 0.1 },
          { y: 0, duration: duration * 0.1 },
          { y: -8, duration: duration * 0.1 },
          { y: 0, duration: duration * 0.1 },
          { y: -8, duration: duration * 0.1 },
          { y: 0, duration: duration * 0.1 },
          { y: -8, duration: duration * 0.1 },
          { y: 0, duration: duration * 0.1 }
        ],
        duration
      });
      break;
    
    case AnimationType.Ping:
      timeline.to(element, {
        keyframes: [
          { scale: 1, opacity: 1, duration: 0 },
          { scale: 1, opacity: 1, duration: duration * 0.7 },
          { scale: 2.5, opacity: 0, duration: duration * 0.3 }
        ],
        duration
      });
      break;
    
    // Transitions
    case AnimationType.WipeIn:
      // Get the direction from options or default to "right"
      const wipeInDirection = options.direction || 'right';
      let wipeInClipStart = 'inset(0 100% 0 0)'; // Default: from right
      
      // Determine the starting clip path based on the wipe direction
      switch (wipeInDirection) {
        case 'right':
          wipeInClipStart = 'inset(0 100% 0 0)'; // From right edge
          break;
        case 'left':
          wipeInClipStart = 'inset(0 0 0 100%)'; // From left edge
          break;
        case 'top':
          wipeInClipStart = 'inset(100% 0 0 0)'; // From top edge
          break;
        case 'bottom':
          wipeInClipStart = 'inset(0 0 100% 0)'; // From bottom edge
          break;
        case 'center-h':
          // Reveal from center horizontally
          timeline.fromTo(element,
            { 
              clipPath: 'inset(0 50% 0 50%)',
              opacity: 1
            },
            {
              clipPath: 'inset(0 0 0 0)',
              opacity: 1,
              duration,
              ease: easing
            }
          );
          return timeline; // Return early since we've already set up the animation
        case 'center-v':
          // Reveal from center vertically
          timeline.fromTo(element,
            { 
              clipPath: 'inset(50% 0 50% 0)',
              opacity: 1
            },
            {
              clipPath: 'inset(0 0 0 0)',
              opacity: 1,
              duration,
              ease: easing
            }
          );
          return timeline; // Return early since we've already set up the animation
      }
      
      // Standard directional wipe
      timeline.fromTo(element,
        { 
          clipPath: wipeInClipStart,
          opacity: 1,
          transformOrigin: 'center center'
        },
        {
          clipPath: 'inset(0 0 0 0)',
          opacity: 1,
          duration,
          ease: easing
        }
      );
      break;
    
    case AnimationType.WipeOut:
      // Get the direction from options or default to "right"
      const wipeOutDirection = options.direction || 'left';
      let wipeOutClipEnd = 'inset(0 0 0 100%)'; // Default: to left
      
      // Determine the ending clip path based on the wipe direction
      switch (wipeOutDirection) {
        case 'left':
          wipeOutClipEnd = 'inset(0 0 0 100%)'; // To left edge
          break;
        case 'right':
          wipeOutClipEnd = 'inset(0 100% 0 0)'; // To right edge
          break;
        case 'top':
          wipeOutClipEnd = 'inset(100% 0 0 0)'; // To top edge
          break;
        case 'bottom':
          wipeOutClipEnd = 'inset(0 0 100% 0)'; // To bottom edge
          break;
        case 'center-h':
          // Collapse to center horizontally
          timeline.fromTo(element,
            { 
              clipPath: 'inset(0 0 0 0)',
              opacity: 1
            },
            {
              clipPath: 'inset(0 50% 0 50%)',
              opacity: 1,
              duration,
              ease: easing
            }
          );
          return timeline; // Return early since we've already set up the animation
        case 'center-v':
          // Collapse to center vertically
          timeline.fromTo(element,
            { 
              clipPath: 'inset(0 0 0 0)',
              opacity: 1
            },
            {
              clipPath: 'inset(50% 0 50% 0)',
              opacity: 1,
              duration,
              ease: easing
            }
          );
          return timeline; // Return early since we've already set up the animation
      }
      
      // Standard directional wipe
      timeline.fromTo(element,
        { 
          clipPath: 'inset(0 0 0 0)',
          opacity: 1,
          transformOrigin: 'center center'
        },
        {
          clipPath: wipeOutClipEnd,
          opacity: 1,
          duration,
          ease: easing
        }
      );
      break;
    
    case AnimationType.FadeIn:
      timeline.fromTo(element,
        { opacity: 0 },
        { 
          opacity: 1, 
          duration,
          ease: easing
        }
      );
      break;
    
    case AnimationType.FadeOut:
      timeline.fromTo(element,
        { opacity: 1 },
        { 
          opacity: 0, 
          duration,
          ease: easing
        }
      );
      break;
    
    case AnimationType.SlideUp:
      // Get distance from options or calculate based on element height
      const slideUpDistance = options.distanceY || (element.offsetHeight > 0 ? element.offsetHeight : 100);
      const slideUpVariant = options.variant || 'standard';
      
      switch (slideUpVariant) {
        case 'spring':
          timeline.fromTo(element,
            {
              y: slideUpDistance,
              opacity: options.opacity !== undefined ? options.opacity : 0
            },
            {
              y: 0,
              opacity: 1,
              duration,
              ease: 'elastic.out(1,0.5)'
            }
          );
          break;
        case 'overshoot':
          timeline.fromTo(element,
            {
              y: slideUpDistance,
              opacity: options.opacity !== undefined ? options.opacity : 0
            },
            {
              y: 0,
              opacity: 1,
              duration,
              ease: 'back.out(1.7)'
            }
          );
          break;
        case 'soft':
          timeline.fromTo(element,
            {
              y: slideUpDistance * 0.7,
              opacity: options.opacity !== undefined ? options.opacity : 0
            },
            {
              y: 0,
              opacity: 1,
              duration,
              ease: 'power3.out'
            }
          );
          break;
        case 'stagger':
          // For staggered entrance, move the element up and down slightly
          timeline.fromTo(element,
            {
              y: slideUpDistance,
              opacity: 0
            },
            {
              y: -10, // Overshoot up
              opacity: 1,
              duration: duration * 0.7,
              ease: 'power2.out'
            }
          ).to(element, {
            y: 0, // Settle back to final position
            duration: duration * 0.3,
            ease: 'power1.inOut'
          });
          break;
        default: // standard
          timeline.fromTo(element,
            {
              y: slideUpDistance,
              opacity: options.opacity !== undefined ? options.opacity : 0
            },
            {
              y: 0,
              opacity: 1,
              duration,
              ease: easing
            }
          );
          break;
      }
      break;
    
    case AnimationType.SlideDown:
      // Get distance from options or calculate based on element height
      const slideDownDistance = options.distanceY || (element.offsetHeight > 0 ? element.offsetHeight : 100);
      const slideDownVariant = options.variant || 'standard';
      
      switch (slideDownVariant) {
        case 'spring':
          timeline.fromTo(element,
            {
              y: -slideDownDistance,
              opacity: options.opacity !== undefined ? options.opacity : 0
            },
            {
              y: 0,
              opacity: 1,
              duration,
              ease: 'elastic.out(1,0.5)'
            }
          );
          break;
        case 'overshoot':
          timeline.fromTo(element,
            {
              y: -slideDownDistance,
              opacity: options.opacity !== undefined ? options.opacity : 0
            },
            {
              y: 0,
              opacity: 1,
              duration,
              ease: 'back.out(1.7)'
            }
          );
          break;
        case 'soft':
          timeline.fromTo(element,
            {
              y: -slideDownDistance * 0.7,
              opacity: options.opacity !== undefined ? options.opacity : 0
            },
            {
              y: 0,
              opacity: 1,
              duration,
              ease: 'power3.out'
            }
          );
          break;
        case 'stagger':
          // For staggered entrance, move the element down and up slightly
          timeline.fromTo(element,
            {
              y: -slideDownDistance,
              opacity: 0
            },
            {
              y: 10, // Overshoot down
              opacity: 1,
              duration: duration * 0.7,
              ease: 'power2.out'
            }
          ).to(element, {
            y: 0, // Settle back to final position
            duration: duration * 0.3,
            ease: 'power1.inOut'
          });
          break;
        default: // standard
          timeline.fromTo(element,
            {
              y: -slideDownDistance,
              opacity: options.opacity !== undefined ? options.opacity : 0
            },
            {
              y: 0,
              opacity: 1,
              duration,
              ease: easing
            }
          );
          break;
      }
      break;
    
    case AnimationType.ScaleUp:
      const scaleUpVariant = options.variant || 'standard';
      const scaleUpFrom = options.scaleFrom || 0.5;
      const scaleUpTo = options.scaleTo || 1.2;
      
      switch (scaleUpVariant) {
        case 'bounce':
          timeline.fromTo(element,
            {
              scale: scaleUpFrom,
              opacity: options.opacity !== undefined ? options.opacity : 0
            },
            {
              scale: scaleUpTo,
              opacity: 1,
              duration,
              ease: 'bounce.out'
            }
          );
          break;
        case 'elastic':
          timeline.fromTo(element,
            {
              scale: scaleUpFrom,
              opacity: options.opacity !== undefined ? options.opacity : 0
            },
            {
              scale: scaleUpTo,
              opacity: 1,
              duration,
              ease: 'elastic.out(1,0.3)'
            }
          );
          break;
        case '3d':
          // 3D-like scale effect with perspective
          timeline.fromTo(element,
            {
              scale: scaleUpFrom,
              opacity: options.opacity !== undefined ? options.opacity : 0,
              transformOrigin: 'center center',
              perspective: 400,
              rotationX: 10,
              z: -50
            },
            {
              scale: scaleUpTo,
              opacity: 1,
              rotationX: 0,
              z: 0,
              duration,
              ease: 'back.out(1.7)'
            }
          );
          break;
        case 'pulse':
          // Scale with a slight pulse at the end
          timeline.fromTo(element,
            {
              scale: scaleUpFrom,
              opacity: options.opacity !== undefined ? options.opacity : 0
            },
            {
              scale: scaleUpTo * 1.1, // Overshoot
              opacity: 1,
              duration: duration * 0.7,
              ease: 'power2.out'
            }
          ).to(element, {
            scale: scaleUpTo,
            duration: duration * 0.3,
            ease: 'power1.inOut'
          });
          break;
        default: // standard
          timeline.fromTo(element,
            {
              scale: scaleUpFrom,
              opacity: options.opacity !== undefined ? options.opacity : 0
            },
            {
              scale: scaleUpTo,
              opacity: 1,
              duration,
              ease: easing
            }
          );
          break;
      }
      break;
    
    case AnimationType.ScaleDown:
      const scaleDownVariant = options.variant || 'standard';
      const scaleDownFrom = options.scaleFrom || 1.5;
      const scaleDownTo = options.scaleTo || 0.8;
      
      switch (scaleDownVariant) {
        case 'bounce':
          timeline.fromTo(element,
            {
              scale: scaleDownFrom,
              opacity: options.opacity !== undefined ? options.opacity : 0
            },
            {
              scale: scaleDownTo,
              opacity: 1,
              duration,
              ease: 'bounce.out'
            }
          );
          break;
        case 'smoosh':
          // Creates a smooshing effect
          timeline.fromTo(element,
            {
              scaleY: scaleDownFrom,
              scaleX: scaleDownFrom,
              opacity: options.opacity !== undefined ? options.opacity : 0
            },
            {
              scaleY: scaleDownTo * 0.9, // Smoosh down more
              scaleX: scaleDownTo * 1.1, // Widen while smooshing
              opacity: 1,
              duration: duration * 0.7,
              ease: 'power2.out'
            }
          ).to(element, {
            scaleY: scaleDownTo,
            scaleX: scaleDownTo,
            duration: duration * 0.3,
            ease: 'power1.inOut'
          });
          break;
        case 'gravity':
          // Like something dropping with gravity
          timeline.fromTo(element,
            {
              scaleY: scaleDownFrom,
              y: -30,
              opacity: options.opacity !== undefined ? options.opacity : 0
            },
            {
              scaleY: scaleDownTo * 0.7, // Smoosh when landing
              scaleX: scaleDownTo * 1.2,
              y: 0,
              opacity: 1,
              duration: duration * 0.6,
              ease: 'power3.in'
            }
          ).to(element, {
            scaleY: scaleDownTo,
            scaleX: scaleDownTo,
            duration: duration * 0.4,
            ease: 'elastic.out(1, 0.3)'
          });
          break;
        default: // standard
          timeline.fromTo(element,
            {
              scale: scaleDownFrom,
              opacity: options.opacity !== undefined ? options.opacity : 0
            },
            {
              scale: scaleDownTo,
              opacity: 1,
              duration,
              ease: easing
            }
          );
          break;
      }
      break;
    
    case AnimationType.ScaleFade:
      const scaleFadeVariant = options.variant || 'standard';
      const scaleFadeFrom = options.scaleFrom || 0.8;
      const scaleFadeTo = options.scaleTo || 1;
      
      switch (scaleFadeVariant) {
        case 'blur':
          // Scale + fade with blur effect
          timeline.fromTo(element,
            {
              scale: scaleFadeFrom,
              opacity: 0,
              filter: 'blur(8px)'
            },
            {
              scale: scaleFadeTo,
              opacity: 1,
              filter: 'blur(0px)',
              duration,
              ease: easing
            }
          );
          break;
        case 'glow':
          // Scale + fade with glow effect at the midpoint
          timeline.fromTo(element,
            {
              scale: scaleFadeFrom,
              opacity: 0,
              filter: 'brightness(1)'
            },
            {
              scale: scaleFadeTo * 0.9,
              opacity: 0.7,
              filter: 'brightness(1.5)',
              duration: duration * 0.5,
              ease: 'power2.in'
            }
          ).to(element, {
            scale: scaleFadeTo,
            opacity: 1,
            filter: 'brightness(1)',
            duration: duration * 0.5,
            ease: 'power1.out'
          });
          break;
        default: // standard
          timeline.fromTo(element,
            {
              scale: scaleFadeFrom,
              opacity: 0
            },
            {
              scale: scaleFadeTo,
              opacity: 1,
              duration,
              ease: easing
            }
          );
          break;
      }
      break;
    
    case AnimationType.PuffInCenter:
      const puffVariant = options.variant || 'standard';
      
      // Base implementation using clip-path and blur filter
      switch (puffVariant) {
        case 'intense':
          // More dramatic with stronger blur and scale effect
          timeline.fromTo(element,
            {
              scale: 2,
              filter: 'blur(4px)',
              opacity: 0,
              transformOrigin: 'center center'
            },
            {
              scale: 1,
              filter: 'blur(0)',
              opacity: 1,
              duration,
              ease: 'back.out(1.7)'
            }
          );
          break;
        case 'gentle':
          // Subtle effect with less scale and blur
          timeline.fromTo(element,
            {
              scale: 1.5,
              filter: 'blur(2px)',
              opacity: 0,
              transformOrigin: 'center center'
            },
            {
              scale: 1,
              filter: 'blur(0)',
              opacity: 1,
              duration,
              ease: 'power2.out'
            }
          );
          break;
        case 'glow':
          // Adds a glow effect with the puff
          timeline.fromTo(element,
            {
              scale: 1.8,
              filter: 'blur(3px) brightness(1.5)',
              opacity: 0,
              transformOrigin: 'center center'
            },
            {
              scale: 1,
              filter: 'blur(0) brightness(1)',
              opacity: 1,
              duration,
              ease: 'power3.out'
            }
          );
          break;
        case 'twist':
          // Adds a slight rotation to the puff effect
          timeline.fromTo(element,
            {
              scale: 1.8,
              rotation: 15,
              filter: 'blur(3px)',
              opacity: 0,
              transformOrigin: 'center center'
            },
            {
              scale: 1,
              rotation: 0,
              filter: 'blur(0)',
              opacity: 1,
              duration,
              ease: 'back.out(1.2)'
            }
          );
          break;
        default: // standard
          timeline.fromTo(element,
            {
              scale: 2,
              filter: 'blur(2px)',
              opacity: 0,
              transformOrigin: 'center center'
            },
            {
              scale: 1,
              filter: 'blur(0)',
              opacity: 1,
              duration,
              ease: easing
            }
          );
          break;
      }
      break;
    
    case AnimationType.PuffOutCenter:
      const puffOutVariant = options.variant || 'standard';
      const targetOpacity = options.opacity !== undefined ? options.opacity : 0;
      
      switch (puffOutVariant) {
        case 'intense':
          // More dramatic exit effect with stronger blur and scale
          timeline.fromTo(element,
            {
              scale: 1,
              opacity: 1,
              filter: 'blur(0)',
              transformOrigin: 'center center'
            },
            {
              scale: 2,
              opacity: targetOpacity,
              filter: 'blur(4px)',
              duration,
              ease: 'power2.in'
            }
          );
          break;
        case 'bright':
          // Exit with a bright flash then fade
          timeline.fromTo(element,
            {
              scale: 1,
              opacity: 1,
              filter: 'blur(0) brightness(1)',
              transformOrigin: 'center center'
            },
            {
              scale: 2,
              opacity: targetOpacity,
              filter: 'blur(4px) brightness(1.5)',
              duration,
              ease: 'power3.in'
            }
          );
          break;
        case 'twist':
          // Adds a slight rotation to the puff effect
          timeline.fromTo(element,
            {
              scale: 1,
              rotation: 0,
              opacity: 1,
              filter: 'blur(0)',
              transformOrigin: 'center center'
            },
            {
              scale: 2,
              rotation: 15,
              opacity: targetOpacity,
              filter: 'blur(4px)',
              duration,
              ease: 'back.in(1.2)'
            }
          );
          break;
        default: // standard
          timeline.fromTo(element,
            {
              scale: 1,
              opacity: 1,
              filter: 'blur(0)',
              transformOrigin: 'center center'
            },
            {
              scale: 2,
              opacity: targetOpacity,
              filter: 'blur(2px)',
              duration,
              ease: easing
            }
          );
          break;
      }
      break;
    
    // Special Effects
    case AnimationType.Flicker3:
      timeline.to(element, {
        keyframes: [
          { opacity: 1, duration: 0 },
          { opacity: 0, duration: duration / 3 },
          { opacity: 1, duration: duration / 3 },
          { opacity: 1, duration: duration / 3 }
        ],
        ease: 'none',
        duration
      });
      break;
    
    case AnimationType.Custom:
      if (options.customData && options.customData.keyframes) {
        timeline.to(element, {
          keyframes: options.customData.keyframes,
          duration,
          ease: easing
        });
      } else if (options.customData && options.customData.textAnimation === 'character') {
        // Character by character text animation
        const text = element.textContent || '';
        const chars = text.split('');
        
        // Clear the element
        element.textContent = '';
        
        // Create span for each character
        const charElements = chars.map(char => {
          const span = document.createElement('span');
          span.textContent = char === ' ' ? '\u00A0' : char; // Replace spaces with non-breaking spaces
          span.style.opacity = '0';
          span.style.display = 'inline-block';
          element.appendChild(span);
          return span;
        });
        
        // Animate each character
        charElements.forEach((span, index) => {
          timeline.to(span, {
            opacity: 1,
            duration: 0.05,
            delay: index * 0.05,
            ease: easing
          }, 0);
        });
      }
      break;
    
    // Circle Animation Implementations using modern clip-path
    case AnimationType.CircleIn:
      // Use clip-path for more elegant circle animations
      timeline.fromTo(element, 
        { 
          clipPath: 'circle(0% at center)',
          opacity: 0
        }, 
        { 
          clipPath: 'circle(150% at center)',
          opacity: 1,
          duration: duration,
          ease: easing
        }
      );
      break;
      
    case AnimationType.CircleOut:
      timeline.fromTo(element, 
        { 
          clipPath: 'circle(150% at center)',
          opacity: 1
        }, 
        { 
          clipPath: 'circle(0% at center)',
          opacity: 0,
          duration: duration,
          ease: easing
        }
      );
      break;
      
    case AnimationType.CircleInTop:
      timeline.fromTo(element, 
        { 
          clipPath: 'circle(0% at top center)',
          opacity: 0
        }, 
        { 
          clipPath: 'circle(150% at top center)',
          opacity: 1,
          duration: duration,
          ease: easing
        }
      );
      break;
      
    case AnimationType.CircleInBottom:
      timeline.fromTo(element, 
        { 
          clipPath: 'circle(0% at bottom center)',
          opacity: 0
        }, 
        { 
          clipPath: 'circle(150% at bottom center)',
          opacity: 1,
          duration: duration,
          ease: easing
        }
      );
      break;
      
    case AnimationType.CircleInLeft:
      timeline.fromTo(element, 
        { 
          clipPath: 'circle(0% at left center)',
          opacity: 0
        }, 
        { 
          clipPath: 'circle(150% at left center)',
          opacity: 1,
          duration: duration,
          ease: easing
        }
      );
      break;
      
    case AnimationType.CircleInRight:
      timeline.fromTo(element, 
        { 
          clipPath: 'circle(0% at right center)',
          opacity: 0
        }, 
        { 
          clipPath: 'circle(150% at right center)',
          opacity: 1,
          duration: duration,
          ease: easing
        }
      );
      break;
    
    // Addition of RotateScale animation
    case AnimationType.RotateScale:
      timeline.fromTo(element,
        {
          scale: options.scaleFrom || 0,
          rotation: options.rotationFrom || -180,
          opacity: options.opacityFrom || 0,
          transformOrigin: 'center center'
        },
        {
          scale: options.scaleTo || 1,
          rotation: options.rotationTo || 0,
          opacity: options.opacityTo || 1,
          duration: duration,
          ease: easing
        }
      );
      break;
      
    // Slide Left animation (element slides in from left)
    case AnimationType.SlideLeft:
      timeline.fromTo(element,
        {
          transform: `translateX(-${options.distance || 100}%)`,
          opacity: options.opacityFrom !== undefined ? options.opacityFrom : 0
        },
        {
          transform: 'translateX(0)',
          opacity: options.opacityTo !== undefined ? options.opacityTo : 1,
          duration: duration,
          ease: easing
        }
      );
      break;
      
    // Slide Right animation (element slides in from right)
    case AnimationType.SlideRight:
      timeline.fromTo(element,
        {
          transform: `translateX(${options.distance || 100}%)`,
          opacity: options.opacityFrom !== undefined ? options.opacityFrom : 0
        },
        {
          transform: 'translateX(0)',
          opacity: options.opacityTo !== undefined ? options.opacityTo : 1,
          duration: duration,
          ease: easing
        }
      );
      break;
      
    default:
      // No animation or unsupported type
      break;
  }
  
  return timeline;
}
