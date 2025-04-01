/**
 * Link Sync Manager - Orchestrates syncing link operations between registry and application state
 * 
 * This module connects the central LinkRegistry with the application state,
 * ensuring that changes to links are properly reflected in the UI and state.
 */

import { AnimationLayer, GifFrame, AnimationFrame, TimelineMode } from '../types/animation';
import { linkRegistry } from './linkRegistry';
import { isLayerLinked, findLayerById, findLayersByName } from './safeLayerOperations';
import { RegistryMode } from './linkRegistryInterfaces';

/**
 * Logging utility for debugging
 * @param message Debug message 
 * @param data Optional data to log
 */
export function debugLog(message: string, data?: any): void {
  console.log(`[LayerSync][DEBUG] ${message}`, data || "");
}

/**
 * Logging utility for errors
 * @param message Error message
 * @param error Optional error object
 */
export function errorLog(message: string, error?: any): void {
  console.error(`[LayerSync][ERROR] ${message}`, error || "");
}

/**
 * Initializes the link manager with frames data
 * 
 * @param framesByAdSize Map of ad size IDs to their frames
 * @param timelineMode Current timeline mode (animation or gifFrames)
 */
export function initializeLinkManager(
  framesByAdSize: Record<string, AnimationFrame[] | GifFrame[]>,
  timelineMode: TimelineMode
): void {
  // Auto-link layers with the same name across ad sizes
  console.log('[LinkSyncManager][initializeLinkManager] Auto-linking layers with the same name, mode:', timelineMode);
  
  // Convert timelineMode to the registry mode format using our utility
  const mode = getRegistryModeFromTimelineMode(timelineMode);
  console.log(`[LinkSyncManager][initializeLinkManager] Registry mode: ${mode}`);
  
  // Log the current state of the registry before auto-linking
  console.log(`[LinkSyncManager][initializeLinkManager] Registry before auto-linking:`, {
    animationMode: {
      linkedLayersCount: Object.keys(linkRegistry.animationMode.linkedLayers).length,
      syncModesCount: Object.keys(linkRegistry.animationMode.syncModes).length
    },
    gifFrameMode: {
      layersByNameCount: Object.keys(linkRegistry.gifFrameMode.layersByName).length,
      framesByNumberCount: Object.keys(linkRegistry.gifFrameMode.framesByNumber).length
    }
  });
  
  // Log the frames we're auto-linking
  console.log(`[LinkSyncManager][initializeLinkManager] Auto-linking frames:`, 
    Object.keys(framesByAdSize).join(', '));
  
  // Run auto-linking through registry
  linkRegistry.autoLinkLayers(framesByAdSize, mode);
  
  // Log the updated state after auto-linking
  console.log(`[LinkSyncManager][initializeLinkManager] Registry after auto-linking:`, {
    animationMode: {
      linkedLayersCount: Object.keys(linkRegistry.animationMode.linkedLayers).length,
      syncModesCount: Object.keys(linkRegistry.animationMode.syncModes).length
    },
    gifFrameMode: {
      layersByNameCount: Object.keys(linkRegistry.gifFrameMode.layersByName).length,
      framesByNumberCount: Object.keys(linkRegistry.gifFrameMode.framesByNumber).length
    }
  });
  
  // Log all linked layers by name in the current mode
  if (mode === 'gif') {
    console.log(`[LinkSyncManager][initializeLinkManager] GIF mode linked layers by name:`, 
      Object.keys(linkRegistry.gifFrameMode.layersByName));
  } else {
    console.log(`[LinkSyncManager][initializeLinkManager] Animation mode linked layers:`, 
      Object.keys(linkRegistry.animationMode.linkedLayers));
  }
}

/**
 * Toggle the linking status of a layer
 * 
 * @param layerId ID of the layer to toggle linking for
 * @param allLayers All layers from all ad sizes
 * @param timelineMode Current timeline mode (animation or gifFrames)
 * @returns Updated layers with toggled link status
 */
export function toggleLayerLink(
  layerId: string,
  allLayers: Record<string, AnimationLayer[]>,
  timelineMode: TimelineMode
): Record<string, AnimationLayer[]> {
  // Convert timelineMode to the registry mode format using our utility
  const mode = getRegistryModeFromTimelineMode(timelineMode);
  
  // Find the target layer
  let targetLayer: AnimationLayer | null = null;
  let targetAdSizeId = '';
  
  for (const [adSizeId, layers] of Object.entries(allLayers)) {
    const foundLayer = findLayerById(layers, layerId);
    if (foundLayer) {
      targetLayer = foundLayer;
      targetAdSizeId = adSizeId;
      break;
    }
  }
  
  if (!targetLayer) {
    console.error(`toggleLayerLink: Layer ${layerId} not found`);
    return allLayers;
  }
  
  // Check if layer is already linked
  const isLinked = isLayerLinked(targetLayer, mode);
  
  // Deep clone the layers to avoid mutation
  const updatedLayers = JSON.parse(JSON.stringify(allLayers));
  
  if (isLinked) {
    // Unlink the layer
    console.log(`Unlinking layer ${layerId} (${targetLayer.name}) in ${mode} mode`);
    
    for (const [adSizeId, layers] of Object.entries(updatedLayers)) {
      // Update all layers to reflect the unlink
      updatedLayers[adSizeId] = linkRegistry.unlinkLayer(layerId, mode, layers as AnimationLayer[]);
    }
  } else {
    // Find all layers with the same name across different ad sizes
    const layersToLink: string[] = [layerId]; // Start with the target layer
    const targetLayerName = targetLayer.name;
    
    // Add all layers with the same name from different ad sizes
    for (const [adSizeId, layers] of Object.entries(allLayers)) {
      if (adSizeId === targetAdSizeId) continue; // Skip the target ad size
      
      const matchingLayers = findLayersByName(layers, targetLayerName);
      if (matchingLayers.length > 0) {
        // Take the first matching layer from each ad size
        layersToLink.push(matchingLayers[0].id);
      }
    }
    
    // Only proceed if we found at least one other layer to link with
    if (layersToLink.length > 1) {
      console.log(`Linking ${layersToLink.length} layers with name "${targetLayerName}" in ${mode} mode`);
      
      // Link the layers and update all ad sizes
      for (const [adSizeId, layers] of Object.entries(updatedLayers)) {
        // Create the link group
        const groupId = linkRegistry.linkLayers(
          targetLayerName, 
          layersToLink,
          mode // Mode (animation or gif)
        );
        // Update layer properties
        updatedLayers[adSizeId] = linkRegistry.syncLayerLinkStates(layers as AnimationLayer[], mode);
      }
    } else {
      console.warn(`No matching layers found to link with ${layerId} (${targetLayerName})`);
    }
  }
  
  return updatedLayers;
}

/**
 * Sync visibility changes to linked layers
 * 
 * @param layerId ID of the layer whose visibility changed
 * @param isVisible New visibility state
 * @param allLayers All layers from all ad sizes
 * @param timelineMode Current timeline mode (animation or gifFrames)
 * @returns Updated layers with synced visibility
 */
export function syncLinkedLayerVisibility(
  layerId: string,
  isVisible: boolean,
  allLayers: Record<string, AnimationLayer[]>,
  timelineMode: TimelineMode
): Record<string, AnimationLayer[]> {
  // Convert timelineMode to the registry mode format using our utility
  const mode = getRegistryModeFromTimelineMode(timelineMode);
  
  // Get all linked layers for this layer
  const linkedLayerIds = linkRegistry.getLinkedLayers(layerId, mode);
  
  // Skip if no linked layers
  if (linkedLayerIds.length === 0) {
    return allLayers;
  }
  
  console.log(`Syncing visibility (${isVisible}) to ${linkedLayerIds.length} linked layers in ${mode} mode`);
  
  // Deep clone the layers to avoid mutation
  const updatedLayers = JSON.parse(JSON.stringify(allLayers));
  
  // Update the visibility of all linked layers
  linkedLayerIds.forEach(linkedId => {
    // Find the layer and update its visibility
    for (const [adSizeId, layers] of Object.entries(updatedLayers)) {
      const layer = findLayerById(layers as AnimationLayer[], linkedId);
      if (layer) {
        layer.visible = isVisible;
        console.log(`Updated visibility of ${linkedId} (${layer.name}) to ${isVisible}`);
      }
    }
  });
  
  return updatedLayers;
}

/**
 * Sync animation changes to linked layers
 * 
 * @param sourceLayerId ID of the layer whose animations changed
 * @param animationId ID of the animation that changed
 * @param updatedAnimation The updated animation data
 * @param allLayers All layers from all ad sizes
 * @returns Updated layers with synced animations
 */
export function syncLinkedLayerAnimation(
  sourceLayerId: string,
  animationId: string,
  updatedAnimation: any,
  allLayers: Record<string, AnimationLayer[]>
): Record<string, AnimationLayer[]> {
  // Only used in animation mode
  const mode = 'animation';
  
  // Get all linked layers for this layer
  const linkedLayerIds = linkRegistry.getLinkedLayers(sourceLayerId, mode);
  
  // Skip if no linked layers
  if (linkedLayerIds.length === 0) {
    return allLayers;
  }
  
  console.log(`Syncing animation ${animationId} to ${linkedLayerIds.length} linked layers`);
  
  // Deep clone the layers to avoid mutation
  const updatedLayers = JSON.parse(JSON.stringify(allLayers));
  
  // Update the animation in all linked layers
  linkedLayerIds.forEach(linkedId => {
    // Find the layer and update its animation
    for (const [adSizeId, layers] of Object.entries(updatedLayers)) {
      const layer = findLayerById(layers as AnimationLayer[], linkedId);
      if (layer) {
        // Find the animation by ID
        const animIndex = layer.animations.findIndex(anim => anim.id === animationId);
        if (animIndex !== -1) {
          // Update the animation
          layer.animations[animIndex] = {
            ...layer.animations[animIndex],
            ...updatedAnimation
          };
          console.log(`Updated animation ${animationId} in layer ${linkedId} (${layer.name})`);
        } else {
          // Animation doesn't exist in this linked layer, add it
          layer.animations.push({
            ...updatedAnimation,
            id: animationId
          });
          console.log(`Added animation ${animationId} to layer ${linkedId} (${layer.name})`);
        }
      }
    }
  });
  
  return updatedLayers;
}

/**
 * Converts between Timeline Mode and the Registry Mode format
 * 
 * @param timelineMode The application's timeline mode
 * @returns The corresponding registry mode
 */
export function getRegistryModeFromTimelineMode(timelineMode: TimelineMode): RegistryMode {
  return timelineMode === 'animation' ? 'animation' : 'gif';
}