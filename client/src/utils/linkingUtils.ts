import { v4 as uuidv4 } from 'uuid';
import { AnimationLayer, Animation, LinkSyncMode, LinkedLayerInfo, AnimationFrame, GifFrame } from '../types/animation';
import { syncDebug, syncError, syncInfo, syncWarn, syncSuccess, logLayerMatch, logFrameSyncState, logOverrideBlocked, logSyncIssue } from './syncLogger';

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
    syncWarn(`Invalid frame ID format: ${frameId}, expected 'gif-frame-' prefix`);
    return { frameNumber: '', adSizeId: '', isValid: false };
  }
  
  const parts = frameId.split('-');
  syncDebug(`Parsing frame ID ${frameId} with ${parts.length} parts: ${parts.join(', ')}`);
  
  // Different formats to handle:
  // 1. gif-frame-frame-X-Y (new format)
  // 2. gif-frame-X-Y (old format)
  let frameNumber = '';
  let adSizeId = '';
  
  if (parts.length >= 5 && parts[2] === 'frame') {
    // Format: gif-frame-frame-X-Y
    frameNumber = parts[parts.length - 1];
    adSizeId = `${parts[2]}-${parts[3]}`;
    syncDebug(`Using new format - adSizeId: ${adSizeId}, frameNumber: ${frameNumber}`);
  } else if (parts.length >= 4) {
    // Format: gif-frame-X-Y
    frameNumber = parts[parts.length - 1];
    adSizeId = parts[2].startsWith('frame') ? parts[2] : `frame-${parts[2]}`;
    syncDebug(`Using old format - adSizeId: ${adSizeId}, frameNumber: ${frameNumber}`);
  }
  
  const isValid = frameNumber !== '' && adSizeId !== '';
  
  if (isValid) {
    syncDebug(`Frame ID parsed successfully: frame ${frameNumber} of ad size ${adSizeId}`);
  } else {
    syncWarn(`Failed to parse frame ID: ${frameId} - Missing adSizeId or frameNumber`);
  }
  
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
  
  syncDebug(`Translating layer ${layerId} from ${sourceAdSizeId} to ${targetAdSizeId}`);
  
  // STRATEGY 1: If we have the layer name and all layers, find the equivalent layer by name
  // This is the most reliable method for matching layers across different ad sizes
  if (sourceLayerName && allLayers && allLayers[targetAdSizeId]) {
    // Find a layer in the target ad size with the same name
    const targetLayer = allLayers[targetAdSizeId].find(layer => layer.name === sourceLayerName);
    if (targetLayer) {
      logLayerMatch(sourceLayerName, layerId, targetLayer.id, sourceAdSizeId, targetAdSizeId);
      return targetLayer.id;
    } else {
      syncWarn(`No layer with name "${sourceLayerName}" found in ad size ${targetAdSizeId}`);
    }
  } else {
    syncDebug(`No layer name or layer data available, falling back to ID-based translation`);
  }
  
  // STRATEGY 2a: Try to find the layer by role-based nomenclature (Background, Headline, etc.)
  if (allLayers && allLayers[sourceAdSizeId] && allLayers[targetAdSizeId]) {
    const sourceLayer = allLayers[sourceAdSizeId].find(layer => layer.id === layerId);
    if (sourceLayer) {
      // Try to find the layer by its relative position in the layer stack
      const sourceLayerIndex = allLayers[sourceAdSizeId].findIndex(l => l.id === layerId);
      
      // If we found this layer's index and the target ad size has enough layers
      if (sourceLayerIndex !== -1 && sourceLayerIndex < allLayers[targetAdSizeId].length) {
        // Try to match by index first if the layers are in the same order
        const targetLayerByIndex = allLayers[targetAdSizeId][sourceLayerIndex];
        syncDebug(`Found potential match by position: ${targetLayerByIndex.id} (${targetLayerByIndex.name})`);
        
        // Extra sanity check - if names are available, verify they're similar (basic role check)
        if (sourceLayer.name && targetLayerByIndex.name) {
          const sourceRole = sourceLayer.name.split(' ')[0].toLowerCase(); // e.g., "Background" from "Background Layer"
          const targetRole = targetLayerByIndex.name.split(' ')[0].toLowerCase();
          
          if (sourceRole === targetRole) {
            syncSuccess(`Matched layer by position and role: ${sourceRole}`);
            return targetLayerByIndex.id;
          } else {
            syncWarn(`Position match failed role check: ${sourceRole} vs ${targetRole}`);
          }
        } else {
          // If no names to compare, just use position
          syncDebug(`Using position-based match: ${targetLayerByIndex.id}`);
          return targetLayerByIndex.id;
        }
      }
    }
  }
  
  // Parse layer ID - for our specific format "layer-X-Y"
  const layerIdParts = layerId.split('-');
  
  // Check if this is in our standard format
  if (layerIdParts[0] !== 'layer' || layerIdParts.length < 3) {
    syncWarn(`Non-standard layer ID format: ${layerId}, returning original`);
    return layerId; // Return original ID as fallback
  }

  // Extract the source frame number and position
  const sourceFrameNumber = parseInt(layerIdParts[1], 10);
  const layerPosition = layerIdParts[2];
  
  // Extract the target frame number - this should be from the ad size (e.g., "frame-1" -> 1)
  const targetAdSizeParts = targetAdSizeId.split('-');
  const targetFrameNumber = targetAdSizeParts.length > 1 ? parseInt(targetAdSizeParts[1], 10) : NaN;
  
  if (isNaN(sourceFrameNumber) || isNaN(targetFrameNumber)) {
    syncWarn(`Could not parse frame numbers - source: ${sourceFrameNumber}, target: ${targetFrameNumber}`);
    return layerId; // Return original as fallback
  }
  
  // STRATEGY 3: Match by position in the layers array
  // For our specific format "layer-X-Y", we can substitute X with the target frame number
  const targetLayerId = `layer-${targetFrameNumber}-${layerPosition}`;
  
  syncDebug(`ID-based translation: ${layerId} → ${targetLayerId}`);
  
  // If we have access to all layers and the target frame layers, we can verify this mapping
  if (allLayers && allLayers[targetAdSizeId]) {
    // Check if the target layer exists
    const targetLayerExists = allLayers[targetAdSizeId].some(layer => layer.id === targetLayerId);
    if (!targetLayerExists) {
      syncWarn(`Generated target layer ID ${targetLayerId} does not exist in target ad size ${targetAdSizeId} - SYNC MAY FAIL`);
      // We'll still return it as it follows the pattern, but give a stronger warning
    } else {
      syncSuccess(`Verified that layer ${targetLayerId} exists in target ad size ${targetAdSizeId}`);
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
  syncDebug(`Looking for all frames with frame number ${frameNumber}`);
  
  // Make sure we're working with a string for comparison
  const targetFrameNumber = String(frameNumber);
  
  const matches = gifFrames.filter(frame => {
    const parsedId = parseGifFrameId(frame.id);
    const isMatch = parsedId.isValid && parsedId.frameNumber === targetFrameNumber;
    
    if (isMatch) {
      syncDebug(`Found matching frame: ${frame.id} with frame number ${targetFrameNumber}`);
    }
    
    return isMatch;
  });
  
  if (matches.length > 0) {
    syncDebug(`Found ${matches.length} frames with frame number ${targetFrameNumber}`);
    matches.forEach(frame => {
      const parsedId = parseGifFrameId(frame.id);
      syncDebug(`  - Frame ${frame.id} (Ad size: ${parsedId.adSizeId})`);
    });
  } else {
    syncWarn(`No frames found with frame number ${targetFrameNumber}`);
  }
  
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
  try {
    console.log(`🔄 unlinkLayer: Starting to unlink layer ${layerId}`);
    
    // Make a deep copy of the frames to avoid mutating the original
    const updatedFrames = JSON.parse(JSON.stringify(frames));
    
    // Enhanced debugging - log the structure of frames
    console.log(`🔄 unlinkLayer: Working with ${Object.keys(updatedFrames).length} frames`);
    Object.keys(updatedFrames).forEach(fId => {
      console.log(`🔄 unlinkLayer: Frame ${fId} has ${updatedFrames[fId]?.length || 0} layers`);
    });
    
    // Find the layer to unlink
    let targetLayer: AnimationLayer | null = null;
    let frameId: string | null = null;
    let layerIndex: number = -1;
    
    Object.keys(updatedFrames).forEach(fId => {
      if (!updatedFrames[fId]) {
        console.warn(`🔄 unlinkLayer: Frame ${fId} has no layers array`);
        return;
      }
      
      const lIndex = updatedFrames[fId].findIndex(
        (layer: AnimationLayer) => layer.id === layerId
      );
      if (lIndex !== -1) {
        targetLayer = updatedFrames[fId][lIndex] as AnimationLayer;
        frameId = fId;
        layerIndex = lIndex;
        console.log(`🔄 unlinkLayer: Found layer ${layerId} in frame ${fId} at index ${lIndex}`);
      }
    });
    
    // If layer not found or not linked, return unchanged
    if (!targetLayer) {
      console.warn(`🔄 unlinkLayer: Target layer ${layerId} not found in any frame`);
      return frames;
    }
    
    if (!('linkedLayer' in targetLayer)) {
      console.warn(`🔄 unlinkLayer: Layer ${layerId} is not linked (no linkedLayer property)`);
      return frames;
    }
    
    if (layerIndex === -1 || !frameId) {
      console.warn(`🔄 unlinkLayer: Invalid layer index (${layerIndex}) or frameId (${frameId})`);
      return frames;
    }
    
    // Type assertion to ensure TypeScript understands this is an AnimationLayer with linkedLayer
    const targetLayerWithLinks = targetLayer as AnimationLayer & { linkedLayer: LinkedLayerInfo };
    console.log(`🔄 unlinkLayer: Layer details:`, {
      name: targetLayerWithLinks.name,
      isMain: targetLayerWithLinks.linkedLayer.isMain,
      syncMode: targetLayerWithLinks.linkedLayer.syncMode,
      groupId: targetLayerWithLinks.linkedLayer.groupId
    });
    
    // Get the group ID before unlinking
    const groupId = targetLayerWithLinks.linkedLayer.groupId;
    const wasMain = targetLayerWithLinks.linkedLayer.isMain;
    
    // Create a new layer without the linkedLayer property
    // This is better than using delete which can cause TypeScript issues
    const { linkedLayer, ...layerWithoutLink } = targetLayerWithLinks;
    console.log(`🔄 unlinkLayer: Successfully removed linkedLayer property`);
    
    // Update targetLayer with the changes 
    targetLayer = layerWithoutLink as AnimationLayer;
    
    // Update the frame with the modified layer
    updatedFrames[frameId][layerIndex] = targetLayer;
    console.log(`🔄 unlinkLayer: Updated layer in frame ${frameId}`);
    
    // If this was the main layer, assign a new main layer in the group
    if (wasMain) {
      console.log(`🔄 unlinkLayer: This was the main layer, looking for a new main layer`);
      let foundNewMain = false;
      
      // Look for another layer in the same group to make main
      Object.keys(updatedFrames).forEach(fId => {
        if (foundNewMain) return;
        
        if (!updatedFrames[fId]) {
          console.warn(`🔄 unlinkLayer: Frame ${fId} has no layers array during main reassignment`);
          return;
        }
        
        updatedFrames[fId].forEach((layer: AnimationLayer, idx: number) => {
          if (foundNewMain) return;
          
          if (layer.linkedLayer && layer.linkedLayer.groupId === groupId) {
            // Make this the new main layer
            layer.linkedLayer.isMain = true;
            updatedFrames[fId][idx] = layer;
            foundNewMain = true;
            console.log(`🔄 unlinkLayer: Assigned new main layer: ${layer.id} in frame ${fId}`);
          }
        });
      });
      
      if (!foundNewMain) {
        console.warn(`🔄 unlinkLayer: Could not find a new main layer for group ${groupId}`);
      }
    }
    
    console.log(`🔄 unlinkLayer: Successfully unlinked layer ${layerId}`);
    return updatedFrames;
  } catch (error) {
    console.error(`🔄 ERROR in unlinkLayer: `, error);
    // Return original frames on error to prevent data corruption
    return frames;
  }
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
    syncInfo(`Starting layer sync - Source frame: ${sourceFrameId}, Layer ID: ${layerId}`);
    
    // Make a deep copy of the frames to avoid mutating the original
    const updatedGifFrames = JSON.parse(JSON.stringify(gifFrames));
    
    // Find the source frame
    const sourceFrame = updatedGifFrames.find((frame: GifFrame) => frame.id === sourceFrameId);
    if (!sourceFrame) {
      syncError(`Source GIF frame not found: ${sourceFrameId}`);
      return gifFrames;
    }
    
    // Parse the frame ID to extract adSizeId and frameNumber
    const parsedSourceId = parseGifFrameId(sourceFrameId);
    if (!parsedSourceId.isValid) {
      syncError(`Failed to parse source frame ID: ${sourceFrameId}`);
      return gifFrames;
    }
    
    // Extract details from the source frame
    const { frameNumber, adSizeId: sourceAdSizeId } = parsedSourceId;
    const sourceAdSize = sourceFrame.adSizeId || sourceAdSizeId;
    
    syncDebug(`Source frame details:
    - Frame ID: ${sourceFrameId}
    - Frame Number: ${frameNumber}
    - Ad Size: ${sourceAdSize}
    - Layer ID: ${layerId}`);
    
    // Check if the layer is hidden in the source frame
    if (!sourceFrame.hiddenLayers) {
      sourceFrame.hiddenLayers = []; // Initialize if not exists
      syncDebug(`Initialized empty hiddenLayers array for source frame: ${sourceFrameId}`);
    }
    
    const isHiddenInSource = sourceFrame.hiddenLayers.includes(layerId);
    syncDebug(`Source layer ${layerId} visibility status: ${isHiddenInSource ? 'hidden' : 'visible'}`);
    
    // Find the source layer name if we have all layers data
    let sourceLayerName: string | undefined;
    let sourceRole: string | undefined;
    let sourceIndex: number = -1;
    
    if (allLayers && allLayers[sourceAdSize]) {
      const sourceLayers = allLayers[sourceAdSize];
      const sourceLayer = sourceLayers.find(layer => layer.id === layerId);
      sourceIndex = sourceLayers.findIndex(layer => layer.id === layerId);
      
      if (sourceLayer) {
        sourceLayerName = sourceLayer.name;
        if (sourceLayerName) {
          sourceRole = sourceLayerName.split(' ')[0].toLowerCase(); // e.g., "background" from "Background Layer"
        }
        
        syncDebug(`Found source layer details:
        - Name: "${sourceLayerName}"
        - Role: "${sourceRole}"
        - Index in layer stack: ${sourceIndex}
        - Total layers in source ad size: ${sourceLayers.length}`);
      } else {
        syncWarn(`Could not find source layer ${layerId} in ad size ${sourceAdSize} - SYNC WILL LIKELY FAIL`);
      }
    } else {
      syncWarn(`Missing layer data for ad size ${sourceAdSize} - Cannot perform advanced layer matching`);
    }
    
    // Find all frames with the same frame number across all ad sizes
    const matchingFrames = findFramesWithSameNumber(updatedGifFrames, frameNumber);
    
    if (matchingFrames.length === 0) {
      syncWarn(`No matching frames found with frame number ${frameNumber} - SYNC BLOCKED`);
      return gifFrames;
    }
    
    syncDebug(`Found ${matchingFrames.length} frames with number ${frameNumber} for syncing`);
    
    // ---- SYNC DIAGNOSTICS ----
    // Map out all ad sizes and their frames to help with debugging
    const adSizesInSync = new Set<string>();
    matchingFrames.forEach(frame => {
      const parsed = parseGifFrameId(frame.id);
      if (parsed.isValid) {
        adSizesInSync.add(parsed.adSizeId);
      }
    });
    
    syncDebug(`Ad sizes involved in this sync operation: ${Array.from(adSizesInSync).join(', ')}`);
    // -------------------------
    
    // Process each matching frame
    let syncSuccessCount = 0;
    let syncFailCount = 0;
    
    matchingFrames.forEach(frame => {
      // Skip the source frame itself
      if (frame.id === sourceFrameId) {
        return;
      }
      
      // Get the target frame's ad size
      const parsedTargetId = parseGifFrameId(frame.id);
      if (!parsedTargetId.isValid) {
        logSyncIssue(
          sourceFrameId,
          frame.id,
          layerId,
          sourceLayerName || '[unknown]',
          'unknown',
          `Invalid target frame ID format: ${frame.id}`,
          'frame ID parsing'
        );
        syncFailCount++;
        return;
      }
      
      const targetAdSize = frame.adSizeId || parsedTargetId.adSizeId;
      syncDebug(`Processing target frame: ${frame.id} (Ad size: ${targetAdSize})`);
      
      // Initialize hiddenLayers array if it doesn't exist
      if (!frame.hiddenLayers) {
        frame.hiddenLayers = [];
        syncDebug(`Initialized empty hiddenLayers array for target frame: ${frame.id}`);
      }
      
      // ---- ADVANCED LAYER MATCHING LOGIC ----
      let targetLayer: AnimationLayer | undefined;
      let matchMethod = "none";
      
      // STRATEGY 1: Match by layer name (most reliable)
      if (allLayers && allLayers[targetAdSize] && sourceLayerName) {
        targetLayer = allLayers[targetAdSize].find(layer => layer.name === sourceLayerName);
        if (targetLayer) {
          syncDebug(`Found layer match by name: "${sourceLayerName}" → ${targetLayer.id}`);
          matchMethod = "name";
        }
      }
      
      // STRATEGY 2: Match by role (word in name) if available
      if (!targetLayer && allLayers && allLayers[targetAdSize] && sourceRole) {
        targetLayer = allLayers[targetAdSize].find(layer => {
          const targetRole = layer.name?.split(' ')[0].toLowerCase();
          return targetRole === sourceRole;
        });
        
        if (targetLayer) {
          syncDebug(`Found layer match by role: "${sourceRole}" → ${targetLayer.id}`);
          matchMethod = "role";
        }
      }
      
      // STRATEGY 3: Match by position in layer stack
      if (!targetLayer && allLayers && allLayers[targetAdSize] && sourceIndex !== -1) {
        const targetLayers = allLayers[targetAdSize];
        if (sourceIndex < targetLayers.length) {
          targetLayer = targetLayers[sourceIndex];
          syncDebug(`Found layer match by stack position: Index ${sourceIndex} → ${targetLayer.id}`);
          matchMethod = "position";
        }
      }
      
      // STRATEGY 4: Try ID-based mapping as last resort
      if (!targetLayer) {
        const targetLayerId = translateLayerId(
          layerId, 
          sourceAdSize, 
          targetAdSize,
          sourceLayerName,
          allLayers
        );
        
        if (targetLayerId !== layerId) { // If translation succeeded
          if (allLayers && allLayers[targetAdSize]) {
            targetLayer = allLayers[targetAdSize].find(layer => layer.id === targetLayerId);
            if (targetLayer) {
              syncDebug(`Found layer match by ID translation: ${layerId} → ${targetLayerId}`);
              matchMethod = "id-translation";
            }
          }
        }
      }
      
      // If we still couldn't find a target layer, log detailed info and skip
      if (!targetLayer) {
        // Use the specialized sync issue logging function
        logSyncIssue(
          sourceFrameId,
          frame.id,
          layerId,
          sourceLayerName || '[unknown]',
          targetAdSize,
          'Failed to find matching layer after trying all matching methods',
          'name, role, position, and ID translation'
        );
        syncFailCount++;
        return;
      }
      
      syncInfo(`Found matching layer in target ad size: ${targetLayer.id} (${targetLayer.name}) using method: ${matchMethod}`);
      
      // Check if this layer has an override
      const layerHasOverride = frame.overrides?.layerVisibility?.[targetLayer.id];
      if (layerHasOverride) {
        logOverrideBlocked(frame.id, targetLayer.id, targetLayer.name || '');
        syncDebug(`Layer has override - keeping current visibility state`);
        return;
      }
      
      // Sync visibility state
      const isHiddenInTarget = frame.hiddenLayers.includes(targetLayer.id);
      
      let wasUpdated = false;
      if (isHiddenInSource && !isHiddenInTarget) {
        frame.hiddenLayers.push(targetLayer.id);
        wasUpdated = true;
        syncDebug(`Visibility change: Hiding layer ${targetLayer.id} (${targetLayer.name}) in frame ${frame.id}`);
      } else if (!isHiddenInSource && isHiddenInTarget) {
        frame.hiddenLayers = frame.hiddenLayers.filter(id => id !== targetLayer.id);
        wasUpdated = true;
        syncDebug(`Visibility change: Showing layer ${targetLayer.id} (${targetLayer.name}) in frame ${frame.id}`);
      } else {
        syncDebug(`No visibility change needed - layer visibility already matches source`);
      }
      
      // Log the sync result
      logFrameSyncState(
        sourceFrameId,
        frame.id,
        layerId,
        targetLayer.id,
        sourceLayerName || '',
        targetLayer.name || '',
        isHiddenInSource,
        isHiddenInTarget,
        wasUpdated
      );
      
      // Also update visibleLayerCount if needed
      if (wasUpdated) {
        const totalLayers = allLayers && allLayers[targetAdSize] ? allLayers[targetAdSize].length : 0;
        frame.visibleLayerCount = totalLayers - frame.hiddenLayers.length;
        syncSuccessCount++;
      }
    });
    
    syncInfo(`Layer sync complete - Success: ${syncSuccessCount}, Failed: ${syncFailCount}`);
    return updatedGifFrames;
  } catch (error) {
    syncError(`Error in syncGifFramesByNumber: ${error}`);
    return gifFrames; // Return original frames on error
  }
}