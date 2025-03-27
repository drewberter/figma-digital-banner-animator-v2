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
  type: AnimationType;
  mode?: AnimationMode; // Entrance or Exit animation
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
  customData?: Record<string, any>;
}

export interface AnimationLayer {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  animations: Animation[];
  keyframes: Keyframe[];
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