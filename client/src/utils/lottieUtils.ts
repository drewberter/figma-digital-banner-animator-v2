import { AnimationType, EasingType } from '../types/animation';
import lottieWeb from 'lottie-web';

// Use the standard Lottie library as the default instance
let lottieInstance: any = lottieWeb;

// Function to initialize Lottie with the appropriate renderer
export function initLottie(renderer: 'svg' | 'canvas' | 'html' | 'worker' = 'svg') {
  // For now, we'll just use the default lottie-web package
  // We can expand on this with the custom Lottie variants later as needed
  lottieInstance = lottieWeb;
  
  // Return the instance for immediate use
  return lottieInstance;
}

// Get the initialized Lottie instance
export function getLottie() {
  return lottieInstance;
}

// Convert animation type to Lottie configuration
export function convertAnimationToLottie(
  animation: {
    type: AnimationType;
    duration: number;
    delay?: number;
    easing: EasingType;
    opacity?: number;
    scale?: number;
    rotation?: number;
    position?: { x: number; y: number };
  },
  element: { width: number; height: number }
) {
  const lottieData: any = {
    v: '5.7.4',
    fr: 30, // 30fps
    ip: animation.delay || 0, // In frames
    op: (animation.delay || 0) + animation.duration * 30, // End frame
    w: element.width,
    h: element.height,
    nm: `${animation.type} Animation`,
    ddd: 0, // 3D setting: 0 = off
    assets: [],
    layers: []
  };

  // Create base object layer
  const baseLayer = {
    ddd: 0,
    ind: 1,
    ty: 4,
    nm: 'Element',
    sr: 1,
    ks: {
      o: { a: 0, k: 100 }, // Opacity
      r: { a: 0, k: 0 },   // Rotation
      p: { a: 0, k: [element.width / 2, element.height / 2, 0] }, // Position
      s: { a: 0, k: [100, 100, 100] } // Scale
    },
    ao: 0,
    shapes: [{
      ty: 'rc', // Rectangle
      p: { a: 0, k: [0, 0] },
      s: { a: 0, k: [element.width, element.height] },
      r: { a: 0, k: 0 }
    }],
    ip: 0,
    op: animation.duration * 30,
    st: 0
  };

  // Apply animation properties based on type
  switch (animation.type) {
    case AnimationType.Fade:
      // Add opacity animation
      baseLayer.ks.o = {
        a: 1, // Animated
        k: [
          {
            i: { x: [0.833], y: [0.833] },
            o: { x: [0.167], y: [0.167] },
            t: animation.delay || 0,
            s: [animation.opacity === undefined ? 0 : animation.opacity * 100]
          },
          {
            t: (animation.delay || 0) + animation.duration * 30,
            s: [100]
          }
        ]
      };
      break;
    case AnimationType.Scale:
      // Add scale animation
      baseLayer.ks.s = {
        a: 1, // Animated
        k: [
          {
            i: { x: [0.833], y: [0.833] },
            o: { x: [0.167], y: [0.167] },
            t: animation.delay || 0,
            s: [animation.scale === undefined ? 0 : animation.scale * 100, 
                animation.scale === undefined ? 0 : animation.scale * 100, 100]
          },
          {
            t: (animation.delay || 0) + animation.duration * 30,
            s: [100, 100, 100]
          }
        ]
      };
      break;
    case AnimationType.Rotate:
      // Add rotation animation
      baseLayer.ks.r = {
        a: 1, // Animated
        k: [
          {
            i: { x: [0.833], y: [0.833] },
            o: { x: [0.167], y: [0.167] },
            t: animation.delay || 0,
            s: [animation.rotation || -90]
          },
          {
            t: (animation.delay || 0) + animation.duration * 30,
            s: [0]
          }
        ]
      };
      break;
    case AnimationType.Slide:
      // Calculate position based on direction (default slide from bottom)
      let startX = element.width / 2;
      let startY = element.height * 1.5; // Start below the view
      
      if (animation.position) {
        startX = animation.position.x;
        startY = animation.position.y;
      }
      
      // Add position animation
      baseLayer.ks.p = {
        a: 1, // Animated
        k: [
          {
            i: { x: [0.833], y: [0.833] },
            o: { x: [0.167], y: [0.167] },
            t: animation.delay || 0,
            s: [startX, startY, 0]
          },
          {
            t: (animation.delay || 0) + animation.duration * 30,
            s: [element.width / 2, element.height / 2, 0]
          }
        ]
      };
      break;
    default:
      // No specific animation
      break;
  }

  // Add the layer to the animation
  lottieData.layers.push(baseLayer);

  return lottieData;
}

// Initialize with default SVG renderer
initLottie();

export default {
  initLottie,
  getLottie,
  convertAnimationToLottie
};