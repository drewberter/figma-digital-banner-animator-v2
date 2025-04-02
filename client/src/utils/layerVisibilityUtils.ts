/**
 * Enhanced GIF Frame Layer Visibility Helpers
 * 
 * These utilities provide robust, consistent handling of layer visibility
 * across GIF frames, ensuring that both the hiddenLayers array and the
 * layer.visible property remain in sync at all times.
 */

import { 
  AnimationLayer, 
  GifFrame,
  LinkSyncMode
} from '../types/animation';
import { parseGifFrameId } from './linkingUtils';

/**
 * Utility function to detect if a layer is likely a background layer
 * based on its name and position in the hierarchy
 * 
 * Note: While we identify background layers, we no longer invert their visibility.
 * This detection is used for logging and UI indicators only.
 * 
 * @param layer The layer or layer name to check
 * @returns true if the layer is likely a background layer
 */
export function isLikelyBackgroundLayer(layer: AnimationLayer | string): boolean {
  const name = typeof layer === 'string' ? layer.toLowerCase() : (layer?.name || '').toLowerCase();
  
  // Common background layer names
  const backgroundPatterns = [
    'background',
    'bg',
    'backdrop',
    'back',
    'canvas',
    'bkgd',
    'bkg'
  ];
  
  // Check if the name contains any of the background patterns
  return backgroundPatterns.some(pattern => name.includes(pattern));
}

/**
 * Helper function to ensure consistent visibility state across both
 * the hiddenLayers array and visible property.
 * 
 * This provides a single source of truth for visibility state
 * and ensures the two properties never contradict each other.
 */
export function setLayerVisibilityConsistent(
  frame: GifFrame,
  layerId: string,
  makeVisible: boolean,
  isBackgroundLayer: boolean = false
): GifFrame {
  // Create a deep copy to avoid mutation
  const updatedFrame = JSON.parse(JSON.stringify(frame));
  
  // We no longer invert visibility for background layers
  // This ensures GIF frames maintain consistent visibility
  const actualVisibility = makeVisible;
  
  // Add debug information for tracing
  console.log(`[setLayerVisibilityConsistent] Layer ${layerId} in frame ${frame.id}, makeVisible=${makeVisible}, isBackgroundLayer=${isBackgroundLayer}, actualVisibility=${actualVisibility}`);
  
  // Ensure hiddenLayers array exists
  if (!updatedFrame.hiddenLayers) {
    updatedFrame.hiddenLayers = [];
  }
  
  // 1. Update hiddenLayers array (the source of truth for visibility)
  if (actualVisibility) {
    // Make visible - remove from hiddenLayers
    updatedFrame.hiddenLayers = updatedFrame.hiddenLayers.filter((id: string) => id !== layerId);
  } else {
    // Make hidden - add to hiddenLayers if not already there
    if (!updatedFrame.hiddenLayers.includes(layerId)) {
      updatedFrame.hiddenLayers.push(layerId);
    }
  }
  
  // 2. Ensure layer.visible property matches hiddenLayers state
  if (updatedFrame.layers) {
    const updateLayerVisibleProperty = (
      layers: AnimationLayer[],
      targetId: string,
      visible: boolean
    ): boolean => {
      for (let i = 0; i < layers.length; i++) {
        if (layers[i].id === targetId) {
          // IMPORTANT: Set visible property to match hiddenLayers state
          layers[i].visible = visible;
          
          // Apply special effect to ensure React detects the change
          // Adding a unique timestamp forces React to see this as a new object
          layers[i].lastUpdated = Date.now();
          
          // Add special indicator to help with debugging
          if (isBackgroundLayer) {
            layers[i]._isBackgroundLayer = true;
          }
          
          // Flag as successfully updated
          return true;
        }
        
        // Check children recursively
        if (layers[i]?.children && Array.isArray(layers[i].children) && layers[i].children.length > 0) {
          // Safely access children ensuring it's not undefined
          const childLayers = layers[i].children;
          if (updateLayerVisibleProperty(childLayers, targetId, visible)) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    // Apply the update to the layer tree
    if (updatedFrame.layers) {
      updateLayerVisibleProperty(updatedFrame.layers, layerId, actualVisibility);
    }
  }
  
  // Return the updated frame with consistent visibility state
  return updatedFrame;
}

/**
 * Enhanced layer sync function that ensures visibility state consistency
 * across both the hiddenLayers array and visible property.
 */
export function syncLayersByNameConsistent(
  layerId: string,
  sourceFrameId: string,
  allFrames: GifFrame[],
  makeVisible: boolean
): GifFrame[] {
  console.log(`[LayerSync] STARTING LAYER VISIBILITY SYNC`);
  console.log(`[LayerSync] Source layer: ${layerId} in frame: ${sourceFrameId}`);
  console.log(`[LayerSync] Setting visibility: ${makeVisible ? 'VISIBLE' : 'HIDDEN'}`);
  
  try {
    // Create a deep copy to avoid mutation
    const updatedFrames = JSON.parse(JSON.stringify(allFrames));
    
    // Find the source frame
    const sourceFrameIndex = updatedFrames.findIndex((f: GifFrame) => f.id === sourceFrameId);
    if (sourceFrameIndex === -1) {
      console.error(`[LayerSync] Source frame ${sourceFrameId} not found`);
      return allFrames;
    }
    
    const sourceFrame = updatedFrames[sourceFrameIndex];
    
    // Find the source layer in the source frame
    if (!sourceFrame.layers) {
      console.error(`[LayerSync] Source frame has no layers`);
      return allFrames;
    }
    
    // Get the source layer and its name
    const sourceLayer = findLayerById(sourceFrame.layers, layerId);
    if (!sourceLayer || !sourceLayer.name) {
      console.error(`[LayerSync] Source layer ${layerId} not found or has no name`);
      return allFrames;
    }
    
    const sourceName = sourceLayer.name;
    console.log(`[LayerSync] Will sync all layers named "${sourceName}" (case-insensitive)`);
    
    // Check if this is a background layer which needs special treatment
    const bgPatterns = ['background', 'bg', 'backdrop', 'back layer', 'bkgd', 'background layer'];
    const isBackgroundLayer = bgPatterns.some(pattern => 
      sourceName.toLowerCase().includes(pattern)
    );
    
    if (isBackgroundLayer) {
      console.log(`[LayerSync] BACKGROUND LAYER DETECTED: "${sourceName}"`);
      console.log(`[LayerSync] Background layer detected but no special handling needed - visibility will be consistent`);
    }
    
    // Parse source frame info for better cross-frame matching
    const parsedSourceFrameId = parseGifFrameId(sourceFrameId);
    const sourceFrameNumber = parsedSourceFrameId.isValid ? parsedSourceFrameId.frameNumber : null;
    const sourceAdSizeId = parsedSourceFrameId.isValid ? parsedSourceFrameId.adSizeId : null;
    
    // First, update the source frame for immediate feedback
    updatedFrames[sourceFrameIndex] = setLayerVisibilityConsistent(
      sourceFrame,
      layerId,
      makeVisible,
      isBackgroundLayer
    );
    
    // Now go through ALL other frames and update any layer with matching name
    updatedFrames.forEach((frame: GifFrame, frameIndex: number) => {
      // Skip the source frame since we've already updated it
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
          console.log(`[LayerSync] Skipping ${frameInfo} - different frame number (${frameNumber} vs ${sourceFrameNumber})`);
          return;
        }
        
        // Skip if same ad size (prevent intra-ad-size linking)
        if (sourceAdSizeId === adSizeId) {
          console.log(`[LayerSync] Skipping ${frameInfo} - same ad size (${adSizeId})`);
          return;
        }
        
        console.log(`[LayerSync] Frame ${frameInfo} eligible for syncing - same frame number (${frameNumber}), different ad size`);
      }
      
      // Helper to find all layers with matching name (recursive)
      const findMatchingLayers = (layers: AnimationLayer[]): AnimationLayer[] => {
        let matches: AnimationLayer[] = [];
        
        for (const layer of layers) {
          // Case-insensitive match
          if (layer.name && layer.name.toLowerCase() === sourceName.toLowerCase()) {
            // Skip layers with overrides
            if (hasVisibilityOverride(frame, layer.id)) {
              console.log(`[LayerSync] Layer "${layer.name}" (${layer.id}) has override - skipping`);
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
        console.log(`[LayerSync] Found ${matchingLayers.length} matching layers named "${sourceName}" in ${frameInfo}:`);
        matchingLayers.forEach(layer => {
          console.log(`[LayerSync] - ${layer.name} (${layer.id})`);
        });
        
        // Update each matching layer's visibility
        matchingLayers.forEach(layer => {
          // Use our helper function to ensure consistent visibility state
          const updatedFrame = setLayerVisibilityConsistent(
            frame,
            layer.id,
            makeVisible,
            isBackgroundLayer
          );
          
          // Update the frame in our array (safe because we're using index reference)
          updatedFrames[frameIndex] = updatedFrame;
          
          // Ensure the layer has proper link properties for UI display
          if (layer.linkedLayer === undefined) {
            // Find the layer again in the updated frame
            const updatedLayer = findLayerById(updatedFrames[frameIndex].layers || [], layer.id);
            if (updatedLayer) {
              // Create linkedLayer property if not exists
              updatedLayer.linkedLayer = {
                id: layer.id,
                layerId: layer.id,
                frameId: frame.id,
                name: layer.name || '',
                hasOverride: false,
                // Additional properties used in the codebase
                groupId: `gif-link-${sourceName.toLowerCase()}`,
                syncMode: LinkSyncMode.Full,
                isMain: false,
                overrides: []
              };
              
              // Also set isLinked flag for UI
              updatedLayer.isLinked = true;
              
              console.log(`[LayerSync] Added link properties to layer "${updatedLayer.name}" for UI display`);
            }
          }
        });
      } else {
        console.log(`[LayerSync] No matching layers found in ${frameInfo}`);
      }
    });
    
    // Update source layer linking properties for UI display
    const updatedSourceLayer = findLayerById(updatedFrames[sourceFrameIndex].layers || [], layerId);
    if (updatedSourceLayer) {
      if (!updatedSourceLayer.linkedLayer) {
        updatedSourceLayer.linkedLayer = {
          id: updatedSourceLayer.id,
          layerId: updatedSourceLayer.id,
          frameId: sourceFrameId,
          name: updatedSourceLayer.name || '',
          hasOverride: false,
          // Additional properties used in the codebase
          groupId: `gif-link-${sourceName.toLowerCase()}`,
          syncMode: LinkSyncMode.Full,
          isMain: true,
          overrides: []
        };
      }
      updatedSourceLayer.isLinked = true;
      console.log(`[LayerSync] Added link properties to source layer "${sourceName}" for UI display`);
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
    
    console.log(`[LayerSync] FINISHED LAYER SYNC: "${sourceName}" layers synchronized`);
    
    return updatedFrames;
  } catch (caughtError: any) {
    // Safely handle error message
    const errorMessage = caughtError && typeof caughtError === 'object' && 'message' in caughtError 
      ? String(caughtError.message) 
      : 'Unknown error occurred';
    
    console.error('[LayerSync] ERROR IN LAYER SYNC:', errorMessage);
    console.error('Error in layer synchronization:', caughtError);
    
    return allFrames;
  }
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
 * Checks if a layer has visibility override settings in a frame
 */
export function hasVisibilityOverride(frame: GifFrame, layerId: string): boolean {
  return frame.overrides?.layerVisibility?.[layerId]?.overridden || false;
}

/**
 * Main function to toggle layer visibility with consistency guarantees
 */
export function toggleLayerVisibility(
  frame: GifFrame, 
  layerId: string,
  syncAcrossFrames: boolean = true,
  frames: GifFrame[] = []
): GifFrame | GifFrame[] {
  // Find the layer to determine its current state
  const layer = findLayerById(frame.layers || [], layerId);
  if (!layer) {
    console.error(`[toggleLayerVisibility] Layer ${layerId} not found in frame ${frame.id}`);
    return frame;
  }
  
  // Determine current visibility and invert it
  const isCurrentlyVisible = frame.hiddenLayers ? !frame.hiddenLayers.includes(layerId) : true;
  const makeVisible = !isCurrentlyVisible;
  
  console.log(`[toggleLayerVisibility] Toggling ${layer.name} (${layerId}) to ${makeVisible ? 'visible' : 'hidden'}`);
  
  // Check if this is likely a background layer
  const bgPatterns = ['background', 'bg', 'backdrop', 'back layer', 'bkgd', 'background layer'];
  const isBackgroundLayer = layer.name ? bgPatterns.some(pattern => 
    layer.name.toLowerCase().includes(pattern)
  ) : false;
  
  if (isBackgroundLayer) {
    console.log(`[toggleLayerVisibility] Background layer detected: ${layer.name}. No special handling needed.`);
  }
  
  // If syncing across frames is requested, use the full sync function
  if (syncAcrossFrames && frames.length > 0) {
    console.log(`[toggleLayerVisibility] Syncing visibility across frames`);
    return syncLayersByNameConsistent(layerId, frame.id, frames, makeVisible);
  }
  
  // Otherwise just update this single frame
  console.log(`[toggleLayerVisibility] Updating only this frame (${frame.id})`);
  return setLayerVisibilityConsistent(frame, layerId, makeVisible, isBackgroundLayer);
}

/**
 * Layer Visibility Management
 * 
 * Unified approach to layer visibility for both animation and GIF frame modes
 */

import { AnimationLayer, GifFrame, TimelineMode } from '../types/animation';
import { findLayerById } from './layerLinkUtils';
import { isGifModeLink, isAnimationModeLink } from './layerLinkUtils';

/**
 * Toggle layer visibility consistently across modes
 * 
 * @param frame The frame containing the layer
 * @param layerId The ID of the layer to toggle
 * @param frames All frames (for linked layer synchronization)
 * @param mode Current timeline mode
 * @returns Updated frames with visibility toggled
 */
export function toggleLayerVisibility(
  frame: any, // Can be AnimationFrame or GifFrame
  layerId: string,
  frames: any[], // Array of frames
  mode: TimelineMode
): any[] {
  // Find the layer in the frame
  const layer = findLayerById(frame.layers, layerId);
  if (!layer) {
    console.error(`Layer ${layerId} not found in frame ${frame.id}`);
    return frames;
  }
  
  // Log operation
  console.log(`[LayerVisibility] Toggling visibility for layer ${layer.name} (${layerId}) in frame ${frame.id}, current: ${layer.visible}`);
  
  // Create a fresh copy of frames to avoid reference issues
  const updatedFrames = JSON.parse(JSON.stringify(frames));
  
  // Find the index of the current frame
  const frameIndex = updatedFrames.findIndex((f: any) => f.id === frame.id);
  if (frameIndex === -1) {
    console.error(`Frame ${frame.id} not found in frames array`);
    return frames;
  }
  
  // Helper to toggle visibility recursively in a layer tree
  const toggleVisibilityRecursive = (layers: AnimationLayer[], targetId: string): AnimationLayer[] => {
    return layers.map(l => {
      if (l.id === targetId) {
        // Toggle visibility
        return { ...l, visible: !l.visible };
      }
      
      // Process children if needed
      if (l.children && l.children.length > 0) {
        return {
          ...l,
          children: toggleVisibilityRecursive(l.children, targetId)
        };
      }
      
      return l;
    });
  };
  
  // Update the layer's visibility in the current frame
  updatedFrames[frameIndex].layers = toggleVisibilityRecursive(updatedFrames[frameIndex].layers, layerId);
  
  // GIF Frame mode - may need to sync across ad sizes for linked layers
  if (mode === 'gifFrames' && layer.isLinked && layer.linkedLayer?.groupId) {
    const { groupId } = layer.linkedLayer;
    
    // Only sync if this is a GIF mode link
    if (isGifModeLink(groupId)) {
      // Find all frames that might have linked layers
      const newVisibility = !layer.visible; // Calculate the new visibility state
      
      // Sync to other frames
      return syncLayerVisibilityByName(updatedFrames, layer.name, newVisibility);
    }
  }
  
  // Animation mode - sync across frames within the same ad size
  if (mode === 'animation' && layer.isLinked && layer.linkedLayer?.groupId && !layer.linkedLayer.hasOverride) {
    const { groupId } = layer.linkedLayer;
    
    // Only sync if this is an Animation mode link
    if (isAnimationModeLink(groupId)) {
      // Sync to all frames in the same ad size
      return updatedFrames.map((f: any) => {
        if (f.id === frame.id) return f; // Skip the already updated frame
        
        // Update the linked layer in other frames
        f.layers = toggleVisibilityRecursive(f.layers, layerId);
        return f;
      });
    }
  }
  
  // Handle frame-specific visibility arrays if needed (GIF frames)
  if (mode === 'gifFrames') {
    const gifFrame = updatedFrames[frameIndex] as GifFrame;
    
    // Check if the frame has a hiddenLayers array
    if (!gifFrame.hiddenLayers) {
      gifFrame.hiddenLayers = [];
    }
    
    // Update the hiddenLayers array to match layer.visible state
    const isNowHidden = !layer.visible;
    
    if (isNowHidden && !gifFrame.hiddenLayers.includes(layerId)) {
      // Add to hidden layers
      gifFrame.hiddenLayers.push(layerId);
    } else if (!isNowHidden && gifFrame.hiddenLayers.includes(layerId)) {
      // Remove from hidden layers
      gifFrame.hiddenLayers = gifFrame.hiddenLayers.filter(id => id !== layerId);
    }
  }
  
  return updatedFrames;
}

/**
 * Sync layer visibility by name across frames
 * 
 * @param frames Array of frames
 * @param layerName Name of the layer to sync
 * @param visible Visibility to set
 * @returns Updated frames with synchronized visibility
 */
export function syncLayerVisibilityByName(
  frames: any[],
  layerName: string,
  visible: boolean
): any[] {
  if (!layerName) {
    console.error(`Cannot sync layer visibility: missing layer name`);
    return frames;
  }
  
  // Create a fresh copy to avoid reference issues
  const updatedFrames = JSON.parse(JSON.stringify(frames));
  
  // Helper to update layers with matching name
  const updateLayerVisibilityByName = (layers: AnimationLayer[], name: string, visible: boolean): AnimationLayer[] => {
    return layers.map(layer => {
      // Update if name matches
      if (layer.name === name) {
        return { ...layer, visible };
      }
      
      // Process children if they exist
      if (layer.children && layer.children.length > 0) {
        return {
          ...layer,
          children: updateLayerVisibilityByName(layer.children, name, visible)
        };
      }
      
      return layer;
    });
  };
  
  // Process all frames
  return updatedFrames.map((frame: any) => {
    // Skip if no layers
    if (!frame.layers) return frame;
    
    // Update layers with matching name
    frame.layers = updateLayerVisibilityByName(frame.layers, layerName, visible);
    
    // Update hiddenLayers array if this is a GIF frame
    if (frame.hiddenLayers) {
      // Find all layers with the matching name to update hiddenLayers
      const findLayerIdsByName = (layers: AnimationLayer[], name: string): string[] => {
        let ids: string[] = [];
        
        layers.forEach(layer => {
          if (layer.name === name) {
            ids.push(layer.id);
          }
          
          if (layer.children && layer.children.length > 0) {
            ids = [...ids, ...findLayerIdsByName(layer.children, name)];
          }
        });
        
        return ids;
      };
      
      const layerIds = findLayerIdsByName(frame.layers, layerName);
      
      // Update hiddenLayers based on visibility
      if (!visible) {
        // Add to hidden layers if not already there
        layerIds.forEach(id => {
          if (!frame.hiddenLayers.includes(id)) {
            frame.hiddenLayers.push(id);
          }
        });
      } else {
        // Remove from hidden layers
        frame.hiddenLayers = frame.hiddenLayers.filter((id: string) => !layerIds.includes(id));
      }
    }
    
    return frame;
  });
}

/**
 * Ensure layer visibility and hiddenLayers array are consistent
 * 
 * @param frame Frame to update
 * @returns Updated frame with consistent visibility
 */
export function ensureConsistentVisibility(frame: GifFrame): GifFrame {
  if (!frame.layers) return frame;
  
  // Create a deep copy to avoid reference issues
  const updatedFrame = JSON.parse(JSON.stringify(frame));
  
  // Initialize hiddenLayers if it doesn't exist
  if (!updatedFrame.hiddenLayers) {
    updatedFrame.hiddenLayers = [];
  }
  
  // Helper to update layer visibility based on hiddenLayers
  const updateLayerVisibility = (layers: AnimationLayer[]): AnimationLayer[] => {
    return layers.map(layer => {
      // Set visibility based on hiddenLayers
      const isHidden = updatedFrame.hiddenLayers.includes(layer.id);
      
      // Process children recursively
      if (layer.children && layer.children.length > 0) {
        return {
          ...layer,
          visible: !isHidden,
          children: updateLayerVisibility(layer.children)
        };
      }
      
      return { ...layer, visible: !isHidden };
    });
  };
  
  // Update all layers
  updatedFrame.layers = updateLayerVisibility(updatedFrame.layers);
  
  return updatedFrame;
}