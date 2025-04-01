/**
 * Centralized Test Utilities
 * 
 * This file contains consolidated test utilities for various features
 * such as layer visibility, hidden timeline state, and layer linking.
 */

import { GifFrame, AnimationLayer } from '../types/animation';
import { AnimationLayerWithUI } from '../types/animationExtensions';

/**
 * Test utility to verify layer visibility state consistency
 */
export function testVisibilityConsistency(layers: AnimationLayer[]): void {
  console.log('=== LAYER VISIBILITY STATE CONSISTENCY TEST ===');
  
  // Collect layer information
  interface LayerInfo {
    id: string;
    name: string;
    path: string[];
    visible: boolean;
    hiddenInTimeline?: boolean;
    lastUpdated?: number;
  }
  
  const layerInfos: LayerInfo[] = [];
  
  // Process layers recursively
  const processLayer = (layer: AnimationLayer, path: string[] = []): void => {
    const layerWithUI = layer as AnimationLayerWithUI;
    
    layerInfos.push({
      id: layer.id,
      name: layer.name,
      path,
      visible: layer.visible,
      hiddenInTimeline: layerWithUI.hiddenInTimeline,
      lastUpdated: layerWithUI.lastUpdated
    });
    
    // Process children
    if (layer.children && layer.children.length > 0) {
      const updatedPath = [...path, layer.name];
      layer.children.forEach(child => processLayer(child, updatedPath));
    }
  };
  
  // Start processing from the root
  layers.forEach(layer => processLayer(layer));
  
  // Log summary
  console.log(`Processed ${layerInfos.length} layers`);
  
  // Check for visibility state inconsistencies
  const inconsistentLayers = layerInfos.filter(layer => {
    // A layer has inconsistent state if:
    // - It's marked as not visible but hiddenInTimeline is true (these should be mutually exclusive)
    return !layer.visible && layer.hiddenInTimeline === true;
  });
  
  if (inconsistentLayers.length > 0) {
    console.log(`⚠️ Found ${inconsistentLayers.length} layers with inconsistent visibility state:`);
    inconsistentLayers.forEach(layer => {
      console.log(`- ${layer.name} (${layer.id}): visible=${layer.visible}, hiddenInTimeline=${layer.hiddenInTimeline}`);
    });
  } else {
    console.log('✅ All layers have consistent visibility state');
  }
}

/**
 * Sets up a global test function for hiddenInTimeline feature
 */
export function setupHiddenInTimelineTest(): void {
  if (typeof window !== 'undefined') {
    (window as any).testHiddenInTimeline = (layers: AnimationLayer[]) => {
      console.log('=== HIDDEN IN TIMELINE TEST ===');
      
      // First run the consistency test
      testVisibilityConsistency(layers);
      
      // Count layers with various states
      const stats = {
        total: 0,
        visible: 0,
        hidden: 0,
        hiddenInTimeline: 0
      };
      
      // Track layers with hiddenInTimeline property
      const hiddenInTimelineLayers: {
        id: string;
        name: string;
        path: string;
        visible: boolean;
        hiddenInTimeline: boolean;
      }[] = [];
      
      // Helper to process layers
      const processLayer = (layer: AnimationLayer, path: string = ''): void => {
        stats.total++;
        
        if (layer.visible) {
          stats.visible++;
        } else {
          stats.hidden++;
        }
        
        // Check for hiddenInTimeline property
        const layerWithUI = layer as AnimationLayerWithUI;
        if (layerWithUI.hiddenInTimeline === true) {
          stats.hiddenInTimeline++;
          
          hiddenInTimelineLayers.push({
            id: layer.id,
            name: layer.name,
            path: path ? `${path} > ${layer.name}` : layer.name,
            visible: layer.visible,
            hiddenInTimeline: true
          });
        }
        
        // Process children
        if (layer.children && layer.children.length > 0) {
          const newPath = path ? `${path} > ${layer.name}` : layer.name;
          layer.children.forEach(child => processLayer(child, newPath));
        }
      };
      
      // Process all layers
      layers.forEach(layer => processLayer(layer));
      
      // Log summary
      console.log('Summary:');
      console.log(`- Total layers: ${stats.total}`);
      console.log(`- Visible layers: ${stats.visible}`);
      console.log(`- Hidden layers: ${stats.hidden}`);
      console.log(`- Hidden in timeline only: ${stats.hiddenInTimeline}`);
      
      // Log details of layers hidden in timeline only
      if (hiddenInTimelineLayers.length > 0) {
        console.log('\nLayers hidden in timeline only:');
        hiddenInTimelineLayers.forEach(layer => {
          console.log(`- ${layer.name} (${layer.id}) at path: ${layer.path}`);
          console.log(`  visible: ${layer.visible}, hiddenInTimeline: ${layer.hiddenInTimeline}`);
        });
      }
      
      // Return stats for programmatic use
      return {
        stats,
        hiddenInTimelineLayers
      };
    };
    
    console.log('Added global testHiddenInTimeline function. Use window.testHiddenInTimeline(layers) to test.');
  }
}

/**
 * Test utility to verify layer linking is working correctly
 */
export function testLayerLinking(frames: GifFrame[], layerName?: string): void {
  console.log(`=== TESTING LAYER LINKING ===`);
  console.log(`Testing ${frames.length} frames`);
  
  if (layerName) {
    console.log(`Looking for layers named "${layerName}"`);
    
    // Count how many frames have layers with this name
    let framesWithMatchingLayers = 0;
    let totalMatchingLayers = 0;
    
    frames.forEach(frame => {
      let frameHasMatch = false;
      
      const findMatchingLayers = (layers: AnimationLayer[]) => {
        layers.forEach(layer => {
          if (layer.name === layerName) {
            totalMatchingLayers++;
            frameHasMatch = true;
            
            // Log the layer state
            console.log(`${frame.id}: Layer "${layer.name}" (${layer.id}) - visible: ${layer.visible}`);
            
            // Check if it has linked layer properties
            if (layer.linkedLayer) {
              console.log(`  • Link group: ${layer.linkedLayer.groupId}, isMain: ${layer.linkedLayer.isMain}`);
            } else {
              console.log(`  • Not linked`);
            }
          }
          
          if (layer.children?.length) {
            findMatchingLayers(layer.children);
          }
        });
      };
      
      if (frame.layers?.length) {
        findMatchingLayers(frame.layers);
      }
      
      if (frameHasMatch) {
        framesWithMatchingLayers++;
      }
    });
    
    console.log(`Found ${totalMatchingLayers} layers named "${layerName}" across ${framesWithMatchingLayers} frames`);
  } else {
    console.log(`No layer name specified, showing frame summary`);
    frames.forEach(frame => {
      console.log(`Frame ${frame.id}: ${frame.layers?.length || 0} layers`);
    });
  }
}

/**
 * Setup global layer linking test in the window object
 */
export function setupGlobalLayerLinkingTest(gifFrames: GifFrame[]): void {
  if (typeof window !== 'undefined') {
    (window as any).testLayerLinking = (layerName?: string) => {
      testLayerLinking(gifFrames, layerName);
    };
    
    console.log('Added global testLayerLinking function to window. Call window.testLayerLinking("layer name") to analyze layer linking');
  }
}

/**
 * Helper to test if layer linking works bidirectionally
 */
export function testBidirectionalLinking(
  frames: GifFrame[],
  layerName: string
): void {
  console.log(`=== TESTING BIDIRECTIONAL LINKING FOR "${layerName}" ===`);
  
  // Find all layers with the given name across all frames
  const matchingLayers: {
    frameId: string;
    layer: AnimationLayer;
  }[] = [];
  
  frames.forEach(frame => {
    if (!frame.layers) return;
    
    const findMatchingLayersInFrame = (layers: AnimationLayer[]) => {
      layers.forEach(layer => {
        if (layer.name === layerName) {
          matchingLayers.push({
            frameId: frame.id,
            layer
          });
        }
        
        if (layer.children?.length) {
          findMatchingLayersInFrame(layer.children);
        }
      });
    };
    
    findMatchingLayersInFrame(frame.layers);
  });
  
  if (matchingLayers.length === 0) {
    console.log(`No layers named "${layerName}" found`);
    return;
  }
  
  console.log(`Found ${matchingLayers.length} layers named "${layerName}"`);
  
  matchingLayers.forEach(({ frameId, layer }) => {
    console.log(`Layer in frame ${frameId}:`);
    console.log(`  ID: ${layer.id}`);
    console.log(`  Visible: ${layer.visible}`);
    console.log(`  isLinked: ${layer.isLinked}`);
    
    if (layer.linkedLayer) {
      console.log(`  Link group: ${layer.linkedLayer.groupId}`);
      console.log(`  Is main: ${layer.linkedLayer.isMain}`);
      console.log(`  Sync mode: ${layer.linkedLayer.syncMode}`);
    } else {
      console.log(`  No linkedLayer property`);
    }
  });
}