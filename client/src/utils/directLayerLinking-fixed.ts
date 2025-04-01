/**
 * Enhanced GIF Frame Auto Layer Link Sync
 * 
 * A reliable, efficient system for synchronizing layer visibility
 * across multiple frames based on layer name matching.
 */

import { GifFrame, AnimationLayer, LinkSyncMode } from '../types/animation';
import { parseGifFrameId } from './linkingUtils';
import { toast } from '@/hooks/use-toast';
import { ensureConsistentVisibility } from './ensureConsistentVisibility';

// Direct link table maps layer names to their IDs in each frame
// Structure: { layerName: { frameId: layerId } }
interface DirectLinkTable {
  [layerName: string]: {
    [frameId: string]: string;
  };
}

// Global link table that can be updated as frames/layers change
const directLinkTable: DirectLinkTable = {};

/**
 * Get the direct link table - helper for test utilities
 */
export function getDirectLinkTable(): DirectLinkTable {
  return directLinkTable;
}

/**
 * Enhanced logging functions for better debugging
 */
export function log(...args: any[]) {
  console.log(`[LayerSync]`, ...args);
}

export function logHighlight(...args: any[]) {
  console.log(`\n%c[LayerSync] ${args.join(' ')}`, 'background: #000; color: #ff0; padding: 2px 4px; border-radius: 2px;');
}

/**
 * Builds and updates the direct link mapping table
 * This should be called whenever frames or layers change
 */
export function buildDirectLinkTable(frames: GifFrame[]): void {
  log(`Building link table for ${frames.length} frames`);
  
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
        log(`Mapped layer "${layer.name}" (${layer.id}) in frame ${parsedFrame.frameNumber} of size ${parsedFrame.adSizeId}`);
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
  log(`Built link table with ${layerNames.length} unique layer names`);
  
  // Show sample of the mapping for debugging
  if (layerNames.length > 0) {
    const sampleEntries = layerNames.slice(0, 3);
    sampleEntries.forEach(name => {
      const frames = Object.keys(directLinkTable[name]);
      log(`Sample entry: "${name}" appears in ${frames.length} frames`);
    });
  }
}

/**
 * Checks if a layer has override settings
 */
export function hasVisibilityOverride(frame: GifFrame, layerId: string): boolean {
  return !!(frame.overrides?.layerVisibility?.[layerId]?.overridden);
}

/**
 * Helper function to find a layer by ID in a nested structure
 */
export function findLayerById(layers: AnimationLayer[], targetId: string): AnimationLayer | null {
  for (const layer of layers) {
    if (layer.id === targetId) {
      return layer;
    }
    
    if (layer.children && layer.children.length > 0) {
      const result = findLayerById(layer.children, targetId);
      if (result) return result;
    }
  }
  
  return null;
}

/**
 * Helper function to update a layer's visibility in a nested structure
 */
export function updateLayerVisibility(
  layers: AnimationLayer[], 
  targetId: string, 
  visible: boolean
): boolean {
  for (let i = 0; i < layers.length; i++) {
    if (layers[i].id === targetId) {
      layers[i].visible = visible;
      return true;
    }
    
    if (layers[i].children && layers[i].children.length > 0) {
      if (updateLayerVisibility(layers[i].children, targetId, visible)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Main synchronization function that links layers by name across frames
 * This is the core of the GIF Frame Auto Layer Link Sync feature
 * 
 * @param layerId The ID of the source layer being toggled
 * @param sourceFrameId The ID of the frame containing the source layer
 * @param allFrames All GIF frames in the project
 * @param makeVisible Whether to make the layer visible (true) or hidden (false)
 * @returns Updated frames with all matching layers synced
 */
export function syncLayersByName(
  layerId: string,
  sourceFrameId: string,
  allFrames: GifFrame[],
  makeVisible: boolean
): GifFrame[] {
  logHighlight(`🔄 STARTING LAYER VISIBILITY SYNC 🔄`);
  log(`Source layer: ${layerId} in frame: ${sourceFrameId}`);
  log(`Setting visibility: ${makeVisible ? '✅ VISIBLE' : '❌ HIDDEN'}`);
  
  try {
    // Create a deep copy to avoid mutation
    const updatedFrames = JSON.parse(JSON.stringify(allFrames));
    
    // Find the source frame
    const sourceFrameIndex = updatedFrames.findIndex((f: GifFrame) => f.id === sourceFrameId);
    if (sourceFrameIndex === -1) {
      console.error(`Source frame ${sourceFrameId} not found`);
      return allFrames;
    }
    
    const sourceFrame = updatedFrames[sourceFrameIndex];
    
    // Find the source layer in the source frame
    if (!sourceFrame.layers) {
      console.error(`Source frame has no layers`);
      return allFrames;
    }
    
    // Get the source layer and its name
    const sourceLayer = findLayerById(sourceFrame.layers, layerId);
    if (!sourceLayer || !sourceLayer.name) {
      console.error(`Source layer ${layerId} not found or has no name`);
      return allFrames;
    }
    
    const sourceName = sourceLayer.name;
    log(`Will sync all layers named "${sourceName}" (case-insensitive)`);
    
    // Show toast notification about the sync operation
    toast({
      title: "Layer Sync",
      description: `Syncing all "${sourceName}" layers across frames`,
      variant: "default",
      duration: 2000
    });
    
    // SPECIAL HANDLING: Check if this is a Background layer which needs special treatment
    // Background layers often have specific names like "Background", "BG", "Bg Layer", etc.
    const bgPatterns = ['background', 'bg', 'backdrop', 'back layer'];
    const isBackgroundLayer = bgPatterns.some(pattern => 
      sourceName.toLowerCase().includes(pattern)
    );
    
    if (isBackgroundLayer) {
      logHighlight(`🎯 BACKGROUND LAYER DETECTED: "${sourceName}"`);
      log(`Special handling enabled - will invert visibility state for background layers`);
    }
    
    // Parse source frame info for better cross-frame matching
    const parsedSourceFrameId = parseGifFrameId(sourceFrameId);
    const sourceFrameNumber = parsedSourceFrameId.isValid ? parsedSourceFrameId.frameNumber : null;
    const sourceAdSizeId = parsedSourceFrameId.isValid ? parsedSourceFrameId.adSizeId : null;
    
    // Now go through ALL frames and update any layer with matching name
    updatedFrames.forEach((frame: GifFrame, frameIndex: number) => {
      // Skip the source frame since it's already updated
      if (frame.id === sourceFrameId) {
        return;
      }
      
      if (!frame.layers) {
        return;
      }
      
      // Parse frame ID for better cross-frame matching and logging
      const parsedFrameId = parseGifFrameId(frame.id);
      const frameNumber = parsedFrameId.isValid ? parsedFrameId.frameNumber : null;
      const adSizeId = parsedFrameId.isValid ? parsedFrameId.adSizeId : null;
      
      const frameInfo = parsedFrameId.isValid 
        ? `frame ${parsedFrameId.frameNumber} of size ${parsedFrameId.adSizeId}` 
        : frame.id;
      
      // Enhanced cross-frame matching rules:
      // 1. Only sync between frames with the same frame number
      // 2. Only sync across different ad sizes, not within the same ad size
      if (sourceFrameNumber && frameNumber && sourceAdSizeId && adSizeId) {
        // Skip if frame numbers don't match
        if (sourceFrameNumber !== frameNumber) {
          log(`Skipping ${frameInfo} - different frame number (${frameNumber} vs ${sourceFrameNumber})`);
          return;
        }
        
        // Skip if same ad size (prevent intra-ad-size linking)
        if (sourceAdSizeId === adSizeId) {
          log(`Skipping ${frameInfo} - same ad size (${adSizeId})`);
          return;
        }
        
        log(`Frame ${frameInfo} eligible for syncing - same frame number (${frameNumber}), different ad size`);
      }
      
      // Helper to find all layers with matching name (recursive)
      const findMatchingLayers = (layers: AnimationLayer[]): AnimationLayer[] => {
        let matches: AnimationLayer[] = [];
        
        for (const layer of layers) {
          // Case-insensitive match
          if (layer.name && layer.name.toLowerCase() === sourceName.toLowerCase()) {
            // Skip layers with overrides
            if (hasVisibilityOverride(frame, layer.id)) {
              log(`Layer "${layer.name}" (${layer.id}) has override - skipping`);
              continue;
            }
            
            matches.push(layer);
          }
          
          // Check children
          if (layer.children && layer.children.length > 0) {
            matches = [...matches, ...findMatchingLayers(layer.children)];
          }
        }
        
        return matches;
      };
      
      // Find all matching layers in this frame
      const matchingLayers = findMatchingLayers(frame.layers);
      
      if (matchingLayers.length > 0) {
        log(`Found ${matchingLayers.length} matching layers named "${sourceName}" in ${frameInfo}`);
        
        // Update each matching layer's visibility
        matchingLayers.forEach(layer => {
          // Ensure hiddenLayers array exists
          if (!frame.hiddenLayers) {
            frame.hiddenLayers = [];
          }
          
          // Use the ensureConsistentVisibility helper for background layer handling
          log(`${isBackgroundLayer ? '🔄 BACKGROUND LAYER' : '🔹 Regular layer'} "${layer.name}" - Requested: ${makeVisible ? 'VISIBLE' : 'HIDDEN'}`);
          
          // Update the frame with consistent visibility state using our specialized helper
          // This handles both hiddenLayers array and visible property for consistency
          const updatedFrameCopy = ensureConsistentVisibility(frame, layer.id, makeVisible, isBackgroundLayer);
          
          // Copy over the updated hiddenLayers and update layer visibility status
          frame.hiddenLayers = updatedFrameCopy.hiddenLayers;
          
          // Check if layer visibility changed and log appropriate message
          const isVisibleAfterUpdate = !frame.hiddenLayers.includes(layer.id);
          if (isVisibleAfterUpdate) {
            log(`✅ Made layer "${layer.name}" (${layer.id}) VISIBLE in ${frameInfo}`);
          } else {
            log(`❌ Hid layer "${layer.name}" (${layer.id}) in ${frameInfo}`);
          }

          // Update linkedLayer property
          if (layer.linkedLayer === undefined) {
            // Create linkedLayer property if not exists
            layer.linkedLayer = {
              layerId: layer.id,
              frameId: frame.id,
              name: layer.name || sourceName,
              hasOverride: false,
              groupId: `gif-link-${sourceName.toLowerCase()}`,
              syncMode: LinkSyncMode.Full,
              isMain: false,
              overrides: []
            };
            
            // Also set isLinked flag for UI
            layer.isLinked = true;
            // Set locked state to trigger link icon display
            layer.locked = true;
            log(`🔗 Added link properties to layer "${layer.name}" for UI display`);
          }
        });
      } else {
        log(`No matching layers found in ${frameInfo}`);
      }
    });
    
    // Update source layer linking properties for UI display
    if (sourceLayer) {
      if (!sourceLayer.linkedLayer) {
        sourceLayer.linkedLayer = {
          layerId: sourceLayer.id,
          frameId: sourceFrameId,
          name: sourceLayer.name || sourceName,
          hasOverride: false,
          groupId: `gif-link-${sourceName.toLowerCase()}`,
          syncMode: LinkSyncMode.Full,
          isMain: true,
          overrides: []
        };
      }
      sourceLayer.isLinked = true;
      // Set locked state to trigger link icon display
      sourceLayer.locked = true;
      log(`🔗 Added link properties to source layer "${sourceName}" for UI display`);
    }
    
    // Update frame statistics after all visibility changes
    updatedFrames.forEach((frame: GifFrame) => {
      if (!frame.layers) return;
      
      // Count visible layers recursively
      const countVisibleLayers = (layers: AnimationLayer[]): number => {
        return layers.reduce((count, layer) => {
          // A layer is visible if it's not in the hiddenLayers array
          const isVisible = !(frame.hiddenLayers || []).includes(layer.id);
          
          // Count children for containers
          const childrenCount = layer.children && layer.children.length > 0
            ? countVisibleLayers(layer.children)
            : 0;
            
          return count + (isVisible ? 1 : 0) + childrenCount;
        }, 0);
      };
      
      // Update visibleLayerCount property
      frame.visibleLayerCount = countVisibleLayers(frame.layers);
    });
    
    logHighlight(`✅ FINISHED LAYER SYNC: "${sourceName}" layers synchronized`);
    
    return updatedFrames;
  } catch (caughtError: any) {
    // Safely handle error message
    const errorMessage = caughtError && typeof caughtError === 'object' && 'message' in caughtError 
      ? String(caughtError.message) 
      : 'Unknown error occurred';
    
    logHighlight(`❌ ERROR IN LAYER SYNC: ${errorMessage}`);
    console.error('Error in layer synchronization:', caughtError);
    
    // Show error toast
    toast({
      title: "Layer Sync Failed",
      description: errorMessage,
      variant: "destructive",
      duration: 3000
    });
    
    return allFrames;
  }
}

/**
 * Toggles the override status for a layer in a GIF frame
 * When a layer has an override, it won't sync its visibility with other frames
 * 
 * @param frames All GIF frames
 * @param frameId ID of the frame containing the layer
 * @param layerId ID of the layer to toggle override for
 * @returns Updated frames with the layer override toggled
 */
export function toggleLayerVisibilityOverride(
  frames: GifFrame[],
  frameId: string,
  layerId: string
): GifFrame[] {
  try {
    // Create a deep copy to avoid mutation
    const updatedFrames = JSON.parse(JSON.stringify(frames));
    
    // Find the frame
    const frameIndex = updatedFrames.findIndex((f: GifFrame) => f.id === frameId);
    if (frameIndex === -1) {
      console.error(`Frame ${frameId} not found`);
      return frames;
    }
    
    const frame = updatedFrames[frameIndex];
    
    // Find the layer to ensure it exists
    const layer = frame.layers ? findLayerById(frame.layers, layerId) : null;
    if (!layer) {
      console.error(`Layer ${layerId} not found in frame ${frameId}`);
      return frames;
    }
    
    // Initialize the overrides object if it doesn't exist
    if (!frame.overrides) {
      frame.overrides = { layerVisibility: {} };
    }
    
    if (!frame.overrides.layerVisibility) {
      frame.overrides.layerVisibility = {};
    }
    
    // Check current override status
    const currentOverride = frame.overrides.layerVisibility[layerId]?.overridden || false;
    
    // Toggle the override
    frame.overrides.layerVisibility[layerId] = {
      overridden: !currentOverride
    };
    
    // Show a toast notification
    const newStatus = !currentOverride;
    toast({
      title: newStatus ? "Layer Override Enabled" : "Layer Override Disabled",
      description: newStatus 
        ? `"${layer.name}" will no longer sync with other frames` 
        : `"${layer.name}" will now sync with other frames`,
      variant: "default",
      duration: 2000
    });
    
    logHighlight(`${newStatus ? '🔒' : '🔓'} ${layer.name} override ${newStatus ? 'ENABLED' : 'DISABLED'}`);
    
    return updatedFrames;
  } catch (error) {
    console.error('Error toggling layer override:', error);
    
    // Show error toast
    toast({
      title: "Error Toggling Override",
      description: "Failed to toggle layer override",
      variant: "destructive",
      duration: 3000
    });
    
    return frames;
  }
}

/**
 * Updates a layer's visibility in a frame
 * This is a utility function that handles all the complexity of
 * updating the hiddenLayers array and visible property consistently
 */
export function setLayerVisibility(
  frame: GifFrame,
  layerId: string,
  visible: boolean,
  isBackgroundLayer: boolean = false
): GifFrame {
  // Use the ensureConsistentVisibility helper for reliable state management
  return ensureConsistentVisibility(frame, layerId, visible, isBackgroundLayer);
}

/**
 * Clean slate function to reset all GIF frame layer linking data
 * Use this when switching between modes or if you're having issues
 */
export function resetLayerLinkData(frames: GifFrame[]): GifFrame[] {
  logHighlight(`🧹 Resetting all layer link data`);
  
  // Clear the direct link table
  Object.keys(directLinkTable).forEach(key => {
    delete directLinkTable[key];
  });
  
  // Create a deep copy to avoid mutation
  const updatedFrames = JSON.parse(JSON.stringify(frames));
  
  // Reset link properties on all frames
  updatedFrames.forEach((frame: GifFrame) => {
    if (!frame.layers) return;
    
    // Helper to process layers recursively
    const resetLayerLinks = (layers: AnimationLayer[]) => {
      return layers.map(layer => {
        // If in GIF mode, only remove gif-specific links
        if (layer.linkedLayer?.groupId?.startsWith('gif-link-')) {
          // Remove link properties
          const { linkedLayer, isLinked, ...rest } = layer;
          return rest;
        }
        
        // Process children
        if (layer.children && layer.children.length > 0) {
          return {
            ...layer,
            children: resetLayerLinks(layer.children)
          };
        }
        
        return layer;
      });
    };
    
    // Reset all layers in the frame
    frame.layers = resetLayerLinks(frame.layers);
    
    // Reset overrides
    frame.overrides = {
      ...frame.overrides,
      layerVisibility: {}
    };
  });
  
  log(`Layer link data reset complete`);
  return updatedFrames;
}

/**
 * Test utility for layer linking
 * This is a simple wrapper to expose for debugging
 */
export function testLayerLinking(gifFrames: GifFrame[], layerName?: string): void {
  console.log('==== LAYER LINKING TEST ====');
  console.log(`Testing ${gifFrames.length} GIF frames`);
  
  if (layerName) {
    console.log(`Filtering for layers named "${layerName}"`);
    
    // Find all layers with this name across frames
    let matchingLayers: any[] = [];
    
    gifFrames.forEach(frame => {
      const findLayersWithName = (layers: AnimationLayer[], path = '') => {
        layers.forEach(layer => {
          if (layer.name === layerName) {
            matchingLayers.push({
              frameId: frame.id, 
              layerId: layer.id,
              visible: layer.visible,
              path: path ? `${path} > ${layer.name}` : layer.name
            });
          }
          
          if (layer.children?.length) {
            findLayersWithName(layer.children, path ? `${path} > ${layer.name}` : layer.name);
          }
        });
      };
      
      findLayersWithName(frame.layers);
    });
    
    console.log(`Found ${matchingLayers.length} layers named "${layerName}":`, matchingLayers);
  } else {
    console.log('No layer name specified, showing frame summary:');
    gifFrames.forEach(frame => {
      console.log(`Frame ${frame.id}: ${frame.layers.length} layers`);
    });
  }
}
