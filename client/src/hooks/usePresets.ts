import { useState, useEffect, useCallback } from 'react';
import { useAnimationContext } from '../context/AnimationContext';
import { 
  AnimationType, 
  EasingType,
  Preset,
  Animation,
  AnimationMode
} from '../types/animation';

// Predefined animation presets
const defaultPresets: Preset[] = [
  // Google Home and Material Design inspired presets
  {
    id: 'material-stagger-in',
    name: 'Material Stagger In',
    category: 'entrance',
    animation: {
      type: AnimationType.Custom,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseOutBack,
      variant: 'staggered',
      customData: {
        staggerAmount: 0.1,
        keyframes: [
          { offset: 0, opacity: 0, transform: 'translateY(15px)' },
          { offset: 1, opacity: 1, transform: 'translateY(0)' }
        ]
      }
    },
    icon: '<rect x="12" y="24" width="24" height="4" fill="#0078D4" opacity="0.2"/><rect x="12" y="18" width="24" height="4" fill="#0078D4" opacity="0.6"/><rect x="12" y="12" width="24" height="4" fill="#0078D4"/>'
  },
  {
    id: 'breathing-pulse',
    name: 'Breathing Pulse',
    category: 'attention-seekers',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 2.5,
      delay: 0,
      easing: EasingType.EaseInOut,
      customData: {
        keyframes: [
          { offset: 0, opacity: 0.85, transform: 'scale(0.95)' },
          { offset: 0.5, opacity: 1, transform: 'scale(1.05)' },
          { offset: 1, opacity: 0.85, transform: 'scale(0.95)' }
        ]
      }
    },
    icon: '<circle cx="24" cy="24" r="12" fill="#0078D4" opacity="0.8"/><circle cx="24" cy="24" r="16" stroke="#0078D4" stroke-width="2" stroke-dasharray="4 2"/>'
  },
  {
    id: 'smooth-float',
    name: 'Smooth Float',
    category: 'attention-seekers',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 3.0,
      delay: 0,
      easing: EasingType.EaseInOut,
      customData: {
        keyframes: [
          { offset: 0, transform: 'translateY(0px)' },
          { offset: 0.5, transform: 'translateY(-8px)' },
          { offset: 1, transform: 'translateY(0px)' }
        ]
      }
    },
    icon: '<path d="M20 24L24 20L28 24L24 28L20 24Z" fill="#0078D4"/><path d="M20 24C20 21.7909 21.7909 20 24 20C26.2091 20 28 21.7909 28 24C28 26.2091 26.2091 28 24 28C21.7909 28 20 26.2091 20 24Z" stroke="#0078D4" stroke-width="2" stroke-dasharray="4 2"/>'
  },
  {
    id: 'drop-bounce-in',
    name: 'Drop Bounce In',
    category: 'entrance',
    animation: {
      type: AnimationType.Custom,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.9,
      delay: 0,
      easing: EasingType.EaseOut,
      customData: {
        keyframes: [
          { offset: 0, opacity: 0, transform: 'translateY(-40px)' },
          { offset: 0.6, opacity: 1, transform: 'translateY(10px)' },
          { offset: 0.8, transform: 'translateY(-5px)' },
          { offset: 1, transform: 'translateY(0)' }
        ]
      }
    },
    icon: '<rect x="16" y="16" width="16" height="16" rx="2" fill="#0078D4"/><path d="M24 12V16" stroke="#0078D4" stroke-width="2" stroke-dasharray="2 2"/>'
  },
  {
    id: 'shape-morph',
    name: 'Shape Morph',
    category: 'transitions',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 1.2,
      delay: 0,
      easing: EasingType.EaseInOut,
      customData: {
        keyframes: [
          { offset: 0, borderRadius: '0%', transform: 'rotate(0deg)' },
          { offset: 0.5, borderRadius: '50%', transform: 'rotate(45deg)' },
          { offset: 1, borderRadius: '0%', transform: 'rotate(90deg)' }
        ]
      }
    },
    icon: '<rect x="18" y="18" width="12" height="12" fill="#0078D4"/><circle cx="24" cy="24" r="8" stroke="#0078D4" stroke-width="2" stroke-dasharray="4 2"/>'
  },

  // Entrance animations
  {
    id: 'fade-in',
    name: 'Fade In',
    category: 'entrance',
    animation: {
      type: AnimationType.Fade,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseOut,
      opacity: 100
    },
    icon: '<path d="M24 12C17.373 12 12 17.373 12 24C12 30.627 17.373 36 24 36C30.627 36 36 30.627 36 24C36 17.373 30.627 12 24 12ZM24 32C19.582 32 16 28.418 16 24C16 19.582 19.582 16 24 16C28.418 16 32 19.582 32 24C32 28.418 28.418 32 24 32Z" fill="#0078D4" fill-opacity="0.5"/><path d="M24 8C15.163 8 8 15.163 8 24C8 32.837 15.163 40 24 40C32.837 40 40 32.837 40 24C40 15.163 32.837 8 24 8ZM24 36C17.373 36 12 30.627 12 24C12 17.373 17.373 12 24 12C30.627 12 36 17.373 36 24C36 30.627 30.627 36 24 36Z" fill="#0078D4"/>'
  },
  {
    id: 'fade-in-right',
    name: 'Fade In Right',
    category: 'entrance',
    animation: {
      type: AnimationType.Slide,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseOut,
      direction: 'right',
      opacity: 100
    },
    icon: '<path d="M8 24H40" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M32 16L40 24L32 32" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="12" y="20" width="16" height="8" rx="2" fill="#0078D4" fill-opacity="0.5"/>'
  },
  {
    id: 'bounce-in',
    name: 'Bounce In',
    category: 'entrance',
    animation: {
      type: AnimationType.Scale,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 1,
      delay: 0,
      easing: EasingType.Bounce,
      scale: 1
    },
    icon: '<circle cx="24" cy="24" r="12" fill="#0078D4"/><path d="M24 36V42" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M24 12V6" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M36 24H42" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M12 24H6" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/>'
  },
  {
    id: 'slide-up-entrance',
    name: 'Slide Up',
    category: 'entrance',
    animation: {
      type: AnimationType.SlideUp,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.7,
      delay: 0,
      easing: EasingType.EaseOut,
      opacity: 100
    },
    icon: '<path d="M24 36L24 12" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M16 20L24 12L32 20" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  {
    id: 'slide-up-spring',
    name: 'Slide Up Spring',
    category: 'entrance',
    animation: {
      type: AnimationType.SlideUp,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.9,
      delay: 0,
      easing: EasingType.EaseOutBack,
      variant: 'spring',
      opacity: 100
    },
    icon: '<path d="M24 36L24 12" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M16 20L24 12L32 20" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 26L24 18L32 26" stroke="#0078D4" stroke-width="2" stroke-dasharray="2 2" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  {
    id: 'slide-up-stagger',
    name: 'Slide Up Stagger',
    category: 'entrance',
    animation: {
      type: AnimationType.SlideUp,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseOut,
      variant: 'stagger',
      opacity: 100
    },
    icon: '<path d="M24 36L24 12" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M16 20L24 12L32 20" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 32L20 24" stroke="#0078D4" stroke-width="1" stroke-linecap="round"/><path d="M28 32L28 24" stroke="#0078D4" stroke-width="1" stroke-linecap="round"/>'
  },
  {
    id: 'slide-down-entrance',
    name: 'Slide Down',
    category: 'entrance',
    animation: {
      type: AnimationType.SlideDown,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.7,
      delay: 0,
      easing: EasingType.EaseOut,
      opacity: 100
    },
    icon: '<path d="M24 12L24 36" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M32 28L24 36L16 28" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  {
    id: 'slide-down-spring',
    name: 'Slide Down Spring',
    category: 'entrance',
    animation: {
      type: AnimationType.SlideDown,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.9,
      delay: 0,
      easing: EasingType.EaseOutBack,
      variant: 'spring',
      opacity: 100
    },
    icon: '<path d="M24 12L24 36" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M32 28L24 36L16 28" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M32 22L24 30L16 22" stroke="#0078D4" stroke-width="2" stroke-dasharray="2 2" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  {
    id: 'slide-down-bounce',
    name: 'Slide Down Bounce',
    category: 'entrance',
    animation: {
      type: AnimationType.SlideDown,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.Bounce,
      variant: 'bounce',
      opacity: 100
    },
    icon: '<path d="M24 12L24 36" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M32 28L24 36L16 28" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  {
    id: 'slide-left-entrance',
    name: 'Slide Left',
    category: 'entrance',
    animation: {
      type: AnimationType.SlideLeft,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.7,
      delay: 0,
      easing: EasingType.EaseOut,
      opacity: 100
    },
    icon: '<path d="M36 24L12 24" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M20 16L12 24L20 32" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  {
    id: 'slide-left-spring',
    name: 'Slide Left Spring',
    category: 'entrance',
    animation: {
      type: AnimationType.SlideLeft,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.9,
      delay: 0,
      easing: EasingType.EaseOutBack,
      variant: 'spring',
      opacity: 100
    },
    icon: '<path d="M36 24L12 24" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M20 16L12 24L20 32" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 16L18 24L26 32" stroke="#0078D4" stroke-width="2" stroke-dasharray="2 2" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  {
    id: 'slide-right-entrance',
    name: 'Slide Right',
    category: 'entrance',
    animation: {
      type: AnimationType.SlideRight,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.7,
      delay: 0,
      easing: EasingType.EaseOut,
      opacity: 100
    },
    icon: '<path d="M12 24L36 24" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M28 16L36 24L28 32" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  {
    id: 'slide-right-spring',
    name: 'Slide Right Spring',
    category: 'entrance',
    animation: {
      type: AnimationType.SlideRight,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.9,
      delay: 0,
      easing: EasingType.EaseOutBack,
      variant: 'spring',
      opacity: 100
    },
    icon: '<path d="M12 24L36 24" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M28 16L36 24L28 32" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 16L30 24L22 32" stroke="#0078D4" stroke-width="2" stroke-dasharray="2 2" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  {
    id: 'scale-up-entrance',
    name: 'Scale Up',
    category: 'entrance',
    animation: {
      type: AnimationType.ScaleUp,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseOut
    },
    icon: '<rect x="16" y="16" width="16" height="16" fill="#0078D4" fill-opacity="0.5"/><rect x="12" y="12" width="24" height="24" stroke="#0078D4" stroke-width="2" stroke-dasharray="4 4"/>'
  },
  {
    id: 'scale-fade-entrance',
    name: 'Scale Fade',
    category: 'entrance',
    animation: {
      type: AnimationType.ScaleFade,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseOut
    },
    icon: '<rect x="16" y="16" width="16" height="16" fill="#0078D4" fill-opacity="0.2"/><rect x="12" y="12" width="24" height="24" stroke="#0078D4" stroke-width="2"/>'
  },
  {
    id: 'wipe-in-entrance',
    name: 'Wipe In',
    category: 'entrance',
    animation: {
      type: AnimationType.WipeIn,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseInOut,
      direction: 'right'
    },
    icon: '<rect x="12" y="12" width="24" height="24" fill="#0078D4"/><path d="M24 12V36" stroke="#fff" stroke-width="2"/>'
  },
  {
    id: 'wipe-in-left',
    name: 'Wipe In Left',
    category: 'entrance',
    animation: {
      type: AnimationType.WipeIn,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseInOut,
      direction: 'left'
    },
    icon: '<rect x="12" y="12" width="24" height="24" fill="#0078D4"/><path d="M24 12V36" stroke="#fff" stroke-width="2"/>'
  },
  {
    id: 'wipe-in-top',
    name: 'Wipe In Top',
    category: 'entrance',
    animation: {
      type: AnimationType.WipeIn,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseInOut,
      direction: 'top'
    },
    icon: '<rect x="12" y="12" width="24" height="24" fill="#0078D4"/><path d="M12 24H36" stroke="#fff" stroke-width="2"/>'
  },
  {
    id: 'wipe-in-center-h',
    name: 'Wipe In Center',
    category: 'entrance',
    animation: {
      type: AnimationType.WipeIn,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseOut,
      direction: 'center-h'
    },
    icon: '<rect x="12" y="12" width="24" height="24" fill="#0078D4"/><path d="M24 12V36" stroke="#fff" stroke-width="2"/><path d="M12 24H36" stroke="#fff" stroke-width="2"/>'
  },
  {
    id: 'puff-in-center-entrance',
    name: 'Puff In Center',
    category: 'entrance',
    animation: {
      type: AnimationType.PuffInCenter,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.7,
      delay: 0,
      easing: EasingType.EaseOut
    },
    icon: '<circle cx="24" cy="24" r="10" fill="#0078D4" fill-opacity="0.5"/><circle cx="24" cy="24" r="16" stroke="#0078D4" stroke-width="2"/>'
  },
  {
    id: 'puff-out-center-exit',
    name: 'Puff Out Center',
    category: 'exit',
    animation: {
      type: AnimationType.PuffOutCenter,
      mode: AnimationMode.Exit,
      startTime: 0,
      duration: 0.7,
      delay: 0,
      easing: EasingType.EaseIn,
      opacity: 0
    },
    icon: '<circle cx="24" cy="24" r="16" fill="#0078D4" fill-opacity="0.5"/><circle cx="24" cy="24" r="8" stroke="#0078D4" stroke-width="2"/>'
  },
  {
    id: 'puff-out-center-intense',
    name: 'Puff Out Intense',
    category: 'exit',
    animation: {
      type: AnimationType.PuffOutCenter,
      mode: AnimationMode.Exit,
      startTime: 0,
      duration: 0.5,
      delay: 0,
      easing: EasingType.EaseOutBack,
      variant: 'intense',
      opacity: 0
    },
    icon: '<circle cx="24" cy="24" r="18" fill="#0078D4" fill-opacity="0.5"/><circle cx="24" cy="24" r="6" stroke="#0078D4" stroke-width="2"/>'
  },
  
  // Circle animations
  {
    id: 'circle-in',
    name: 'Circle In',
    category: 'entrance',
    animation: {
      type: AnimationType.CircleIn,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseOut
    },
    icon: '<circle cx="24" cy="24" r="16" stroke="#0078D4" stroke-width="2" fill="#0078D4" fill-opacity="0.2"/>'
  },
  {
    id: 'circle-out',
    name: 'Circle Out',
    category: 'exit',
    animation: {
      type: AnimationType.CircleOut,
      mode: AnimationMode.Exit,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseIn
    },
    icon: '<circle cx="24" cy="24" r="16" stroke="#0078D4" stroke-width="2" fill="#0078D4" fill-opacity="0.2"/>'
  },
  {
    id: 'circle-in-top',
    name: 'Circle In Top',
    category: 'entrance',
    animation: {
      type: AnimationType.CircleInTop,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseOut
    },
    icon: '<circle cx="24" cy="12" r="12" stroke="#0078D4" stroke-width="2" fill="#0078D4" fill-opacity="0.2"/>'
  },
  {
    id: 'circle-in-bottom',
    name: 'Circle In Bottom',
    category: 'entrance',
    animation: {
      type: AnimationType.CircleInBottom,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseOut
    },
    icon: '<circle cx="24" cy="36" r="12" stroke="#0078D4" stroke-width="2" fill="#0078D4" fill-opacity="0.2"/>'
  },
  {
    id: 'circle-in-left',
    name: 'Circle In Left',
    category: 'entrance',
    animation: {
      type: AnimationType.CircleInLeft,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseOut
    },
    icon: '<circle cx="12" cy="24" r="12" stroke="#0078D4" stroke-width="2" fill="#0078D4" fill-opacity="0.2"/>'
  },
  {
    id: 'circle-in-right',
    name: 'Circle In Right',
    category: 'entrance',
    animation: {
      type: AnimationType.CircleInRight,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseOut
    },
    icon: '<circle cx="36" cy="24" r="12" stroke="#0078D4" stroke-width="2" fill="#0078D4" fill-opacity="0.2"/>'
  },
  
  // Advanced Scale and Transform
  {
    id: 'rotate-scale',
    name: 'Rotate Scale',
    category: 'entrance',
    animation: {
      type: AnimationType.RotateScale,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseOut,
      scale: 1,
      rotation: 360
    },
    icon: '<rect x="16" y="16" width="16" height="16" fill="#0078D4" fill-opacity="0.5" transform="rotate(45 24 24)"/><rect x="12" y="12" width="24" height="24" stroke="#0078D4" stroke-width="2" stroke-dasharray="4 4"/>'
  },
  
  // Exit animations
  {
    id: 'fade-out',
    name: 'Fade Out',
    category: 'exit',
    animation: {
      type: AnimationType.FadeOut,
      mode: AnimationMode.Exit,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseIn
    },
    icon: '<path d="M24 12C17.373 12 12 17.373 12 24C12 30.627 17.373 36 24 36C30.627 36 36 30.627 36 24C36 17.373 30.627 12 24 12ZM24 32C19.582 32 16 28.418 16 24C16 19.582 19.582 16 24 16C28.418 16 32 19.582 32 24C32 28.418 28.418 32 24 32Z" fill="#0078D4" fill-opacity="0.2"/><path d="M24 8C15.163 8 8 15.163 8 24C8 32.837 15.163 40 24 40C32.837 40 40 32.837 40 24C40 15.163 32.837 8 24 8ZM24 36C17.373 36 12 30.627 12 24C12 17.373 17.373 12 24 12C30.627 12 36 17.373 36 24C36 30.627 30.627 36 24 36Z" fill="#0078D4" fill-opacity="0.5"/>'
  },
  {
    id: 'slide-down-exit',
    name: 'Slide Down Exit',
    category: 'exit',
    animation: {
      type: AnimationType.Slide,
      mode: AnimationMode.Exit,
      startTime: 0,
      duration: 0.7,
      delay: 0,
      easing: EasingType.EaseIn,
      direction: 'down',
      opacity: 0
    },
    icon: '<path d="M24 12L24 36" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M32 28L24 36L16 28" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  {
    id: 'scale-down-exit',
    name: 'Scale Down Exit',
    category: 'exit',
    animation: {
      type: AnimationType.ScaleDown,
      mode: AnimationMode.Exit,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseIn
    },
    icon: '<rect x="12" y="12" width="24" height="24" fill="#0078D4"/><rect x="16" y="16" width="16" height="16" stroke="#0078D4" stroke-width="2" fill="#0078D4" fill-opacity="0.3"/>'
  },
  {
    id: 'wipe-out-exit',
    name: 'Wipe Out Exit',
    category: 'exit',
    animation: {
      type: AnimationType.WipeOut,
      mode: AnimationMode.Exit,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseInOut,
      direction: 'left'
    },
    icon: '<rect x="12" y="12" width="24" height="24" fill="#0078D4"/><path d="M24 12V36" stroke="#fff" stroke-width="2"/>'
  },
  {
    id: 'wipe-out-right',
    name: 'Wipe Out Right',
    category: 'exit',
    animation: {
      type: AnimationType.WipeOut,
      mode: AnimationMode.Exit,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseInOut,
      direction: 'right'
    },
    icon: '<rect x="12" y="12" width="24" height="24" fill="#0078D4"/><path d="M24 12V36" stroke="#fff" stroke-width="2"/>'
  },
  {
    id: 'wipe-out-center',
    name: 'Wipe Out Center',
    category: 'exit',
    animation: {
      type: AnimationType.WipeOut,
      mode: AnimationMode.Exit,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseInOut,
      direction: 'center-h'
    },
    icon: '<rect x="12" y="12" width="24" height="24" fill="#0078D4"/><path d="M24 12V36" stroke="#fff" stroke-width="2"/><path d="M12 24H36" stroke="#fff" stroke-width="2"/>'
  },
  
  // Rotations & Flips - Entrance Animations
  {
    id: 'rotate-90-entrance',
    name: 'Rotate 90°',
    category: 'entrance',
    animation: {
      type: AnimationType.Rotate90,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseOut
    },
    icon: '<path d="M24 12C17.373 12 12 17.373 12 24C12 30.627 17.373 36 24 36C30.627 36 36 30.627 36 24C36 17.373 30.627 12 24 12ZM24 32C19.582 32 16 28.418 16 24C16 19.582 19.582 16 24 16C28.418 16 32 19.582 32 24C32 28.418 28.418 32 24 32Z" fill="#0078D4"/><path d="M24 16L24 12" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M31 24L35 24" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M24 32L24 36" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M12 24L16 24" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M30 18L32 16" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M32 32L30 30" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M16 32L18 30" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M18 18L16 16" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M32 24C32 28.4183 28.4183 32 24 32" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M32 24L24 24" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/>'
  },
  {
    id: 'rotate-minus-90-entrance',
    name: 'Rotate -90°',
    category: 'entrance',
    animation: {
      type: AnimationType.RotateMinus90,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseOut
    },
    icon: '<path d="M24 12C17.373 12 12 17.373 12 24C12 30.627 17.373 36 24 36C30.627 36 36 30.627 36 24C36 17.373 30.627 12 24 12ZM24 32C19.582 32 16 28.418 16 24C16 19.582 19.582 16 24 16C28.418 16 32 19.582 32 24C32 28.418 28.418 32 24 32Z" fill="#0078D4"/><path d="M24 16L24 12" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M16 24L12 24" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M24 32L24 36" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M32 24L36 24" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M30 18L32 16" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M32 32L30 30" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M16 32L18 30" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M18 18L16 16" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M16 24C16 19.5817 19.5817 16 24 16" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M16 24L24 24" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/>'
  },
  {
    id: 'flip-vertical-entrance',
    name: 'Flip Vertical',
    category: 'entrance',
    animation: {
      type: AnimationType.FlipVertical,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseOut
    },
    icon: '<rect x="12" y="12" width="24" height="24" fill="#0078D4" fill-opacity="0.5"/><path d="M12 24H36" stroke="#0078D4" stroke-width="2"/><path d="M12 16C12 13.7909 13.7909 12 16 12H32C34.2091 12 36 13.7909 36 16V24H12V16Z" fill="#0078D4"/>'
  },
  {
    id: 'flip-horizontal-entrance',
    name: 'Flip Horizontal',
    category: 'entrance',
    animation: {
      type: AnimationType.FlipHorizontal,
      mode: AnimationMode.Entrance,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseOut
    },
    icon: '<rect x="12" y="12" width="24" height="24" fill="#0078D4" fill-opacity="0.5"/><path d="M24 12L24 36" stroke="#0078D4" stroke-width="2"/><path d="M16 12C13.7909 12 12 13.7909 12 16V32C12 34.2091 13.7909 36 16 36H24V12H16Z" fill="#0078D4"/>'
  },
  
  // Rotation & Flips - Exit Animations
  {
    id: 'rotate-90-exit',
    name: 'Rotate 90° Exit',
    category: 'exit',
    animation: {
      type: AnimationType.Rotate90,
      mode: AnimationMode.Exit,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseIn
    },
    icon: '<path d="M24 12C17.373 12 12 17.373 12 24C12 30.627 17.373 36 24 36C30.627 36 36 30.627 36 24C36 17.373 30.627 12 24 12ZM24 32C19.582 32 16 28.418 16 24C16 19.582 19.582 16 24 16C28.418 16 32 19.582 32 24C32 28.418 28.418 32 24 32Z" fill="#0078D4"/><path d="M24 16L24 12" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M31 24L35 24" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M24 32L24 36" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M12 24L16 24" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M30 18L32 16" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M32 32L30 30" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M16 32L18 30" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M18 18L16 16" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M32 24C32 28.4183 28.4183 32 24 32" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M32 24L24 24" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/>'
  },
  {
    id: 'flip-vertical-exit',
    name: 'Flip Vertical Exit',
    category: 'exit',
    animation: {
      type: AnimationType.FlipVertical,
      mode: AnimationMode.Exit,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseIn
    },
    icon: '<rect x="12" y="12" width="24" height="24" fill="#0078D4" fill-opacity="0.5"/><path d="M12 24H36" stroke="#0078D4" stroke-width="2"/><path d="M12 16C12 13.7909 13.7909 12 16 12H32C34.2091 12 36 13.7909 36 16V24H12V16Z" fill="#0078D4"/>'
  },
  
  // Attention Seekers
  {
    id: 'blink',
    name: 'Blink',
    category: 'attention-seekers',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.Linear,
      customData: {
        keyframes: [
          { offset: 0, opacity: 1 },
          { offset: 0.25, opacity: 0 },
          { offset: 0.5, opacity: 1 },
          { offset: 0.75, opacity: 0 },
          { offset: 1, opacity: 1 }
        ]
      }
    },
    icon: '<circle cx="24" cy="24" r="12" fill="#0078D4"/><circle cx="24" cy="24" r="12" fill="#0078D4" fill-opacity="0.2" stroke="#0078D4" stroke-width="2" stroke-dasharray="6 3"/>'
  },
  {
    id: 'bounce-top',
    name: 'Bounce Top',
    category: 'attention-seekers',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.Bounce,
      customData: {
        keyframes: [
          { offset: 0, transform: 'translateY(0)' },
          { offset: 0.5, transform: 'translateY(-15px)' },
          { offset: 1, transform: 'translateY(0)' }
        ]
      }
    },
    icon: '<rect x="16" y="16" width="16" height="16" fill="#0078D4"/><path d="M20 12L28 12" stroke="#0078D4" stroke-width="2"/><path d="M24 16L24 12" stroke="#0078D4" stroke-width="2"/>'
  },
  {
    id: 'bounce-right',
    name: 'Bounce Right',
    category: 'attention-seekers',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.Bounce,
      customData: {
        keyframes: [
          { offset: 0, transform: 'translateX(0)' },
          { offset: 0.5, transform: 'translateX(15px)' },
          { offset: 1, transform: 'translateX(0)' }
        ]
      }
    },
    icon: '<rect x="16" y="16" width="16" height="16" fill="#0078D4"/><path d="M36 20L36 28" stroke="#0078D4" stroke-width="2"/><path d="M32 24L36 24" stroke="#0078D4" stroke-width="2"/>'
  },
  {
    id: 'bounce-bottom',
    name: 'Bounce Bottom',
    category: 'attention-seekers',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.Bounce,
      customData: {
        keyframes: [
          { offset: 0, transform: 'translateY(0)' },
          { offset: 0.5, transform: 'translateY(15px)' },
          { offset: 1, transform: 'translateY(0)' }
        ]
      }
    },
    icon: '<rect x="16" y="16" width="16" height="16" fill="#0078D4"/><path d="M20 36L28 36" stroke="#0078D4" stroke-width="2"/><path d="M24 32L24 36" stroke="#0078D4" stroke-width="2"/>'
  },
  {
    id: 'bounce-left',
    name: 'Bounce Left',
    category: 'attention-seekers',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.Bounce,
      customData: {
        keyframes: [
          { offset: 0, transform: 'translateX(0)' },
          { offset: 0.5, transform: 'translateX(-15px)' },
          { offset: 1, transform: 'translateX(0)' }
        ]
      }
    },
    icon: '<rect x="16" y="16" width="16" height="16" fill="#0078D4"/><path d="M12 20L12 28" stroke="#0078D4" stroke-width="2"/><path d="M16 24L12 24" stroke="#0078D4" stroke-width="2"/>'
  },
  {
    id: 'flicker',
    name: 'Flicker',
    category: 'attention-seekers',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 1,
      delay: 0,
      easing: EasingType.Linear,
      customData: {
        keyframes: [
          { offset: 0, opacity: 1 },
          { offset: 0.1, opacity: 0 },
          { offset: 0.2, opacity: 1 },
          { offset: 0.3, opacity: 0 },
          { offset: 0.4, opacity: 1 },
          { offset: 0.7, opacity: 1 },
          { offset: 0.8, opacity: 0 },
          { offset: 0.9, opacity: 1 },
          { offset: 1, opacity: 1 }
        ]
      }
    },
    icon: '<path d="M20 12H28L24 20L28 24L20 36L24 24L20 20L24 12" fill="#0078D4"/>'
  },
  {
    id: 'flicker-fade',
    name: 'Flicker Fade',
    category: 'attention-seekers',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 1.2,
      delay: 0,
      easing: EasingType.Linear,
      customData: {
        keyframes: [
          { offset: 0, opacity: 0.2 },
          { offset: 0.1, opacity: 1 },
          { offset: 0.2, opacity: 0.2 },
          { offset: 0.3, opacity: 1 },
          { offset: 0.5, opacity: 0.2 },
          { offset: 0.6, opacity: 1 },
          { offset: 0.8, opacity: 0.2 },
          { offset: 0.9, opacity: 1 },
          { offset: 1, opacity: 0.2 }
        ]
      }
    },
    icon: '<path d="M22 16V20M24 16V22M26 16V18" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><circle cx="24" cy="24" r="8" fill="#0078D4" fill-opacity="0.5" stroke="#0078D4" stroke-width="2"/>'
  },
  {
    id: 'jello-horizontal',
    name: 'Jello Horizontal',
    category: 'attention-seekers',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 0.9,
      delay: 0,
      easing: EasingType.Linear,
      customData: {
        keyframes: [
          { offset: 0, transform: 'scale3d(1, 1, 1)' },
          { offset: 0.3, transform: 'scale3d(1.25, 0.75, 1)' },
          { offset: 0.4, transform: 'scale3d(0.75, 1.25, 1)' },
          { offset: 0.5, transform: 'scale3d(1.15, 0.85, 1)' },
          { offset: 0.65, transform: 'scale3d(0.95, 1.05, 1)' },
          { offset: 0.75, transform: 'scale3d(1.05, 0.95, 1)' },
          { offset: 1, transform: 'scale3d(1, 1, 1)' }
        ]
      }
    },
    icon: '<rect x="16" y="16" width="16" height="16" rx="2" fill="#0078D4"/><path d="M12 24H16M32 24H36" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/>'
  },
  {
    id: 'jello-vertical',
    name: 'Jello Vertical',
    category: 'attention-seekers',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 0.9,
      delay: 0,
      easing: EasingType.Linear,
      customData: {
        keyframes: [
          { offset: 0, transform: 'scale3d(1, 1, 1)' },
          { offset: 0.3, transform: 'scale3d(0.75, 1.25, 1)' },
          { offset: 0.4, transform: 'scale3d(1.25, 0.75, 1)' },
          { offset: 0.5, transform: 'scale3d(0.85, 1.15, 1)' },
          { offset: 0.65, transform: 'scale3d(1.05, 0.95, 1)' },
          { offset: 0.75, transform: 'scale3d(0.95, 1.05, 1)' },
          { offset: 1, transform: 'scale3d(1, 1, 1)' }
        ]
      }
    },
    icon: '<rect x="16" y="16" width="16" height="16" rx="2" fill="#0078D4"/><path d="M24 12V16M24 32V36" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/>'
  },
  {
    id: 'heartbeat',
    name: 'Heartbeat',
    category: 'attention-seekers',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 1.3,
      delay: 0,
      easing: EasingType.EaseInOut,
      customData: {
        keyframes: [
          { offset: 0, transform: 'scale(1)' },
          { offset: 0.14, transform: 'scale(1.3)' },
          { offset: 0.28, transform: 'scale(1)' },
          { offset: 0.42, transform: 'scale(1.3)' },
          { offset: 0.7, transform: 'scale(1)' },
          { offset: 1, transform: 'scale(1)' }
        ]
      }
    },
    icon: '<path d="M24 32L23.0268 31.5098C18.4713 29.1026 16 24.7137 16 20.1397C16 16.3359 18.8127 14 22.3077 14C24.5234 14 25.978 15.9424 24 20C27.978 15.9424 29.4766 14 31.6923 14C35.1873 14 38 16.3359 38 20.1397C38 24.7137 34.5254 29.1026 29.9732 31.5098L29 32H24Z" fill="#0078D4" stroke="#0078D4" stroke-width="2"/>'
  },
  {
    id: 'shake-horizontal',
    name: 'Shake Horizontal',
    category: 'attention-seekers',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.Linear,
      customData: {
        keyframes: [
          { offset: 0, transform: 'translateX(0)' },
          { offset: 0.1, transform: 'translateX(-8px)' },
          { offset: 0.2, transform: 'translateX(8px)' },
          { offset: 0.3, transform: 'translateX(-8px)' },
          { offset: 0.4, transform: 'translateX(8px)' },
          { offset: 0.5, transform: 'translateX(-8px)' },
          { offset: 0.6, transform: 'translateX(8px)' },
          { offset: 0.7, transform: 'translateX(-8px)' },
          { offset: 0.8, transform: 'translateX(8px)' },
          { offset: 0.9, transform: 'translateX(-8px)' },
          { offset: 1, transform: 'translateX(0)' }
        ]
      }
    },
    icon: '<rect x="16" y="16" width="16" height="16" fill="#0078D4"/><path d="M12 24L16 24M32 24L36 24" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/>'
  },
  {
    id: 'shake-left',
    name: 'Shake Left',
    category: 'attention-seekers',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.Linear,
      customData: {
        keyframes: [
          { offset: 0, transform: 'translateX(0)' },
          { offset: 0.2, transform: 'translateX(-10px)' },
          { offset: 0.4, transform: 'translateX(-5px)' },
          { offset: 0.6, transform: 'translateX(-8px)' },
          { offset: 0.8, transform: 'translateX(-3px)' },
          { offset: 1, transform: 'translateX(0)' }
        ]
      }
    },
    icon: '<rect x="16" y="16" width="16" height="16" fill="#0078D4"/><path d="M10 24L14 24" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M10 20L14 24L10 28" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  {
    id: 'shake-top',
    name: 'Shake Top',
    category: 'attention-seekers',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.Linear,
      customData: {
        keyframes: [
          { offset: 0, transform: 'translateY(0)' },
          { offset: 0.1, transform: 'translateY(-8px)' },
          { offset: 0.2, transform: 'translateY(0)' },
          { offset: 0.3, transform: 'translateY(-8px)' },
          { offset: 0.4, transform: 'translateY(0)' },
          { offset: 0.5, transform: 'translateY(-8px)' },
          { offset: 0.6, transform: 'translateY(0)' },
          { offset: 0.7, transform: 'translateY(-8px)' },
          { offset: 0.8, transform: 'translateY(0)' },
          { offset: 0.9, transform: 'translateY(-8px)' },
          { offset: 1, transform: 'translateY(0)' }
        ]
      }
    },
    icon: '<rect x="16" y="16" width="16" height="16" fill="#0078D4"/><path d="M24 12L24 16" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M20 10L24 14L28 10" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  {
    id: 'ping',
    name: 'Ping',
    category: 'attention-seekers',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 1.5,
      delay: 0,
      easing: EasingType.EaseOut,
      customData: {
        keyframes: [
          { offset: 0, transform: 'scale(1)', opacity: 1 },
          { offset: 0.7, transform: 'scale(1)', opacity: 1 },
          { offset: 1, transform: 'scale(2.5)', opacity: 0 }
        ]
      }
    },
    icon: '<circle cx="24" cy="24" r="6" fill="#0078D4"/><circle cx="24" cy="24" r="12" stroke="#0078D4" stroke-width="2" stroke-dasharray="4 2"/>'
  },
  {
    id: 'pulsate-up',
    name: 'Pulsate (Up)',
    category: 'attention-seekers',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 0.7,
      delay: 0,
      easing: EasingType.EaseOut,
      customData: {
        keyframes: [
          { offset: 0, transform: 'scale(1)' },
          { offset: 0.5, transform: 'scale(1.1)' },
          { offset: 1, transform: 'scale(1)' }
        ]
      }
    },
    icon: '<circle cx="24" cy="24" r="8" fill="#0078D4"/><circle cx="24" cy="24" r="12" stroke="#0078D4" stroke-width="2" stroke-dasharray="2 2"/>'
  },
  {
    id: 'pulsate-down',
    name: 'Pulsate (Down)',
    category: 'attention-seekers',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 0.7,
      delay: 0,
      easing: EasingType.EaseOut,
      customData: {
        keyframes: [
          { offset: 0, transform: 'scale(1)' },
          { offset: 0.5, transform: 'scale(0.9)' },
          { offset: 1, transform: 'scale(1)' }
        ]
      }
    },
    icon: '<circle cx="24" cy="24" r="12" fill="#0078D4"/><circle cx="24" cy="24" r="8" stroke="#0078D4" stroke-width="2" stroke-dasharray="2 2"/>'
  },
  {
    id: 'flicker-3',
    name: 'Flicker 3',
    category: 'special-effects',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 0.5,
      delay: 0,
      easing: EasingType.Linear,
      customData: {
        keyframes: [
          { offset: 0, opacity: 1 },
          { offset: 0.33, opacity: 0 },
          { offset: 0.66, opacity: 1 },
          { offset: 1, opacity: 1 }
        ]
      }
    },
    icon: '<rect x="14" y="14" width="20" height="20" rx="2" fill="#0078D4" fill-opacity="0.5"/><path d="M24 14V34" stroke="#0078D4" stroke-width="2"/>'
  },
  {
    id: 'scale-up-center',
    name: 'Scale Up Center',
    category: 'special-effects',
    animation: {
      type: AnimationType.Scale,
      startTime: 0,
      duration: 0.7,
      delay: 0,
      easing: EasingType.EaseOut,
      scale: 1.2
    },
    icon: '<rect x="16" y="16" width="16" height="16" fill="#0078D4" fill-opacity="0.5"/><rect x="12" y="12" width="24" height="24" stroke="#0078D4" stroke-width="2"/>'
  },
  
  // Exit animations
  {
    id: 'fade-out',
    name: 'Fade Out',
    category: 'exit',
    animation: {
      type: AnimationType.Fade,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseIn,
      opacity: 0
    },
    icon: '<path d="M24 12C17.373 12 12 17.373 12 24C12 30.627 17.373 36 24 36C30.627 36 36 30.627 36 24C36 17.373 30.627 12 24 12ZM24 32C19.582 32 16 28.418 16 24C16 19.582 19.582 16 24 16C28.418 16 32 19.582 32 24C32 28.418 28.418 32 24 32Z" fill="#0078D4" fill-opacity="0.2"/><path d="M24 8C15.163 8 8 15.163 8 24C8 32.837 15.163 40 24 40C32.837 40 40 32.837 40 24C40 15.163 32.837 8 24 8ZM24 36C17.373 36 12 30.627 12 24C12 17.373 17.373 12 24 12C30.627 12 36 17.373 36 24C36 30.627 30.627 36 24 36Z" fill="#0078D4" fill-opacity="0.5"/>'
  },
  
  // Emphasis animations
  {
    id: 'pulse',
    name: 'Pulse',
    category: 'emphasis',
    animation: {
      type: AnimationType.Pulse,
      startTime: 0,
      duration: 0.8,
      delay: 0,
      easing: EasingType.EaseInOut,
      customData: {
        keyframes: [
          { offset: 0, transform: 'scale(1)' },
          { offset: 0.5, transform: 'scale(1.1)' },
          { offset: 1, transform: 'scale(1)' }
        ]
      }
    },
    icon: '<circle cx="24" cy="24" r="8" fill="#0078D4"/><circle cx="24" cy="24" r="16" stroke="#0078D4" stroke-width="2" stroke-dasharray="4 4"/>'
  },
  {
    id: 'shake',
    name: 'Shake',
    category: 'emphasis',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 0.5,
      delay: 0,
      easing: EasingType.Linear,
      customData: {
        keyframes: [
          { offset: 0, transform: 'translateX(0)' },
          { offset: 0.1, transform: 'translateX(-5px)' },
          { offset: 0.3, transform: 'translateX(5px)' },
          { offset: 0.5, transform: 'translateX(-5px)' },
          { offset: 0.7, transform: 'translateX(5px)' },
          { offset: 0.9, transform: 'translateX(-5px)' },
          { offset: 1, transform: 'translateX(0)' }
        ]
      }
    },
    icon: '<rect x="16" y="16" width="16" height="16" fill="#0078D4"/><path d="M12 24H8" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M40 24H36" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/>'
  },
  
  // Text animations
  {
    id: 'text-character',
    name: 'Character by Character',
    category: 'text',
    animation: {
      type: AnimationType.Custom,
      startTime: 0,
      duration: 1.2,
      delay: 0,
      easing: EasingType.Linear,
      customData: {
        textAnimation: 'character'
      }
    },
    icon: '<path d="M12 16H36" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M12 24H28" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/><path d="M12 32H22" stroke="#0078D4" stroke-width="2" stroke-linecap="round"/>'
  }
];

// Custom hook for managing animation presets
export function usePresets() {
  const [presets, setPresets] = useState<Preset[]>(defaultPresets);
  const [customPresets, setCustomPresets] = useState<Preset[]>([]);
  const { updateLayerAnimation } = useAnimationContext();
  
  // Load custom presets from localStorage
  useEffect(() => {
    const storedPresets = localStorage.getItem('customPresets');
    if (storedPresets) {
      try {
        const parsedPresets = JSON.parse(storedPresets);
        setCustomPresets(parsedPresets);
      } catch (error) {
        console.error('Error parsing custom presets:', error);
      }
    }
  }, []);
  
  // Combine default and custom presets
  useEffect(() => {
    setPresets([...defaultPresets, ...customPresets]);
  }, [customPresets]);
  
  // Save a custom preset
  const saveCustomPreset = useCallback((name: string, animation: Animation, category: string = 'custom') => {
    const newPreset: Preset = {
      id: `custom-${Date.now()}`,
      name,
      category,
      animation,
      icon: '<rect x="16" y="16" width="16" height="16" fill="#0078D4"/>' // Default icon
    };
    
    setCustomPresets(prev => {
      const updatedPresets = [...prev, newPreset];
      localStorage.setItem('customPresets', JSON.stringify(updatedPresets));
      return updatedPresets;
    });
    
    return newPreset.id;
  }, []);
  
  // Apply a preset to a layer
  const applyPreset = useCallback((layerId: string, presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      updateLayerAnimation(layerId, preset.animation);
      return true;
    }
    return false;
  }, [presets, updateLayerAnimation]);
  
  // Delete a custom preset
  const deleteCustomPreset = useCallback((presetId: string) => {
    setCustomPresets(prev => {
      const updatedPresets = prev.filter(p => p.id !== presetId);
      localStorage.setItem('customPresets', JSON.stringify(updatedPresets));
      return updatedPresets;
    });
  }, []);
  
  return {
    presets,
    saveCustomPreset,
    applyPreset,
    deleteCustomPreset
  };
}
