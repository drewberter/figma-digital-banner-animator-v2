/**
 * Animation Type Definitions
 * 
 * This file defines the core types used throughout the application.
 */

/**
 * Animation Type Enum
 */
export enum AnimationType {
  // Basic animations
  FadeIn = 'fadeIn',
  FadeOut = 'fadeOut',
  SlideIn = 'slideIn',
  SlideOut = 'slideOut',
  ScaleUp = 'scaleUp',
  ScaleDown = 'scaleDown',
  Rotate = 'rotate',
  
  // Scale Up animations
  ScaleUpBL = 'scale-up-bl',
  ScaleUpBR = 'scale-up-br',
  ScaleUpBottom = 'scale-up-bottom',
  ScaleUpCenter = 'scale-up-center',
  ScaleUpHorCenter = 'scale-up-hor-center',
  ScaleUpHorLeft = 'scale-up-hor-left',
  ScaleUpHorRight = 'scale-up-hor-right',
  ScaleUpLeft = 'scale-up-left',
  ScaleUpRight = 'scale-up-right',
  ScaleUpTL = 'scale-up-tl',
  ScaleUpTR = 'scale-up-tr',
  ScaleUpTop = 'scale-up-top',
  ScaleUpVerBottom = 'scale-up-ver-bottom',
  ScaleUpVerCenter = 'scale-up-ver-center',
  ScaleUpVerTop = 'scale-up-ver-top',
  
  // Scale Down animations
  ScaleDownBL = 'scale-down-bl',
  ScaleDownBR = 'scale-down-br',
  ScaleDownBottom = 'scale-down-bottom',
  ScaleDownCenter = 'scale-down-center',
  ScaleDownHorCenter = 'scale-down-hor-center',
  ScaleDownHorLeft = 'scale-down-hor-left',
  ScaleDownHorRight = 'scale-down-hor-right',
  ScaleDownLeft = 'scale-down-left',
  ScaleDownRight = 'scale-down-right',
  ScaleDownTL = 'scale-down-tl',
  ScaleDownTR = 'scale-down-tr',
  ScaleDownTop = 'scale-down-top',
  ScaleDownVerBottom = 'scale-down-ver-bottom',
  ScaleDownVerCenter = 'scale-down-ver-center',
  ScaleDownVerTop = 'scale-down-ver-top',
  
  // Rotate animations
  RotateBL = 'rotate-bl',
  RotateBottom = 'rotate-bottom',
  RotateBR = 'rotate-br',
  RotateCenter = 'rotate-center',
  RotateDiagonal1 = 'rotate-diagonal-1',
  
  // Simple animations
  SimpleFadeIn = 'simple-fade-in',
  SimpleFadeOut = 'simple-fade-out',
  InstantShow = 'instant-show',
  InstantHide = 'instant-hide',
  
  // Always keep Custom at the end
  Custom = 'custom'
}

/**
 * Easing Type Enum for animation transitions
 */
export enum EasingType {
  Linear = 'linear',
  EaseIn = 'easeIn',
  EaseOut = 'easeOut',
  EaseInOut = 'easeInOut',
  Bounce = 'bounce',
  Elastic = 'elastic'
}

/**
 * Animation Mode Enum for specifying animation direction
 */
export enum AnimationMode {
  Entrance = 'entrance',
  Exit = 'exit',
  Emphasis = 'emphasis',
  Path = 'path',
  Background = 'background',
  Custom = 'custom'
}

/**
 * Animation represents a single animation applied to a layer
 */
export interface Animation {
  id: string;
  type: string;
  easing: string;
  duration: number;
  delay: number;
  startTime: number;
  direction?: string;
  mode?: AnimationMode | string;
  isOverridden?: boolean;
  customProps?: Record<string, any>;
}

/**
 * Preset represents a predefined animation configuration
 */
export interface Preset {
  id: string;
  name: string;
  type: AnimationType;
  mode: AnimationMode;
  easing: EasingType;
  duration: number;
  delay: number;
  direction?: string;
  customProps?: Record<string, any>;
  category?: string;
  tags?: string[];
}

/**
 * Keyframe represents a point in time with specific property values
 */
export interface Keyframe {
  id: string;
  time: number;
  properties: Record<string, any>;
}

/**
 * AnimationLayer represents a layer that can be animated
 */
export interface AnimationLayer {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  parentId: string | null;
  children?: AnimationLayer[];
  isLinked: boolean;
  
  // Extended properties
  linkedLayer?: LinkedLayerInfo;
  
  // Common properties
  locked?: boolean;
  isExpanded?: boolean;
  isOverridden?: boolean;
  animations?: Animation[];
  keyframes?: Keyframe[];
  position?: { x: number; y: number };
  opacity?: number;
  lastUpdated?: number;
  
  // Special indicators
  _isBackgroundLayer?: boolean;
  
  // Type indicators for container analysis
  isGroup?: boolean;
  isFrame?: boolean;
  
  // UI-specific properties
  hiddenInTimeline?: boolean;
  
  // Layer styling and dimensions
  style?: Record<string, any>;
  dimensions?: { width: number; height: number };
}

/**
 * AnimationFrame represents a design frame that contains layers
 */
export interface AnimationFrame {
  id: string;
  name: string;
  width: number;
  height: number;
  selected: boolean;
  headlineText?: string;
  description?: string;
  buttonText?: string;
  logoText?: string;
  delay?: number;
  adSizeId?: string;
  layers?: AnimationLayer[];
  hiddenLayers?: string[]; // Array of layer IDs that are hidden in this frame
}

/**
 * GifFrame represents a frame in GIF export mode
 */
export interface GifFrame {
  id: string;
  name: string;
  frameNumber: number;
  frameIndex: number;
  layers: AnimationLayer[];
  hiddenLayers: string[];
  visibleLayerCount: number;
  selected: boolean;
  delay: number;
  adSizeId: string;
  isBlankKeyframe: boolean;
  width: number;
  height: number;
  overrides: {
    layerVisibility: Record<string, any>;
  };
}

/**
 * AdSize represents a specific ad size configuration
 */
export interface AdSize {
  id: string;
  name: string;
  width: number;
  height: number;
  frameIds: string[];
  selected?: boolean;
  frames?: AnimationFrame[]; // Backward compatibility with existing code
}

/**
 * TimelineMode represents how the timeline displays animations
 */
export type TimelineMode = 'animation' | 'gifFrames';

/**
 * LinkSyncMode represents how layer linking syncs across frames
 */
export enum LinkSyncMode {
  AnimationMode = 'animationMode',
  GifFrameMode = 'gifFrameMode',
  None = 'none',
  Full = 'full'
}

/**
 * LinkRegistry tracks layer linking information
 */
export interface LinkRegistry {
  mode: LinkSyncMode;
  linkedLayers: Record<string, string[]>;
  overrides: Record<string, string[]>;
}

/**
 * LinkedLayerInfo provides information about a linked layer
 */
export interface LinkedLayerInfo {
  layerId: string;
  frameId: string;
  name: string;
  hasOverride: boolean;
  
  // Extended properties matching the linkedLayer property in AnimationLayer
  id?: string;
  
  // Additional properties used throughout the codebase
  groupId?: string;
  syncMode?: LinkSyncMode;
  isMain?: boolean;
  overrides?: string[];
}