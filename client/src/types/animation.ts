export enum AnimationType {
  None = 'None',
  Fade = 'Fade',
  Slide = 'Slide',
  Scale = 'Scale',
  Rotate = 'Rotate',
  Bounce = 'Bounce',
  Pulse = 'Pulse',
  Custom = 'Custom'
}

export enum EasingType {
  Linear = 'Linear',
  EaseIn = 'Ease In',
  EaseOut = 'Ease Out',
  EaseInOut = 'Ease In Out',
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
  isOverridden?: boolean; // Whether this animation has been overridden in a linked layer
  customData?: Record<string, any>;
}

export enum LinkSyncMode {
  Full = 'Full',         // Fully synchronize all animations
  Partial = 'Partial',   // Synchronize specific animations
  Independent = 'Independent' // No synchronization
}

export interface LinkedLayerInfo {
  groupId: string;        // Unique identifier for the linked group
  syncMode: LinkSyncMode; // How animations are synchronized
  isMain: boolean;        // Whether this is the main/master layer in the group
  overrides: string[];    // IDs of animations that are overridden (not synced)
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
}

export interface AnimationFrame {
  id: string;
  name: string;
  selected: boolean;
  width: number;
  height: number;
}

export interface Preset {
  id: string;
  name: string;
  category: string;
  animation: Animation;
  icon: string; // SVG path
}