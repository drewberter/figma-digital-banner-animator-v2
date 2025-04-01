/**
 * Animation type definitions
 */

/**
 * Animation object containing properties and timeline for a layer
 */
export interface Animation {
  type: string;
  startTime: number;
  duration: number;
  delay?: number;
  easing: string;
  direction?: string;
  opacity?: number;
  scale?: number;
  rotation?: number;
  positionOverride?: boolean;
  position?: {
    x: number;
    y: number;
  };
  customData?: Record<string, any>;
}

/**
 * Keyframe for animation
 */
export interface Keyframe {
  time: number;
  properties: Record<string, any>;
}

/**
 * Link synchronization mode
 */
export enum LinkSyncMode {
  Full = 'Full',
  Visibility = 'Visibility',
  Animation = 'Animation'
}

/**
 * Linked layer information
 */
export interface LinkedLayerInfo {
  groupId: string;
  syncMode: LinkSyncMode;
  isMain: boolean;
  overrides: string[];
}

/**
 * Animation layer, can be nested
 */
export interface AnimationLayer {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  expanded?: boolean;
  animations: Animation[];
  keyframes: Keyframe[];
  children?: AnimationLayer[];
  
  // For layer linking
  isLinked?: boolean;
  linkedLayer?: LinkedLayerInfo;
}

/**
 * Animation frame containing layers
 */
export interface AnimationFrame {
  id: string;
  name: string;
  selected: boolean;
  width: number;
  height: number;
  adSizeId?: string;
  layers?: AnimationLayer[];
}

/**
 * GIF frame (extends AnimationFrame)
 */
export interface GifFrame extends AnimationFrame {
  frameNumber: string;
  hiddenLayers?: string[];
  visibleLayerCount?: number;
  overrides?: {
    layerVisibility?: {
      [layerId: string]: {
        overridden: boolean;
      };
    };
  };
}

/**
 * Ad size containing frames
 */
export interface AdSize {
  id: string;
  name: string;
  width: number;
  height: number;
  frames: AnimationFrame[];
  selected: boolean;
}

/**
 * Timeline mode
 */
export type TimelineMode = 'animation' | 'gifFrames';