import { AnimationType, EasingType, AnimationLayer, AnimationFrame, GifFrame } from '../types/animation';

// Define entrance, emphasis, and exit animation groups for reuse
const entranceAnimations = {
  fadeIn: {
    type: AnimationType.Fade,
    duration: 0.8,
    easing: EasingType.EaseOut,
    opacity: 1
  },
  scaleUp: {
    type: AnimationType.Scale,
    duration: 0.7,
    easing: EasingType.EaseOut,
    scale: 1.2
  },
  slideIn: {
    type: AnimationType.Slide,
    duration: 0.7,
    easing: EasingType.EaseOut,
    direction: 'right'
  },
  rotateIn: {
    type: AnimationType.Rotate,
    duration: 1.0,
    easing: EasingType.EaseInOut,
    rotation: 360
  }
};

const emphasisAnimations = {
  pulse: {
    type: AnimationType.Pulse,
    duration: 0.5,
    easing: EasingType.EaseInOut
  },
  bounce: {
    type: AnimationType.Bounce,
    duration: 0.6,
    easing: EasingType.Bounce
  },
  wiggle: {
    type: AnimationType.Custom,
    duration: 0.5,
    easing: EasingType.EaseInOut,
    customData: { type: 'wiggle', amplitude: 10 }
  }
};

const exitAnimations = {
  fadeOut: {
    type: AnimationType.Fade,
    duration: 0.6,
    easing: EasingType.EaseIn,
    opacity: 0
  },
  scaleDown: {
    type: AnimationType.Scale,
    duration: 0.5,
    easing: EasingType.EaseIn,
    scale: 0.5
  },
  slideOut: {
    type: AnimationType.Slide,
    duration: 0.6,
    easing: EasingType.EaseIn,
    direction: 'left'
  }
};

// Mock animation frames data
export const mockFrames: AnimationFrame[] = [
  {
    id: 'frame-1',
    name: 'Banner 300x250',
    selected: true,
    width: 300,
    height: 250,
    headlineText: 'Amazing Offer',
    description: 'Limited time only!',
    buttonText: 'Shop Now',
    logoText: 'LOGO'
  },
  {
    id: 'frame-2',
    name: 'Banner 728x90',
    selected: false,
    width: 728,
    height: 90,
    headlineText: 'Special Promotion',
    description: 'Save big today',
    buttonText: 'Learn More',
    logoText: 'BRAND'
  },
  {
    id: 'frame-3',
    name: 'Banner 320x50',
    selected: false,
    width: 320,
    height: 50,
    headlineText: 'New Product',
    description: 'Discover now',
    buttonText: 'Buy Now',
    logoText: 'LOGO'
  },
  {
    id: 'frame-4',
    name: 'Banner 160x600',
    selected: false,
    width: 160, 
    height: 600,
    headlineText: 'Best Deals',
    description: 'Limited stock',
    buttonText: 'View Offers',
    logoText: 'BRAND'
  }
];

// Mock animation layers data
// Initial mock GIF frames
export const mockGifFrames: GifFrame[] = [
  {
    id: 'gif-frame-1-1',
    name: 'Frame 1',
    selected: true,
    delay: 2.5,
    adSizeId: 'frame-1',
    hiddenLayers: [],
    visibleLayerCount: 5,
    frameIndex: 0
  },
  {
    id: 'gif-frame-1-2',
    name: 'Frame 2',
    selected: false,
    delay: 2.5,
    adSizeId: 'frame-1', 
    hiddenLayers: ['layer-1-3'],
    visibleLayerCount: 4,
    frameIndex: 1
  },
  {
    id: 'gif-frame-1-3',
    name: 'Frame 3',
    selected: false,
    delay: 2.5,
    adSizeId: 'frame-1',
    hiddenLayers: ['layer-1-3', 'layer-1-5'],
    visibleLayerCount: 3,
    frameIndex: 2
  }
];

// Generate GIF frames for a specific ad size
export function generateGifFramesForAdSize(adSizeId: string): GifFrame[] {
  // If no ad size provided, return empty array
  if (!adSizeId) return [];
  
  // Find the specific ad size
  const adSize = mockFrames.find(f => f.id === adSizeId);
  if (!adSize) return [];
  
  // Get layers for this ad size
  const layers = mockLayers[adSizeId] || [];
  
  // Create GIF frames based on the specific ad size
  // For this demo, we'll create 3 frames with different layer visibility
  const frames: GifFrame[] = [];
  
  // Create frame 1 - All layers visible
  frames.push({
    id: `gif-frame-${adSizeId}-1`, // Format: gif-frame-[adSizeId]-[frameNumber]
    name: 'Frame 1',
    selected: true,
    delay: 2.5,
    adSizeId: adSizeId,
    hiddenLayers: [],
    visibleLayerCount: layers.length,
    frameIndex: 0
  });
  
  // Find the third layer (usually the subhead) to hide in frame 2
  const thirdLayerId = layers.length > 2 ? layers[2].id : null;
  
  // Create frame 2 - Hide one layer (e.g., subheadline)
  frames.push({
    id: `gif-frame-${adSizeId}-2`, // Format: gif-frame-[adSizeId]-[frameNumber]
    name: 'Frame 2',
    selected: false,
    delay: 2.5,
    adSizeId: adSizeId,
    hiddenLayers: thirdLayerId ? [thirdLayerId] : [],
    visibleLayerCount: thirdLayerId ? layers.length - 1 : layers.length,
    frameIndex: 1
  });
  
  // Find the last layer (usually the logo) to hide in frame 3
  const lastLayerId = layers.length > 0 ? layers[layers.length - 1].id : null;
  
  // Create frame 3 - Hide two layers (e.g., subheadline and logo)
  frames.push({
    id: `gif-frame-${adSizeId}-3`, // Format: gif-frame-[adSizeId]-[frameNumber]
    name: 'Frame 3',
    selected: false,
    delay: 2.5,
    adSizeId: adSizeId,
    hiddenLayers: [
      ...(thirdLayerId ? [thirdLayerId] : []),
      ...(lastLayerId ? [lastLayerId] : [])
    ],
    visibleLayerCount: layers.length - (thirdLayerId ? 1 : 0) - (lastLayerId ? 1 : 0),
    frameIndex: 2
  });
  
  return frames;
}

export const mockLayers: Record<string, AnimationLayer[]> = {
  // 300x250 Banner
  'frame-1': [
    {
      id: 'layer-1-1',
      name: 'Background',
      type: 'rectangle',
      visible: true,
      locked: false,
      animations: [
        {
          ...entranceAnimations.fadeIn,
          startTime: 0
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-1-2',
      name: 'Headline',
      type: 'text',
      visible: true,
      locked: false,
      animations: [
        {
          ...entranceAnimations.scaleUp,
          startTime: 0.3
        },
        {
          ...emphasisAnimations.pulse,
          startTime: 2.5
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-1-3',
      name: 'Subhead',
      type: 'text',
      visible: true,
      locked: false,
      animations: [
        {
          ...entranceAnimations.slideIn,
          startTime: 0.6
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-1-4',
      name: 'CTA Button',
      type: 'button',
      visible: true,
      locked: false,
      animations: [
        {
          ...entranceAnimations.fadeIn,
          startTime: 1.0
        },
        {
          ...emphasisAnimations.bounce,
          startTime: 2.0
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-1-5',
      name: 'Logo',
      type: 'image',
      visible: true,
      locked: false,
      animations: [
        {
          ...entranceAnimations.rotateIn,
          startTime: 0.8
        }
      ],
      keyframes: []
    }
  ],
  
  // 728x90 Banner
  'frame-2': [
    {
      id: 'layer-2-1',
      name: 'Background',
      type: 'rectangle',
      visible: true,
      locked: false,
      animations: [
        {
          ...entranceAnimations.fadeIn,
          startTime: 0
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-2-2',
      name: 'Headline',
      type: 'text',
      visible: true,
      locked: false,
      animations: [
        {
          ...entranceAnimations.slideIn,
          startTime: 0.3
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-2-3',
      name: 'Subhead',
      type: 'text',
      visible: true,
      locked: false,
      animations: [
        {
          ...entranceAnimations.fadeIn,
          startTime: 0.6
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-2-4',
      name: 'CTA Button',
      type: 'button',
      visible: true,
      locked: false,
      animations: [
        {
          ...entranceAnimations.scaleUp,
          startTime: 0.9
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-2-5',
      name: 'Logo',
      type: 'image',
      visible: true,
      locked: false,
      animations: [
        {
          ...entranceAnimations.fadeIn,
          startTime: 0.5
        }
      ],
      keyframes: []
    }
  ],

  // 320x50 Banner
  'frame-3': [
    {
      id: 'layer-3-1',
      name: 'Background',
      type: 'rectangle',
      visible: true,
      locked: false,
      animations: [
        {
          ...entranceAnimations.fadeIn,
          startTime: 0
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-3-2',
      name: 'Headline',
      type: 'text',
      visible: true,
      locked: false,
      animations: [
        {
          ...entranceAnimations.fadeIn,
          startTime: 0.3
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-3-3',
      name: 'Subhead',
      type: 'text',
      visible: true,
      locked: false,
      animations: [
        {
          ...entranceAnimations.fadeIn,
          startTime: 0.5
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-3-4',
      name: 'CTA Button',
      type: 'button',
      visible: true,
      locked: false,
      animations: [
        {
          ...entranceAnimations.fadeIn,
          startTime: 0.7
        },
        {
          ...emphasisAnimations.pulse,
          startTime: 1.5
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-3-5',
      name: 'Logo',
      type: 'image',
      visible: true,
      locked: false,
      animations: [
        {
          ...entranceAnimations.fadeIn,
          startTime: 0.2
        }
      ],
      keyframes: []
    }
  ],
  
  // 160x600 Banner
  'frame-4': [
    {
      id: 'layer-4-1',
      name: 'Background',
      type: 'rectangle',
      visible: true,
      locked: false,
      animations: [
        {
          ...entranceAnimations.fadeIn,
          startTime: 0
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-4-2',
      name: 'Headline',
      type: 'text',
      visible: true,
      locked: false,
      animations: [
        {
          ...entranceAnimations.slideIn,
          direction: 'top',
          startTime: 0.3
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-4-3',
      name: 'Subhead',
      type: 'text',
      visible: true,
      locked: false,
      animations: [
        {
          ...entranceAnimations.slideIn,
          direction: 'top',
          startTime: 0.6
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-4-4',
      name: 'CTA Button',
      type: 'button',
      visible: true,
      locked: false,
      animations: [
        {
          ...entranceAnimations.fadeIn,
          startTime: 0.9
        },
        {
          ...emphasisAnimations.bounce,
          startTime: 2.0
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-4-5',
      name: 'Logo',
      type: 'image',
      visible: true,
      locked: false,
      animations: [
        {
          ...entranceAnimations.fadeIn,
          startTime: 1.2
        }
      ],
      keyframes: []
    }
  ]
};