/**
 * Layer Linking Utilities
 * 
 * This file provides utilities for linking layers across frames and ad sizes.
 * It supports both Animation Mode and GIF Frame Mode linking.
 */

import { AnimationLayer, LinkSyncMode } from '../types/animation';

/**
 * Parse GIF frame ID into components
 * 
 * @param frameId The frame ID to parse (e.g. "gif-frame-frame-4-1" or "frame-1-size-300x250")
 * @returns Object with parsed components
 */
export function parseGifFrameId(frameId: string): { frameNumber: number, adSizeId: string, isValid: boolean } {
  try {
    if (!frameId) {
      console.warn('Invalid or empty frameId passed to parseGifFrameId');
      return { frameNumber: 0, adSizeId: 'unknown', isValid: false };
    }
    
    // Match new format like "gif-frame-frame-4-1" where "frame-4" is the ad size ID and "1" is the frame number
    const gifFrameRegex = /gif-frame-(frame-\d+)-(\d+)/;
    const gifFrameMatch = frameId.match(gifFrameRegex);
    
    if (gifFrameMatch && gifFrameMatch.length === 3) {
      return {
        frameNumber: parseInt(gifFrameMatch[2], 10),
        adSizeId: gifFrameMatch[1],
        isValid: true
      };
    }
    
    // Match format like "frame-1-size-300x250"
    const regex = /frame-(\d+)-size-(.+)/;
    const match = frameId.match(regex);
    
    if (match && match.length === 3) {
      return {
        frameNumber: parseInt(match[1], 10),
        adSizeId: match[2],
        isValid: true
      };
    } 
    
    // Try alternative format like "frame-1-adsize-300x250"
    const altRegex = /frame-(\d+)-adsize-(.+)/;
    const altMatch = frameId.match(altRegex);
    
    if (altMatch && altMatch.length === 3) {
      return {
        frameNumber: parseInt(altMatch[1], 10),
        adSizeId: altMatch[2],
        isValid: true
      };
    }
    
    console.error(`Invalid GIF frame ID format: "${frameId}"`);
    return { frameNumber: 0, adSizeId: 'unknown', isValid: false };
  } catch (error) {
    console.error('Error parsing frameId:', error);
    return { frameNumber: 0, adSizeId: 'unknown', isValid: false };
  }
}

/**
 * Automatically link layers with the same name across frames
 * This simplified implementation is for testing purposes only
 * 
 * @param frames Record of frame IDs to layers for linking
 * @returns Updated frames with linked layers
 */
export function autoLinkLayers(frames: Record<string, AnimationLayer[]>): Record<string, AnimationLayer[]> {
  console.log("autoLinkLayers: Starting auto-linking for frames", Object.keys(frames).join(", "));

  const updatedFrames = { ...frames };
  
  try {
    // Create a dictionary to organize layers by name
    const layersByName: Record<string, { frameId: string; layer: AnimationLayer }[]> = {};
    
    // First pass: collect all layers by name
    for (const frameId in updatedFrames) {
      if (!updatedFrames[frameId] || !Array.isArray(updatedFrames[frameId])) {
        console.log(`autoLinkLayers: No layers found for frame ${frameId}`);
        continue;
      }
      
      // Process all layers in this frame
      updatedFrames[frameId].forEach(layer => {
        if (!layer.name) {
          console.warn(`autoLinkLayers: Layer ${layer.id} in frame ${frameId} is missing a name, skipping`);
          return;
        }
        
        // Normalize layer name (case-insensitive matching)
        const normalizedName = layer.name.toLowerCase();
        
        if (!layersByName[normalizedName]) {
          layersByName[normalizedName] = [];
        }
        
        // Add this layer occurrence to our collection
        layersByName[normalizedName].push({
          frameId,
          layer
        });
      });
    }
    
    // Second pass: link layers with the same name
    for (const layerName in layersByName) {
      const layers = layersByName[layerName];
      
      // Only link if we have at least 2 layers with the same name
      if (layers.length > 1) {
        console.log(`autoLinkLayers: Creating link group for ${layerName} with ${layers.length} layers`);
        
        // Create a link group
        const groupId = `group-${layerName.replace(/[^a-z0-9]/gi, '-')}`;
        
        // Update all layers in this group
        layers.forEach(item => {
          // Update the layer's properties
          const layerIndex = updatedFrames[item.frameId].findIndex(l => l.id === item.layer.id);
          
          if (layerIndex !== -1) {
            // Mark layer as linked and store the link group ID
            updatedFrames[item.frameId][layerIndex] = {
              ...item.layer,
              isLinked: true,
              locked: true // Lock linked layers to prevent individual editing
            };
            
            console.log(`autoLinkLayers: Linked layer ${item.layer.id} in frame ${item.frameId} and set locked=true`);
          }
        });
      }
    }
    
    console.log("autoLinkLayers: Finished auto-linking layers");
    return updatedFrames;
  } catch (error) {
    console.error("Error in autoLinkLayers:", error);
    return frames; // Return original on error
  }
}

/**
 * Synchronize animation settings between linked layers
 * This is a simplified placeholder implementation
 */
export function syncLinkedLayerAnimations(
  sourceLayerId: string, 
  animation: any,
  allFrames: Record<string, AnimationLayer[]>
): Record<string, AnimationLayer[]> {
  // Placeholder implementation that logs but doesn't modify anything
  console.log(`syncLinkedLayerAnimations: Would sync animation for source layer ${sourceLayerId}`);
  return allFrames;
}

/**
 * Set animation override for a layer
 * This is a simplified placeholder implementation
 */
export function setAnimationOverride(
  layerId: string, 
  animationId: string,
  override: boolean
): void {
  // Placeholder implementation that logs but doesn't do anything
  console.log(`setAnimationOverride: Would set override=${override} for layer ${layerId}, animation ${animationId}`);
}

/**
 * Unlink a layer from its group
 * This implementation properly handles nested layers
 */
export function unlinkLayer(
  allFrames: Record<string, AnimationLayer[]>,
  layerId: string
): Record<string, AnimationLayer[]> {
  console.log(`unlinkLayer: Unlinking layer ${layerId} across all frames`);
  
  // Deep clone the frames to avoid directly mutating the input
  const updatedFrames = JSON.parse(JSON.stringify(allFrames));
  
  // Find the target layer to get its name
  let targetLayerName: string | null = null;
  
  // Search for the layer across all frames
  outerLoop: for (const frameId in updatedFrames) {
    const findLayerName = (layers: AnimationLayer[]): string | null => {
      for (const layer of layers) {
        if (layer.id === layerId && layer.name) {
          return layer.name;
        }
        if (layer.children?.length) {
          const found = findLayerName(layer.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    targetLayerName = findLayerName(updatedFrames[frameId]);
    if (targetLayerName) break outerLoop;
  }
  
  if (!targetLayerName) {
    console.warn(`unlinkLayer: Could not find layer with ID ${layerId} or it has no name`);
    return allFrames; // Return original if layer not found
  }
  
  console.log(`unlinkLayer: Found layer named "${targetLayerName}" to unlink`);
  
  // Now unlink the target layer and any linked layers with the same name
  const normalizedName = targetLayerName.toLowerCase();
  
  // Process all frames
  for (const frameId in updatedFrames) {
    const processLayers = (layers: AnimationLayer[]): AnimationLayer[] => {
      return layers.map(layer => {
        // Check for name match or ID match
        if (layer.id === layerId || (layer.name && layer.name.toLowerCase() === normalizedName)) {
          // Unlink the layer
          console.log(`unlinkLayer: Unlinking layer "${layer.name}" (${layer.id}) in frame ${frameId}`);
          
          return {
            ...layer,
            isLinked: false,
            locked: false, // Unlock previously linked layer
            timestamp: Date.now() // Add timestamp to force React to recognize the change
          };
        }
        
        // Recursively process children
        if (layer.children?.length) {
          return {
            ...layer,
            children: processLayers(layer.children)
          };
        }
        
        // No changes to this layer
        return layer;
      });
    };
    
    // Update layers
    updatedFrames[frameId] = processLayers(updatedFrames[frameId]);
  }
  
  console.log(`unlinkLayer: Finished unlinking layers with name "${targetLayerName}"`);
  return updatedFrames;
}

/**
 * Set sync mode for a layer
 * This is a simplified placeholder implementation
 */
export function setSyncMode(layerId: string, mode: LinkSyncMode): void {
  // Placeholder implementation that logs but doesn't do anything
  console.log(`setSyncMode: Would set sync mode ${mode} for layer ${layerId}`);
}

/**
 * Translate a layer ID between different contexts
 * This is a simplified placeholder implementation
 */
export function translateLayerId(layerId: string, sourceFrameId: string, targetFrameId: string): string {
  // Placeholder implementation that returns the original ID
  return layerId;
}

/**
 * Link a specific layer to matching layers by name
 * This implementation supports nested layers and provides debugging info
 */
export function linkLayer(
  allFrames: Record<string, AnimationLayer[]>,
  layerId: string
): Record<string, AnimationLayer[]> {
  console.log(`linkLayer: Linking layer ${layerId} to matching layers by name`);
  
  // Find the layer to link
  let layerToLink: AnimationLayer | null = null;
  let sourceFrameId: string = '';
  
  // Find the layer in the frames
  for (const frameId in allFrames) {
    if (!allFrames[frameId] || !Array.isArray(allFrames[frameId])) {
      console.warn(`linkLayer: Frame ${frameId} has no valid layers array`);
      continue;
    }
    
    const findLayer = (layers: AnimationLayer[]): AnimationLayer | null => {
      for (const layer of layers) {
        if (layer.id === layerId) {
          return layer;
        }
        if (layer.children?.length) {
          const foundLayer = findLayer(layer.children);
          if (foundLayer) return foundLayer;
        }
      }
      return null;
    };
    
    layerToLink = findLayer(allFrames[frameId]);
    if (layerToLink) {
      sourceFrameId = frameId;
      break;
    }
  }
  
  if (!layerToLink || !layerToLink.name) {
    console.warn(`linkLayer: Could not find layer with ID ${layerId} or it has no name`);
    return allFrames;
  }
  
  console.log(`linkLayer: Found layer "${layerToLink.name}" (${layerId}) to link from frame ${sourceFrameId}`);
  
  // Clone the frames to avoid mutating the original
  const updatedFrames = JSON.parse(JSON.stringify(allFrames));
  
  // Create a timestamp for this link operation - ensures React detects the change
  const linkTimestamp = Date.now();
  
  // Generate a group ID based on the layer name
  const groupId = `link-group-${layerToLink.name.toLowerCase().replace(/[^a-z0-9]/gi, '-')}-${linkTimestamp.toString().substring(8)}`;
  
  // Link by name (case insensitive)
  const normalizedName = layerToLink.name.toLowerCase();
  
  // Counter to track how many layers were linked
  let linkedLayerCount = 0;
  
  // Process all frames except the source frame first
  for (const frameId in updatedFrames) {
    if (frameId === sourceFrameId) continue; // We'll handle the source frame later
    
    if (!updatedFrames[frameId] || !Array.isArray(updatedFrames[frameId])) {
      console.warn(`linkLayer: Frame ${frameId} has no valid layers array when linking`);
      continue;
    }
    
    const processLayers = (layers: AnimationLayer[]): AnimationLayer[] => {
      return layers.map(layer => {
        // Check for name match (case insensitive)
        if (layer.name && layer.name.toLowerCase() === normalizedName) {
          // Mark as linked
          console.log(`linkLayer: Linking layer "${layer.name}" (${layer.id}) in frame ${frameId}`);
          linkedLayerCount++;
          
          return {
            ...layer,
            isLinked: true,
            locked: true, // Lock linked layers to prevent individual editing
            timestamp: linkTimestamp, // Add timestamp to force React to recognize the change
            linkGroup: groupId // Add the group ID for identifying the link group
          };
        }
        
        // Recursively process children
        if (layer.children?.length) {
          return {
            ...layer,
            children: processLayers(layer.children)
          };
        }
        
        // No changes to this layer
        return layer;
      });
    };
    
    // Update layers
    updatedFrames[frameId] = processLayers(updatedFrames[frameId]);
  }
  
  // Now update the source layer
  const updateSourceLayer = (layers: AnimationLayer[]): AnimationLayer[] => {
    return layers.map(layer => {
      if (layer.id === layerId) {
        // Mark source layer as linked
        console.log(`linkLayer: Marking source layer "${layer.name}" (${layer.id}) as linked and main`);
        linkedLayerCount++;
        
        return {
          ...layer,
          isLinked: true,
          locked: true, // Lock linked layers to prevent individual editing
          isMain: true, // Flag as the main layer in the link group
          timestamp: linkTimestamp, // Add timestamp to force React to recognize the change
          linkGroup: groupId // Add the group ID for identifying the link group
        };
      }
      
      // Recursively process children
      if (layer.children?.length) {
        return {
          ...layer,
          children: updateSourceLayer(layer.children)
        };
      }
      
      // No changes to this layer
      return layer;
    });
  };
  
  // Update source frame
  updatedFrames[sourceFrameId] = updateSourceLayer(updatedFrames[sourceFrameId]);
  
  console.log(`linkLayer: Successfully linked ${linkedLayerCount} layers with name "${layerToLink.name}" in group ${groupId}`);
  
  return updatedFrames;
}

/**
 * Synchronize layer visibility across gif frames
 * This is a simplified placeholder implementation
 */
export function syncGifFrameLayerVisibility(
  sourceFrameId: string,
  targetFrameId: string,
  layerId: string,
  visible: boolean,
  allFrames: Record<string, AnimationLayer[]>
): Record<string, AnimationLayer[]> {
  // Placeholder implementation that logs but returns unmodified frames
  console.log(`syncGifFrameLayerVisibility: Would sync visibility=${visible} from frame ${sourceFrameId} to ${targetFrameId} for layer ${layerId}`);
  return allFrames;
}