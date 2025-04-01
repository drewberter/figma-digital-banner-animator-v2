/**
 * Test utility specifically for background layer handling
 * 
 * This utility tests if background layers are correctly detected and
 * their visibility state is properly inverted as needed.
 */

import { GifFrame, AnimationLayer } from '../types/animation';
import { findLayerById, setLayerVisibilityConsistent, isLikelyBackgroundLayer } from './layerVisibilityUtils'; 
import { parseGifFrameId } from './linkingUtils';

/**
 * Detects if a layer is likely a background layer based on name patterns
 */
export function isBackgroundLayer(layerName: string): boolean {
  const bgPatterns = ['background', 'bg', 'backdrop', 'back layer', 'bkgd', 'background layer'];
  return bgPatterns.some(pattern => 
    layerName.toLowerCase().includes(pattern)
  );
}

/**
 * Test background layer handling specifically
 */
export function testBackgroundLayerHandling(
  gifFrames: GifFrame[]
): void {
  console.log('%c === BACKGROUND LAYER SPECIAL HANDLING TEST ===', 'background: #ff5722; color: #fff; padding: 5px; font-weight: bold;');
  
  // Collect all background layers for testing
  const backgroundLayers: Array<{
    frameId: string;
    layerId: string;
    layerName: string;
    isVisible: boolean;
    hasOverride: boolean;
  }> = [];
  
  // Helper to find background layers
  const findBackgroundLayers = (
    layers: AnimationLayer[] | undefined,
    frame: GifFrame
  ): void => {
    if (!layers) return;
    
    layers.forEach(layer => {
      if (layer.name && isBackgroundLayer(layer.name)) {
        backgroundLayers.push({
          frameId: frame.id,
          layerId: layer.id,
          layerName: layer.name,
          isVisible: !(frame.hiddenLayers || []).includes(layer.id),
          hasOverride: layer._isBackgroundLayer === true
        });
      }
      
      // Check children
      if (layer.children) {
        findBackgroundLayers(layer.children, frame);
      }
    });
  };
  
  // Find all background layers in all frames
  gifFrames.forEach(frame => {
    findBackgroundLayers(frame.layers, frame);
  });
  
  // Log background layers
  console.log(`Found ${backgroundLayers.length} potential background layers:`);
  backgroundLayers.forEach(layer => {
    console.log(`- ${layer.layerName} in frame ${layer.frameId} (${layer.isVisible ? 'visible' : 'hidden'})`);
  });
  
  // Test toggling a background layer's visibility
  if (backgroundLayers.length > 0) {
    const testLayer = backgroundLayers[0];
    console.log(`\n%c Testing background layer: ${testLayer.layerName} `, 'background: #ff5722; color: #fff; padding: 3px;');
    
    // Find the frame
    const frame = gifFrames.find(f => f.id === testLayer.frameId);
    if (!frame) {
      console.error(`Frame ${testLayer.frameId} not found`);
      return;
    }
    
    // Initial state
    console.log(`Original visibility: ${testLayer.isVisible ? 'VISIBLE' : 'HIDDEN'}`);
    
    // First test - detection
    const isLikelyBackground = isLikelyBackgroundLayer(testLayer.layerName);
    console.log(`\nTest Case 1: Direct visibility function`);
    
    // Update frame to toggle visibility
    const toggledFrame = setLayerVisibilityConsistent(
      frame,
      testLayer.layerId,
      !testLayer.isVisible,
      false // Don't explicitly mark as background
    );
    
    // Check the result
    const toggledLayer = findLayerById(toggledFrame.layers || [], testLayer.layerId);
    const isNowVisible = !(toggledFrame.hiddenLayers || []).includes(testLayer.layerId);
    console.log(`After toggling: ${isNowVisible ? 'VISIBLE' : 'HIDDEN'}`);
    
    // Second test - with background flag
    console.log(`\nTest Case 2: Special background layer handling`);
    
    // Update frame with background flag
    const bgFrame = setLayerVisibilityConsistent(
      frame,
      testLayer.layerId,
      !testLayer.isVisible,
      true // Explicitly mark as background
    );
    
    // Check the result
    const bgLayer = findLayerById(bgFrame.layers || [], testLayer.layerId);
    const isBgVisible = !(bgFrame.hiddenLayers || []).includes(testLayer.layerId);
    const hasBgFlag = (bgLayer as any)?._isBackgroundLayer === true;
    
    console.log(`After applying bg logic: ${isBgVisible ? 'VISIBLE' : 'HIDDEN'}`);
    console.log(`${isNowVisible === !testLayer.isVisible ? '✅ Regular visibility toggling works correctly' : '❌ Issue with regular visibility toggling'}`);
    console.log(`${isBgVisible === !isNowVisible ? '✅ Special background handling works correctly' : '❌ Issue with special background handling'}`);
    
    // Third test - auto-detection
    console.log(`\nTest Case 3: Auto-detecting background layers`);
    console.log(`Detection result: ${isLikelyBackground ? 'IS' : 'NOT'} likely a background`);
    console.log(`Recommendation: ${isLikelyBackground ? 'Use' : 'Skip'} the isBackgroundLayer parameter when updating this layer`);
  } else {
    console.log('No background layers found to test');
  }
  
  console.log('%c === TEST COMPLETE ===', 'background: #ff5722; color: #fff; padding: 5px; font-weight: bold;');
}

// Add global function for testing from console
if (typeof window !== 'undefined') {
  (window as any).testBackgroundLayerHandling = () => {
    const frames = (window as any).getGifFrames?.() || [];
    testBackgroundLayerHandling(frames);
  };
  
  console.log('Added global testBackgroundLayerHandling function to window. Call window.testBackgroundLayerHandling() to test background layer handling');
}