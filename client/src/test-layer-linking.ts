/**
 * Test Script for GIF Frame Auto Layer Linking
 * 
 * This file provides tests for the layer linking functionality.
 * Use this to verify that layer visibility is correctly synchronized
 * across frames and ad sizes.
 */

import { testLayerLinking } from './utils/layerLinkingTest';
import { GifFrame, AnimationLayer } from './types/animation';
import { TestGifFrame, TestAnimationLayer } from './types/test-types';

// Sample test frames with layers for testing
const createSampleFrames = (): any[] => {
  // Layer factory helper
  const createLayer = (id: string, name: string, visible = true, children: TestAnimationLayer[] = []): TestAnimationLayer => ({
    id,
    name,
    visible,
    children,
    type: 'Layer',
    parentId: null,
    isLinked: false,
    opacity: 1,
    position: { x: 0, y: 0 },
    lastUpdated: Date.now()
  });

  // Create some layers
  const bg1 = createLayer('bg1', 'Background');
  const logo1 = createLayer('logo1', 'Logo');
  const cta1 = createLayer('cta1', 'CTA Button');
  const headline1 = createLayer('headline1', 'Headline');
  
  const bg2 = createLayer('bg2', 'Background');
  const logo2 = createLayer('logo2', 'Logo');
  const cta2 = createLayer('cta2', 'CTA Button');
  const headline2 = createLayer('headline2', 'Headline');
  
  const bg3 = createLayer('bg3', 'Background');
  const logo3 = createLayer('logo3', 'Logo', false); // Hidden logo
  const cta3 = createLayer('cta3', 'CTA Button');
  const headline3 = createLayer('headline3', 'Headline');
  
  // Create frames for multiple ad sizes and frame numbers
  const frame1Size1: TestGifFrame = {
    id: 'frame-1-size-300x250',
    name: 'Frame 1 (300x250)',
    layers: [bg1, logo1, cta1, headline1] as any,
    hiddenLayers: [],
    visibleLayerCount: 4,
    overrides: { layerVisibility: {} },
    selected: false,
    delay: 0,
    adSizeId: '300x250',
    frameNumber: 1,
    isBlankKeyframe: false,
    width: 300,
    height: 250
  };
  
  const frame1Size2: TestGifFrame = {
    id: 'frame-1-size-728x90',
    name: 'Frame 1 (728x90)',
    layers: [bg2, logo2, cta2, headline2] as any,
    hiddenLayers: [],
    visibleLayerCount: 4,
    overrides: { layerVisibility: {} },
    selected: false,
    delay: 0,
    adSizeId: '728x90',
    frameNumber: 1,
    isBlankKeyframe: false,
    width: 728,
    height: 90
  };
  
  const frame2Size1: TestGifFrame = {
    id: 'frame-2-size-300x250',
    name: 'Frame 2 (300x250)',
    layers: [bg3, logo3, cta3, headline3] as any,
    hiddenLayers: ['logo3'],
    visibleLayerCount: 3, 
    overrides: { layerVisibility: {} },
    selected: false,
    delay: 0,
    adSizeId: '300x250',
    frameNumber: 2,
    isBlankKeyframe: false,
    width: 300,
    height: 250
  };
  
  return [frame1Size1, frame1Size2, frame2Size1];
};

// Run the test
const runTest = () => {
  console.log('Starting GIF Frame Layer Linking Test...');
  const frames = createSampleFrames();
  testLayerLinking(frames);
  
  // Test specific layer syncing
  console.log('\n\nTesting specific layer (logo)...');
  testLayerLinking(frames, 'Logo');
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).runLayerLinkingTest = runTest;
  console.log('Layer linking test available. Run window.runLayerLinkingTest() in console.');
}

export { runTest };