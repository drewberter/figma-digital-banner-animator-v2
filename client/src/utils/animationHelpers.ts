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
      const direction = options.direction || 'right';
      let fromX = 0, fromY = 0;
      
      switch (direction) {
        case 'left':
          fromX = -100;
          break;
        case 'right':
          fromX = 100;
          break;
        case 'up':
          fromY = -100;
          break;
        case 'down':
          fromY = 100;
          break;
      }
      
      timeline.fromTo(element, 
        { 
          x: fromX, 
          y: fromY, 
          opacity: options.opacity !== undefined ? options.opacity : 0 
        }, 
        { 
          x: 0, 
          y: 0, 
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
      
    default:
      // No animation or unsupported type
      break;
  }
  
  return timeline;
}
