/**
 * Test Type Definitions
 * 
 * These types are simplified versions of the actual types used in the application.
 * They're used for test files to avoid TypeScript errors when working with test data.
 */

import { Animation, Keyframe } from './animation';

/**
 * Simplified Animation Layer for testing purposes
 */
export interface TestAnimationLayer {
  id: string;
  name: string;
  visible: boolean;
  children?: TestAnimationLayer[];
  type: string;
  parentId: string | null;
  isLinked: boolean;
  opacity?: number;
  position?: { x: number; y: number };
  lastUpdated?: number;
}

/**
 * Simplified GIF Frame for testing purposes
 */
export interface TestGifFrame {
  id: string;
  name: string;
  layers: TestAnimationLayer[];
  hiddenLayers: string[];
  visibleLayerCount: number;
  overrides: { layerVisibility: Record<string, any> };
  selected: boolean;
  delay: number;
  adSizeId: string;
  frameNumber: number;
  isBlankKeyframe: boolean;
  width: number;
  height: number;
}

/**
 * Simplified Ad Size for testing purposes
 */
export interface TestAdSize {
  id: string;
  name: string;
  width: number;
  height: number;
  frameIds: string[];
}

/**
 * Simplified Link Registry for testing purposes
 */
export interface TestLinkRegistry {
  mode: string;
  linkedLayers: Record<string, string[]>;
  overrides: Record<string, string[]>;
}