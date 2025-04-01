/**
 * Cross-Mode Testing Utilities
 * 
 * This module provides test utilities for verifying cross-component interactions,
 * including animation mode layer linking, sidebar toggles, GIF frame linking,
 * and override functionality across both animation and GIF modes.
 */

import { GifFrame, AnimationLayer, LinkSyncMode } from '../types/animation';
import { linkRegistry } from './linkRegistry';
import { parseGifFrameId } from './linkingUtils';
import { findLayerById } from './directLayerLinking-fixed';

/**
 * Test Animation Mode Linked Layers
 * This test verifies that layers with the same name are properly linked
 * across different frames in Animation Mode
 */
export function testAnimationModeLayerLinking(frames: GifFrame[], layerName?: string): void {
  console.clear();
  console.log('%c === ANIMATION MODE LAYER LINKING TEST ===', 'background: #4a148c; color: #fff; padding: 5px; font-weight: bold;');
  
  // Get the link registry state
  const registry = (window as any).__DEBUG_LINK_REGISTRY__ || linkRegistry;
  const groups = registry.getDebugGroups?.() || {};
  
  // Filter for animation mode groups (those with 'a' suffix in the ID)
  const animationGroups = Object.values(groups).filter(
    (g: any) => g.id && typeof g.id === 'string' && g.id.endsWith('a')
  );
  
  console.log(`Found ${animationGroups.length} animation mode link groups:`);
  
  // If a specific layer name was provided, focus on that
  if (layerName) {
    const normalizedName = layerName.toLowerCase();
    const matchingGroups = animationGroups.filter(
      (g: any) => g.name && g.name.toLowerCase() === normalizedName
    );
    
    if (matchingGroups.length === 0) {
      console.log(`No animation link groups found for "${layerName}"`);
      return;
    }
    
    console.log(`%c Analyzing animation link group for "${layerName}" `, 'background: #4a148c; color: #fff; padding: 3px;');
    const group = matchingGroups[0];
    
    console.log('Group details:');
    console.log(`- ID: ${group.id}`);
    console.log(`- Main layer: ${group.mainLayerId}`);
    console.log(`- Linked layers: ${group.layerIds?.length || 0}`);
    
    // Check layer visibility consistency
    testLayerVisibilityConsistency(frames, group.layerIds || [], 'animation');
  } else {
    // General overview of all animation mode groups
    animationGroups.forEach((group: any, index: number) => {
      console.log(`%c Group ${index + 1}: "${group.name}" `, 'background: #4a148c; color: #fff; padding: 3px;');
      console.log(`- ID: ${group.id}`);
      console.log(`- Main layer: ${group.mainLayerId}`);
      console.log(`- Linked layers: ${group.layerIds?.length || 0} layers`);
      
      // List linked layers
      if (group.layerIds && group.layerIds.length > 0) {
        console.log('  Linked layers:');
        group.layerIds.forEach((layerId: string) => {
          // Try to find which frame contains this layer
          let layerInfo = "Unknown layer";
          for (const frame of frames) {
            const layer = findLayerById(frame.layers || [], layerId);
            if (layer) {
              layerInfo = `${layer.name} (${layerId}) in frame ${frame.id}`;
              break;
            }
          }
          console.log(`  - ${layerInfo}`);
        });
        
        // Test visibility consistency for this group
        testLayerVisibilityConsistency(frames, group.layerIds, 'animation');
      }
    });
  }
  
  console.log('%c === TEST COMPLETE ===', 'background: #4a148c; color: #fff; padding: 5px; font-weight: bold;');
}

/**
 * Test GIF Mode Linked Layers
 * This test verifies that layers with the same name are properly linked
 * across frames with the same frame number in different ad sizes in GIF Mode
 */
export function testGifModeLayerLinking(frames: GifFrame[], layerName?: string): void {
  console.clear();
  console.log('%c === GIF MODE LAYER LINKING TEST ===', 'background: #00695c; color: #fff; padding: 5px; font-weight: bold;');
  
  // Group frames by frame number
  const framesByNumber: Record<string, GifFrame[]> = {};
  
  frames.forEach(frame => {
    const parsed = parseGifFrameId(frame.id);
    if (parsed.isValid) {
      if (!framesByNumber[parsed.frameNumber]) {
        framesByNumber[parsed.frameNumber] = [];
      }
      framesByNumber[parsed.frameNumber].push(frame);
    }
  });
  
  console.log(`Frames grouped by frame number: ${Object.keys(framesByNumber).length} groups`);
  
  // If a specific layer name was provided, focus on that
  if (layerName) {
    const normalizedName = layerName.toLowerCase();
    
    console.log(`%c Analyzing GIF link status for "${layerName}" across frame numbers `, 
      'background: #00695c; color: #fff; padding: 3px;');
    
    // For each frame number group, find layers with matching name
    Object.entries(framesByNumber).forEach(([frameNumber, framesInGroup]) => {
      // Find all matching layers in this frame number group
      type LayerMatch = {
        layerId: string;
        frameId: string;
        adSizeId: string;
        isVisible: boolean;
        isLinked: boolean;
        hasOverride: boolean;
      };
      
      const matchingLayers: LayerMatch[] = [];
      
      framesInGroup.forEach(frame => {
        const parsed = parseGifFrameId(frame.id);
        if (!parsed.isValid) return;
        
        // Find layers with matching name
        const findLayersWithName = (layers: AnimationLayer[], path: string[] = []): void => {
          if (!layers) return;
          
          layers.forEach(layer => {
            if (layer.name && layer.name.toLowerCase() === normalizedName) {
              matchingLayers.push({
                layerId: layer.id,
                frameId: frame.id,
                adSizeId: parsed.adSizeId,
                isVisible: !(frame.hiddenLayers || []).includes(layer.id),
                isLinked: !!layer.isLinked || !!layer.linkedLayer,
                hasOverride: !!frame.overrides?.layerVisibility?.[layer.id]?.overridden
              });
            }
            
            // Check children
            if (layer.children && layer.children.length > 0) {
              findLayersWithName(layer.children, [...path, layer.name || 'unnamed']);
            }
          });
        };
        
        findLayersWithName(frame.layers || []);
      });
      
      if (matchingLayers.length > 0) {
        console.log(`%c Frame Number ${frameNumber}: ${matchingLayers.length} matching layers `, 
          'background: #00695c; color: #fff; padding: 2px;');
        
        // Log each matching layer
        matchingLayers.forEach(match => {
          const bgColor = match.isVisible ? '#060' : '#600';
          const linkStatus = match.isLinked ? '🔗 Linked' : '⛓️ Not linked';
          const overrideStatus = match.hasOverride ? '🔒 Override' : '';
          
          console.log(
            `%c ${match.isVisible ? 'VISIBLE' : 'HIDDEN'} %c ${linkStatus} %c ${overrideStatus} `,
            `background: ${bgColor}; color: #fff; padding: 2px;`,
            'background: #00695c; color: #fff; padding: 2px;',
            'background: #700; color: #fff; padding: 2px;',
            `Ad Size: ${match.adSizeId}, Frame: ${match.frameId}, Layer ID: ${match.layerId}`
          );
        });
        
        // Check visibility consistency
        const allVisible = matchingLayers.every(m => m.isVisible);
        const allHidden = matchingLayers.every(m => !m.isVisible);
        const allLinked = matchingLayers.every(m => m.isLinked);
        
        if (allVisible) {
          console.log(`%c ✅ CONSISTENT VISIBILITY (all visible) `, 'background: #060; color: #fff;');
        } else if (allHidden) {
          console.log(`%c ✅ CONSISTENT VISIBILITY (all hidden) `, 'background: #060; color: #fff;');
        } else {
          console.log(`%c ❌ INCONSISTENT VISIBILITY `, 'background: #900; color: #fff;');
          
          // Log visibility map for easier debugging
          const visMap = matchingLayers.map(m => 
            `${m.adSizeId}: ${m.isVisible ? 'visible' : 'hidden'}${m.hasOverride ? ' (overridden)' : ''}`
          ).join(', ');
          
          console.log(`Visibility Map: ${visMap}`);
        }
        
        if (allLinked) {
          console.log(`%c ✅ CONSISTENT LINKING (all linked) `, 'background: #060; color: #fff;');
        } else {
          console.log(`%c ❓ INCONSISTENT LINKING `, 'background: #ff9800; color: #fff;');
          
          // Log link map for easier debugging
          const linkMap = matchingLayers.map(m => 
            `${m.adSizeId}: ${m.isLinked ? 'linked' : 'not linked'}`
          ).join(', ');
          
          console.log(`Link Map: ${linkMap}`);
        }
      } else {
        console.log(`Frame Number ${frameNumber}: No layers named "${layerName}" found`);
      }
    });
  } else {
    // General overview of GIF linking across frame numbers
    Object.entries(framesByNumber).forEach(([frameNumber, framesInGroup]) => {
      console.log(`%c Frame Number ${frameNumber}: ${framesInGroup.length} frames `, 
        'background: #00695c; color: #fff; padding: 3px;');
      
      // Get all unique layer names in this frame group
      const layerNameMap: Record<string, { count: number, layers: AnimationLayer[] }> = {};
      
      framesInGroup.forEach(frame => {
        // Collect all layer names recursively
        const collectLayerNames = (layers: AnimationLayer[]): void => {
          if (!layers) return;
          
          layers.forEach(layer => {
            if (layer.name) {
              const normalizedName = layer.name.toLowerCase();
              if (!layerNameMap[normalizedName]) {
                layerNameMap[normalizedName] = { count: 0, layers: [] };
              }
              layerNameMap[normalizedName].count++;
              layerNameMap[normalizedName].layers.push(layer);
            }
            
            // Check children
            if (layer.children && layer.children.length > 0) {
              collectLayerNames(layer.children);
            }
          });
        };
        
        collectLayerNames(frame.layers || []);
      });
      
      // Find layer names that appear multiple times
      const multipleAppearanceLayers = Object.entries(layerNameMap)
        .filter(([_, data]) => data.count > 1)
        .sort((a, b) => b[1].count - a[1].count);
      
      if (multipleAppearanceLayers.length > 0) {
        console.log(`Found ${multipleAppearanceLayers.length} layer names appearing in multiple frames:`);
        
        multipleAppearanceLayers.forEach(([name, data]) => {
          const linkedCount = data.layers.filter(l => l.isLinked || l.linkedLayer).length;
          const linkPercentage = Math.round((linkedCount / data.count) * 100);
          
          console.log(`- "${name}": appears ${data.count} times, ${linkedCount} linked (${linkPercentage}%)`);
          
          // Test this specific layer name in detail if it appears across multiple frames
          if (data.count >= framesInGroup.length / 2) {
            console.log(`  %c Testing "${name}" layer linking `, 'background: #00695c; color: #fff; padding: 2px;');
            testGifModeLayerLinking(framesInGroup, name);
          }
        });
      } else {
        console.log(`No layers appear across multiple frames in frame number ${frameNumber}`);
      }
    });
  }
  
  console.log('%c === TEST COMPLETE ===', 'background: #00695c; color: #fff; padding: 5px; font-weight: bold;');
}

/**
 * Test Layer Visibility Toggle Propagation
 * This test verifies that layer visibility toggles in the sidebar
 * correctly propagate to animation timeline and GIF cards
 */
export function testVisibilityTogglePropagation(frames: GifFrame[]): void {
  console.clear();
  console.log('%c === VISIBILITY TOGGLE PROPAGATION TEST ===', 'background: #e65100; color: #fff; padding: 5px; font-weight: bold;');
  
  // Test setup
  console.log('This test requires manual interaction.');
  console.log('Steps to perform:');
  console.log('1. Toggle a layer\'s visibility in the sidebar');
  console.log('2. Verify the change is reflected in the animation timeline');
  console.log('3. Verify the change is reflected in GIF frame cards');
  console.log('4. Re-run this test after toggling to see the updated state');
  console.log();
  
  // Get current visibility states for all layers
  const visibilityMap: Record<string, { 
    layerId: string,
    layerName: string, 
    frameName: string,
    isVisible: boolean,
    visibleProp: boolean | undefined,
    inHiddenLayers: boolean
  }> = {};
  
  frames.forEach(frame => {
    // Process all layers in the frame
    const processLayers = (layers: AnimationLayer[], framePath: string = frame.id): void => {
      if (!layers) return;
      
      layers.forEach(layer => {
        const hiddenLayers = frame.hiddenLayers || [];
        const isHidden = hiddenLayers.includes(layer.id);
        
        visibilityMap[`${frame.id}_${layer.id}`] = {
          layerId: layer.id,
          layerName: layer.name || 'unnamed',
          frameName: frame.id,
          isVisible: !isHidden,
          visibleProp: layer.visible,
          inHiddenLayers: isHidden
        };
        
        // Check children
        if (layer.children && layer.children.length > 0) {
          processLayers(layer.children, framePath);
        }
      });
    };
    
    processLayers(frame.layers || []);
  });
  
  // Display current state
  console.log(`Current visibility state for ${Object.keys(visibilityMap).length} layers:`);
  console.table(visibilityMap);
  
  // Show potential inconsistencies
  const inconsistencies = Object.values(visibilityMap).filter(
    entry => (entry.visibleProp === false && entry.isVisible) || 
             (entry.visibleProp === true && !entry.isVisible)
  );
  
  if (inconsistencies.length > 0) {
    console.log(`%c ❌ Found ${inconsistencies.length} inconsistencies between visible property and hiddenLayers `, 
      'background: #900; color: #fff;');
    console.table(inconsistencies);
  } else {
    console.log(`%c ✅ No inconsistencies found between visible property and hiddenLayers `, 
      'background: #060; color: #fff;');
  }
  
  console.log('%c === TEST COMPLETE ===', 'background: #e65100; color: #fff; padding: 5px; font-weight: bold;');
}

/**
 * Test Layer Override Functionality
 * This test verifies that layer override toggles work correctly in both
 * animation and GIF modes
 */
export function testLayerOverrideFunctionality(frames: GifFrame[]): void {
  console.clear();
  console.log('%c === LAYER OVERRIDE FUNCTIONALITY TEST ===', 'background: #1a237e; color: #fff; padding: 5px; font-weight: bold;');
  
  // Count the number of layers with overrides
  let overrideCount = 0;
  const overrideMap: Record<string, string[]> = {};
  
  frames.forEach(frame => {
    if (frame.overrides?.layerVisibility) {
      const overriddenLayers = Object.keys(frame.overrides.layerVisibility)
        .filter(layerId => frame.overrides?.layerVisibility?.[layerId]?.overridden);
      
      if (overriddenLayers.length > 0) {
        overrideMap[frame.id] = overriddenLayers;
        overrideCount += overriddenLayers.length;
      }
    }
  });
  
  if (overrideCount > 0) {
    console.log(`Found ${overrideCount} layers with overrides across ${Object.keys(overrideMap).length} frames:`);
    
    Object.entries(overrideMap).forEach(([frameId, layerIds]) => {
      const frame = frames.find(f => f.id === frameId);
      if (!frame) return;
      
      console.log(`%c Frame: ${frameId} `, 'background: #1a237e; color: #fff; padding: 2px;');
      
      layerIds.forEach(layerId => {
        const layer = findLayerById(frame.layers || [], layerId);
        if (!layer) {
          console.log(`  - Layer ID ${layerId} (not found)`);
          return;
        }
        
        console.log(`  - Layer: "${layer.name}" (${layerId})`);
        console.log(`    Override active: ${!!frame.overrides?.layerVisibility?.[layerId]?.overridden}`);
        console.log(`    Is visible: ${!(frame.hiddenLayers || []).includes(layerId)}`);
        console.log(`    Is linked: ${!!layer.isLinked || !!layer.linkedLayer}`);
        
        if (layer.linkedLayer) {
          console.log(`    Link group: ${layer.linkedLayer.groupId}`);
          console.log(`    Is main layer: ${!!layer.linkedLayer.isMain}`);
        }
      });
    });
    
    // Test functionality
    console.log('\nTo test override functionality manually:');
    console.log('1. Toggle a layer\'s link override button');
    console.log('2. Verify the change is reflected in the frame override state');
    console.log('3. Try changing the visibility of linked layers and verify the overridden layer stays independent');
    console.log('4. Re-run this test after making changes to see the updated state');
  } else {
    console.log('No layers with overrides found. To test override functionality:');
    console.log('1. Click the link icon next to a layer name to override its linking');
    console.log('2. Run this test again to see the updated state');
  }
  
  console.log('%c === TEST COMPLETE ===', 'background: #1a237e; color: #fff; padding: 5px; font-weight: bold;');
}

/**
 * Helper function to test layer visibility consistency across a set of layers
 */
function testLayerVisibilityConsistency(
  frames: GifFrame[], 
  layerIds: string[], 
  mode: 'animation' | 'gif'
): void {
  if (layerIds.length <= 1) {
    console.log('Not enough layers to test consistency');
    return;
  }
  
  // Map of layer visibility states 
  const visibilityStates: Record<string, boolean> = {};
  const layerInfoMap: Record<string, { frameId: string, layerName: string }> = {};
  
  // Collect visibility states
  layerIds.forEach(layerId => {
    for (const frame of frames) {
      const layer = findLayerById(frame.layers || [], layerId);
      if (layer) {
        const hiddenLayers = frame.hiddenLayers || [];
        visibilityStates[layerId] = !hiddenLayers.includes(layerId);
        layerInfoMap[layerId] = { frameId: frame.id, layerName: layer.name || 'unnamed' };
        break;
      }
    }
  });
  
  // Check consistency
  const visibilityValues = Object.values(visibilityStates);
  const allHidden = visibilityValues.every(v => v === false);
  const allVisible = visibilityValues.every(v => v === true);
  
  if (allVisible) {
    console.log(`%c ✅ CONSISTENT (all visible) `, 'background: #060; color: #fff;');
  } else if (allHidden) {
    console.log(`%c ✅ CONSISTENT (all hidden) `, 'background: #060; color: #fff;');
  } else {
    console.log(`%c ❌ INCONSISTENT VISIBILITY `, 'background: #900; color: #fff;');
    
    // Log detailed state
    const details = Object.entries(visibilityStates).map(([layerId, isVisible]) => {
      const info = layerInfoMap[layerId];
      return `${info?.layerName} (${layerId}) in ${info?.frameId}: ${isVisible ? 'visible' : 'hidden'}`;
    }).join('\n');
    
    console.log('Visibility details:');
    console.log(details);
    
    if (mode === 'animation') {
      console.log(`\nThis inconsistency may indicate a problem with animation mode layer linking`);
    } else {
      console.log(`\nThis inconsistency may indicate a problem with GIF mode layer linking`);
    }
  }
}

/**
 * Main test function to run all cross-mode tests
 */
export function runCrossModeTests(frames: GifFrame[]): void {
  console.clear();
  console.log('%c === CROSS-MODE COMPREHENSIVE TEST SUITE ===', 'background: #000; color: #fff; padding: 10px; font-weight: bold; font-size: 16px;');
  
  console.log('Running test suite with the following test cases:');
  console.log('1. Animation Mode Layer Linking');
  console.log('2. GIF Mode Layer Linking');
  console.log('3. Visibility Toggle Propagation');
  console.log('4. Layer Override Functionality');
  console.log('\n');
  
  // Run all tests
  console.log('%c 1. Animation Mode Layer Linking ', 'background: #4a148c; color: #fff; padding: 5px;');
  testAnimationModeLayerLinking(frames);
  
  console.log('\n%c 2. GIF Mode Layer Linking ', 'background: #00695c; color: #fff; padding: 5px;');
  testGifModeLayerLinking(frames);
  
  console.log('\n%c 3. Visibility Toggle Propagation ', 'background: #e65100; color: #fff; padding: 5px;');
  testVisibilityTogglePropagation(frames);
  
  console.log('\n%c 4. Layer Override Functionality ', 'background: #1a237e; color: #fff; padding: 5px;');
  testLayerOverrideFunctionality(frames);
  
  console.log('\n%c === TEST SUITE COMPLETE ===', 'background: #000; color: #fff; padding: 10px; font-weight: bold; font-size: 16px;');
}

// Add global function for easy access in browser console
if (typeof window !== 'undefined') {
  (window as any).runCrossModeTests = () => {
    const frames = (window as any).getGifFrames?.() || [];
    runCrossModeTests(frames);
  };
  
  (window as any).testAnimationModeLayerLinking = (layerName?: string) => {
    const frames = (window as any).getGifFrames?.() || [];
    testAnimationModeLayerLinking(frames, layerName);
  };
  
  (window as any).testGifModeLayerLinking = (layerName?: string) => {
    const frames = (window as any).getGifFrames?.() || [];
    testGifModeLayerLinking(frames, layerName);
  };
  
  (window as any).testVisibilityTogglePropagation = () => {
    const frames = (window as any).getGifFrames?.() || [];
    testVisibilityTogglePropagation(frames);
  };
  
  (window as any).testLayerOverrideFunctionality = () => {
    const frames = (window as any).getGifFrames?.() || [];
    testLayerOverrideFunctionality(frames);
  };
  
  console.log('📊 Cross-mode test utilities initialized. Available commands:');
  console.log('- window.runCrossModeTests() - Run all cross-mode tests');
  console.log('- window.testAnimationModeLayerLinking(optionalLayerName) - Test animation mode layer linking');
  console.log('- window.testGifModeLayerLinking(optionalLayerName) - Test GIF mode layer linking');
  console.log('- window.testVisibilityTogglePropagation() - Test visibility toggle propagation');
  console.log('- window.testLayerOverrideFunctionality() - Test layer override functionality');
}