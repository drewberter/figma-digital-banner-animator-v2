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
    height: 250
  }
];

// Mock animation layers data
export const mockLayers: Record<string, AnimationLayer[]> = {
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
  ]
};