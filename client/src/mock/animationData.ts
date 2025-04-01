import { AnimationType, EasingType, AnimationLayer, AnimationFrame, GifFrame } from '../types/animation';

// Define entrance, emphasis, and exit animation groups for reuse
const entranceAnimations = {
  fadeIn: {
    type: AnimationType.Fade,
    duration: 0.8,
    easing: EasingType.EaseOut,
    opacity: 1
  },
  slideIn: {
    type: AnimationType.Slide,
    duration: 0.6,
    easing: EasingType.EaseOut,
    direction: 'right'
  },
  scaleUp: {
    type: AnimationType.Scale,
    duration: 0.5,
    easing: EasingType.BackOut,
    scale: 1
  },
  rotateIn: {
    type: AnimationType.Rotate,
    duration: 0.7,
    easing: EasingType.EaseInOut,
    rotation: 0
  }
};

const emphasisAnimations = {
  pulse: {
    type: AnimationType.Scale,
    duration: 0.3,
    easing: EasingType.EaseInOut,
    scale: 1.05
  },
  wiggle: {
    type: AnimationType.Rotate,
    duration: 0.3,
    easing: EasingType.EaseInOut,
    rotation: 5
  },
  bounce: {
    type: AnimationType.Translate,
    duration: 0.5,
    easing: EasingType.Bounce,
    direction: 'up'
  },
  shake: {
    type: AnimationType.Translate,
    duration: 0.4,
    easing: EasingType.EaseInOut,
    direction: 'right'
  }
};

const exitAnimations = {
  fadeOut: {
    type: AnimationType.Fade,
    duration: 0.5,
    easing: EasingType.EaseIn,
    opacity: 0
  },
  slideOut: {
    type: AnimationType.Slide,
    duration: 0.6,
    easing: EasingType.EaseIn,
    direction: 'right'
  },
  scaleDown: {
    type: AnimationType.Scale,
    duration: 0.5,
    easing: EasingType.BackIn,
    scale: 0
  },
  rotateOut: {
    type: AnimationType.Rotate,
    duration: 0.7,
    easing: EasingType.EaseInOut,
    rotation: 180
  }
};

// Mock animation layers data before they're used
export const mockLayers: Record<string, AnimationLayer[]> = {
  // 300x250 Banner with hierarchical structure
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
      keyframes: [],
      level: 0
    },
    {
      id: 'group-1-1',
      name: 'Content Group',
      type: 'group',
      visible: true,
      locked: false,
      animations: [],
      keyframes: [],
      isGroup: true,
      isExpanded: true,
      children: [
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
          keyframes: [],
          parentId: 'group-1-1',
          level: 1
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
          keyframes: [],
          parentId: 'group-1-1',
          level: 1
        }
      ],
      level: 0
    },
    {
      id: 'frame-1-inner',
      name: 'Call to Action',
      type: 'frame',
      visible: true,
      locked: false,
      animations: [],
      keyframes: [],
      isFrame: true,
      isExpanded: true,
      children: [
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
          keyframes: [],
          parentId: 'frame-1-inner',
          level: 1
        }
      ],
      level: 0
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
      keyframes: [],
      level: 0
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
      keyframes: [],
      level: 0
    },
    {
      id: 'group-2-1',
      name: 'Text Elements',
      type: 'group',
      visible: true,
      locked: false,
      animations: [],
      keyframes: [],
      isGroup: true,
      isExpanded: true,
      children: [
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
          keyframes: [],
          parentId: 'group-2-1',
          level: 1
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
          keyframes: [],
          parentId: 'group-2-1',
          level: 1
        }
      ],
      level: 0
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
      keyframes: [],
      level: 0
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
      keyframes: [],
      level: 0
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
      keyframes: [],
      level: 0
    },
    {
      id: 'frame-3-content',
      name: 'Content Area',
      type: 'frame',
      visible: true,
      locked: false,
      animations: [],
      keyframes: [],
      isFrame: true,
      isExpanded: true,
      children: [
        {
          id: 'group-3-text',
          name: 'Text Group',
          type: 'group',
          visible: true,
          locked: false,
          animations: [],
          keyframes: [],
          isGroup: true,
          isExpanded: true,
          parentId: 'frame-3-content',
          level: 1,
          children: [
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
              keyframes: [],
              parentId: 'group-3-text',
              level: 2
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
              keyframes: [],
              parentId: 'group-3-text',
              level: 2
            }
          ]
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
          keyframes: [],
          parentId: 'frame-3-content',
          level: 1
        }
      ],
      level: 0
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
      keyframes: [],
      level: 0
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
      keyframes: [],
      level: 0
    },
    {
      id: 'group-4-1',
      name: 'Content Group',
      type: 'group',
      visible: true,
      locked: false,
      animations: [],
      keyframes: [],
      isGroup: true,
      isExpanded: true,
      children: [
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
          keyframes: [],
          parentId: 'group-4-1',
          level: 1
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
          keyframes: [],
          parentId: 'group-4-1',
          level: 1
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
          keyframes: [],
          parentId: 'group-4-1',
          level: 1
        }
      ],
      level: 0
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
      keyframes: [],
      level: 0
    }
  ]
};

// Mock animation frames data
export const mockFrames: AnimationFrame[] = [
  {
    id: 'frame-1',
    name: 'Medium Rectangle',
    dimensions: '300x250',
    selected: true,
    width: 300,
    height: 250,
    duration: 3.5,
    backgroundColor: '#4a90e2',
    headlineText: 'Powerful Banner Creator',
    description: 'Create stunning animated banners',
    buttonText: 'Try Now',
    logoUrl: 'https://example.com/logo.png'
  },
  {
    id: 'frame-2',
    name: 'Leaderboard',
    dimensions: '728x90',
    selected: false,
    width: 728,
    height: 90,
    duration: 3.0,
    backgroundColor: '#4a90e2',
    headlineText: 'Powerful Banner Creator',
    description: 'Create stunning animated banners',
    buttonText: 'Try Now',
    logoUrl: 'https://example.com/logo.png'
  },
  {
    id: 'frame-3',
    name: 'Mobile Banner',
    dimensions: '320x50',
    selected: false,
    width: 320,
    height: 50,
    duration: 2.5,
    backgroundColor: '#4a90e2',
    headlineText: 'Powerful Banner Creator',
    description: 'Create stunning animated banners',
    buttonText: 'Try Now',
    logoUrl: 'https://example.com/logo.png'
  },
  {
    id: 'frame-4',
    name: 'Wide Skyscraper',
    dimensions: '160x600',
    selected: false,
    width: 160,
    height: 600,
    duration: 4.0,
    backgroundColor: '#4a90e2',
    headlineText: 'Powerful Banner Creator',
    description: 'Create stunning animated banners',
    buttonText: 'Try Now',
    logoUrl: 'https://example.com/logo.png'
  }
];

// Initial mock GIF frames
export const mockGifFrames: GifFrame[] = [
  {
    id: 'gif-frame-frame-1-1',
    name: 'Frame 1',
    selected: true,
    delay: 1.0, // Reduced delay for better playback experience
    adSizeId: 'frame-1',
    hiddenLayers: [],
    visibleLayerCount: 5,
    frameIndex: 0,
    frameNumber: "1", // Add required frameNumber property
    // Deep clone the layers to ensure we have a proper copy
    layers: JSON.parse(JSON.stringify(mockLayers['frame-1'] || [])),
    overrides: {
      layerVisibility: {}
    },
    sourceOfTruth: true // First frame is the source of truth by default
  },
  {
    id: 'gif-frame-frame-1-2',
    name: 'Frame 2',
    selected: false,
    delay: 1.0, // Reduced delay for better playback experience
    adSizeId: 'frame-1', 
    hiddenLayers: ['layer-1-3'],
    visibleLayerCount: 4,
    frameIndex: 1,
    frameNumber: "2", // Add required frameNumber property
    // Create deep cloned layers with modified visibility for frame 2
    layers: JSON.parse(JSON.stringify(mockLayers['frame-1'] || [])).map((layer: AnimationLayer) => 
      layer.id === 'layer-1-3' ? { ...layer, visible: false } : layer
    ),
    overrides: {
      layerVisibility: {
        'layer-1-3': {
          overridden: false
        }
      }
    }
  },
  {
    id: 'gif-frame-frame-1-3',
    name: 'Frame 3',
    selected: false,
    delay: 1.0, // Reduced delay for better playback experience
    adSizeId: 'frame-1',
    hiddenLayers: ['layer-1-3', 'layer-1-5'],
    visibleLayerCount: 3,
    frameIndex: 2,
    frameNumber: "3", // Add required frameNumber property
    // Create deep cloned layers with modified visibility for frame 3
    layers: JSON.parse(JSON.stringify(mockLayers['frame-1'] || [])).map((layer: AnimationLayer) => 
      (layer.id === 'layer-1-3' || layer.id === 'layer-1-5') ? { ...layer, visible: false } : layer
    ),
    overrides: {
      layerVisibility: {
        'layer-1-3': {
          overridden: false
        },
        'layer-1-5': {
          overridden: false
        }
      }
    }
  }
];

// Generate GIF frames for a specific ad size
// Standardized format for GIF frame IDs: gif-frame-[adSizeId]-[frameNumber]
// Example: gif-frame-frame-1-1 for the first frame of ad size "frame-1"
export function generateGifFramesForAdSize(adSizeId: string): GifFrame[] {
  // If no ad size provided, return empty array
  if (!adSizeId) return [];
  
  // Find the specific ad size
  const adSize = mockFrames.find(f => f.id === adSizeId);
  if (!adSize) return [];
  
  // Get layers for this ad size
  const layers = mockLayers[adSizeId] || [];
  
  // First, check if we already have GIF frames for this ad size
  const existingFrames = mockGifFrames.filter(f => f.adSizeId === adSizeId);
  if (existingFrames.length > 0) {
    console.log(`Found ${existingFrames.length} existing GIF frames for ad size ${adSizeId}`);
    return existingFrames;
  }
  
  // If no existing frames, create GIF frames based on the specific ad size
  console.log(`Creating new GIF frames for ad size ${adSizeId}`);
  const frames: GifFrame[] = [];
  
  // Create frame 1 - All layers visible
  // Create a copy of the layers for frame 1
  const layersFrame1 = JSON.parse(JSON.stringify(layers));
  
  // Prepare the hiddenLayers array for frame 1 (empty as all layers are visible)
  const frame1HiddenLayers: string[] = [];
  
  // Update visibility in the copied layers to match hiddenLayers (all visible)
  layersFrame1.forEach((layer: AnimationLayer) => {
    layer.visible = true;
  });
  
  frames.push({
    id: `gif-frame-${adSizeId}-1`, 
    name: 'Frame 1',
    selected: true,
    delay: 1.0, // Reduced delay for better playback experience
    adSizeId: adSizeId,
    hiddenLayers: frame1HiddenLayers,
    visibleLayerCount: layers.length,
    frameIndex: 0,
    frameNumber: "1", // Add the required frameNumber property
    // Use the properly prepared layers array
    layers: layersFrame1,
    overrides: {
      layerVisibility: {}
    },
    sourceOfTruth: true // First frame is source of truth by default
  });
  
  // Find the third layer (usually the subhead) to hide in frame 2
  const thirdLayerId = layers.length > 2 ? layers[2].id : null;
  
  // Create frame 2 - Hide one layer (e.g., subheadline)
  // Create a copy of the layers for frame 2
  const layersFrame2 = JSON.parse(JSON.stringify(layers));
  
  // Prepare the hiddenLayers array for frame 2
  const frame2HiddenLayers = thirdLayerId ? [thirdLayerId] : [];
  
  // Update visibility in the copied layers to match hiddenLayers
  layersFrame2.forEach((layer: AnimationLayer) => {
    // If this layer's ID is in the hiddenLayers array, set visible to false
    if (frame2HiddenLayers.includes(layer.id)) {
      layer.visible = false;
    } else {
      layer.visible = true;
    }
  });
  
  frames.push({
    id: `gif-frame-${adSizeId}-2`,
    name: 'Frame 2',
    selected: false,
    delay: 1.0,
    adSizeId: adSizeId,
    hiddenLayers: frame2HiddenLayers,
    visibleLayerCount: layers.length - frame2HiddenLayers.length,
    frameIndex: 1,
    frameNumber: "2", // Add required frameNumber property
    layers: layersFrame2, // Add the layer array with adjusted visibility
    overrides: {
      layerVisibility: thirdLayerId ? {
        [thirdLayerId]: {
          overridden: false
        }
      } : {}
    }
  });
  
  // Find the last layer (usually the logo) to hide in frame 3
  const lastLayerId = layers.length > 0 ? layers[layers.length - 1].id : null;
  
  // Create frame 3 - Hide two layers (e.g., subheadline and logo)
  // Create a copy of the layers for frame 3
  const layersFrame3 = JSON.parse(JSON.stringify(layers));
  
  // Prepare the hiddenLayers array for frame 3
  const frame3HiddenLayers = [
    ...(thirdLayerId ? [thirdLayerId] : []),
    ...(lastLayerId ? [lastLayerId] : [])
  ];
  
  // Update visibility in the copied layers to match hiddenLayers
  layersFrame3.forEach((layer: AnimationLayer) => {
    // If this layer's ID is in the hiddenLayers array, set visible to false
    if (frame3HiddenLayers.includes(layer.id)) {
      layer.visible = false;
    } else {
      layer.visible = true;
    }
  });
  
  frames.push({
    id: `gif-frame-${adSizeId}-3`,
    name: 'Frame 3',
    selected: false,
    delay: 1.0,
    adSizeId: adSizeId,
    hiddenLayers: frame3HiddenLayers,
    visibleLayerCount: layers.length - frame3HiddenLayers.length,
    frameIndex: 2,
    frameNumber: "3", // Add required frameNumber property
    layers: layersFrame3, // Add the layer array with adjusted visibility
    overrides: {
      layerVisibility: {
        ...(thirdLayerId ? {
          [thirdLayerId]: {
            overridden: false
          }
        } : {}),
        ...(lastLayerId ? {
          [lastLayerId]: {
            overridden: false
          }
        } : {})
      }
    }
  });
  
  // Add the new frames to mockGifFrames
  mockGifFrames.push(...frames);
  
  return frames;
}