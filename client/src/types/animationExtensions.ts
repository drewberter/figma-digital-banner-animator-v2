/**
 * Extensions to the base animation interfaces for new features
 * 
 * This file is used to augment the existing animation interface when
 * needed without modifying the original type definitions.
 */

import { AnimationLayer } from './animation';

/**
 * Extended AnimationLayer interface with UI-specific properties
 */
export type AnimationLayerWithUI = AnimationLayer & {
  // UI-only visibility state (hidden in timeline but still visible in animation)
  hiddenInTimeline?: boolean;
  
  // Timestamp for tracking state changes (forces React to detect changes)
  lastUpdated?: number;
  
  // For debugging and testing purposes
  _stateVersion?: number;
};