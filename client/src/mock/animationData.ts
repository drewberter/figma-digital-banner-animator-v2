import { AnimationType, EasingType, AnimationLayer, AnimationFrame } from '../types/animation';

// Mock animation frames data
export const mockFrames: AnimationFrame[] = [
  {
    id: 'frame-1',
    name: 'Banner 300x250',
    selected: true,
    width: 300,
    height: 250
  },
  {
    id: 'frame-2',
    name: 'Banner 728x90',
    selected: false,
    width: 728,
    height: 90
  },
  {
    id: 'frame-3',
    name: 'Banner 320x50',
    selected: false,
    width: 320,
    height: 50
  },
  {
    id: 'frame-4',
    name: 'Banner 160x600',
    selected: false,
    width: 160,
    height: 600
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
          type: AnimationType.Fade,
          startTime: 0,
          duration: 1,
          easing: EasingType.EaseInOut,
          opacity: 1
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
          type: AnimationType.Scale,
          startTime: 0.2,
          duration: 0.8,
          easing: EasingType.EaseOut,
          scale: 1.2
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-1-3',
      name: 'Button',
      type: 'button',
      visible: true,
      locked: false,
      animations: [
        {
          type: AnimationType.Bounce,
          startTime: 1.0,
          duration: 0.5,
          easing: EasingType.Bounce
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-1-4',
      name: 'Logo',
      type: 'image',
      visible: true,
      locked: false,
      animations: [
        {
          type: AnimationType.Rotate,
          startTime: 0.5,
          duration: 1.5,
          easing: EasingType.EaseInOut,
          rotation: 360
        }
      ],
      keyframes: []
    }
  ],
  'frame-2': [
    {
      id: 'layer-2-1',
      name: 'Background',
      type: 'rectangle',
      visible: true,
      locked: false,
      animations: [
        {
          type: AnimationType.Fade,
          startTime: 0,
          duration: 0.8,
          easing: EasingType.Linear,
          opacity: 1
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-2-2',
      name: 'Text Content',
      type: 'text',
      visible: true,
      locked: false,
      animations: [
        {
          type: AnimationType.Slide,
          startTime: 0.3,
          duration: 0.7,
          easing: EasingType.EaseOut
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-2-3',
      name: 'CTA Button',
      type: 'button',
      visible: true,
      locked: false,
      animations: [
        {
          type: AnimationType.Pulse,
          startTime: 1.2,
          duration: 0.8,
          easing: EasingType.EaseInOut
        }
      ],
      keyframes: []
    }
  ],
  'frame-3': [
    {
      id: 'layer-3-1',
      name: 'Background',
      type: 'rectangle',
      visible: true,
      locked: false,
      animations: [
        {
          type: AnimationType.Fade,
          startTime: 0,
          duration: 0.5,
          easing: EasingType.EaseIn,
          opacity: 1
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-3-2',
      name: 'Text',
      type: 'text',
      visible: true,
      locked: false,
      animations: [
        {
          type: AnimationType.Scale,
          startTime: 0.2,
          duration: 0.5,
          easing: EasingType.EaseOut,
          scale: 1.1
        }
      ],
      keyframes: []
    }
  ],
  'frame-4': [
    {
      id: 'layer-4-1',
      name: 'Background',
      type: 'rectangle',
      visible: true,
      locked: false,
      animations: [
        {
          type: AnimationType.Fade,
          startTime: 0,
          duration: 0.7,
          easing: EasingType.Linear,
          opacity: 1
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
          type: AnimationType.Fade,
          startTime: 0.3,
          duration: 0.6,
          easing: EasingType.EaseOut,
          opacity: 1
        }
      ],
      keyframes: []
    },
    {
      id: 'layer-4-3',
      name: 'Subheadline',
      type: 'text',
      visible: true,
      locked: false,
      animations: [
        {
          type: AnimationType.Fade,
          startTime: 0.6,
          duration: 0.6,
          easing: EasingType.EaseOut,
          opacity: 1
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
          type: AnimationType.Scale,
          startTime: 0.9,
          duration: 0.6,
          easing: EasingType.EaseOut,
          scale: 1.1
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
          type: AnimationType.Fade,
          startTime: 1.2,
          duration: 0.5,
          easing: EasingType.EaseInOut,
          opacity: 1
        }
      ],
      keyframes: []
    }
  ]
};