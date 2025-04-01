/**
 * Direct Layer Linking System
 * 
 * A straightforward layer linking system that uses a direct mapping table
 * to track layer relationships across frames based purely on layer names.
 * 
 * This approach provides several advantages:
 * 1. Simple implementation with minimal complexity
 * 2. Complete isolation from the animation mode linking system
 * 3. Name-based matching that ignores layer hierarchy
 * 4. Reliable synchronization across frames
 * 5. Fast lookups through direct access to the mapping table
 */

import { GifFrame, AnimationLayer } from '@/types/animation';
import { parseGifFrameId } from './linkingUtils';
import { toast } from '@/hooks/use-toast';

/**
 * Direct link table maps layer names to their IDs in each frame
 * Structure: { layerName: { frameId: layerId } }
 */
export interface DirectLinkTable {
  [layerName: string]: {
    [frameId: string]: string;
  };
}

// Global link table that can be updated as frames/layers change
const directLinkTable: DirectLinkTable = {};

/**
 * Updates the link table with all layers from the given frames
 * Case-insensitive keys for more reliable matching
 */
export function buildDirectLinkTable(frames: GifFrame[]): void {
  console.log(`[DirectLinking] Building link table for ${frames.length} frames`);
  
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
        console.log(`[DirectLinking] Mapped layer "${layer.name}" (${layer.id}) in frame ${parsedFrame.frameNumber} of size ${parsedFrame.adSizeId}`);
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
  console.log(`[DirectLinking] Built link table with ${layerNames.length} unique layer names`);
  
  // Show sample of the mapping (first 3 entries) for debugging
  if (layerNames.length > 0) {
    const sampleEntries = layerNames.slice(0, 3);
    sampleEntries.forEach(name => {
      const frames = Object.keys(directLinkTable[name]);
      console.log(`[DirectLinking] Sample entry: "${name}" appears in ${frames.length} frames`);
    });
  }
}

/**
 * Gets all linked layers across frames for a given layer
 * This uses the direct link table to find layers with the same name in different frames
 * 
 * @param layerId The ID of the source layer
 * @param sourceFrameId The ID of the frame containing the source layer
 * @param allFrames All available frames
 * @returns Array of objects containing frameId and layerId for each linked layer
 */
export function getLinkedLayers(
  layerId: string,
  sourceFrameId: string,
  allFrames: GifFrame[]
): Array<{ frameId: string, layerId: string }> {
  // Find the layer name using its ID and frame ID
  const layerName = findLayerNameById(layerId, sourceFrameId, allFrames);
  if (!layerName) {
    console.warn(`[DirectLinking] Could not find name for layer ${layerId} in frame ${sourceFrameId}`);
    return [];
  }
  
  // Use normalized (lowercase) name for lookup
  const normalizedName = layerName.toLowerCase();
  
  // Get all linked layers from the table
  const linkedLayers: Array<{ frameId: string, layerId: string }> = [];
  
  if (directLinkTable[normalizedName]) {
    // Debug info for matching
    console.log(`[DirectLinking] Found layer "${layerName}" in link table with ${Object.keys(directLinkTable[normalizedName]).length} instances`);
    
    Object.entries(directLinkTable[normalizedName]).forEach(([frameId, id]) => {
      // Skip the source layer itself
      if (frameId !== sourceFrameId || id !== layerId) {
        linkedLayers.push({ frameId, layerId: id });
        
        // Parse frame info for better debug logs
        const parsedFrame = parseGifFrameId(frameId);
        if (parsedFrame.isValid) {
          console.log(`[DirectLinking] Found linked layer in frame ${parsedFrame.frameNumber} of size ${parsedFrame.adSizeId}`);
        }
      }
    });
  } else {
    console.warn(`[DirectLinking] No linked layers found for "${layerName}" (normalized: "${normalizedName}")`);
  }
  
  return linkedLayers;
}

/**
 * Finds a layer's name by its ID in a specific frame
 * This recursively searches through the frame's layer hierarchy
 * 
 * @param layerId The ID of the layer to find
 * @param frameId The ID of the frame containing the layer
 * @param allFrames All available frames
 * @returns The layer's name or null if not found
 */
function findLayerNameById(
  layerId: string,
  frameId: string,
  allFrames: GifFrame[]
): string | null {
  // Find the frame
  const frame = allFrames.find((f: GifFrame) => f.id === frameId);
  if (!frame || !frame.layers) {
    console.warn(`[DirectLinking] Frame ${frameId} not found or has no layers`);
    return null;
  }
  
  // Helper to search for a layer recursively
  const findLayer = (layers: AnimationLayer[]): string | null => {
    for (const layer of layers) {
      if (layer.id === layerId) {
        return layer.name || null;
      }
      
      // Check children if they exist
      if (layer.children && layer.children.length > 0) {
        const result = findLayer(layer.children);
        if (result) return result;
      }
    }
    
    return null;
  };
  
  const name = findLayer(frame.layers);
  
  if (name) {
    console.log(`[DirectLinking] Found layer name "${name}" for ID ${layerId} in frame ${frameId}`);
  } else {
    console.warn(`[DirectLinking] Could not find layer with ID ${layerId} in frame ${frameId}`);
  }
  
  return name;
}

/**
 * SUPER SIMPLE DIRECT LAYER LINKING V2
 * 
 * The simplest possible direct layer linking approach that bypasses all complexity.
 * Just find all layers with the exact same name (case-insensitive) and update them.
 * 
 * @param layerId The ID of the source layer being toggled
 * @param sourceFrameId The ID of the frame containing the source layer
 * @param allFrames All GIF frames in the project
 * @param makeVisible Whether to make the layer visible (true) or hidden (false)
 * @returns Updated frames with all layers of the same name synced
 */

export function log(...args: any[]) {
  console.log(`[DirectLayerLinking]`, ...args);
}

export function logHighlight(...args: any[]) {
  console.log(`\n%c[DirectLayerLinking] ${args.join(' ')}`, 'background: #000; color: #ff0; padding: 2px 4px; border-radius: 2px;');
}
export function syncLayersByNameSimple(
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
      console.error(`[SUPER SIMPLE LINKING] Source frame ${sourceFrameId} not found`);
      return allFrames;
    }
    
    const sourceFrame = updatedFrames[sourceFrameIndex];
    
    // Helper to find a layer by ID (recursive)
    const findLayerById = (layers: AnimationLayer[], targetId: string): AnimationLayer | null => {
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
    };
    
    // Find the source layer in the source frame
    if (!sourceFrame.layers) {
      console.error(`[SUPER SIMPLE LINKING] Source frame has no layers`);
      return allFrames;
    }
    
    // Get the source layer and its name
    const sourceLayer = findLayerById(sourceFrame.layers, layerId);
    if (!sourceLayer || !sourceLayer.name) {
      console.error(`[SUPER SIMPLE LINKING] Source layer ${layerId} not found or has no name`);
      return allFrames;
    }
    
    const sourceName = sourceLayer.name;
    log(`Will sync all layers named "${sourceName}" (case-insensitive)`);
    
    // Show toast notification that we're linking layers by name
    toast({
      title: "GIF Frame Layer Sync",
      description: `Syncing all "${sourceName}" layers across frames`,
      variant: "default",
      duration: 3000
    });
    
    // SPECIAL FIX: Check if this is a Background layer which needs special handling
    // Background layers often have specific names like "Background", "BG", "Bg Layer", etc.
    const bgPatterns = ['background', 'bg', 'backdrop', 'back layer'];
    const isBackgroundLayer = bgPatterns.some(pattern => 
      sourceName.toLowerCase().includes(pattern)
    );
    
    if (isBackgroundLayer) {
      logHighlight(`🎯 BACKGROUND LAYER DETECTED: "${sourceName}"`);
      log(`Special handling enabled - will invert visibility state for background layers`);
    }
    
    // Now go through ALL frames and update any layer with matching name
    updatedFrames.forEach((frame: GifFrame, frameIndex: number) => {
      // Skip the source frame since it's already updated
      if (frame.id === sourceFrameId) {
        return;
      }
      
      if (!frame.layers) {
        return;
      }
      
      // Parse frame ID for better logging
      const parsedFrameId = parseGifFrameId(frame.id);
      const frameInfo = parsedFrameId.isValid 
        ? `frame ${parsedFrameId.frameNumber} of size ${parsedFrameId.adSizeId}` 
        : frame.id;
      
      // Helper to find all layers with matching name (recursive)
      const findMatchingLayers = (layers: AnimationLayer[]): AnimationLayer[] => {
        let matches: AnimationLayer[] = [];
        
        for (const layer of layers) {
          // Case-insensitive match
          if (layer.name && layer.name.toLowerCase() === sourceName.toLowerCase()) {
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
          
          // SPECIAL FIX: For background layer, invert the visibility state
          // This fixes the bug where background layers seem to get the opposite visibility
          const actualVisibility = isBackgroundLayer ? !makeVisible : makeVisible;
          
          log(`${isBackgroundLayer ? '🔄 BACKGROUND LAYER' : '🔹 Regular layer'} "${layer.name}" - Requested: ${makeVisible ? 'VISIBLE' : 'HIDDEN'}, Actual: ${actualVisibility ? 'VISIBLE' : 'HIDDEN'}`);
          
          if (actualVisibility) {
            // Remove from hiddenLayers to make visible
            const wasHidden = frame.hiddenLayers.includes(layer.id);
            frame.hiddenLayers = frame.hiddenLayers.filter((id: string) => id !== layer.id);
            
            if (wasHidden) {
              log(`✅ Made layer "${layer.name}" (${layer.id}) VISIBLE in ${frameInfo}`);
            }
          } else {
            // Add to hiddenLayers to hide
            const wasVisible = !frame.hiddenLayers.includes(layer.id);
            if (wasVisible) {
              frame.hiddenLayers.push(layer.id);
              log(`❌ Hid layer "${layer.name}" (${layer.id}) in ${frameInfo}`);
            }
          }
        });
      } else {
        log(`No matching layers found in ${frameInfo}`);
      }
    });
    
    logHighlight(`✅ FINISHED LAYER SYNC: "${sourceName}" layers in ${updatedFrames.length} frames`);
    
    // Show success toast with the count of frames updated
    toast({
      title: "Layer Sync Complete",
      description: `Successfully linked ${sourceName} across all frames`,
      duration: 2000
    });
    
    return updatedFrames;
  } catch (caughtError: any) {
    // Safely handle error message
    const errorMessage = caughtError && typeof caughtError === 'object' && 'message' in caughtError 
      ? String(caughtError.message) 
      : 'Unknown error occurred';
    
    logHighlight(`❌ ERROR IN LAYER SYNC: ${errorMessage}`);
    console.error('[DirectLayerLinking] Error in simple layer linking:', caughtError);
    
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
 * Syncs visibility of all layers with the same name across frames
 * This is a major simplification from the previous complex syncing systems
 * 
 * @param layerId ID of the layer that was toggled
 * @param sourceFrameId ID of the frame containing the layer
 * @param allFrames All GIF frames in the project
 * @param makeVisible Whether to make the layers visible or hidden
 * @returns Updated frames with synchronized visibility
 */
export function syncLinkedLayerVisibility(
  layerId: string,
  sourceFrameId: string,
  allFrames: GifFrame[],
  makeVisible: boolean
): GifFrame[] {
  // Just use our super simple name-matching function instead
  return syncLayersByNameSimple(layerId, sourceFrameId, allFrames, makeVisible);
}

/**
 * Helper function to check if a layer has override settings
 * 
 * @param frame The frame containing the layer
 * @param layerId ID of the layer to check
 * @returns Whether the layer has visibility overrides
 */
export function hasVisibilityOverride(frame: GifFrame, layerId: string): boolean {
  return !!(frame.overrides?.layerVisibility?.[layerId]?.overridden);
}