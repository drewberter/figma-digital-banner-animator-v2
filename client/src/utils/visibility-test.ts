/**
 * Visibility state management test utilities
 */

import { 
  AnimationLayer, 
  GifFrame,
  LinkedLayerInfo 
} from '../types/animation';
import { findLayerById, hasVisibilityOverride } from './layerVisibilityUtils';

/**
 * Test the hidden in timeline flag functionality
 */
export function testHiddenInTimeline(layers: AnimationLayer[] | null): void {
  console.log('%c === HIDDEN IN TIMELINE TEST ===', 'background: #673ab7; color: #fff; padding: 5px; font-weight: bold;');
  
  if (!layers || layers.length === 0) {
    console.error('No layers provided for testing');
    return;
  }
  
  console.log(`Testing ${layers.length} layers for hidden status`);
  
  // Count and log layers with hidden status
  const hiddenLayers = layers.filter(layer => layer.visible === false);
  
  console.log(`Found ${hiddenLayers.length} layers with visible=false`);
  hiddenLayers.forEach(layer => {
    console.log(`- "${layer.name}" (${layer.id}) is set to hidden`);
  });
  
  // Test to ensure timeline and visibility are in sync
  const inconsistentLayers: AnimationLayer[] = [];
  
  // Helper to check layer and its children recursively
  const checkLayer = (layer: AnimationLayer) => {
    // Check if timeline hidden status matches visibility property
    const hiddenInTimeline = layer.visible === false;
    
    // In React, boolean props that are undefined are treated as false
    // So we need to check for both false and undefined
    if (hiddenInTimeline && layer.visible !== false) {
      inconsistentLayers.push({
        ...layer,
        hiddenInTimeline: true // Special flag for debugging
      });
    }
    
    // Check children recursively
    if (layer.children) {
      layer.children.forEach(checkLayer);
    }
  };
  
  // Process all layers
  layers.forEach(checkLayer);
  
  // Log results
  if (inconsistentLayers.length > 0) {
    console.log(`%c ❌ Found ${inconsistentLayers.length} layers with inconsistent visibility`, 'background: #f44336; color: #fff; padding: 3px;');
    inconsistentLayers.forEach(layer => {
      console.log(`- "${layer.name}" (${layer.id}) has inconsistent visibility`);
    });
  } else {
    console.log('%c ✅ All layers have consistent visibility state', 'background: #4caf50; color: #fff; padding: 3px;');
  }
  
  console.log('%c === TEST COMPLETE ===', 'background: #673ab7; color: #fff; padding: 5px; font-weight: bold;');
}

/**
 * Test visibility state consistency between hiddenLayers array and visible property
 */
export function testVisibilityStateConsistency(frames: GifFrame[]): void {
  console.log('%c === VISIBILITY STATE CONSISTENCY TEST ===', 'background: #673ab7; color: #fff; padding: 5px; font-weight: bold;');
  
  if (!frames || frames.length === 0) {
    console.error('No frames provided for testing');
    return;
  }
  
  console.log(`Testing ${frames.length} frames for visibility consistency`);
  
  // Create a checker for a single frame
  const checkFrameConsistency = (frame: GifFrame) => {
    console.log(`\nChecking frame "${frame.name}" (${frame.id})`);
    
    // Check for required properties
    if (!frame.hiddenLayers) {
      console.log(`%c ⚠️ Frame has no hiddenLayers array - creating it`, 'background: #ff9800; color: #fff; padding: 2px;');
      frame.hiddenLayers = [];
    }
    
    if (!frame.layers) {
      console.log(`%c ⚠️ Frame has no layers`, 'background: #ff9800; color: #fff; padding: 2px;');
      return;
    }
    
    // Create sets for faster lookups
    const hiddenLayerIds = new Set(frame.hiddenLayers);
    const inconsistentLayers: any[] = [];
    
    // Helper to check layer and its children recursively
    const checkLayerConsistency = (layer: AnimationLayer, path: string[] = []) => {
      // Current path including this layer
      const currentPath = [...path, layer.name || 'unnamed'];
      
      // Check if hiddenLayers status matches visible property
      const isHiddenInArray = hiddenLayerIds.has(layer.id);
      const isVisibleProp = layer.visible !== false; // undefined is treated as true
      
      // These should be opposite - hiddenLayers contains IDs of hidden layers
      if (isHiddenInArray === isVisibleProp) {
        inconsistentLayers.push({
          id: layer.id,
          name: layer.name,
          path: currentPath.join(' > '),
          isHiddenInArray,
          isVisibleProp,
          hasOverride: hasVisibilityOverride(frame, layer.id)
        });
      }
      
      // Check children recursively
      if (layer.children) {
        layer.children.forEach(child => checkLayerConsistency(child, currentPath));
      }
    };
    
    // Process all layers
    frame.layers.forEach(layer => checkLayerConsistency(layer));
    
    // Log results
    if (inconsistentLayers.length > 0) {
      console.log(`%c ❌ Found ${inconsistentLayers.length} layers with inconsistent visibility state`, 'background: #f44336; color: #fff; padding: 3px;');
      inconsistentLayers.forEach(info => {
        console.log(
          `%c ${info.isVisibleProp ? 'VISIBLE' : 'HIDDEN'} %c ${info.isHiddenInArray ? 'IN ARRAY' : 'NOT IN ARRAY'} `,
          `background: ${info.isVisibleProp ? '#4caf50' : '#f44336'}; color: #fff; padding: 2px;`,
          `background: ${info.isHiddenInArray ? '#2196f3' : '#9e9e9e'}; color: #fff; padding: 2px;`,
          `"${info.name}" (${info.id})${info.hasOverride ? ' [OVERRIDE]' : ''} - Path: ${info.path}`
        );
      });
      return false;
    } else {
      console.log('%c ✅ All layers have consistent visibility state', 'background: #4caf50; color: #fff; padding: 3px;');
      return true;
    }
  };
  
  // Check all frames
  let failedFrames = 0;
  
  frames.forEach(frame => {
    const result = checkFrameConsistency(frame);
    if (!result) failedFrames++;
  });
  
  // Final report
  console.log('\n--- Final Report ---');
  if (failedFrames > 0) {
    console.log(`%c ❌ ${failedFrames} of ${frames.length} frames have inconsistent visibility state`, 'background: #f44336; color: #fff; padding: 3px;');
  } else {
    console.log(`%c ✅ All ${frames.length} frames have consistent visibility state`, 'background: #4caf50; color: #fff; padding: 3px;');
  }
  
  console.log('%c === TEST COMPLETE ===', 'background: #673ab7; color: #fff; padding: 5px; font-weight: bold;');
}

/**
 * Run all visibility tests
 */
export function runVisibilityTests(frames: GifFrame[]): void {
  console.log('%c === RUNNING ALL VISIBILITY TESTS ===', 'background: #009688; color: #fff; padding: 10px; font-weight: bold;');
  
  // Only run layer test if frames exist
  if (frames && frames.length > 0 && frames[0].layers) {
    testHiddenInTimeline(frames[0].layers);
  } else {
    console.error('Cannot run hidden in timeline test - no layers found');
  }
  
  // Run frame test
  testVisibilityStateConsistency(frames);
  
  console.log('%c === ALL VISIBILITY TESTS COMPLETE ===', 'background: #009688; color: #fff; padding: 10px; font-weight: bold;');
}

// Add global function for testing from console
if (typeof window !== 'undefined') {
  (window as any).testHiddenInTimeline = (layers: AnimationLayer[] | null) => {
    testHiddenInTimeline(layers);
  };
  
  (window as any).testVisibilityStateConsistency = (frames: GifFrame[]) => {
    testVisibilityStateConsistency(frames);
  };
  
  (window as any).runVisibilityTests = () => {
    const frames = (window as any).getGifFrames?.() || [];
    runVisibilityTests(frames);
  };
}