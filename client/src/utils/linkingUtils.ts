import { v4 as uuidv4 } from 'uuid';
import { AnimationLayer, Animation, LinkSyncMode, LinkedLayerInfo, AnimationFrame, GifFrame, TimelineMode } from '../types/animation';
import { syncDebug, syncError, syncInfo, syncWarn, syncSuccess, logLayerMatch, logFrameSyncState, logOverrideBlocked, logSyncIssue } from './syncLogger';
import { mockLayers } from '../mock/animationData';

/**
 * Extracts information from a GIF frame ID
 * Handles different formats like "gif-frame-frame-1-2" or "gif-frame-1-2"
 */
interface ParsedFrameId {
  frameNumber: string;
  adSizeId: string;
  isValid: boolean;
}

/**
 * Creates a consistent GIF frame ID from ad size ID and frame number
 * Uses the newer format: gif-frame-{adSizeId}-{frameNumber}
 */
export function createGifFrameId(adSizeId: string, frameNumber: string): string {
  // Validate inputs
  if (!adSizeId) {
    syncWarn(`Invalid adSizeId: ${adSizeId}`);
    return `gif-frame-frame-1-${frameNumber}`; // Fallback to default
  }
  
  // Strip any existing 'gif-frame-' prefix if it was passed in
  let cleanAdSizeId = adSizeId;
  if (cleanAdSizeId.startsWith('gif-frame-')) {
    const parsed = parseGifFrameId(cleanAdSizeId);
    cleanAdSizeId = parsed.adSizeId;
  }
  
  // Ensure frameNumber is a string
  const frameNumberStr = String(frameNumber);
  
  // Create the ID using the new format
  const frameId = `gif-frame-${cleanAdSizeId}-${frameNumberStr}`;
  
  syncDebug(`Created GIF frame ID: ${frameId} for ad size ${cleanAdSizeId}, frame ${frameNumberStr}`);
  return frameId;
}

/**
 * Parses a GIF frame ID to extract the ad size ID and frame number
 * Handles different formats like "gif-frame-frame-1-2" or "gif-frame-1-2"
 */
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
    // Construct the proper adSizeId by combining all parts except the first two and the last
    // This ensures we get the full adSizeId, including embedded hyphens or numbers
    const adSizeParts = parts.slice(2, parts.length - 1);
    adSizeId = adSizeParts.join('-');
    syncDebug(`Using new format - adSizeId: ${adSizeId}, frameNumber: ${frameNumber}`);
  } else if (parts.length >= 4) {
    // Format: gif-frame-X-Y
    frameNumber = parts[parts.length - 1];
    // For backwards compatibility
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
    
    // Step 1: Collect all layer names across frames (including nested layers)
    const layersByName: Record<string, { frameId: string, layer: AnimationLayer, path: string[] }[]> = {};
    
    // Helper function to recursively process layers and their children
    const processLayer = (
      layer: AnimationLayer, 
      frameId: string, 
      parentPath: string[] = []
    ) => {
      // Skip layers without a name
      if (!layer.name) {
        console.warn(`autoLinkLayers: Layer ${layer.id} in frame ${frameId} is missing a name, skipping`);
        return;
      }
      
      // Calculate the full path to this layer (useful for finding it later)
      const layerPath = [...parentPath, layer.id];
      
      // Register this layer by name
      if (!layersByName[layer.name]) {
        layersByName[layer.name] = [];
      }
      
      layersByName[layer.name].push({ 
        frameId, 
        layer, 
        path: layerPath 
      });
      
      // Process children if this is a container
      if ((layer.isGroup || layer.isFrame || layer.type === 'group' || layer.type === 'frame') && 
          layer.children && Array.isArray(layer.children)) {
        // Process each child layer
        layer.children.forEach(child => {
          processLayer(child, frameId, layerPath);
        });
      }
    };
    
    // Process all frames
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
      
      // Process all top-level layers and their children
      updatedFrames[frameId].forEach((layer: AnimationLayer) => {
        processLayer(layer, frameId);
      });
    });
    
    // Step 2: Create link groups for layers with the same name ONLY across different ad sizes
    Object.keys(layersByName).forEach(layerName => {
      const layers = layersByName[layerName];
      
      // Only process if there are at least 2 layers with the same name
      if (layers.length >= 2) {
        console.log(`autoLinkLayers: Creating link group for ${layerName} with ${layers.length} layers`);
        
        // Extract frame numbers from frame IDs
        const frameInfoMap = new Map<string, { frameNumber: number; adSizeId: string }>();
        
        layers.forEach(item => {
          const frameId = item.frameId;
          
          // Extract frame number from frame ID (e.g., "frame-1" => 1)
          const frameMatch = frameId.match(/frame-(\d+)/);
          if (frameMatch) {
            const frameNumber = parseInt(frameMatch[1], 10);
            
            // Extract ad size ID from frame ID or use default
            // For GIF frames, the format might be "adsize_frame-1"
            const adSizeMatch = frameId.match(/^([^_]+)_frame-/);
            const adSizeId = adSizeMatch ? adSizeMatch[1] : 'default';
            
            frameInfoMap.set(frameId, { frameNumber, adSizeId });
          }
        });
        
        // Group layers by frame number
        const layersByFrameNumber = new Map<number, typeof layers>();
        
        layers.forEach(item => {
          const frameInfo = frameInfoMap.get(item.frameId);
          if (frameInfo) {
            const { frameNumber } = frameInfo;
            
            if (!layersByFrameNumber.has(frameNumber)) {
              layersByFrameNumber.set(frameNumber, []);
            }
            
            layersByFrameNumber.get(frameNumber)!.push(item);
          }
        });
        
        // For each frame number, create a separate link group ONLY linking across different ad sizes
        layersByFrameNumber.forEach((layersInFrame, frameNumber) => {
          // Only create a link group if there are at least 2 layers with the same frame number
          if (layersInFrame.length >= 2) {
            const groupId = uuidv4(); // Generate a unique group ID for this frame number
            
            // Track which ad sizes we've already included in this link group
            const linkedAdSizes = new Set<string>();
            
            // Process each layer in this frame number
            layersInFrame.forEach((item, index) => {
              const frameInfo = frameInfoMap.get(item.frameId);
              if (!frameInfo) return; // Skip if we don't have frame info
              
              const { adSizeId } = frameInfo;
              
              // Skip if this ad size already has a linked layer (prevent intra-ad-size linking)
              if (linkedAdSizes.has(adSizeId)) {
                return;
              }
              
              // Add this ad size to the linked set
              linkedAdSizes.add(adSizeId);
              
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
                overrides: [], // No overrides initially
                frameId: item.frameId // Add frameId to ensure proper linking
              };
              
              // Update the layer with linking info
              item.layer.linkedLayer = linkedLayer;
              
              // Mark the layer as locked to reflect its linked status visually in the UI
              item.layer.locked = true;
              
              console.log(`autoLinkLayers: Linked layer ${item.layer.id} in frame ${item.frameId} and set locked=true`);
              
              // Helper function to find and update a nested layer by path
              const updateLayerByPath = (
                layers: AnimationLayer[], 
                path: string[], 
                updatedLayer: AnimationLayer
              ): boolean => {
                // Base case: path is empty or has only one element
                if (path.length === 0) return false;
                
                if (path.length === 1) {
                  // This is the target layer, update it
                  const layerIndex = layers.findIndex((l: AnimationLayer) => l.id === path[0]);
                  if (layerIndex !== -1) {
                    layers[layerIndex] = updatedLayer;
                    return true;
                  }
                  return false;
                }
                
                // Find the next container in the path
                const nextId = path[0];
                const containerIndex = layers.findIndex((l: AnimationLayer) => l.id === nextId);
                
                if (containerIndex !== -1 && 
                    layers[containerIndex].children && 
                    Array.isArray(layers[containerIndex].children)) {
                  // Recurse into this container with the rest of the path
                  const foundAndUpdated = updateLayerByPath(
                    layers[containerIndex].children!, 
                    path.slice(1), 
                    updatedLayer
                  );
                  
                  return foundAndUpdated;
                }
                
                return false;
              };
              
              // Update the layer in the frame using its path
              if (item.path.length > 1) {
                // This is a nested layer
                const pathCopy = [...item.path];
                const updated = updateLayerByPath(
                  updatedFrames[item.frameId], 
                  pathCopy,
                  item.layer
                );
                
                if (!updated) {
                  console.warn(`autoLinkLayers: Failed to update nested layer ${item.layer.id} in frame ${item.frameId}`);
                }
              } else {
                // Top-level layer, use the simple update approach
                const layerIndex = updatedFrames[item.frameId].findIndex(
                  (l: AnimationLayer) => l.id === item.layer.id
                );
                if (layerIndex !== -1) {
                  updatedFrames[item.frameId][layerIndex] = item.layer;
                }
              }
            });
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
  
  // Helper function to find a layer in a nested structure
  const findLayerInNestedStructure = (
    layers: AnimationLayer[],
    layerId: string
  ): { layer: AnimationLayer; path: string[] } | null => {
    // Helper for recursive search
    const searchInLayers = (
      currentLayers: AnimationLayer[], 
      currentPath: string[] = []
    ): { layer: AnimationLayer; path: string[] } | null => {
      // First check direct children
      for (let i = 0; i < currentLayers.length; i++) {
        const layer = currentLayers[i];
        
        // If this is the target layer, return it with its path
        if (layer.id === layerId) {
          return { 
            layer, 
            path: [...currentPath, layer.id] 
          };
        }
        
        // If this is a container with children, search in it
        if ((layer.isGroup || layer.isFrame || layer.type === 'group' || layer.type === 'frame') && 
            layer.children && Array.isArray(layer.children)) {
          
          // Search in the container's children
          const result = searchInLayers(
            layer.children, 
            [...currentPath, layer.id]
          );
          
          // If found in this container, return the result
          if (result) return result;
        }
      }
      
      // Not found in this level or any children
      return null;
    };
    
    // Start the search from the top level
    return searchInLayers(layers);
  };
  
  // Helper function to update a layer within a nested structure
  const updateLayerInNestedStructure = (
    layers: AnimationLayer[],
    path: string[],
    updatedLayer: AnimationLayer
  ): boolean => {
    // Base case: empty path
    if (path.length === 0) return false;
    
    // If the path has only one element, it's at this level
    if (path.length === 1) {
      const targetIndex = layers.findIndex((l: AnimationLayer) => l.id === path[0]);
      if (targetIndex !== -1) {
        layers[targetIndex] = updatedLayer;
        return true;
      }
      return false;
    }
    
    // Find the container for the next part of the path
    const containerId = path[0];
    const containerIndex = layers.findIndex((l: AnimationLayer) => l.id === containerId);
    
    // If the container exists and has children, recurse into it
    if (containerIndex !== -1 && 
        layers[containerIndex].children && 
        Array.isArray(layers[containerIndex].children)) {
      
      return updateLayerInNestedStructure(
        layers[containerIndex].children!,
        path.slice(1),
        updatedLayer
      );
    }
    
    return false;
  };
  
  // Find the source layer from any frame
  let sourceLayer: AnimationLayer | null = null;
  let sourceFrameId: string | null = null;
  let sourcePath: string[] | null = null;
  
  for (const frameId of Object.keys(updatedFrames)) {
    const result = findLayerInNestedStructure(updatedFrames[frameId], sourceLayerId);
    if (result) {
      sourceLayer = result.layer;
      sourceFrameId = frameId;
      sourcePath = result.path;
      console.log(`Found source layer ${sourceLayerId} in frame ${frameId} at path: ${sourcePath.join(' > ')}`);
      break;
    }
  }
  
  // If source layer not found, return unchanged
  if (!sourceLayer) {
    console.warn(`Source layer ${sourceLayerId} not found in any frame`);
    return frames;
  }
  
  // Check if layer has linkedLayer property
  if (!('linkedLayer' in sourceLayer)) {
    console.warn(`Source layer ${sourceLayerId} is not linked`);
    return frames;
  }
  
  // Type assertion to ensure TypeScript understands this is an AnimationLayer with linkedLayer
  const sourceLayerWithLinks = sourceLayer as AnimationLayer & { linkedLayer: LinkedLayerInfo };
  const { groupId, syncMode } = sourceLayerWithLinks.linkedLayer;
  
  // If independent sync mode, no syncing needed
  if (syncMode === LinkSyncMode.Independent) {
    return frames;
  }
  
  // Find all layers in the same group across all frames
  Object.keys(updatedFrames).forEach(frameId => {
    // Helper function to process layers recursively
    const processLayersRecursively = (layers: AnimationLayer[], path: string[] = []) => {
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        const currentPath = [...path, layer.id];
        
        // Skip the source layer
        if (layer.id === sourceLayerId) {
          continue;
        }
        
        // Check if this layer belongs to the same link group
        if (layer.linkedLayer && layer.linkedLayer.groupId === groupId) {
          console.log(`Found linked layer ${layer.id} in frame ${frameId} at path: ${currentPath.join(' > ')}`);
          
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
            
            // Update the layer in the frame
            if (path.length === 0) {
              // Top-level layer
              layers[i] = layer;
            } else {
              // Nested layer - update it within the structure
              const success = updateLayerInNestedStructure(
                updatedFrames[frameId],
                currentPath,
                layer
              );
              
              if (!success) {
                console.warn(`Failed to update nested layer ${layer.id} in frame ${frameId}`);
              }
            }
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
            
            // Update the layer in the frame
            if (path.length === 0) {
              // Top-level layer
              layers[i] = layer;
            } else {
              // Nested layer - update it within the structure
              const success = updateLayerInNestedStructure(
                updatedFrames[frameId],
                currentPath,
                layer
              );
              
              if (!success) {
                console.warn(`Failed to update nested layer ${layer.id} in frame ${frameId}`);
              }
            }
          }
        }
        
        // If this is a container, process its children
        if ((layer.isGroup || layer.isFrame || layer.type === 'group' || layer.type === 'frame') && 
            layer.children && Array.isArray(layer.children)) {
          processLayersRecursively(layer.children, currentPath);
        }
      }
    };
    
    // Start processing from the top level
    processLayersRecursively(updatedFrames[frameId]);
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
  
  // Helper function to find a layer in a nested structure
  const findLayerInNestedStructure = (
    layers: AnimationLayer[],
    layerId: string
  ): { layer: AnimationLayer; path: string[] } | null => {
    // Helper for recursive search
    const searchInLayers = (
      currentLayers: AnimationLayer[], 
      currentPath: string[] = []
    ): { layer: AnimationLayer; path: string[] } | null => {
      // First check direct children
      for (let i = 0; i < currentLayers.length; i++) {
        const layer = currentLayers[i];
        
        // If this is the target layer, return it with its path
        if (layer.id === layerId) {
          return { 
            layer, 
            path: [...currentPath, layer.id] 
          };
        }
        
        // If this is a container with children, search in it
        if ((layer.isGroup || layer.isFrame || layer.type === 'group' || layer.type === 'frame') && 
            layer.children && Array.isArray(layer.children)) {
          
          // Search in the container's children
          const result = searchInLayers(
            layer.children, 
            [...currentPath, layer.id]
          );
          
          // If found in this container, return the result
          if (result) return result;
        }
      }
      
      // Not found in this level or any children
      return null;
    };
    
    // Start the search from the top level
    return searchInLayers(layers);
  };
  
  // Helper function to update a layer within a nested structure
  const updateLayerInNestedStructure = (
    layers: AnimationLayer[],
    path: string[],
    updatedLayer: AnimationLayer
  ): boolean => {
    // Base case: empty path
    if (path.length === 0) return false;
    
    // If the path has only one element, it's at this level
    if (path.length === 1) {
      const targetIndex = layers.findIndex((l: AnimationLayer) => l.id === path[0]);
      if (targetIndex !== -1) {
        layers[targetIndex] = updatedLayer;
        return true;
      }
      return false;
    }
    
    // Find the container for the next part of the path
    const containerId = path[0];
    const containerIndex = layers.findIndex((l: AnimationLayer) => l.id === containerId);
    
    // If the container exists and has children, recurse into it
    if (containerIndex !== -1 && 
        layers[containerIndex].children && 
        Array.isArray(layers[containerIndex].children)) {
      
      return updateLayerInNestedStructure(
        layers[containerIndex].children!,
        path.slice(1),
        updatedLayer
      );
    }
    
    return false;
  };
  
  // Find the target layer from any frame
  let targetLayer: AnimationLayer | null = null;
  let targetFrameId: string | null = null;
  let targetPath: string[] | null = null;
  
  for (const frameId of Object.keys(updatedFrames)) {
    const result = findLayerInNestedStructure(updatedFrames[frameId], layerId);
    if (result) {
      targetLayer = result.layer;
      targetFrameId = frameId;
      targetPath = result.path;
      console.log(`Found target layer ${layerId} in frame ${frameId} at path: ${targetPath.join(' > ')}`);
      break;
    }
  }
  
  // If layer not found or not linked, return unchanged
  if (!targetLayer || !("linkedLayer" in targetLayer) || !targetFrameId) {
    console.warn(`Target layer ${layerId} not found in any frame or is not linked`);
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
  
  // Update the layer in the frame using its path
  if (targetPath!.length === 1) {
    // Top-level layer
    const layerIndex = updatedFrames[targetFrameId].findIndex((l: AnimationLayer) => l.id === layerId);
    if (layerIndex !== -1) {
      updatedFrames[targetFrameId][layerIndex] = targetLayerWithLinks;
    }
  } else {
    // Nested layer - update it within the structure
    const success = updateLayerInNestedStructure(
      updatedFrames[targetFrameId!],
      targetPath!,
      targetLayerWithLinks
    );
    
    if (!success) {
      console.warn(`Failed to update nested layer ${layerId} in frame ${targetFrameId}`);
    }
  }
  
  return updatedFrames;
}

/**
 * Links a specific layer by its ID with other layers that have the same name
 * 
 * @param frames Object mapping frame IDs to arrays of layers
 * @param layerId ID of the layer to link
 * @returns Updated frames with the layer linked
 */
export function linkLayer(
  frames: Record<string, AnimationLayer[]>,
  layerId: string
): Record<string, AnimationLayer[]> {
  try {
    console.log(`🔗 linkLayer: Starting to link layer ${layerId} with other layers`);
    
    // Make a deep copy of the frames to avoid mutating the original
    const updatedFrames = JSON.parse(JSON.stringify(frames));
    
    // Helper function to find a layer in a nested structure
    const findLayerInNestedStructure = (
      layers: AnimationLayer[],
      layerId: string
    ): { layer: AnimationLayer; path: string[] } | null => {
      // Helper for recursive search
      const searchInLayers = (
        currentLayers: AnimationLayer[], 
        currentPath: string[] = []
      ): { layer: AnimationLayer; path: string[] } | null => {
        // First check direct children
        for (let i = 0; i < currentLayers.length; i++) {
          const layer = currentLayers[i];
          
          // If this is the target layer, return it with its path
          if (layer.id === layerId) {
            return { 
              layer, 
              path: [...currentPath, layer.id] 
            };
          }
          
          // If this is a container with children, search in it
          if ((layer.isGroup || layer.isFrame || layer.type === 'group' || layer.type === 'frame') && 
              layer.children && Array.isArray(layer.children)) {
            
            // Search in the container's children
            const result = searchInLayers(
              layer.children, 
              [...currentPath, layer.id]
            );
            
            // If found in this container, return the result
            if (result) return result;
          }
        }
        
        // Not found in this level or any children
        return null;
      };
      
      // Start the search from the top level
      return searchInLayers(layers);
    };
    
    // Helper function to update a layer within a nested structure
    const updateLayerInNestedStructure = (
      layers: AnimationLayer[],
      path: string[],
      updatedLayer: AnimationLayer
    ): boolean => {
      // Base case: empty path
      if (path.length === 0) return false;
      
      // If the path has only one element, it's at this level
      if (path.length === 1) {
        const targetIndex = layers.findIndex((l: AnimationLayer) => l.id === path[0]);
        if (targetIndex !== -1) {
          layers[targetIndex] = updatedLayer;
          return true;
        }
        return false;
      }
      
      // Find the container for the next part of the path
      const containerId = path[0];
      const containerIndex = layers.findIndex((l: AnimationLayer) => l.id === containerId);
      
      // If the container exists and has children, recurse into it
      if (containerIndex !== -1 && 
          layers[containerIndex].children && 
          Array.isArray(layers[containerIndex].children)) {
        
        return updateLayerInNestedStructure(
          layers[containerIndex].children!,
          path.slice(1),
          updatedLayer
        );
      }
      
      return false;
    };
    
    console.log(`🔗 linkLayer: Working with ${Object.keys(updatedFrames).length} frames`);
    
    // Find the target layer first
    let targetLayer: AnimationLayer | null = null;
    let targetFrameId: string | null = null;
    let targetPath: string[] | null = null;
    
    for (const frameId of Object.keys(updatedFrames)) {
      const result = findLayerInNestedStructure(updatedFrames[frameId], layerId);
      if (result) {
        targetLayer = result.layer;
        targetFrameId = frameId;
        targetPath = result.path;
        console.log(`🔗 linkLayer: Found layer ${layerId} in frame ${frameId} at path: ${targetPath.join(' > ')}`);
        console.log(`🔗 linkLayer: Layer name: "${targetLayer.name || 'Unnamed'}"`);
        break;
      }
    }
    
    // If target layer not found, return unchanged
    if (!targetLayer || !targetFrameId || !targetPath) {
      console.warn(`🔗 linkLayer: Target layer ${layerId} not found in any frame`);
      return frames;
    }
    
    // Helper function to collect all layers with the same name recursively
    const findLayersWithSameName = (
      frameId: string,
      layers: AnimationLayer[],
      targetName: string,
      result: { frameId: string; layer: AnimationLayer; path: string[] }[] = [],
      parentPath: string[] = []
    ) => {
      // Process all layers at this level
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        const currentPath = [...parentPath, layer.id];
        
        // If this layer has the target name, add it
        if (layer.name === targetName) {
          result.push({ 
            frameId,
            layer,
            path: currentPath
          });
          console.log(`🔗 linkLayer: Found layer with matching name "${targetName}" in frame ${frameId} at path: ${currentPath.join(' > ')}`);
        }
        
        // If this is a container, process its children
        if ((layer.isGroup || layer.isFrame || layer.type === 'group' || layer.type === 'frame') && 
            layer.children && Array.isArray(layer.children)) {
          
          findLayersWithSameName(
            frameId,
            layer.children,
            targetName,
            result,
            currentPath
          );
        }
      }
      
      return result;
    };
    
    // Find all layers with the same name in all frames
    const layersToLink: { frameId: string; layer: AnimationLayer; path: string[] }[] = [];
    const layerName = targetLayer.name || 'Unnamed'; // Provide default value
    
    Object.keys(updatedFrames).forEach(frameId => {
      findLayersWithSameName(
        frameId,
        updatedFrames[frameId],
        layerName,
        layersToLink
      );
    });
    
    // If we only have one layer with this name, there's nothing to link
    if (layersToLink.length <= 1) {
      console.warn(`🔗 linkLayer: No other layers with name "${layerName}" found to link with`);
      return frames;
    }
    
    // Create a link group ID
    const groupId = uuidv4();
    console.log(`🔗 linkLayer: Created link group ${groupId} for layers named "${layerName}"`);
    
    // Link all the layers, with the target layer as the main one
    layersToLink.forEach(({ frameId, layer, path }) => {
      // Update the layer's linking information
      const isMain = layer.id === layerId; // The target layer is the main one
      
      // Create linked layer with updated properties
      const updatedLayer = {
        ...layer,
        linkedLayer: {
          isMain,
          syncMode: 'Full' as LinkSyncMode, // Default to full sync
          groupId,
          overrides: [] // No overrides initially
        }
      };
      
      // Update the layer in the frame, handling nested paths correctly
      if (path.length === 1) {
        // Top-level layer
        const layerIndex = updatedFrames[frameId].findIndex((l: AnimationLayer) => l.id === layer.id);
        if (layerIndex !== -1) {
          updatedFrames[frameId][layerIndex] = updatedLayer;
          console.log(`🔗 linkLayer: Updated top-level layer ${layer.id} in frame ${frameId} (isMain: ${isMain})`);
        }
      } else {
        // Nested layer - update it within the structure
        const success = updateLayerInNestedStructure(
          updatedFrames[frameId],
          path,
          updatedLayer
        );
        
        if (success) {
          console.log(`🔗 linkLayer: Updated nested layer ${layer.id} in frame ${frameId} (isMain: ${isMain})`);
        } else {
          console.warn(`🔗 linkLayer: Failed to update nested layer ${layer.id} in frame ${frameId}`);
        }
      }
    });
    
    console.log(`🔗 linkLayer: Successfully linked ${layersToLink.length} layers`);
    return updatedFrames;
  } catch (error) {
    console.error(`🔗 linkLayer ERROR:`, error);
    return frames;
  }
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
    
    // Helper function to find a layer in a nested structure
    const findLayerInNestedStructure = (
      layers: AnimationLayer[],
      layerId: string
    ): { layer: AnimationLayer; path: string[] } | null => {
      // Helper for recursive search
      const searchInLayers = (
        currentLayers: AnimationLayer[], 
        currentPath: string[] = []
      ): { layer: AnimationLayer; path: string[] } | null => {
        // First check direct children
        for (let i = 0; i < currentLayers.length; i++) {
          const layer = currentLayers[i];
          
          // If this is the target layer, return it with its path
          if (layer.id === layerId) {
            return { 
              layer, 
              path: [...currentPath, layer.id] 
            };
          }
          
          // If this is a container with children, search in it
          if ((layer.isGroup || layer.isFrame || layer.type === 'group' || layer.type === 'frame') && 
              layer.children && Array.isArray(layer.children)) {
            
            // Search in the container's children
            const result = searchInLayers(
              layer.children, 
              [...currentPath, layer.id]
            );
            
            // If found in this container, return the result
            if (result) return result;
          }
        }
        
        // Not found in this level or any children
        return null;
      };
      
      // Start the search from the top level
      return searchInLayers(layers);
    };
    
    // Helper function to update a layer within a nested structure
    const updateLayerInNestedStructure = (
      layers: AnimationLayer[],
      path: string[],
      updatedLayer: AnimationLayer
    ): boolean => {
      // Base case: empty path
      if (path.length === 0) return false;
      
      // If the path has only one element, it's at this level
      if (path.length === 1) {
        const targetIndex = layers.findIndex((l: AnimationLayer) => l.id === path[0]);
        if (targetIndex !== -1) {
          layers[targetIndex] = updatedLayer;
          return true;
        }
        return false;
      }
      
      // Find the container for the next part of the path
      const containerId = path[0];
      const containerIndex = layers.findIndex((l: AnimationLayer) => l.id === containerId);
      
      // If the container exists and has children, recurse into it
      if (containerIndex !== -1 && 
          layers[containerIndex].children && 
          Array.isArray(layers[containerIndex].children)) {
        
        return updateLayerInNestedStructure(
          layers[containerIndex].children!,
          path.slice(1),
          updatedLayer
        );
      }
      
      return false;
    };
    
    // Enhanced debugging - log the structure of frames
    console.log(`🔄 unlinkLayer: Working with ${Object.keys(updatedFrames).length} frames`);
    
    // Find the target layer in all frames
    let targetLayer: AnimationLayer | null = null;
    let targetFrameId: string | null = null;
    let targetPath: string[] | null = null;
    
    for (const frameId of Object.keys(updatedFrames)) {
      const result = findLayerInNestedStructure(updatedFrames[frameId], layerId);
      if (result) {
        targetLayer = result.layer;
        targetFrameId = frameId;
        targetPath = result.path;
        console.log(`🔄 unlinkLayer: Found layer ${layerId} in frame ${frameId} at path: ${targetPath.join(' > ')}`);
        break;
      }
    }
    
    // If layer not found, return unchanged
    if (!targetLayer || !targetFrameId || !targetPath) {
      console.warn(`🔄 unlinkLayer: Target layer ${layerId} not found in any frame`);
      return frames;
    }
    
    // Check if layer is linked
    if (!('linkedLayer' in targetLayer)) {
      console.warn(`🔄 unlinkLayer: Layer ${layerId} is not linked (no linkedLayer property)`);
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
    
    // Update the layer in the frame using its path
    if (targetPath.length === 1) {
      // Top-level layer
      const layerIndex = updatedFrames[targetFrameId].findIndex((l: AnimationLayer) => l.id === layerId);
      if (layerIndex !== -1) {
        updatedFrames[targetFrameId][layerIndex] = layerWithoutLink as AnimationLayer;
        console.log(`🔄 unlinkLayer: Updated top-level layer in frame ${targetFrameId}`);
      }
    } else {
      // Nested layer - update it within the structure
      const success = updateLayerInNestedStructure(
        updatedFrames[targetFrameId],
        targetPath,
        layerWithoutLink as AnimationLayer
      );
      
      if (success) {
        console.log(`🔄 unlinkLayer: Updated nested layer in frame ${targetFrameId}`);
      } else {
        console.warn(`🔄 unlinkLayer: Failed to update nested layer in frame ${targetFrameId}`);
      }
    }
    
    // Helper function to find and update linked layers in the same group recursively
    const findAndUpdateLinkedLayers = (
      frameId: string, 
      layers: AnimationLayer[], 
      groupId: string,
      wasMain: boolean,
      parentPath: string[] = []
    ): boolean => {
      let foundNewMain = false;
      
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        const currentPath = [...parentPath, layer.id];
        
        // Skip processing if we've already found a new main
        if (foundNewMain) continue;
        
        // If this layer is in the same link group
        if (layer.linkedLayer && layer.linkedLayer.groupId === groupId) {
          if (wasMain) {
            // Make this the new main layer
            layer.linkedLayer.isMain = true;
            console.log(`🔄 unlinkLayer: Assigned new main layer: ${layer.id} in frame ${frameId}`);
            foundNewMain = true;
          }
          
          // Update this layer in the structure
          if (parentPath.length === 0) {
            // Top-level layer
            updatedFrames[frameId][i] = layer;
          } else {
            // Nested layer
            const success = updateLayerInNestedStructure(
              updatedFrames[frameId],
              currentPath,
              layer
            );
            if (!success) {
              console.warn(`🔄 unlinkLayer: Failed to update linked layer ${layer.id} in frame ${frameId}`);
            }
          }
        }
        
        // If this is a container, process its children
        if (!foundNewMain && 
            (layer.isGroup || layer.isFrame || layer.type === 'group' || layer.type === 'frame') && 
            layer.children && Array.isArray(layer.children)) {
          
          foundNewMain = findAndUpdateLinkedLayers(
            frameId,
            layer.children,
            groupId,
            wasMain,
            currentPath
          );
        }
      }
      
      return foundNewMain;
    };
    
    // If this was the main layer, assign a new main layer in the group
    if (wasMain) {
      console.log(`🔄 unlinkLayer: This was the main layer, looking for a new main layer`);
      let foundNewMain = false;
      
      // Look for another layer in the same group to make main
      for (const frameId of Object.keys(updatedFrames)) {
        if (foundNewMain) break;
        
        foundNewMain = findAndUpdateLinkedLayers(
          frameId,
          updatedFrames[frameId],
          groupId,
          wasMain
        );
      }
      
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
  
  // Helper function to find a layer in a nested structure
  const findLayerInNestedStructure = (
    layers: AnimationLayer[],
    layerId: string
  ): { layer: AnimationLayer; path: string[] } | null => {
    // Helper for recursive search
    const searchInLayers = (
      currentLayers: AnimationLayer[], 
      currentPath: string[] = []
    ): { layer: AnimationLayer; path: string[] } | null => {
      // First check direct children
      for (let i = 0; i < currentLayers.length; i++) {
        const layer = currentLayers[i];
        
        // If this is the target layer, return it with its path
        if (layer.id === layerId) {
          return { 
            layer, 
            path: [...currentPath, layer.id] 
          };
        }
        
        // If this is a container with children, search in it
        if ((layer.isGroup || layer.isFrame || layer.type === 'group' || layer.type === 'frame') && 
            layer.children && Array.isArray(layer.children)) {
          
          // Search in the container's children
          const result = searchInLayers(
            layer.children, 
            [...currentPath, layer.id]
          );
          
          // If found in this container, return the result
          if (result) return result;
        }
      }
      
      // Not found in this level or any children
      return null;
    };
    
    // Start the search from the top level
    return searchInLayers(layers);
  };
  
  // Helper function to update a layer within a nested structure
  const updateLayerInNestedStructure = (
    layers: AnimationLayer[],
    path: string[],
    updatedLayer: AnimationLayer
  ): boolean => {
    // Base case: empty path
    if (path.length === 0) return false;
    
    // If the path has only one element, it's at this level
    if (path.length === 1) {
      const targetIndex = layers.findIndex((l: AnimationLayer) => l.id === path[0]);
      if (targetIndex !== -1) {
        layers[targetIndex] = updatedLayer;
        return true;
      }
      return false;
    }
    
    // Find the container for the next part of the path
    const containerId = path[0];
    const containerIndex = layers.findIndex((l: AnimationLayer) => l.id === containerId);
    
    // If the container exists and has children, recurse into it
    if (containerIndex !== -1 && 
        layers[containerIndex].children && 
        Array.isArray(layers[containerIndex].children)) {
      
      return updateLayerInNestedStructure(
        layers[containerIndex].children!,
        path.slice(1),
        updatedLayer
      );
    }
    
    return false;
  };
  
  // Find the target layer from any frame
  let targetLayer: AnimationLayer | null = null;
  let targetFrameId: string | null = null;
  let targetPath: string[] | null = null;
  
  for (const frameId of Object.keys(updatedFrames)) {
    const result = findLayerInNestedStructure(updatedFrames[frameId], layerId);
    if (result) {
      targetLayer = result.layer;
      targetFrameId = frameId;
      targetPath = result.path;
      console.log(`Found target layer ${layerId} in frame ${frameId} at path: ${targetPath.join(' > ')}`);
      break;
    }
  }
  
  // If layer not found or not linked, return unchanged
  if (!targetLayer || !("linkedLayer" in targetLayer) || !targetFrameId || !targetPath) {
    console.warn(`Target layer ${layerId} not found in any frame or is not linked`);
    return frames;
  }
  
  // Type assertion to ensure TypeScript understands this is an AnimationLayer with linkedLayer
  const targetLayerWithLinks = targetLayer as AnimationLayer & { linkedLayer: LinkedLayerInfo };
  
  // Update the sync mode
  targetLayerWithLinks.linkedLayer.syncMode = syncMode;
  
  // Update the layer in the frame using its path
  if (targetPath.length === 1) {
    // Top-level layer
    const layerIndex = updatedFrames[targetFrameId].findIndex((l: AnimationLayer) => l.id === layerId);
    if (layerIndex !== -1) {
      updatedFrames[targetFrameId][layerIndex] = targetLayerWithLinks;
      console.log(`Updated sync mode for top-level layer ${layerId} to ${syncMode}`);
    }
  } else {
    // Nested layer - update it within the structure
    const success = updateLayerInNestedStructure(
      updatedFrames[targetFrameId],
      targetPath,
      targetLayerWithLinks
    );
    
    if (success) {
      console.log(`Updated sync mode for nested layer ${layerId} to ${syncMode}`);
    } else {
      console.warn(`Failed to update sync mode for nested layer ${layerId} in frame ${targetFrameId}`);
    }
  }
  
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
      sourceIndex = sourceLayers.findIndex((layer: AnimationLayer) => layer.id === layerId);
      
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
      
      // The key fix is here - we directly match source and target visibility states
      // Instead of inverse behavior, we want the same visibility behavior across ad sizes
      if (isHiddenInSource && !isHiddenInTarget) {
        // If source is hidden, target should be hidden too
        frame.hiddenLayers.push(targetLayer.id);
        wasUpdated = true;
        syncDebug(`Visibility change: Hiding layer ${targetLayer.id} (${targetLayer.name}) in frame ${frame.id} to match source`);
      } else if (!isHiddenInSource && isHiddenInTarget) {
        // If source is visible, target should be visible too
        frame.hiddenLayers = frame.hiddenLayers.filter(id => id !== targetLayer.id);
        wasUpdated = true;
        syncDebug(`Visibility change: Showing layer ${targetLayer.id} (${targetLayer.name}) in frame ${frame.id} to match source`);
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

/**
 * Toggles the override status for a layer in a GIF frame
 * When a layer has an override, it won't sync its visibility with other frames
 * 
 * @param gifFrames Array of GIF frames
 * @param frameId ID of the GIF frame containing the layer
 * @param layerId ID of the layer to toggle override for
 * @returns Updated GIF frames with the layer override toggled
 */
export function toggleLayerVisibilityOverride(
  gifFrames: GifFrame[],
  frameId: string,
  layerId: string
): GifFrame[] {
  try {
    // Make a deep copy of the frames to avoid mutating the original
    const updatedGifFrames = JSON.parse(JSON.stringify(gifFrames));
    
    // Find the specific frame
    const frameIndex = updatedGifFrames.findIndex((frame: GifFrame) => frame.id === frameId);
    if (frameIndex === -1) {
      syncError(`Frame not found: ${frameId}`);
      return gifFrames;
    }
    
    const frame = updatedGifFrames[frameIndex];
    
    // Make sure the frame has a layers array
    if (!frame.layers || !Array.isArray(frame.layers)) {
      const { adSizeId } = parseGifFrameId(frameId);
      if (adSizeId && frame.adSizeId) {
        // Initialize layers from the parent ad size if possible
        syncInfo(`Initializing layers array for frame ${frameId} from ad size ${frame.adSizeId}`);
        // This assumes mockLayers has the layers for this ad size
        try {
          frame.layers = JSON.parse(JSON.stringify(mockLayers[frame.adSizeId] || []));
        } catch (err) {
          syncError(`Failed to initialize layers for frame ${frameId}: ${err}`);
        }
      }
    }
    
    // Parse the frame ID to validate it's a GIF frame
    const parsedFrameId = parseGifFrameId(frameId);
    if (!parsedFrameId.isValid) {
      syncError(`Invalid GIF frame ID: ${frameId}`);
      return gifFrames;
    }
    
    // Initialize the overrides object if it doesn't exist
    if (!frame.overrides) {
      frame.overrides = { layerVisibility: {} };
    }
    
    if (!frame.overrides.layerVisibility) {
      frame.overrides.layerVisibility = {};
    }
    
    // Initialize the specific layer override if it doesn't exist
    if (!frame.overrides.layerVisibility[layerId]) {
      frame.overrides.layerVisibility[layerId] = {
        overridden: false
      };
    }
    
    // Toggle the override status
    const currentOverride = frame.overrides.layerVisibility[layerId].overridden;
    frame.overrides.layerVisibility[layerId].overridden = !currentOverride;
    
    // If we're enabling an override, just update the override flag
    if (!currentOverride) {
      // We're enabling the override, log the change
      syncInfo(`Enabled visibility override for layer ${layerId} in frame ${frameId}`);
    } else {
      // We're disabling the override, so we'll sync with other frames
      syncInfo(`Disabled visibility override for layer ${layerId} in frame ${frameId} - will now sync with other frames`);
      
      // Find out what the synced value should be by checking other frames with the same number
      const { frameNumber } = parsedFrameId;
      const matchingFrames = findFramesWithSameNumber(updatedGifFrames, frameNumber)
        .filter(f => f.id !== frameId && (!f.overrides?.layerVisibility?.[layerId]?.overridden));
      
      if (matchingFrames.length > 0) {
        // Find a "truth source" frame to sync from
        const truthFrame = matchingFrames.find(f => f.sourceOfTruth) || matchingFrames[0];
        
        // Get the visibility from the truth frame
        const isHiddenInTruth = truthFrame.hiddenLayers?.includes(layerId) || false;
        
        // Update the visibility in this frame to match the truth source
        // Make sure our update is consistent with our fix in syncGifFramesByNumber
        if (isHiddenInTruth && !frame.hiddenLayers?.includes(layerId)) {
          // Truth source has it hidden, so we should hide it too
          if (!frame.hiddenLayers) frame.hiddenLayers = [];
          frame.hiddenLayers.push(layerId);
          syncDebug(`Synced visibility: Hiding layer ${layerId} in frame ${frameId} to match other frames`);
        } else if (!isHiddenInTruth && frame.hiddenLayers?.includes(layerId)) {
          // Truth source has it visible, so we should show it too
          frame.hiddenLayers = frame.hiddenLayers.filter((id: string) => id !== layerId);
          syncDebug(`Synced visibility: Showing layer ${layerId} in frame ${frameId} to match other frames`);
        }
      }
    }
    
    // After we've made changes to hiddenLayers, make sure the layers array is updated to match
    if (frame.layers && Array.isArray(frame.layers)) {
      // Update each layer's visible property based on the hiddenLayers array
      frame.layers = frame.layers.map((layer: any) => {
        if (layer.id === layerId) {
          // For this specific layer, set visibility based on hiddenLayers
          const isHidden = frame.hiddenLayers?.includes(layerId) || false;
          return {
            ...layer,
            visible: !isHidden // visible is opposite of hidden
          };
        }
        return layer;
      });
      
      syncDebug(`Updated visibility in layer object for layer ${layerId} in frame ${frameId}`);
    } else {
      // Try to get layers from the parent ad size
      const { adSizeId } = parsedFrameId;
      if (adSizeId && mockLayers && mockLayers[adSizeId]) {
        // Initialize layers from the parent ad size
        syncInfo(`Creating new layers array for frame ${frameId} from ad size ${adSizeId}`);
        try {
          // Deep clone the layers from the parent ad size
          const newLayers = JSON.parse(JSON.stringify(mockLayers[adSizeId] || []));
          
          // Update the visibility based on hiddenLayers
          frame.layers = newLayers.map((layer: any) => ({
            ...layer,
            visible: !(frame.hiddenLayers?.includes(layer.id) || false)
          }));
          
          syncDebug(`Created and updated new layers array for frame ${frameId}`);
        } catch (err) {
          syncError(`Failed to create layers for frame ${frameId}: ${err}`);
        }
      } else {
        syncError(`No layers array to update in frame ${frameId} and no parent ad size data available`);
      }
    }
    
    return updatedGifFrames;
  } catch (error) {
    syncError(`Error in toggleLayerVisibilityOverride: ${error}`);
    return gifFrames; // Return original frames on error
  }
}

/**
 * Synchronizes layer visibility between GIF frames with the same frame number
 * This function handles both toggling a layer's visibility and syncing it across frames
 * 
 * @param gifFrames All GIF frames in the project
 * @param frameId ID of the source frame where visibility was toggled
 * @param layerId ID of the layer whose visibility was toggled
 * @param allLayers All layers data for name matching across ad sizes
 * @param timelineMode Current timeline mode (animation or gifFrames)
 * @param respectOverrides Whether to respect override settings (default: true)
 * @returns Updated GIF frames array
 */
export function syncGifFrameLayerVisibility(
  gifFrames: GifFrame[],
  frameId: string,
  layerId: string,
  allLayers?: Record<string, AnimationLayer[]>,
  timelineMode: TimelineMode = 'gifFrames',
  respectOverrides: boolean = true
): GifFrame[] {
  // Log detailed information for debugging
  console.log("[syncGifFrameLayerVisibility] *** START *** ", {
    frameId,
    layerId,
    timelineMode,
    respectOverrides,
    frameCount: gifFrames.length,
    // Important: GIF frame visibility syncing should happen regardless of animation mode
    // We're now explicitly logging that this is independent of timeline mode
  });
  try {
    // We now allow syncing regardless of mode, but log that we're in a different mode
    if (timelineMode !== 'gifFrames') {
      syncDebug(`Not in GIF frames mode, but still processing visibility sync for GIF frames`);
      // Continue processing instead of returning early
    }
    
    // Validate the frame ID is a GIF frame
    if (!frameId.startsWith('gif-frame-')) {
      syncError(`Invalid frame ID format: ${frameId}, expected 'gif-frame-' prefix`);
      return gifFrames;
    }
    
    // Make a deep copy of all frames to avoid mutating the original
    const updatedFrames = JSON.parse(JSON.stringify(gifFrames));
    
    // Use our parser to extract frame information
    const parsedFrameId = parseGifFrameId(frameId);
    if (!parsedFrameId.isValid) {
      syncError(`Invalid GIF frame ID format: ${frameId}`);
      return gifFrames;
    }
    
    const { adSizeId, frameNumber } = parsedFrameId;
    
    // Find the source frame
    const sourceFrameIndex = updatedFrames.findIndex((f: GifFrame) => f.id === frameId);
    if (sourceFrameIndex === -1) {
      syncError(`Source frame not found: ${frameId}`);
      return gifFrames;
    }
    
    const sourceFrame = updatedFrames[sourceFrameIndex];
    
    // Initialize hiddenLayers array if it doesn't exist
    if (!sourceFrame.hiddenLayers) {
      sourceFrame.hiddenLayers = [];
      syncDebug(`Initialized empty hiddenLayers array for source frame: ${frameId}`);
    }
    
    // Find the layer in the frame's layers
    if (!sourceFrame.layers) {
      // This shouldn't normally happen - something is wrong with the frame
      syncError(`Source frame ${frameId} has no layers array`);
      return gifFrames;
    }
    
    // Helper function to find a layer and its path recursively in the layer hierarchy
    const findLayerWithPath = (
      layers: AnimationLayer[], 
      targetId: string, 
      currentPath: string[] = []
    ): { layer: AnimationLayer | null; path: string[]; parent: AnimationLayer | null } => {
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        const layerPath = [...currentPath, layer.id];
        
        // If this is the target layer, return it
        if (layer.id === targetId) {
          return { 
            layer, 
            path: layerPath,
            parent: currentPath.length > 0 ? layers[i-1] || null : null
          };
        }
        
        // If this is a container with children, search in it
        if ((layer.isGroup || layer.isFrame || layer.type === 'group' || layer.type === 'frame') && 
            layer.children && Array.isArray(layer.children)) {
          
          // Search in the container's children
          const result = findLayerWithPath(
            layer.children, 
            targetId,
            layerPath
          );
          
          // If found in this container, return the result with this layer as parent
          if (result.layer) {
            // If no parent set yet, set this layer as parent
            if (!result.parent && result.path.length > 1) {
              result.parent = layer;
            }
            return result;
          }
        }
      }
      
      // Not found in this level or any children
      return { layer: null, path: [], parent: null };
    };
    
    // Find the layer and its parent
    const { layer: sourceLayer, path: sourcePath, parent: parentLayer } = 
      findLayerWithPath(sourceFrame.layers, layerId);
    
    if (!sourceLayer) {
      syncError(`Layer ${layerId} not found in frame ${frameId}`);
      return gifFrames;
    }
    
    // Get current visibility state
    // A layer is hidden if it's in the hiddenLayers array, regardless of its own visible property
    // Initialize hiddenLayers if it doesn't exist to avoid null/undefined errors
    if (!sourceFrame.hiddenLayers) {
      sourceFrame.hiddenLayers = [];
    }
    const isCurrentlyVisible = !sourceFrame.hiddenLayers.includes(layerId);
    
    // Helper function to toggle visibility recursively for a layer and its children
    const updateVisibilityRecursively = (
      layer: AnimationLayer, 
      frame: GifFrame, 
      makeVisible: boolean,
      updateChildren: boolean = true
    ) => {
      if (!layer || !frame) return;
      
      // Ensure hiddenLayers exists
      if (!frame.hiddenLayers) {
        frame.hiddenLayers = [];
      }
      
      // Handle layer visibility
      if (makeVisible) {
        frame.hiddenLayers = frame.hiddenLayers.filter(id => id !== layer.id);
      } else {
        if (!frame.hiddenLayers.includes(layer.id)) {
          frame.hiddenLayers.push(layer.id);
        }
      }
      
      // Handle children recursively
      if (updateChildren && layer.children && Array.isArray(layer.children)) {
        layer.children.forEach(child => {
          updateVisibilityRecursively(child, frame, makeVisible, true);
        });
      }
      
      // Update visibleLayerCount
      const countVisibleLayers = (layers: AnimationLayer[]): number => {
        return layers.reduce((count, l) => {
          const isVisible = !frame.hiddenLayers.includes(l.id);
          const childCount = (l.children && Array.isArray(l.children)) ? 
            countVisibleLayers(l.children) : 0;
          return count + (isVisible ? 1 : 0) + childCount;
        }, 0);
      };
      
      if (frame.layers) {
        frame.visibleLayerCount = countVisibleLayers(frame.layers);
      }ddenLayers array exists
      if (!frame.hiddenLayers) {
        frame.hiddenLayers = [];
      }
      
      if (makeVisible) {
        // Make visible - remove from hiddenLayers
        frame.hiddenLayers = frame.hiddenLayers.filter((id: string) => id !== layer.id);
      } else {
        // Make hidden - add to hiddenLayers if not already there
        if (!frame.hiddenLayers.includes(layer.id)) {
          frame.hiddenLayers.push(layer.id);
        }
      }
      
      // If this is a container with children, process them too
      if (updateChildren && 
          (layer.isGroup || layer.isFrame || layer.type === 'group' || layer.type === 'frame') && 
          layer.children && Array.isArray(layer.children)) {
        
        syncDebug(`Processing ${layer.children.length} children of layer ${layer.name} (${layer.id})`);
        layer.children.forEach(child => {
          // Make sure child has proper parent references
          if (!child.parentId) {
            child.parentId = layer.id;
          }
          updateVisibilityRecursively(child, frame, makeVisible);
        });
      }
    };
    
    // Toggle visibility in source frame
    if (isCurrentlyVisible) {
      // Currently visible -> hide it and its children
      updateVisibilityRecursively(sourceLayer, sourceFrame, false);
      syncDebug(`Hid layer ${layerId} and its children in frame ${frameId}`);
    } else {
      // Currently hidden -> show it
      updateVisibilityRecursively(sourceLayer, sourceFrame, true);
      
      // If it has a parent, make sure all ancestors are visible too
      if (parentLayer) {
        // Ensure all parent containers are visible (traverse up the path)
        const parentPath = sourcePath.slice(0, -1); // All except the last element (which is the layer itself)
        
        const ensureParentsVisible = (
          layers: AnimationLayer[],
          path: string[],
          currentIndex: number = 0
        ) => {
          if (currentIndex >= path.length) return;
          
          const parentId = path[currentIndex];
          const parent = layers.find((l: AnimationLayer) => l.id === parentId);
          
          if (parent) {
            // Make this parent visible
            parent.visible = true;
            
            // Ensure hiddenLayers exists to avoid null/undefined errors
            if (!sourceFrame.hiddenLayers) {
              sourceFrame.hiddenLayers = [];
            }
            
            sourceFrame.hiddenLayers = sourceFrame.hiddenLayers.filter((id: string) => id !== parent.id);
            
            // Continue with its children if there are more path elements
            if (currentIndex < path.length - 1 && parent.children) {
              ensureParentsVisible(parent.children, path, currentIndex + 1);
            }
          }
        };
        
        ensureParentsVisible(sourceFrame.layers, parentPath);
        syncDebug(`Made parent containers visible for layer ${layerId} in frame ${frameId}`);
      }
    }
    
    // Update the source frame with the modified layers
    updatedFrames[sourceFrameIndex] = sourceFrame;
    
    // Get layer name for cross-ad-size syncing (if available)
    const sourceLayerName = sourceLayer.name;
    
    // Check if this frame has an override for this layer
    const hasOverride = sourceFrame.overrides?.layerVisibility?.[layerId]?.overridden;
    
    // If respecting overrides and this layer has an override, don't sync with other frames
    if (respectOverrides && hasOverride) {
      syncDebug(`Layer ${layerId} has override in frame ${frameId}, not syncing with other frames`);
      return updatedFrames;
    }
    
    // Find all other frames with the same frame number but ONLY from DIFFERENT AD SIZES
    // This is the key to proper cross-ad-size linking
    const framesWithSameNumber = updatedFrames.filter((f: GifFrame) => {
      if (f.id === frameId) return false; // Skip the source frame
      
      const parsed = parseGifFrameId(f.id);
      const sourceAdSizeId = parsedFrameId.adSizeId;
      
      // Only match frames with the same frame number that are from DIFFERENT ad sizes
      // This prevents linking within the same ad size
      return parsed.isValid && 
             parsed.frameNumber === frameNumber && 
             parsed.adSizeId !== sourceAdSizeId; // This is the key difference
    });
    
    syncDebug(`Found ${framesWithSameNumber.length} other frames with frame number ${frameNumber} from different ad sizes`);
    
    // For each frame with the same frame number, sync the layer visibility
    framesWithSameNumber.forEach((frame: GifFrame) => {
      // Skip frames with overrides for this layer if we're respecting overrides
      const otherHasOverride = frame.overrides?.layerVisibility?.[layerId]?.overridden;
      if (respectOverrides && otherHasOverride) {
        syncDebug(`Skipping sync for frame ${frame.id} due to override`);
        return;
      }
      
      // Get the target ad size ID
      const parsedTargetId = parseGifFrameId(frame.id);
      if (!parsedTargetId.isValid) {
        syncError(`Invalid target frame ID: ${frame.id}`);
        return;
      }
      
      const targetAdSizeId = parsedTargetId.adSizeId;
      
      // Find the equivalent layer in the target frame
      let targetLayerId = layerId;
      let targetLayer: AnimationLayer | null = null;
      let targetPath: string[] = [];
      
      // STRATEGY 1: Try to find by name if available
      if (sourceLayerName && allLayers && allLayers[targetAdSizeId]) {
        // First try exact match by name at any level in the hierarchy
        // Note: This variable is unused but kept for clarity on the approach
        // It's a placeholder for a possible future implementation
        const targetLayerResult = { layer: null, path: [], parent: null };
          
        const findLayerByNameRecursively = (
          layers: AnimationLayer[],
          name: string,
          currentPath: string[] = []
        ): { layer: AnimationLayer | null; path: string[] } => {
          for (const layer of layers) {
            const layerPath = [...currentPath, layer.id];
            
            if (layer.name === name) {
              return { layer, path: layerPath };
            }
            
            // If this is a container, check its children
            if ((layer.isGroup || layer.isFrame || layer.type === 'group' || layer.type === 'frame') && 
                layer.children && Array.isArray(layer.children)) {
              
              const result = findLayerByNameRecursively(layer.children, name, layerPath);
              if (result.layer) {
                return result;
              }
            }
          }
          
          return { layer: null, path: [] };
        };
        
        // Try to find the layer by name in the target frame
        if (frame.layers) {
          const result = findLayerByNameRecursively(frame.layers, sourceLayerName);
          if (result.layer) {
            targetLayer = result.layer;
            targetLayerId = targetLayer.id;
            targetPath = result.path;
            syncDebug(`Found equivalent layer by name (path search): ${targetLayerId}`);
          }
        }
        
        // If not found by recursive search, try the allLayers lookup
        if (!targetLayer) {
          const targetLayerByName = allLayers[targetAdSizeId].find((l: AnimationLayer) => l.name === sourceLayerName);
          if (targetLayerByName) {
            targetLayerId = targetLayerByName.id;
            // Now try to find this layer in the frame
            if (frame.layers) {
              const result = findLayerWithPath(frame.layers, targetLayerId);
              if (result.layer) {
                targetLayer = result.layer;
                targetPath = result.path;
                syncDebug(`Found equivalent layer by name (allLayers + ID): ${targetLayerId}`);
              }
            }
          }
        }
      }
      
      // STRATEGY 2: If still not found, try direct ID match
      if (!targetLayer && frame.layers) {
        const result = findLayerWithPath(frame.layers, targetLayerId);
        if (result.layer) {
          targetLayer = result.layer;
          targetPath = result.path;
          syncDebug(`Found equivalent layer by direct ID match: ${targetLayerId}`);
        }
      }
      
      // Initialize hiddenLayers array if it doesn't exist
      if (!frame.hiddenLayers) {
        frame.hiddenLayers = [];
      }
      
      // Skip if we couldn't find the target layer
      if (!targetLayer) {
        syncError(`Target layer not found in frame ${frame.id}`);
        return;
      }
      
      // Update visibility to match source frame
      const isHiddenInTarget = frame.hiddenLayers.includes(targetLayerId);
      
      if (!isCurrentlyVisible && !isHiddenInTarget) {
        // If source is hidden and target is visible, hide target and children
        updateVisibilityRecursively(targetLayer, frame, false);
        syncDebug(`Synced: Hiding layer ${targetLayerId} and children in frame ${frame.id}`);
      } else if (isCurrentlyVisible && isHiddenInTarget) {
        // If source is visible and target is hidden, show target
        updateVisibilityRecursively(targetLayer, frame, true);
        
        // Ensure parent containers are visible too (if we have path information)
        if (targetPath.length > 1) {
          const parentPath = targetPath.slice(0, -1);
          
          const ensureParentsVisible = (
            layers: AnimationLayer[],
            path: string[],
            currentIndex: number = 0
          ) => {
            if (currentIndex >= path.length) return;
            
            const parentId = path[currentIndex];
            const parent = layers.find((l: AnimationLayer) => l.id === parentId);
            
            if (parent) {
              // Make this parent visible
              parent.visible = true;
              
              // Ensure hiddenLayers array exists to avoid null/undefined errors
              if (!frame.hiddenLayers) {
                frame.hiddenLayers = [];
              }
              
              frame.hiddenLayers = frame.hiddenLayers.filter((id: string) => id !== parent.id);
              
              // Continue with its children if there are more path elements
              if (currentIndex < path.length - 1 && parent.children) {
                ensureParentsVisible(parent.children, path, currentIndex + 1);
              }
            }
          };
          
          ensureParentsVisible(frame.layers, parentPath);
        }
        
        syncDebug(`Synced: Showing layer ${targetLayerId} and making parents visible in frame ${frame.id}`);
      }
      
      // Update frame statistics
      if (frame.layers) {
        const countVisibleLayers = (layers: AnimationLayer[]): number => {
          let count = 0;
          
          // Ensure hiddenLayers exists
          if (!frame.hiddenLayers) {
            frame.hiddenLayers = [];
          }
          
          for (const layer of layers) {
            if (layer.visible !== false && !frame.hiddenLayers.includes(layer.id)) {
              count++;
            }
            // Also count visible children
            if ((layer.isGroup || layer.isFrame || layer.type === 'group' || layer.type === 'frame') && 
                layer.children && Array.isArray(layer.children)) {
              count += countVisibleLayers(layer.children);
            }
          }
          return count;
        };
        
        frame.visibleLayerCount = countVisibleLayers(frame.layers);
      }
    });
    
    syncSuccess(`Successfully synced visibility for layer ${layerId} across all frames with number ${frameNumber}`);
    return updatedFrames;
  } catch (error) {
    syncError(`Error in syncGifFrameLayerVisibility: ${error}`);
    return gifFrames;
  }
}