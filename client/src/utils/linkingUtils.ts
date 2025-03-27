import { v4 as uuidv4 } from 'uuid';
import { AnimationLayer, Animation, LinkSyncMode, LinkedLayerInfo, AnimationFrame, GifFrame } from '../types/animation';

/**
 * Extracts information from a GIF frame ID
 * Handles different formats like "gif-frame-frame-1-2" or "gif-frame-1-2"
 */
interface ParsedFrameId {
  frameNumber: string;
  adSizeId: string;
  isValid: boolean;
}

export function parseGifFrameId(frameId: string): ParsedFrameId {
  if (!frameId.startsWith('gif-frame-')) {
    console.warn(`parseGifFrameId: Invalid frame ID format: ${frameId}, expected 'gif-frame-' prefix`);
    return { frameNumber: '', adSizeId: '', isValid: false };
  }
  
  const parts = frameId.split('-');
  console.log(`parseGifFrameId: Parsing frame ID ${frameId} with ${parts.length} parts: ${parts.join(', ')}`);
  
  // Different formats to handle:
  // 1. gif-frame-frame-X-Y (new format)
  // 2. gif-frame-X-Y (old format)
  let frameNumber = '';
  let adSizeId = '';
  
  if (parts.length >= 5 && parts[2] === 'frame') {
    // Format: gif-frame-frame-X-Y
    frameNumber = parts[parts.length - 1];
    adSizeId = `${parts[2]}-${parts[3]}`;
    console.log(`parseGifFrameId: Using new format - adSizeId: ${adSizeId}, frameNumber: ${frameNumber}`);
  } else if (parts.length >= 4) {
    // Format: gif-frame-X-Y
    frameNumber = parts[parts.length - 1];
    adSizeId = parts[2].startsWith('frame') ? parts[2] : `frame-${parts[2]}`;
    console.log(`parseGifFrameId: Using old format - adSizeId: ${adSizeId}, frameNumber: ${frameNumber}`);
  }
  
  const isValid = frameNumber !== '' && adSizeId !== '';
  console.log(`parseGifFrameId: Result - adSizeId: ${adSizeId}, frameNumber: ${frameNumber}, isValid: ${isValid}`);
  
  return { 
    frameNumber, 
    adSizeId,
    isValid
  };
}

/**
 * Translates a layer ID from one ad size to another
 * Uses layer name lookup when available to find equivalent layers
 */
export function translateLayerId(
  layerId: string, 
  sourceAdSizeId: string, 
  targetAdSizeId: string,
  // We'll add optional parameters for accessing layer name data
  sourceLayerName?: string,
  allLayers?: Record<string, AnimationLayer[]>
): string {
  // If ad sizes are the same, no translation needed
  if (sourceAdSizeId === targetAdSizeId) {
    return layerId;
  }
  
  console.log(`translateLayerId - START: Translating layer ${layerId} from ${sourceAdSizeId} to ${targetAdSizeId}`);
  
  // STRATEGY 1: If we have the layer name and all layers, find the equivalent layer by name
  // This is the most reliable method for matching layers across different ad sizes
  if (sourceLayerName && allLayers && allLayers[targetAdSizeId]) {
    // Find a layer in the target ad size with the same name
    const targetLayer = allLayers[targetAdSizeId].find(layer => layer.name === sourceLayerName);
    if (targetLayer) {
      console.log(`translateLayerId: Found layer with matching name "${sourceLayerName}" in target ad size -> ${targetLayer.id}`);
      return targetLayer.id;
    }
  }
  
  // Parse layer ID - for our specific format "layer-X-Y"
  const layerIdParts = layerId.split('-');
  
  // Check if this is in our standard format
  if (layerIdParts[0] !== 'layer' || layerIdParts.length < 3) {
    console.warn(`translateLayerId: Non-standard layer ID format: ${layerId}, returning original`);
    return layerId; // Return original ID as fallback
  }

  // Extract the source frame number and position
  const sourceFrameNumber = parseInt(layerIdParts[1], 10);
  const layerPosition = layerIdParts[2];
  
  // Extract the target frame number - this should be from the ad size (e.g., "frame-1" -> 1)
  const targetAdSizeParts = targetAdSizeId.split('-');
  const targetFrameNumber = targetAdSizeParts.length > 1 ? parseInt(targetAdSizeParts[1], 10) : NaN;
  
  if (isNaN(sourceFrameNumber) || isNaN(targetFrameNumber)) {
    console.warn(`translateLayerId: Could not parse frame numbers - source: ${sourceFrameNumber}, target: ${targetFrameNumber}`);
    return layerId; // Return original as fallback
  }
  
  // STRATEGY 2: Match by position in the layers array
  // For our specific format "layer-X-Y", we can substitute X with the target frame number
  const targetLayerId = `layer-${targetFrameNumber}-${layerPosition}`;
  
  console.log(`translateLayerId: Created position-based mapping from ${layerId} to ${targetLayerId}`);
  
  // If we have access to all layers and the target frame layers, we can verify this mapping
  if (allLayers && allLayers[targetAdSizeId]) {
    // Check if the target layer exists
    const targetLayerExists = allLayers[targetAdSizeId].some(layer => layer.id === targetLayerId);
    if (!targetLayerExists) {
      console.warn(`translateLayerId: Generated target layer ID ${targetLayerId} does not exist in target frame`);
      // We'll still return it as it follows the pattern
    }
  }
  
  return targetLayerId;
}

/**
 * Finds all frames with the same frame number (sequence position) across all ad sizes
 */
export function findFramesWithSameNumber(
  gifFrames: GifFrame[], 
  frameNumber: string
): GifFrame[] {
  console.log(`findFramesWithSameNumber: Looking for all frames with number ${frameNumber}`);
  
  // Make sure we're working with a string for comparison
  const targetFrameNumber = String(frameNumber);
  
  const matches = gifFrames.filter(frame => {
    const parsedId = parseGifFrameId(frame.id);
    const isMatch = parsedId.isValid && parsedId.frameNumber === targetFrameNumber;
    
    if (isMatch) {
      console.log(`findFramesWithSameNumber: Frame ${frame.id} matches frame number ${targetFrameNumber}`);
    }
    
    return isMatch;
  });
  
  console.log(`findFramesWithSameNumber: Found ${matches.length} matching frames`);
  return matches;
}

/**
 * Automatically links layers with the same name across different frames
 * 
 * @param frames Object mapping frame IDs to arrays of layers
 * @returns Updated frames with linked layers
 */
export function autoLinkLayers(frames: Record<string, AnimationLayer[]>): Record<string, AnimationLayer[]> {
  try {
    // Make a deep copy of the frames to avoid mutating the original
    const updatedFrames = JSON.parse(JSON.stringify(frames));
    
    console.log("autoLinkLayers: Starting auto-linking for frames", Object.keys(updatedFrames).join(", "));
    
    // Step 1: Collect all layer names across frames
    const layersByName: Record<string, { frameId: string, layer: AnimationLayer }[]> = {};
    
    Object.keys(updatedFrames).forEach(frameId => {
      if (!updatedFrames[frameId]) {
        console.log(`autoLinkLayers: No layers found for frame ${frameId}`);
        return;
      }
      
      // Make sure the frame ID is valid
      if (!frameId.startsWith('frame-')) {
        console.log(`autoLinkLayers: Skipping frame with invalid ID format: ${frameId}`);
        return;
      }
      
      console.log(`autoLinkLayers: Processing ${updatedFrames[frameId].length} layers for frame ${frameId}`);
      
      updatedFrames[frameId].forEach((layer: AnimationLayer) => {
        // Check that the layer has a valid name property
        if (!layer.name) {
          console.warn(`autoLinkLayers: Layer ${layer.id} in frame ${frameId} is missing a name, skipping`);
          return;
        }
        
        if (!layersByName[layer.name]) {
          layersByName[layer.name] = [];
        }
        layersByName[layer.name].push({ frameId, layer });
      });
    });
    
    // Step 2: Create link groups for layers with the same name
    Object.keys(layersByName).forEach(layerName => {
      const layers = layersByName[layerName];
      
      // Only process if there are at least 2 layers with the same name
      if (layers.length >= 2) {
        console.log(`autoLinkLayers: Creating link group for ${layerName} with ${layers.length} layers`);
        const groupId = uuidv4(); // Generate a unique group ID
        
        // Set the first layer as the main one in the group
        layers.forEach((item, index) => {
          // Make sure each animation has an ID
          item.layer.animations.forEach(animation => {
            if (!animation.id) {
              animation.id = uuidv4();
            }
          });
          
          // Create linked layer info
          const linkedLayer: LinkedLayerInfo = {
            groupId,
            syncMode: LinkSyncMode.Full, // Default to full sync
            isMain: index === 0, // First layer in the group is the main one
            overrides: [] // No overrides initially
          };
          
          // Update the layer with linking info
          item.layer.linkedLayer = linkedLayer;
          
          console.log(`autoLinkLayers: Linked layer ${item.layer.id} in frame ${item.frameId}`);
          
          // Update the frame's layers
          const layerIndex = updatedFrames[item.frameId].findIndex(
            (l: AnimationLayer) => l.id === item.layer.id
          );
          if (layerIndex !== -1) {
            updatedFrames[item.frameId][layerIndex] = item.layer;
          }
        });
      }
    });
    
    console.log("autoLinkLayers: Finished auto-linking layers");
    return updatedFrames;
  } catch (error) {
    console.error("Error in autoLinkLayers:", error);
    return frames; // Return original frames on error
  }
}

/**
 * Synchronizes animations between linked layers
 * 
 * @param frames Object mapping frame IDs to arrays of layers
 * @param sourceLayerId ID of the layer that was modified
 * @returns Updated frames with synchronized animations
 */
export function syncLinkedLayerAnimations(
  frames: Record<string, AnimationLayer[]>,
  sourceLayerId: string
): Record<string, AnimationLayer[]> {
  // Make a deep copy of the frames to avoid mutating the original
  const updatedFrames = JSON.parse(JSON.stringify(frames));
  
  // Find the source layer
  let sourceLayer: AnimationLayer | null = null;
  let sourceFrameId: string | null = null;
  
  Object.keys(updatedFrames).forEach(frameId => {
    const layerIndex = updatedFrames[frameId].findIndex(
      (layer: AnimationLayer) => layer.id === sourceLayerId
    );
    if (layerIndex !== -1) {
      sourceLayer = updatedFrames[frameId][layerIndex] as AnimationLayer;
      sourceFrameId = frameId;
    }
  });
  
  // If source layer not found, return unchanged
  if (!sourceLayer) {
    return frames;
  }
  
  // Check if layer has linkedLayer property
  if (!('linkedLayer' in sourceLayer)) {
    return frames;
  }
  
  // Type assertion to ensure TypeScript understands this is an AnimationLayer with linkedLayer
  const sourceLayerWithLinks = sourceLayer as AnimationLayer & { linkedLayer: LinkedLayerInfo };
  const { groupId, syncMode } = sourceLayerWithLinks.linkedLayer;
  
  // If independent sync mode, no syncing needed
  if (syncMode === LinkSyncMode.Independent) {
    return frames;
  }
  
  // Find all layers in the same group
  Object.keys(updatedFrames).forEach(frameId => {
    updatedFrames[frameId].forEach((layer: AnimationLayer, layerIndex: number) => {
      // Skip the source layer
      if (layer.id === sourceLayerId) {
        return;
      }
      
      // Check if layer is in the same link group
      if (layer.linkedLayer && layer.linkedLayer.groupId === groupId) {
        // Handle different sync modes
        if (syncMode === LinkSyncMode.Full) {
          // Full sync: copy all animations except overridden ones
          const targetOverrides = layer.linkedLayer.overrides || [];
          
          // Clear existing animations that aren't overridden
          const overriddenAnimations = layer.animations.filter(anim => 
            anim.id && targetOverrides.includes(anim.id)
          );
          
          // Copy animations from source layer
          const newAnimations = sourceLayer!.animations
            .filter(anim => !anim.isOverridden)
            .map(anim => ({
              ...anim,
              isOverridden: false
            }));
          
          // Combine overridden animations with new ones
          layer.animations = [...overriddenAnimations, ...newAnimations];
        } else if (syncMode === LinkSyncMode.Partial) {
          // Partial sync: only sync non-overridden animations
          const targetOverrides = layer.linkedLayer.overrides || [];
          
          // Update only non-overridden animations
          sourceLayer!.animations.forEach(sourceAnim => {
            if (sourceAnim.id && !targetOverrides.includes(sourceAnim.id)) {
              // Find if this animation already exists
              const existingIndex = layer.animations.findIndex(
                a => a.id === sourceAnim.id
              );
              
              if (existingIndex !== -1) {
                // Update existing animation
                layer.animations[existingIndex] = {
                  ...sourceAnim,
                  isOverridden: false
                };
              } else {
                // Add new animation
                layer.animations.push({
                  ...sourceAnim,
                  isOverridden: false
                });
              }
            }
          });
        }
        
        // Update the frame with the modified layer
        updatedFrames[frameId][layerIndex] = layer;
      }
    });
  });
  
  return updatedFrames;
}

/**
 * Toggles the override status of an animation in a linked layer
 * 
 * @param frames Object mapping frame IDs to arrays of layers
 * @param layerId ID of the layer containing the animation
 * @param animationId ID of the animation to toggle override for
 * @returns Updated frames with the animation override toggled
 */
export function setAnimationOverride(
  frames: Record<string, AnimationLayer[]>,
  layerId: string,
  animationId: string
): Record<string, AnimationLayer[]> {
  // Make a deep copy of the frames to avoid mutating the original
  const updatedFrames = JSON.parse(JSON.stringify(frames));
  
  // Find the layer
  let targetLayer: AnimationLayer | null = null;
  let frameId: string | null = null;
  let layerIndex: number = -1;
  
  Object.keys(updatedFrames).forEach(fId => {
    const lIndex = updatedFrames[fId].findIndex(
      (layer: AnimationLayer) => layer.id === layerId
    );
    if (lIndex !== -1) {
      targetLayer = updatedFrames[fId][lIndex] as AnimationLayer;
      frameId = fId;
      layerIndex = lIndex;
    }
  });
  
  // If layer not found or not linked, return unchanged
  if (!targetLayer || !("linkedLayer" in targetLayer) || layerIndex === -1 || !frameId) {
    return frames;
  }
  
  // Type assertion to ensure TypeScript understands this is an AnimationLayer with linkedLayer
  const targetLayerWithLinks = targetLayer as AnimationLayer & { linkedLayer: LinkedLayerInfo };
  
  // Toggle override status in the linked layer info
  const overrides = targetLayerWithLinks.linkedLayer.overrides || [];
  const isCurrentlyOverridden = overrides.includes(animationId);
  
  if (isCurrentlyOverridden) {
    // Remove from overrides
    targetLayerWithLinks.linkedLayer.overrides = overrides.filter((id: string) => id !== animationId);
    
    // Find the animation and update its override status
    const animIndex = targetLayerWithLinks.animations.findIndex((anim: Animation) => anim.id === animationId);
    if (animIndex !== -1) {
      targetLayerWithLinks.animations[animIndex].isOverridden = false;
    }
  } else {
    // Add to overrides
    targetLayerWithLinks.linkedLayer.overrides.push(animationId);
    
    // Find the animation and update its override status
    const animIndex = targetLayerWithLinks.animations.findIndex((anim: Animation) => anim.id === animationId);
    if (animIndex !== -1) {
      targetLayerWithLinks.animations[animIndex].isOverridden = true;
    }
  }
  
  // Update targetLayer with the changes from targetLayerWithLinks
  targetLayer = targetLayerWithLinks;
  
  // Update the frame with the modified layer
  updatedFrames[frameId][layerIndex] = targetLayer;
  
  return updatedFrames;
}

/**
 * Unlinks a layer from its group
 * 
 * @param frames Object mapping frame IDs to arrays of layers
 * @param layerId ID of the layer to unlink
 * @returns Updated frames with the layer unlinked
 */
export function unlinkLayer(
  frames: Record<string, AnimationLayer[]>,
  layerId: string
): Record<string, AnimationLayer[]> {
  // Make a deep copy of the frames to avoid mutating the original
  const updatedFrames = JSON.parse(JSON.stringify(frames));
  
  // Find the layer to unlink
  let targetLayer: AnimationLayer | null = null;
  let frameId: string | null = null;
  let layerIndex: number = -1;
  
  Object.keys(updatedFrames).forEach(fId => {
    const lIndex = updatedFrames[fId].findIndex(
      (layer: AnimationLayer) => layer.id === layerId
    );
    if (lIndex !== -1) {
      targetLayer = updatedFrames[fId][lIndex] as AnimationLayer;
      frameId = fId;
      layerIndex = lIndex;
    }
  });
  
  // If layer not found or not linked, return unchanged
  if (!targetLayer || !('linkedLayer' in targetLayer) || layerIndex === -1 || !frameId) {
    return frames;
  }
  
  // Type assertion to ensure TypeScript understands this is an AnimationLayer with linkedLayer
  const targetLayerWithLinks = targetLayer as AnimationLayer & { linkedLayer: LinkedLayerInfo };
  
  // Get the group ID before unlinking
  const groupId = targetLayerWithLinks.linkedLayer.groupId;
  const wasMain = targetLayerWithLinks.linkedLayer.isMain;
  
  // Create a new layer without the linkedLayer property
  // This is better than using delete which can cause TypeScript issues
  const { linkedLayer, ...layerWithoutLink } = targetLayerWithLinks;
  
  // Update targetLayer with the changes 
  targetLayer = layerWithoutLink as AnimationLayer;
  
  // Update the frame with the modified layer
  updatedFrames[frameId][layerIndex] = targetLayer;
  
  // If this was the main layer, assign a new main layer in the group
  if (wasMain) {
    let foundNewMain = false;
    
    // Look for another layer in the same group to make main
    Object.keys(updatedFrames).forEach(fId => {
      if (foundNewMain) return;
      
      updatedFrames[fId].forEach((layer: AnimationLayer, idx: number) => {
        if (foundNewMain) return;
        
        if (layer.linkedLayer && layer.linkedLayer.groupId === groupId) {
          // Make this the new main layer
          layer.linkedLayer.isMain = true;
          updatedFrames[fId][idx] = layer;
          foundNewMain = true;
        }
      });
    });
  }
  
  return updatedFrames;
}

/**
 * Updates the sync mode for a linked layer
 * 
 * @param frames Object mapping frame IDs to arrays of layers
 * @param layerId ID of the layer to update
 * @param syncMode New sync mode to set
 * @returns Updated frames with the layer's sync mode updated
 */
export function setSyncMode(
  frames: Record<string, AnimationLayer[]>,
  layerId: string,
  syncMode: LinkSyncMode
): Record<string, AnimationLayer[]> {
  // Make a deep copy of the frames to avoid mutating the original
  const updatedFrames = JSON.parse(JSON.stringify(frames));
  
  // Find the layer
  let targetLayer: AnimationLayer | null = null;
  let frameId: string | null = null;
  let layerIndex: number = -1;
  
  Object.keys(updatedFrames).forEach(fId => {
    const lIndex = updatedFrames[fId].findIndex(
      (layer: AnimationLayer) => layer.id === layerId
    );
    if (lIndex !== -1) {
      targetLayer = updatedFrames[fId][lIndex] as AnimationLayer;
      frameId = fId;
      layerIndex = lIndex;
    }
  });
  
  // If layer not found or not linked, return unchanged
  if (!targetLayer || !("linkedLayer" in targetLayer) || layerIndex === -1 || !frameId) {
    return frames;
  }
  
  // Type assertion to ensure TypeScript understands this is an AnimationLayer with linkedLayer
  const targetLayerWithLinks = targetLayer as AnimationLayer & { linkedLayer: LinkedLayerInfo };
  
  // Update the sync mode
  targetLayerWithLinks.linkedLayer.syncMode = syncMode;
  
  // Update targetLayer with the changes from targetLayerWithLinks
  targetLayer = targetLayerWithLinks;
  
  // Update the frame with the modified layer
  updatedFrames[frameId][layerIndex] = targetLayer;
  
  return updatedFrames;
}

/**
 * Synchronizes GIF frame layer visibility across different ad sizes by frame number
 * For example, all frame #1 in different ad sizes will have the same layers toggled on/off
 * 
 * @param gifFrames Array of all GIF frames
 * @param sourceFrameId ID of the GIF frame that was modified
 * @param layerId ID of the layer that was toggled
 * @param allLayers Optional map of all layers by frame ID to help with name-based matching
 * @returns Updated GIF frames with synchronized layer visibility
 */
export function syncGifFramesByNumber(
  gifFrames: GifFrame[],
  sourceFrameId: string,
  layerId: string,
  allLayers?: Record<string, AnimationLayer[]>
): GifFrame[] {
  try {
    console.log(`syncGifFramesByNumber - START - Source frame: ${sourceFrameId}, Layer: ${layerId}`);
    
    // Make a deep copy of the frames to avoid mutating the original
    const updatedGifFrames = JSON.parse(JSON.stringify(gifFrames));
    
    // Find the source frame
    const sourceFrame = updatedGifFrames.find((frame: GifFrame) => frame.id === sourceFrameId);
    if (!sourceFrame) {
      console.error("Source GIF frame not found:", sourceFrameId);
      return gifFrames;
    }
    
    // Parse the frame ID to extract adSizeId and frameNumber
    const parsedSourceId = parseGifFrameId(sourceFrameId);
    if (!parsedSourceId.isValid) {
      console.error("Could not parse source frame ID:", sourceFrameId);
      return gifFrames;
    }
    
    // Extract details from the source frame
    const { frameNumber, adSizeId: sourceAdSizeId } = parsedSourceId;
    const sourceAdSize = sourceFrame.adSizeId || sourceAdSizeId;
    
    console.log(`syncGifFramesByNumber - Source frame ${sourceFrameId} has frame number ${frameNumber} and ad size ${sourceAdSize}`);
    
    // Check if the layer is hidden in the source frame
    const isHiddenInSource = sourceFrame.hiddenLayers && sourceFrame.hiddenLayers.includes(layerId);
    console.log(`syncGifFramesByNumber - Source layer ${layerId} is hidden: ${isHiddenInSource}`);
    
    // Find the source layer name if we have all layers data
    let sourceLayerName: string | undefined;
    if (allLayers && allLayers[sourceAdSize]) {
      const sourceLayer = allLayers[sourceAdSize].find(layer => layer.id === layerId);
      if (sourceLayer) {
        sourceLayerName = sourceLayer.name;
        console.log(`syncGifFramesByNumber - Found source layer name: "${sourceLayerName}"`);
      }
    }
    
    // Find all frames with the same frame number across all ad sizes
    const matchingFrames = findFramesWithSameNumber(updatedGifFrames, frameNumber);
    console.log(`syncGifFramesByNumber - Found ${matchingFrames.length} frames with number ${frameNumber}`);
    
    // Process each matching frame
    matchingFrames.forEach(frame => {
      // Skip the source frame itself
      if (frame.id === sourceFrameId) {
        return;
      }
      
      // Get the target frame's ad size
      const parsedTargetId = parseGifFrameId(frame.id);
      if (!parsedTargetId.isValid) return;
      
      const targetAdSize = frame.adSizeId || parsedTargetId.adSizeId;
      
      // Only proceed if we have layer data for name matching
      if (!allLayers || !allLayers[targetAdSize] || !sourceLayerName) return;
      
      // Find the equivalent layer in the target frame by name
      const targetLayer = allLayers[targetAdSize].find(layer => layer.name === sourceLayerName);
      if (!targetLayer) return;
      
      // Initialize hiddenLayers array if it doesn't exist
      if (!frame.hiddenLayers) {
        frame.hiddenLayers = [];
      }
      
      // Check if this layer has an override
      const hasOverride = frame.overrides?.layerVisibility?.[targetLayer.id];
      if (hasOverride) {
        console.log(`Layer ${targetLayer.id} has an override in frame ${frame.id}, skipping sync`);
        return;
      }
      
      // Sync visibility state
      const isHiddenInTarget = frame.hiddenLayers.includes(targetLayer.id);
      if (isHiddenInSource && !isHiddenInTarget) {
        frame.hiddenLayers.push(targetLayer.id);
      } else if (!isHiddenInSource && isHiddenInTarget) {
        frame.hiddenLayers = frame.hiddenLayers.filter(id => id !== targetLayer.id);
      }
      if (!parsedTargetId.isValid) {
        console.warn(`syncGifFramesByNumber - Could not parse target frame ID: ${frame.id}, skipping`);
        return;
      }
      
      const targetAdSize = frame.adSizeId || parsedTargetId.adSizeId;
      console.log(`syncGifFramesByNumber - Processing target frame ${frame.id} with ad size ${targetAdSize}`);
      
      // Translate the source layer ID to the target ad size
      // Use the enhanced version with name-based lookup if available
      const targetLayerId = translateLayerId(
        layerId, 
        sourceAdSize, 
        targetAdSize,
        sourceLayerName,
        allLayers
      );
      
      // Check if this layer has an override in this frame
      // Override format: frame.overrides.layerVisibility[layerId].overridden
      const hasOverride = frame.overrides?.layerVisibility?.[targetLayerId]?.overridden || false;
      
      // Only sync if there's no override
      if (!hasOverride) {
        // Ensure hiddenLayers array is initialized
        if (!frame.hiddenLayers) {
          frame.hiddenLayers = [];
        }
        
        // Get current visibility state
        const isCurrentlyHidden = frame.hiddenLayers.includes(targetLayerId);
        console.log(`syncGifFramesByNumber - Target layer ${targetLayerId} in frame ${frame.id} is currently hidden: ${isCurrentlyHidden}`);
        
        if (isHiddenInSource && !isCurrentlyHidden) {
          // Source is hidden but target is visible - hide the target layer
          frame.hiddenLayers.push(targetLayerId);
          console.log(`syncGifFramesByNumber - Added layer ${targetLayerId} to hidden layers in frame ${frame.id}`);
        } else if (!isHiddenInSource && isCurrentlyHidden) {
          // Source is visible but target is hidden - show the target layer
          frame.hiddenLayers = frame.hiddenLayers.filter(id => id !== targetLayerId);
          console.log(`syncGifFramesByNumber - Removed layer ${targetLayerId} from hidden layers in frame ${frame.id}`);
        } else {
          console.log(`syncGifFramesByNumber - Layer ${targetLayerId} visibility already matches source in frame ${frame.id}`);
        }
        
        // Update the visibleLayerCount if present
        if (typeof frame.visibleLayerCount === 'number') {
          const totalLayers = 5; // Default number of layers
          frame.visibleLayerCount = totalLayers - frame.hiddenLayers.length;
        }
      } else {
        console.log(`syncGifFramesByNumber - Layer ${targetLayerId} has an override in frame ${frame.id} - not syncing`);
      }
    });
    
    console.log(`syncGifFramesByNumber - END - Successfully synced layer visibility across frames`);
    return updatedGifFrames;
  } catch (error) {
    console.error("Error in syncGifFramesByNumber:", error);
    return gifFrames; // Return original frames on error
  }
}