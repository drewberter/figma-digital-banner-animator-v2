/**
 * Test utility to verify layer linking is working correctly
 */

import { AnimationLayer, GifFrame, LinkSyncMode } from '../types/animation';
import { parseGifFrameId } from './linkingUtils';
import { hasVisibilityOverride } from './layerVisibilityUtils';

// Add direct link table declarations here - this will be populated by buildDirectLinkTable
interface DirectLinkTable {
  [layerName: string]: {
    [frameId: string]: string;
  };
}

// Create a reference to the global link table
const directLinkTable: DirectLinkTable = {};

/**
 * Test utility to verify layer linking is working correctly
 */
export function testLayerLinking(
  gifFrames: GifFrame[],
  targetLayerName?: string
): void {
  // Clear console for cleaner output
  console.clear();
  console.log('%c === GIF FRAME LAYER LINKING TEST ===', 'background: #333; color: #fff; padding: 5px; font-weight: bold;');
  
  // Build the link table
  buildDirectLinkTable(gifFrames);
  
  // Log all frames
  console.log(`Total frames: ${gifFrames.length}`);
  
  // Parse each frame for better debugging
  const framesByNumber: Record<string, GifFrame[]> = {};
  
  gifFrames.forEach(frame => {
    const parsedId = parseGifFrameId(frame.id);
    if (parsedId.isValid) {
      const { frameNumber, adSizeId } = parsedId;
      
      if (!framesByNumber[frameNumber]) {
        framesByNumber[frameNumber] = [];
      }
      
      framesByNumber[frameNumber].push(frame);
      
      console.log(`Frame: ${frame.id} (Number: ${frameNumber}, AdSize: ${adSizeId})`);
    } else {
      console.log(`Frame with invalid ID format: ${frame.id}`);
    }
  });
  
  // Log frames grouped by number
  console.log('Frames grouped by frame number:');
  Object.entries(framesByNumber).forEach(([number, frames]) => {
    console.log(`  Frame Number ${number}: ${frames.length} frames across ad sizes`);
  });
  
  // Find and log all unique layer names across frames
  const allLayerNames = new Set<string>();
  const layerNameCounts: Record<string, number> = {};
  
  // Helper to process layers recursively
  const processLayers = (layers: AnimationLayer[] | undefined) => {
    if (!layers) return;
    
    layers.forEach(layer => {
      if (layer.name) {
        const normalizedName = layer.name.toLowerCase();
        allLayerNames.add(normalizedName);
        
        if (!layerNameCounts[normalizedName]) {
          layerNameCounts[normalizedName] = 0;
        }
        
        layerNameCounts[normalizedName]++;
      }
      
      // Process children
      if (layer.children) {
        processLayers(layer.children);
      }
    });
  };
  
  // Process all frames
  gifFrames.forEach(frame => {
    processLayers(frame.layers);
  });
  
  // Log layer names and counts
  console.log(`Found ${allLayerNames.size} unique layer names across all frames:`);
  
  const sortedNames = Object.entries(layerNameCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
  
  sortedNames.forEach(({ name, count }) => {
    console.log(`  "${name}": appears ${count} times`);
  });
  
  // If a specific layer name was provided, analyze it in detail
  if (targetLayerName) {
    const normalizedTargetName = targetLayerName.toLowerCase();
    
    console.log(`%c DETAILED ANALYSIS FOR LAYER: "${targetLayerName}" `, 'background: #007acc; color: #fff; padding: 3px;');
    
    if (!layerNameCounts[normalizedTargetName]) {
      console.log(`No layers found with name "${targetLayerName}"`);
      return;
    }
    
    // Find all instances of this layer across frames
    interface LayerInstance {
      frameId: string;
      layerId: string;
      frameNumber: string;
      adSizeId: string;
      isVisible: boolean;
      hasOverride: boolean;
      isLinked: boolean;
      path: string[];
    }
    
    const instances: LayerInstance[] = [];
    
    // Helper to find layers with the target name
    const findLayersByName = (
      layers: AnimationLayer[] | undefined, 
      frameId: string,
      frame: GifFrame,
      parentPath: string[] = []
    ) => {
      if (!layers) return;
      
      layers.forEach(layer => {
        if (layer.name && layer.name.toLowerCase() === normalizedTargetName) {
          const parsedId = parseGifFrameId(frameId);
          const path = [...parentPath, layer.name];
          
          instances.push({
            frameId,
            layerId: layer.id,
            frameNumber: parsedId.isValid ? parsedId.frameNumber : 'unknown',
            adSizeId: parsedId.isValid ? parsedId.adSizeId : 'unknown',
            isVisible: !(frame.hiddenLayers || []).includes(layer.id),
            hasOverride: hasVisibilityOverride(frame, layer.id),
            isLinked: !!layer.isLinked || !!layer.linkedLayer,
            path
          });
        }
        
        // Process children
        if (layer.children) {
          findLayersByName(
            layer.children, 
            frameId, 
            frame, 
            [...parentPath, layer.name || 'unnamed']
          );
        }
      });
    };
    
    // Process all frames
    gifFrames.forEach(frame => {
      findLayersByName(frame.layers, frame.id, frame);
    });
    
    // Group by frame number
    const instancesByFrameNumber: Record<string, LayerInstance[]> = {};
    
    instances.forEach(instance => {
      if (!instancesByFrameNumber[instance.frameNumber]) {
        instancesByFrameNumber[instance.frameNumber] = [];
      }
      
      instancesByFrameNumber[instance.frameNumber].push(instance);
    });
    
    // Log instances grouped by frame number
    console.log(`Found ${instances.length} instances of layer "${targetLayerName}" across frames:`);
    
    Object.entries(instancesByFrameNumber).forEach(([frameNumber, frameInstances]) => {
      console.log(`%c Frame Number ${frameNumber}: ${frameInstances.length} instances `, 'background: #444; color: #fff;');
      
      frameInstances.forEach(instance => {
        const bgColor = instance.isVisible ? '#060' : '#600';
        const linkIcon = instance.isLinked ? '🔗' : '⛓️';
        const overrideIcon = instance.hasOverride ? '🔒' : '';
        
        console.log(
          `%c ${instance.isVisible ? 'VISIBLE' : 'HIDDEN'} %c ${linkIcon} %c ${overrideIcon} `,
          `background: ${bgColor}; color: #fff; padding: 2px;`,
          'background: #007; color: #fff; padding: 2px;',
          'background: #700; color: #fff; padding: 2px;',
          `Ad Size: ${instance.adSizeId}, Path: ${instance.path.join(' > ')}, ID: ${instance.layerId}`
        );
      });
      
      // Check if visibility is consistent across instances in this frame number
      const allVisible = frameInstances.every(i => i.isVisible);
      const allHidden = frameInstances.every(i => !i.isVisible);
      
      if (allVisible) {
        console.log(`%c ✅ CONSISTENT (all visible) `, 'background: #060; color: #fff;');
      } else if (allHidden) {
        console.log(`%c ✅ CONSISTENT (all hidden) `, 'background: #060; color: #fff;');
      } else {
        console.log(`%c ❌ INCONSISTENT VISIBILITY `, 'background: #900; color: #fff;');
        
        // Log visibility map for easier debugging
        const visMap = frameInstances.map(i => 
          `${i.adSizeId}: ${i.isVisible ? 'visible' : 'hidden'}${i.hasOverride ? ' (overridden)' : ''}`
        ).join(', ');
        
        console.log(`Visibility Map: ${visMap}`);
      }
    });
    
    // Direct link table info
    console.log('Direct link table entries for this layer:');
    
    Object.entries(directLinkTable).forEach(([name, frameMap]) => {
      if (name.toLowerCase() === normalizedTargetName) {
        console.log(`  Link table entry for "${name}":`);
        Object.entries(frameMap).forEach(([frameId, layerId]) => {
          const frame = gifFrames.find(f => f.id === frameId);
          const isVisible = frame && frame.hiddenLayers ? 
            !frame.hiddenLayers.includes(layerId) : 
            true;
          
          console.log(`    Frame ${frameId} → Layer ${layerId} (${isVisible ? 'visible' : 'hidden'})`);
        });
      }
    });
  }
  
  console.log('%c === TEST COMPLETE ===', 'background: #333; color: #fff; padding: 5px; font-weight: bold;');
}

/**
 * Helper function to find a layer by ID in a nested structure
 */
export function findLayerInFrameById(layers: AnimationLayer[], targetId: string): AnimationLayer | null {
  for (const layer of layers) {
    if (layer.id === targetId) {
      return layer;
    }
    
    if (layer.children && layer.children.length > 0) {
      const result = findLayerInFrameById(layer.children, targetId);
      if (result) return result;
    }
  }
  
  return null;
}

/**
 * Builds and updates the direct link mapping table
 * This should be called whenever frames or layers change
 */
export function buildDirectLinkTable(frames: GifFrame[]): void {
  console.log(`[LayerSync] Building link table for ${frames.length} frames`);
  
  // Clear the existing table
  Object.keys(directLinkTable).forEach(key => {
    delete directLinkTable[key];
  });
  
  // Helper function to process a layer and its children
  const processLayer = (layer: AnimationLayer, frameId: string) => {
    if (layer.name) {
      // Use normalized layer name (lowercase) for case-insensitive matching
      const normalizedName = layer.name.toLowerCase();
      
      // Create entry for this layer name if it doesn't exist
      if (!directLinkTable[normalizedName]) {
        directLinkTable[normalizedName] = {};
      }
      
      // Map this layer ID to its frame
      directLinkTable[normalizedName][frameId] = layer.id;
      
      // Debug info
      const parsedFrame = parseGifFrameId(frameId);
      if (parsedFrame.isValid) {
        console.log(`[LayerSync] Mapped layer "${layer.name}" (${layer.id}) in frame ${parsedFrame.frameNumber} of size ${parsedFrame.adSizeId}`);
      }
    }
    
    // Process children if they exist
    if (layer.children && layer.children.length > 0) {
      layer.children.forEach(child => processLayer(child, frameId));
    }
  };
  
  // Process all frames and their layers
  frames.forEach(frame => {
    if (frame.layers && frame.layers.length > 0) {
      frame.layers.forEach(layer => processLayer(layer, frame.id));
    }
  });
  
  // Log detailed information about the mapping table
  const layerNames = Object.keys(directLinkTable);
  console.log(`[LayerSync] Built link table with ${layerNames.length} unique layer names`);
}

// Define a function to run a full test on all layers
export function runLayerLinkingTests() {
  // This assumes you have access to gifFrames from somewhere
  const frames = (window as any).getGifFrames?.() || [];
  
  if (frames.length === 0) {
    console.error('No frames available for testing');
    return;
  }
  
  console.log('%c RUNNING FULL LAYER LINKING TEST SUITE', 'background: #060; color: #fff; padding: 5px; font-weight: bold;');
  
  // First test general linking
  testLayerLinking(frames);
  
  // Get all unique layer names from all frames
  const layerNames = new Set<string>();
  const processLayer = (layer: AnimationLayer) => {
    if (layer.name) {
      layerNames.add(layer.name.toLowerCase());
    }
    if (layer.children) {
      layer.children.forEach(processLayer);
    }
  };
  
  frames.forEach(frame => {
    if (frame.layers) {
      frame.layers.forEach(processLayer);
    }
  });
  
  // Test the first 3 unique layer names as a sample
  const sampleNames = Array.from(layerNames).slice(0, 3);
  
  sampleNames.forEach(name => {
    console.log(`\n%c TESTING LAYER: "${name}" `, 'background: #007acc; color: #fff; padding: 5px; font-weight: bold;');
    testLayerLinking(frames, name);
  });
}

// Add a global function for easy testing from the browser console
if (typeof window !== 'undefined') {
  (window as any).testLayerLinking = (layerName?: string) => {
    // This assumes you have access to gifFrames from somewhere
    // You'll need to adapt this to your application structure
    const frames = (window as any).getGifFrames?.() || [];
    testLayerLinking(frames, layerName);
  };
  
  (window as any).runLayerLinkingTests = () => {
    runLayerLinkingTests();
  };
}