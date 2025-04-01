/**
 * Special Layer Testing Utilities
 * 
 * This module provides test utilities for specialized layer scenarios:
 * 1. Nested layer hierarchy visibility management
 * 2. Background layer special handling (inverse visibility logic)
 */

import { GifFrame, AnimationLayer } from '../types/animation';
import { findLayerById } from './directLayerLinking-fixed';
import { setLayerVisibility } from './visibility-state-fix';

/**
 * Test Nested Layer Hierarchy Visibility 
 * This tests the relationship between parent and child layers' visibility
 * to ensure correct propagation and constraints are maintained
 */
export function testNestedLayerHierarchy(frames: GifFrame[]): void {
  console.clear();
  console.log('%c === NESTED LAYER HIERARCHY TEST ===', 'background: #673ab7; color: #fff; padding: 5px; font-weight: bold;');

  // For each frame, find nested layer structures
  frames.forEach(frame => {
    console.log(`%c Analyzing frame: ${frame.id} `, 'background: #673ab7; color: #fff; padding: 3px;');
    
    // Find all container layers (layers with children)
    const containerLayers: {
      layer: AnimationLayer,
      path: string[],
      childCount: number,
      nestingLevel: number,
      isVisible: boolean
    }[] = [];
    
    // Recursive function to find containers and their children
    const findContainers = (layers: AnimationLayer[], path: string[] = [], level: number = 0): void => {
      if (!layers) return;
      
      layers.forEach(layer => {
        const currentPath = [...path, layer.name || 'unnamed'];
        
        if (layer.children && layer.children.length > 0) {
          containerLayers.push({
            layer,
            path: currentPath,
            childCount: layer.children.length,
            nestingLevel: level,
            isVisible: !(frame.hiddenLayers || []).includes(layer.id)
          });
          
          // Recursively process children
          findContainers(layer.children, currentPath, level + 1);
        }
      });
    };
    
    // Start the search
    findContainers(frame.layers || []);
    
    // Report on container structure
    if (containerLayers.length > 0) {
      console.log(`Found ${containerLayers.length} container layers with children:`);
      
      containerLayers.forEach(container => {
        const visibility = container.isVisible ? 'VISIBLE' : 'HIDDEN';
        const bgColor = container.isVisible ? '#060' : '#600';
        
        console.log(
          `%c ${visibility} %c Level ${container.nestingLevel} `,
          `background: ${bgColor}; color: #fff; padding: 2px;`,
          'background: #673ab7; color: #fff; padding: 2px;',
          `${container.layer.name} (${container.childCount} children) - Path: ${container.path.join(' > ')}`
        );
        
        // Check children's visibility
        const childrenVisibility = checkChildrenVisibility(frame, container.layer);
        if (childrenVisibility.allVisible) {
          console.log('  ✅ All children are visible');
        } else if (childrenVisibility.allHidden) {
          console.log('  ✅ All children are hidden');
        } else {
          console.log('  ⚠️ Mixed visibility among children');
          
          childrenVisibility.details.forEach(detail => {
            console.log(`    - ${detail.name}: ${detail.isVisible ? 'visible' : 'hidden'}`);
          });
        }
        
        // Test visibility propagation
        console.log('  🧪 Testing visibility propagation...');
        testVisibilityPropagation(frame, container.layer);
      });
    } else {
      console.log('No container layers with children found in this frame.');
    }
  });
  
  console.log('%c === TEST COMPLETE ===', 'background: #673ab7; color: #fff; padding: 5px; font-weight: bold;');
}

/**
 * Helper function to check visibility status of a layer's children
 */
function checkChildrenVisibility(frame: GifFrame, parentLayer: AnimationLayer): {
  allVisible: boolean,
  allHidden: boolean,
  details: { id: string, name: string, isVisible: boolean }[]
} {
  if (!parentLayer.children || parentLayer.children.length === 0) {
    return { allVisible: true, allHidden: true, details: [] };
  }
  
  const hiddenLayers = frame.hiddenLayers || [];
  const details = parentLayer.children.map(child => {
    return {
      id: child.id,
      name: child.name || 'unnamed',
      isVisible: !hiddenLayers.includes(child.id)
    };
  });
  
  const allVisible = details.every(d => d.isVisible);
  const allHidden = details.every(d => !d.isVisible);
  
  return {
    allVisible,
    allHidden,
    details
  };
}

/**
 * Test how visibility changes propagate through the layer hierarchy
 */
function testVisibilityPropagation(frame: GifFrame, containerLayer: AnimationLayer): void {
  if (!containerLayer.children || containerLayer.children.length === 0) {
    console.log('    No children to test visibility propagation with.');
    return;
  }
  
  // Store original state to restore it after testing
  const originalHiddenLayers = [...(frame.hiddenLayers || [])];
  const containerVisible = !originalHiddenLayers.includes(containerLayer.id);
  
  // Test Case 1: Hide the container
  console.log('    Test Case 1: Hide the container');
  let updatedFrame = setLayerVisibility(frame, containerLayer.id, false);
  
  // Check if children are now effectively hidden
  const childrenAfterHiding = containerLayer.children.map(child => {
    const directlyHidden = (updatedFrame.hiddenLayers || []).includes(child.id);
    // In a real UI, children would be visually hidden when parent is hidden, regardless of their own state
    const effectivelyHidden = true; 
    return {
      id: child.id,
      name: child.name || 'unnamed',
      directlyHidden,
      effectivelyHidden
    };
  });
  
  // Test Case 2: Make a child invisible, then make the container visible
  const testChild = containerLayer.children[0];
  console.log(`    Test Case 2: Hide child "${testChild.name || 'unnamed'}", then show container`);
  
  // First hide the child
  updatedFrame = setLayerVisibility(updatedFrame, testChild.id, false);
  
  // Then make the container visible
  updatedFrame = setLayerVisibility(updatedFrame, containerLayer.id, true);
  
  // Check the states
  const childHidden = (updatedFrame.hiddenLayers || []).includes(testChild.id);
  const containerNowVisible = !(updatedFrame.hiddenLayers || []).includes(containerLayer.id);
  
  console.log(`      Container is ${containerNowVisible ? 'visible' : 'hidden'}`);
  console.log(`      Test child is ${childHidden ? 'still hidden' : 'now visible'}`);
  
  if (containerNowVisible && childHidden) {
    console.log('      ✅ Expected behavior: Child layer maintains its own visibility state');
  } else {
    console.log('      ❌ Unexpected behavior: Child visibility should remain distinct from parent');
  }
  
  // Restore original state
  updatedFrame.hiddenLayers = originalHiddenLayers;
}

/**
 * Test Background Layer Special Handling
 * Background layers often use inverse visibility logic for creative reasons
 */
export function testBackgroundLayerHandling(frames: GifFrame[]): void {
  console.clear();
  console.log('%c === BACKGROUND LAYER SPECIAL HANDLING TEST ===', 'background: #ff5722; color: #fff; padding: 5px; font-weight: bold;');
  
  // Look for layers that might be backgrounds (by name or position)
  const potentialBackgroundLayers: {
    frameId: string,
    layer: AnimationLayer,
    isVisible: boolean,
    isFirstChild: boolean
  }[] = [];
  
  frames.forEach(frame => {
    if (!frame.layers || frame.layers.length === 0) return;
    
    // Look at all layers in this frame
    const hiddenLayers = frame.hiddenLayers || [];
    
    const findPotentialBackgrounds = (layers: AnimationLayer[], isTopLevel: boolean = true, index: number = 0): void => {
      if (!layers) return;
      
      layers.forEach((layer, i) => {
        const isFirstChild = isTopLevel && i === 0;
        const isBackground = 
          // Check name patterns suggesting background
          (layer.name && /background|bg|backdrop|back/i.test(layer.name)) ||
          // Or first child in a top-level container (common pattern)
          isFirstChild;
        
        if (isBackground) {
          potentialBackgroundLayers.push({
            frameId: frame.id,
            layer,
            isVisible: !hiddenLayers.includes(layer.id),
            isFirstChild
          });
        }
        
        // Check children too
        if (layer.children && layer.children.length > 0) {
          findPotentialBackgrounds(layer.children, false);
        }
      });
    };
    
    findPotentialBackgrounds(frame.layers);
  });
  
  if (potentialBackgroundLayers.length === 0) {
    console.log('No potential background layers found in any frame.');
    return;
  }
  
  console.log(`Found ${potentialBackgroundLayers.length} potential background layers:`);
  potentialBackgroundLayers.forEach(bg => {
    console.log(`- ${bg.layer.name || 'unnamed'} in frame ${bg.frameId} (${bg.isVisible ? 'visible' : 'hidden'})`);
  });
  
  // For each potential background, test inverse visibility logic
  potentialBackgroundLayers.forEach(bg => {
    console.log(`\n%c Testing background layer: ${bg.layer.name || 'unnamed'} `, 
      'background: #ff5722; color: #fff; padding: 3px;');
    
    // Find the frame containing this layer
    const frame = frames.find(f => f.id === bg.frameId);
    if (!frame) {
      console.log('Frame not found, skipping test.');
      return;
    }
    
    // Original state
    const originalIsVisible = bg.isVisible;
    console.log(`Original visibility: ${originalIsVisible ? 'VISIBLE' : 'HIDDEN'}`);
    
    // Test Case 1: Use direct layer visibility function
    console.log('\nTest Case 1: Direct visibility function');
    const updatedFrame1 = setLayerVisibility(frame, bg.layer.id, !originalIsVisible);
    const afterUpdate1 = !(updatedFrame1.hiddenLayers || []).includes(bg.layer.id);
    console.log(`After toggling: ${afterUpdate1 ? 'VISIBLE' : 'HIDDEN'}`);
    
    // Test Case 2: Use special background layer handling
    console.log('\nTest Case 2: Special background layer handling');
    // Use isBackgroundLayer=true to test the special logic
    const updatedFrame2 = setLayerVisibility(frame, bg.layer.id, originalIsVisible, true);
    const afterUpdate2 = !(updatedFrame2.hiddenLayers || []).includes(bg.layer.id);
    console.log(`After applying bg logic: ${afterUpdate2 ? 'VISIBLE' : 'HIDDEN'}`);
    
    if (afterUpdate1 !== originalIsVisible) {
      console.log('✅ Regular visibility toggling works correctly');
    } else {
      console.log('❌ Issue with regular visibility toggling');
    }
    
    if (afterUpdate2 === originalIsVisible) {
      console.log('✅ Special background handling inverts the visibility correctly');
    } else {
      console.log('❌ Issue with special background handling');
    }
    
    // Test Case 3: Test auto-detection of background layer based on properties
    console.log('\nTest Case 3: Auto-detecting background layers');
    const isLikelyBackground = 
      (bg.layer.name && /background|bg|backdrop|back/i.test(bg.layer.name)) ||
      bg.isFirstChild || 
      (bg.layer.type === 'shape' && bg.isFirstChild);
    
    console.log(`Detection result: ${isLikelyBackground ? 'IS likely a background' : 'NOT likely a background'}`);
    
    if (isLikelyBackground) {
      console.log('Recommendation: Use the isBackgroundLayer parameter when updating this layer');
    }
  });
  
  console.log('%c === TEST COMPLETE ===', 'background: #ff5722; color: #fff; padding: 5px; font-weight: bold;');
}

/**
 * Combined test function for special layer tests
 */
export function runSpecialLayerTests(frames: GifFrame[]): void {
  console.clear();
  console.log('%c === SPECIAL LAYER TEST SUITE ===', 'background: #000; color: #fff; padding: 10px; font-weight: bold; font-size: 16px;');
  
  console.log('Running specialized layer tests:');
  console.log('1. Nested Layer Hierarchy Test');
  console.log('2. Background Layer Special Handling Test');
  console.log('\n');
  
  // Run all tests
  console.log('%c 1. Nested Layer Hierarchy Test ', 'background: #673ab7; color: #fff; padding: 5px;');
  testNestedLayerHierarchy(frames);
  
  console.log('\n%c 2. Background Layer Special Handling Test ', 'background: #ff5722; color: #fff; padding: 5px;');
  testBackgroundLayerHandling(frames);
  
  console.log('\n%c === TEST SUITE COMPLETE ===', 'background: #000; color: #fff; padding: 10px; font-weight: bold; font-size: 16px;');
}

// Add global function for easy access in browser console
if (typeof window !== 'undefined') {
  (window as any).testNestedLayerHierarchy = () => {
    const frames = (window as any).getGifFrames?.() || [];
    testNestedLayerHierarchy(frames);
  };
  
  (window as any).testBackgroundLayerHandling = () => {
    const frames = (window as any).getGifFrames?.() || [];
    testBackgroundLayerHandling(frames);
  };
  
  (window as any).runSpecialLayerTests = () => {
    const frames = (window as any).getGifFrames?.() || [];
    runSpecialLayerTests(frames);
  };
  
  console.log('🧩 Special layer test utilities initialized. Available commands:');
  console.log('- window.testNestedLayerHierarchy() - Test nested layer visibility propagation');
  console.log('- window.testBackgroundLayerHandling() - Test background layer special handling');
  console.log('- window.runSpecialLayerTests() - Run all special layer tests');
}