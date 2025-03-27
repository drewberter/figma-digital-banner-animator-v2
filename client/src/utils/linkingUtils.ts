import { v4 as uuidv4 } from 'uuid';
import { AnimationLayer, Animation, LinkSyncMode, LinkedLayerInfo, AnimationFrame, GifFrame } from '../types/animation';

/**
 * Automatically links layers with the same name across different frames
 * 
 * @param frames Object mapping frame IDs to arrays of layers
 * @returns Updated frames with linked layers
 */
export function autoLinkLayers(frames: Record<string, AnimationLayer[]>): Record<string, AnimationLayer[]> {
  // Make a deep copy of the frames to avoid mutating the original
  const updatedFrames = JSON.parse(JSON.stringify(frames));
  
  // Step 1: Collect all layer names across frames
  const layersByName: Record<string, { frameId: string, layer: AnimationLayer }[]> = {};
  
  Object.keys(updatedFrames).forEach(frameId => {
    updatedFrames[frameId].forEach((layer: AnimationLayer) => {
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
  
  return updatedFrames;
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
  
  // If source layer not found or not linked, return unchanged
  if (!sourceLayer || !sourceLayer.linkedLayer) {
    return frames;
  }
  
  const { groupId, syncMode } = sourceLayer.linkedLayer;
  
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
  if (!targetLayer || !targetLayer.linkedLayer || layerIndex === -1 || !frameId) {
    return frames;
  }
  
  // Toggle override status in the linked layer info
  const overrides = targetLayer.linkedLayer.overrides || [];
  const isCurrentlyOverridden = overrides.includes(animationId);
  
  if (isCurrentlyOverridden) {
    // Remove from overrides
    targetLayer.linkedLayer.overrides = overrides.filter((id: string) => id !== animationId);
    
    // Find the animation and update its override status
    const animIndex = targetLayer.animations.findIndex((anim: Animation) => anim.id === animationId);
    if (animIndex !== -1) {
      targetLayer.animations[animIndex].isOverridden = false;
    }
  } else {
    // Add to overrides
    targetLayer.linkedLayer.overrides.push(animationId);
    
    // Find the animation and update its override status
    const animIndex = targetLayer.animations.findIndex((anim: Animation) => anim.id === animationId);
    if (animIndex !== -1) {
      targetLayer.animations[animIndex].isOverridden = true;
    }
  }
  
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
  if (!targetLayer || !targetLayer.linkedLayer || layerIndex === -1 || !frameId) {
    return frames;
  }
  
  // Get the group ID before unlinking
  const groupId = targetLayer.linkedLayer.groupId;
  const wasMain = targetLayer.linkedLayer.isMain;
  
  // Remove the linked layer info
  delete targetLayer.linkedLayer;
  
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
  if (!targetLayer || !targetLayer.linkedLayer || layerIndex === -1 || !frameId) {
    return frames;
  }
  
  // Update the sync mode
  targetLayer.linkedLayer.syncMode = syncMode;
  
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
  
  // Extract frame number based on ID format
  if (parts.length >= 4) {
    // If format is gif-frame-frame-X-Y, frameNumber is Y
    // If format is gif-frame-X-Y, frameNumber is Y
    frameNumber = parts[parts.length - 1];
  }
  
  if (!frameNumber) {
    console.error("Could not extract frame number from source frame ID:", sourceFrameId);
    return gifFrames;
  }
  
  console.log(`Syncing GIF frames with frame number ${frameNumber}, layer ${layerId}`);
  
  // Check if the layer is hidden in the source frame
  const isHiddenInSource = sourceFrame.hiddenLayers.includes(layerId);
  
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
      console.log(`Found matching frame: ${frame.id}`);
      
      // Check if this layer has an override in this frame
      const hasOverride = frame.overrides?.layerVisibility?.[layerId]?.overridden || false;
      
      // Only sync if there's no override
      if (!hasOverride) {
        // Get current hidden state
        const isCurrentlyHidden = frame.hiddenLayers.includes(layerId);
        
        if (isHiddenInSource && !isCurrentlyHidden) {
          // Add to hidden layers
          frame.hiddenLayers.push(layerId);
          console.log(`Added layer ${layerId} to hidden layers in frame ${frame.id}`);
        } else if (!isHiddenInSource && isCurrentlyHidden) {
          // Remove from hidden layers
          frame.hiddenLayers = frame.hiddenLayers.filter(id => id !== layerId);
          console.log(`Removed layer ${layerId} from hidden layers in frame ${frame.id}`);
        }
        
        // Update the visibleLayerCount if present
        if (typeof frame.visibleLayerCount === 'number') {
          // Count based on actual hidden layers
          frame.visibleLayerCount = (frame.frameIndex === 0 ? 5 : 5) - frame.hiddenLayers.length;
        }
        
        // Update the frame in the array
        updatedGifFrames[index] = frame;
      } else {
        console.log(`Layer ${layerId} has an override in frame ${frame.id} - not syncing`);
      }
    }
  });
  
  return updatedGifFrames;
}