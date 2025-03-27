import { v4 as uuidv4 } from 'uuid';
import { AnimationLayer, Animation, LinkSyncMode, LinkedLayerInfo, AnimationFrame, GifFrame } from '../types/animation';

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
 * @returns Updated GIF frames with synchronized layer visibility
 */
export function syncGifFramesByNumber(
  gifFrames: GifFrame[],
  sourceFrameId: string,
  layerId: string
): GifFrame[] {
  try {
    console.log(`syncGifFramesByNumber - START - Source frame: ${sourceFrameId}, Layer: ${layerId}`);
    
    // Make a deep copy of the frames to avoid mutating the original
    const updatedGifFrames = JSON.parse(JSON.stringify(gifFrames));
    
    // Find the source frame and its frame number
    const sourceFrame = updatedGifFrames.find((frame: GifFrame) => frame.id === sourceFrameId);
    if (!sourceFrame) {
      console.error("Source GIF frame not found:", sourceFrameId);
      return gifFrames;
    }
    
    // Extract the frame number from the source frame ID
    // GIF frame IDs follow format: gif-frame-[adSizeId]-[frameNumber]
    const parts = sourceFrameId.split('-');
    let frameNumber: string | null = null;
    
    // Extract frame number based on ID format - use the last segment after splitting by dashes
    frameNumber = parts[parts.length - 1];
    
    if (!frameNumber) {
      console.error("Could not extract frame number from source frame ID:", sourceFrameId);
      return gifFrames;
    }
    
    // Validate the source frame has an adSizeId
    if (!sourceFrame.adSizeId) {
      console.error("Source frame is missing adSizeId:", sourceFrameId);
      return gifFrames;
    }
    
    // Get the layer name from the layerId - this is needed for layer linking by name
    // Most layer IDs follow the pattern like "layer-1-1" where the layer name is after "layer-"
    const layerName = layerId.split('-').slice(1).join('-'); 
    console.log(`syncGifFramesByNumber - Syncing frames with number ${frameNumber}, layer ${layerId}, layerName: ${layerName}`);
    
    // Check if the layer is hidden in the source frame
    const isHiddenInSource = sourceFrame.hiddenLayers && sourceFrame.hiddenLayers.includes(layerId);
    console.log(`syncGifFramesByNumber - Layer ${layerId} is hidden in source frame: ${isHiddenInSource}`);
    
    // Find frames with the same number across all ad sizes
    updatedGifFrames.forEach((frame: GifFrame, index: number) => {
      // Skip the source frame
      if (frame.id === sourceFrameId) {
        return;
      }
      
      // Check if this frame has the same frame number
      const frameParts = frame.id.split('-');
      const currentFrameNumber = frameParts[frameParts.length - 1];
      
      if (currentFrameNumber === frameNumber) {
        console.log(`syncGifFramesByNumber - Found matching frame: ${frame.id}`);
        
        // Compute the ad size ID from the frame ID
        let adSizeId = 'frame-1'; // Default fallback
        
        if (frameParts.length >= 4) {
          if (frameParts[2] === 'frame') {
            // Format is gif-frame-frame-X-Y, so adSizeId is "frame-X"
            adSizeId = `${frameParts[2]}-${frameParts[3]}`;
          } else {
            // Format is gif-frame-X-Y, determine if X is a frame number or part of the ad size ID
            adSizeId = frameParts[2].startsWith('frame') ? frameParts[2] : `frame-${frameParts[2]}`;
          }
        }
        
        // Try to find a layer with the same name in this frame's ad size
        // We need to find the correct layer ID for this frame's ad size, since layer IDs can differ across ad sizes
        // The layer ID follows pattern: "layer-[adSizeId]-[layerName]"
        
        // Get the source ad size from the source frame
        const sourceAdSizeId = sourceFrame.adSizeId;
        const targetAdSizeId = frame.adSizeId;
        
        // We need to convert from layer-[sourceAdSizeId]-[layerName] to layer-[targetAdSizeId]-[layerName]
        // Extract the layer ID components - we assume format like "layer-frame-1-layerName"
        const layerIdParts = layerId.split('-');
        
        // Correct layer ID based on target ad size
        let targetLayerId = layerId; // Default to same ID
        
        if (layerIdParts.length >= 3 && targetAdSizeId !== sourceAdSizeId) {
          // Try to generate the correct layer ID for this frame's ad size 
          // Assemble pattern: "layer-[adSizeId]-[rest of name]"
          // First get the target ad size parts
          const targetAdSizeParts = targetAdSizeId.split('-');
          
          if (targetAdSizeParts.length === 2) { // Most common case: "frame-X"
            // Extract the layer name part (everything after the ad size parts in the source)
            // For example, if layerId is "layer-frame-1-header" and targetAdSizeId is "frame-2",
            // we want to construct "layer-frame-2-header"
            
            // Rebuild: "layer" + targetAdSizeId + rest
            const layerNamePart = layerIdParts.slice(3).join('-');
            targetLayerId = `layer-${targetAdSizeId}-${layerNamePart}`;
            
            console.log(`syncGifFramesByNumber - Adjusted layer ID for frame ${frame.id}: ${layerId} -> ${targetLayerId}`);
          }
        }
        
        // Check if this layer has an override in this frame
        const hasOverride = frame.overrides?.layerVisibility?.[targetLayerId]?.overridden || false;
        
        console.log(`syncGifFramesByNumber - Frame ${frame.id} - Layer ${targetLayerId} has override: ${hasOverride}`);
        
        // Only sync if there's no override
        if (!hasOverride) {
          // Ensure hiddenLayers is initialized
          if (!frame.hiddenLayers) {
            frame.hiddenLayers = [];
          }
          
          // Get current hidden state
          const isCurrentlyHidden = frame.hiddenLayers.includes(targetLayerId);
          
          if (isHiddenInSource && !isCurrentlyHidden) {
            // Add to hidden layers
            frame.hiddenLayers.push(targetLayerId);
            console.log(`syncGifFramesByNumber - Added layer ${targetLayerId} to hidden layers in frame ${frame.id}`);
          } else if (!isHiddenInSource && isCurrentlyHidden) {
            // Remove from hidden layers
            frame.hiddenLayers = frame.hiddenLayers.filter(id => id !== targetLayerId);
            console.log(`syncGifFramesByNumber - Removed layer ${targetLayerId} from hidden layers in frame ${frame.id}`);
          }
          
          // Update the visibleLayerCount if present
          if (typeof frame.visibleLayerCount === 'number') {
            // Count based on actual hidden layers
            frame.visibleLayerCount = (frame.frameIndex === 0 ? 5 : 5) - frame.hiddenLayers.length;
          }
          
          // Update the frame in the array
          updatedGifFrames[index] = frame;
        } else {
          console.log(`syncGifFramesByNumber - Layer ${targetLayerId} has an override in frame ${frame.id} - not syncing`);
        }
      } else {
        console.log(`syncGifFramesByNumber - Frame ${frame.id} has number ${currentFrameNumber}, doesn't match ${frameNumber}`);
      }
    });
    
    console.log(`syncGifFramesByNumber - END - Updated ${updatedGifFrames.length} GIF frames`);
    return updatedGifFrames;
  } catch (error) {
    console.error("Error in syncGifFramesByNumber:", error);
    return gifFrames; // Return original frames on error
  }
}