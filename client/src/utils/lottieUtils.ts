import lottieWeb from 'lottie-web';
import { AnimationType, EasingType } from '../types/animation';

// Hold references to different Lottie instances
let lottieSvg: any = null;
let lottieCanvas: any = null;
let lottieWorker: any = null;

/**
 * Initialize the appropriate Lottie instance based on renderer
 */
export function initLottie(renderer: 'svg' | 'canvas' | 'worker' = 'svg') {
  try {
    // Use regular lottie-web for SVG rendering
    if (renderer === 'svg' && !lottieSvg) {
      // Try to use imported lottie
      lottieSvg = lottieWeb;
    }
    
    // Use canvas renderer
    if (renderer === 'canvas' && !lottieCanvas) {
      // In a real implementation, we'd use a separate Lottie canvas renderer
      // For this demo, we'll use the same lottie-web but configure for canvas
      lottieCanvas = lottieWeb;
    }
    
    // Use worker renderer for high performance 
    if (renderer === 'worker' && !lottieWorker) {
      // In a real implementation, we'd use a separate Lottie worker renderer
      // For this demo, we'll use the same lottie-web
      lottieWorker = lottieWeb;
    }
  } catch (error) {
    console.error('Error initializing Lottie:', error);
  }
}

/**
 * Get the appropriate Lottie instance based on what's available
 */
export function getLottie() {
  // Return the first available instance
  return lottieSvg || lottieCanvas || lottieWorker || lottieWeb;
}

/**
 * Convert our animation parameters to Lottie format
 */
export function convertAnimationToLottie(
  animation: {
    type: AnimationType;
    startTime: number;
    duration: number;
    delay?: number;
    easing: EasingType;
    opacity?: number;
    scale?: number;
    rotation?: number;
  }
) {
  // Create a basic Lottie animation object
  const lottieAnimation = {
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: 150,
    w: 300,
    h: 250,
    nm: 'Animation',
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: 'Layer',
        sr: 1,
        ks: {
          o: { // Opacity
            a: animation.opacity !== undefined ? 1 : 0,
            k: animation.opacity !== undefined ? [
              {
                i: { x: [0.25], y: [1] },
                o: { x: [0.75], y: [0] },
                t: animation.startTime * 30,
                s: [0]
              },
              {
                t: (animation.startTime + animation.duration) * 30,
                s: [100]
              }
            ] : 100
          },
          r: { // Rotation
            a: animation.rotation !== undefined ? 1 : 0,
            k: animation.rotation !== undefined ? [
              {
                i: { x: [0.25], y: [1] },
                o: { x: [0.75], y: [0] },
                t: animation.startTime * 30,
                s: [0]
              },
              {
                t: (animation.startTime + animation.duration) * 30,
                s: [animation.rotation]
              }
            ] : 0
          },
          s: { // Scale
            a: animation.scale !== undefined ? 1 : 0,
            k: animation.scale !== undefined ? [
              {
                i: { x: [0.25], y: [1] },
                o: { x: [0.75], y: [0] },
                t: animation.startTime * 30,
                s: [0, 0, 100]
              },
              {
                t: (animation.startTime + animation.duration) * 30,
                s: [animation.scale * 100, animation.scale * 100, 100]
              }
            ] : [100, 100, 100]
          },
          p: { // Position
            a: 0,
            k: [150, 125, 0]
          }
        },
        ao: 0,
        shapes: [{
          ty: 'rc',
          p: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 0 }
        }],
        ip: 0,
        op: 150,
        st: 0
      }
    ],
    markers: []
  };

  return lottieAnimation;
}