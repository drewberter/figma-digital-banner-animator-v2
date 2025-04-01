export enum AnimationType {
  None = 'None',
  // Basic Types
  Fade = 'Fade',
  Slide = 'Slide',
  Scale = 'Scale',
  Rotate = 'Rotate',
  Bounce = 'Bounce',
  Pulse = 'Pulse',
  // Rotations & Flips
  Rotate90 = 'Rotate 90°',
  RotateMinus90 = 'Rotate -90°',
  FlipVertical = 'Flip Vertical',
  FlipHorizontal = 'Flip Horizontal',
  // Attention Seekers
  Blink = 'Blink',
  BounceTop = 'Bounce Top',
  BounceRight = 'Bounce Right',
  BounceBottom = 'Bounce Bottom',
  BounceLeft = 'Bounce Left',
  Flicker = 'Flicker',
  FlickerFade = 'Flicker Fade',
  JelloHorizontal = 'Jello Horizontal',
  JelloVertical = 'Jello Vertical',
  Heartbeat = 'Heartbeat',
  ShakeHorizontal = 'Shake Horizontal',
  ShakeLeft = 'Shake Left',
  ShakeTop = 'Shake Top',
  Ping = 'Ping',
  // Transitions
  WipeIn = 'Wipe In',
  WipeOut = 'Wipe Out',
  FadeIn = 'Fade In',
  FadeOut = 'Fade Out',
  SlideUp = 'Slide Up',
  SlideDown = 'Slide Down',
  SlideLeft = 'Slide Left',
  SlideRight = 'Slide Right',
  ScaleUp = 'Scale Up',
  ScaleDown = 'Scale Down',
  ScaleFade = 'Scale Fade',
  RotateScale = 'Rotate Scale',
  PuffInCenter = 'Puff In Center',
  PuffOutCenter = 'Puff Out Center',
  // Circle animations
  CircleIn = 'Circle In',
  CircleOut = 'Circle Out',
  CircleInTop = 'Circle In Top',
  CircleInBottom = 'Circle In Bottom',
  CircleInLeft = 'Circle In Left',
  CircleInRight = 'Circle In Right',
  // Special Effects
  Flicker3 = 'Flicker 3',
  // Custom Animation Type for advanced keyframes
  Custom = 'Custom'
}

export enum EasingType {
  Linear = 'Linear',
  EaseIn = 'Ease In',
  EaseOut = 'Ease Out',
  EaseInOut = 'Ease In Out',
  EaseOutBack = 'Ease Out Back',
  Bounce = 'Bounce',
  Custom = 'Custom'
}

export interface Keyframe {
  time: number;
  properties: Record<string, any>;
}

export enum AnimationMode {
  Entrance = 'Entrance',
  Exit = 'Exit'
}

export interface Animation {
  id?: string;            // Unique identifier for the animation
  type: AnimationType;
  mode?: AnimationMode;   // Entrance or Exit animation
  startTime?: number;
  duration: number;
  delay?: number;
  easing: EasingType;
  direction?: string;
  opacity?: number;
  scale?: number;
  rotation?: number;
  positionOverride?: boolean;
  position?: {
    x: number;
    y: number;
  };
  variant?: string;       // For animation variants like 'spring', 'bounce', 'stagger', etc.
  isOverridden?: boolean; // Whether this animation has been overridden in a linked layer
  customData?: Record<string, any>;
}

export enum LinkSyncMode {
  Full = 'Full',         // Fully synchronize all animations
  Partial = 'Partial',   // Synchronize specific animations
  Independent = 'Independent' // No synchronization
}

export type TimelineMode = 'animation' | 'gifFrames';
// Standard timeline mode - animation: for editing animations
// GIF Frames mode - gifFrames: for managing layer visibility across gif frames for export

export interface LinkedLayerInfo {
  groupId: string;        // Unique identifier for the linked group
  syncMode: LinkSyncMode; // How animations are synchronized
  isMain: boolean;        // Whether this is the main/master layer in the group
  overrides: string[];    // IDs of animations that are overridden (not synced)
  frameId?: string;       // Optional reference to the frame this layer belongs to (for GIF frames)
}

export interface AnimationLayer {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  animations: Animation[];
  keyframes: Keyframe[];
  linkedLayer?: LinkedLayerInfo; // Information about layer linking
  isLinked?: boolean; // Computed property indicating if the layer is linked
  
  // Hierarchy support
  parentId?: string | null;
  children?: AnimationLayer[];
  isGroup?: boolean;
  isFrame?: boolean;
  isExpanded?: boolean;
  level?: number; // Indentation level in the UI
  
  // GIF Frame Mode linking
  isOverridden?: boolean; // Whether this layer has an override in GIF Frame Mode
  frameId?: string; // The ID of the frame this layer belongs to (for GIF frames)
}

export interface AdSize {
  id: string;
  name: string;
  width: number;
  height: number;
  frames: AnimationFrame[];
  selected: boolean;
}

export interface AnimationFrame {
  id: string;
  name: string;
  selected: boolean;
  width: number;
  height: number;
  headlineText?: string;
  description?: string;
  imageUrl?: string;
  hiddenLayers?: string[]; // IDs of layers that should be hidden in this frame
  size?: string; // Identifier for frame size category (e.g., '300x250', '728x90')
  delay?: number; // Delay in seconds before animations start for this frame
  buttonText?: string; // Text for the CTA button
  logoText?: string; // Text for the logo element
  adSizeId?: string; // Reference to the parent ad size
  layers?: AnimationLayer[]; // Direct reference to layers for GIF frames
  visibleLayerCount?: number; // Cache for visible layer count
}

export interface GifFrame {
  id: string;
  name: string;
  selected: boolean;
  delay: number; // Delay in seconds for this GIF frame
  adSizeId: string; // Reference to the parent ad size this GIF frame is based on
  frameIndex: number; // Index to track frame sequence (now required)
  
  // Cross-ad-size linking
  frameNumber: string; // Frame number for cross-ad-size linking (e.g., "1", "2")
  
  // Direct reference to the frame's layers with all properties (including visibility)
  layers: AnimationLayer[]; 
  
  // UI state
  isLayerListOpen?: boolean; // Whether the layer list is open in the UI
  
  // Frame metadata
  backgroundColor?: string; // Optional background color
  previewImageUrl?: string; // Optional preview image URL
  
  // Statistics (can be computed on demand)
  visibleLayerCount?: number; // Count of visible layers (for UI display)
  
  // Link state
  isLinked?: boolean; // Whether this frame is linked with others of same number
  linkedFrames?: string[]; // IDs of frames this is linked with
  
  // For backward compatibility with previous code (to avoid type errors)
  hiddenLayers?: string[]; // Legacy field - use layer.visible instead
  
  // Custom settings
  customSettings?: {
    [key: string]: any; // For future extensibility
  };
  
  // Layer override information for UI
  overrides?: {
    layerVisibility: Record<string, {overridden: boolean}>
  };
  
  // Source of truth flag
  sourceOfTruth?: boolean;
}

export interface Preset {
  id: string;
  name: string;
  category: string;
  animation: Animation;
  icon: string; // SVG path
}

/**
 * Interface for the cross-ad-size layer linking registry
 * Used to track and manage layer relationships across different ad sizes
 * 
 * @deprecated Use ILinkRegistry from linkRegistryInterfaces.ts instead
 */
export interface LinkRegistry {
  // Link layers with the same name across ad sizes
  linkLayers(layerName: string, layerIds: string[], mode?: 'animation' | 'gif', mainLayerId?: string): string;
  
  // Get all linked layer IDs for a specific layer
  getLinkedLayers(layerId: string, mode?: 'animation' | 'gif'): string[];
  
  // Check if a layer has any linked layers
  hasLinkedLayers(layerId: string): boolean;
  
  // Get the link group name for a layer
  getLinkGroupName(layerId: string): string | null;
  
  // Required methods (no longer optional)
  syncLayerLinkStates(layers: AnimationLayer[], mode: 'animation' | 'gif'): AnimationLayer[];
  syncGifFrameLinkStates(frames: GifFrame[]): GifFrame[];
  syncAnimationFrameLinkStates(frames: AnimationFrame[]): AnimationFrame[];
  
  // Auto-link layers with the same name
  autoLinkLayers(
    framesByAdSize: Record<string, AnimationFrame[] | GifFrame[]>,
    mode: 'animation' | 'gif'
  ): Record<string, AnimationFrame[] | GifFrame[]>;
}