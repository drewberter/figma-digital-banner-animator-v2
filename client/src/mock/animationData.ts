import { AnimationType, EasingType, AnimationLayer, AnimationFrame } from '../types/animation';

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