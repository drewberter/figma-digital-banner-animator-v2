/**
 * Animation Synchronization Utilities
 * 
 * This file contains utilities for syncing animations between linked layers
 */

import { 
  Animation, 
  AnimationLayer, 
  LinkSyncMode,
  AnimationFrame 
} from '../types/animation';
import { toast } from '../hooks/use-toast';

/**
 * Synchronizes a specific animation between linked layers
 * 
 * @param frameLayersMap Record of frame ID to array of layers in that frame
 * @param sourceLayerId ID of the source layer being updated
 * @param updatedAnimation The animation object that was updated
 * @returns Object mapping frame IDs to updated layer arrays
 */
export function syncLinkedLayerAnimations(
  frameLayersMap: Record<string, AnimationLayer[]>,
  sourceLayerId: string,
  updatedAnimation: Animation
): Record<string, AnimationLayer[]> {
  try {
    console.log(`[AnimationSync] Syncing animation for source layer ${sourceLayerId}`);
    
    // Find source layer first
    const sourceFrame = Object.keys(frameLayersMap).find(frameId => {
      return frameLayersMap[frameId].some(layer => layer.id === sourceLayerId);
    });
    
    if (!sourceFrame) {
      console.warn(`[AnimationSync] Source layer ${sourceLayerId} not found in any frame`);
      return frameLayersMap;
    }
    
    // Find the actual source layer
    const sourceLayer = frameLayersMap[sourceFrame].find(layer => layer.id === sourceLayerId);
    if (!sourceLayer) {
      console.warn(`[AnimationSync] Source layer not found in frame ${sourceFrame}`);
      return frameLayersMap;
    }
    
    // Only proceed if the layer is linked
    if (!sourceLayer.isLinked || !sourceLayer.linkedLayer) {
      console.log(`[AnimationSync] Source layer is not linked, no sync needed`);
      return frameLayersMap;
    }
    
    // Get the link group ID to find all related layers
    const groupId = sourceLayer.linkedLayer.groupId;
    if (!groupId) {
      console.warn(`[AnimationSync] Source layer has no group ID, cannot sync`);
      return frameLayersMap;
    }
    
    console.log(`[AnimationSync] Found source layer "${sourceLayer.name}" in group ${groupId}`);
    
    // Check if this layer can sync animations (based on its sync mode)
    const syncMode = sourceLayer.linkedLayer.syncMode;
    const canSyncAnimations = syncMode === LinkSyncMode.Full || syncMode === LinkSyncMode.AnimationMode;
    
    if (!canSyncAnimations) {
      console.log(`[AnimationSync] Layer has sync mode ${syncMode}, not syncing animations`);
      return frameLayersMap;
    }
    
    // Find all linked layers in all frames with the same group ID
    const result: Record<string, AnimationLayer[]> = { ...frameLayersMap };
    let syncCount = 0;
    
    // For each frame
    Object.keys(frameLayersMap).forEach(frameId => {
      if (frameId === sourceFrame) return; // Skip source frame
      
      // Get all layers in the frame
      const frameLayers = [...frameLayersMap[frameId]];
      
      // Find layers in the same link group
      let hasUpdates = false;
      
      // Function to process a layer and its children recursively
      const processLayer = (layer: AnimationLayer, index: number, parentArray: AnimationLayer[]) => {
        // Skip the source layer
        if (layer.id === sourceLayerId) return;
        
        // Check if this layer is linked and in the same group
        if (layer.isLinked && 
            layer.linkedLayer && 
            layer.linkedLayer.groupId === groupId) {
          
          // Check if this specific layer can sync animations
          const layerSyncMode = layer.linkedLayer.syncMode;
          const layerCanSync = layerSyncMode === LinkSyncMode.Full || 
                              layerSyncMode === LinkSyncMode.AnimationMode;
          
          // Check for animation override on this specific animation
          const hasOverride = layer.linkedLayer.overrides?.includes(updatedAnimation.id);
          
          if (layerCanSync && !hasOverride) {
            console.log(`[AnimationSync] Syncing animation ${updatedAnimation.id} to layer "${layer.name}" (${layer.id})`);
            
            // Create a copy of the layer's animations
            const currentAnimations = [...(layer.animations || [])];
            
            // Find the target animation by ID
            const animIndex = currentAnimations.findIndex(anim => anim.id === updatedAnimation.id);
            
            if (animIndex === -1) {
              // Animation doesn't exist yet, add it
              currentAnimations.push({ ...updatedAnimation });
            } else {
              // Update existing animation
              currentAnimations[animIndex] = { ...updatedAnimation };
            }
            
            // Update the layer with the new animations
            const updatedLayer = {
              ...layer,
              animations: currentAnimations,
              lastUpdated: Date.now() // Force React to see this as a change
            };
            
            // Replace the layer in the array
            parentArray[index] = updatedLayer;
            hasUpdates = true;
            syncCount++;
          } else {
            console.log(`[AnimationSync] Layer "${layer.name}" has override or incompatible sync mode, skipping`);
          }
        }
        
        // Process children recursively if they exist
        if (layer.children && layer.children.length > 0) {
          layer.children.forEach((child, childIndex) => {
            processLayer(child, childIndex, layer.children!);
          });
        }
      };
      
      // Process all layers in the frame
      frameLayers.forEach((layer, index) => {
        processLayer(layer, index, frameLayers);
      });
      
      // Save the updated frame layers
      if (hasUpdates) {
        result[frameId] = frameLayers;
      }
    });
    
    // Show a toast notification about the sync
    if (syncCount > 0) {
      toast({
        title: "Animation Sync",
        description: `Synced animation to ${syncCount} linked layers`,
        variant: "default",
        duration: 2000
      });
    }
    
    console.log(`[AnimationSync] Completed animation sync, updated ${syncCount} layers`);
    return result;
  } catch (error) {
    console.error('[AnimationSync] Error syncing animations:', error);
    
    // Show an error toast
    toast({
      title: "Animation Sync Error",
      description: error instanceof Error ? error.message : "Unknown error",
      variant: "destructive",
      duration: 3000
    });
    
    // Return the original data unchanged
    return frameLayersMap;
  }
}

/**
 * Toggles animation override for a specific animation on a layer
 *
 * @param frameLayersMap Record of frame ID to array of layers in that frame
 * @param layerId ID of the layer to toggle override on
 * @param animationId ID of the animation to toggle override for
 * @returns Object mapping frame IDs to updated layer arrays
 */
export function setAnimationOverride(
  frameLayersMap: Record<string, AnimationLayer[]>,
  layerId: string,
  animationId: string
): Record<string, AnimationLayer[]> {
  try {
    console.log(`[AnimationSync] Setting animation override for layer ${layerId}, animation ${animationId}`);
    
    // Find source layer first
    const sourceFrame = Object.keys(frameLayersMap).find(frameId => {
      return frameLayersMap[frameId].some(layer => layer.id === layerId);
    });
    
    if (!sourceFrame) {
      console.warn(`[AnimationSync] Source layer ${layerId} not found in any frame`);
      return frameLayersMap;
    }
    
    // Find the actual source layer
    const sourceLayer = frameLayersMap[sourceFrame].find(layer => layer.id === layerId);
    if (!sourceLayer) {
      console.warn(`[AnimationSync] Source layer not found in frame ${sourceFrame}`);
      return frameLayersMap;
    }
    
    // Only proceed if the layer is linked
    if (!sourceLayer.isLinked || !sourceLayer.linkedLayer) {
      console.log(`[AnimationSync] Source layer is not linked, no override needed`);
      return frameLayersMap;
    }
    
    // Create a copy of the result
    const result = { ...frameLayersMap };
    
    // Get the frame that contains this layer
    const frameLayers = [...frameLayersMap[sourceFrame]];
    
    // Find the layer in this frame
    const layerIndex = frameLayers.findIndex(layer => layer.id === layerId);
    if (layerIndex !== -1) {
      // Create a new layer object with updated overrides
      const layer = frameLayers[layerIndex];
      
      // Ensure linkedLayer and overrides exist
      if (!layer.linkedLayer) {
        layer.linkedLayer = {
          id: layer.id,
          layerId: layer.id,
          frameId: sourceFrame,
          name: layer.name || '',
          hasOverride: false,
          groupId: "",
          syncMode: LinkSyncMode.Full,
          isMain: false,
          overrides: []
        };
      }
      
      if (!layer.linkedLayer.overrides) {
        layer.linkedLayer.overrides = [];
      }
      
      // Toggle the override
      const hasOverride = layer.linkedLayer.overrides.includes(animationId);
      
      if (hasOverride) {
        // Remove the override
        layer.linkedLayer.overrides = layer.linkedLayer.overrides.filter(id => id !== animationId);
      } else {
        // Add the override
        layer.linkedLayer.overrides.push(animationId);
      }
      
      // Update the layer
      frameLayers[layerIndex] = {
        ...layer,
        linkedLayer: {
          ...layer.linkedLayer,
          hasOverride: layer.linkedLayer.overrides.length > 0
        }
      };
      
      // Update the frame
      result[sourceFrame] = frameLayers;
      
      console.log(`[AnimationSync] ${hasOverride ? 'Removed' : 'Added'} override for animation ${animationId}`);
    }
    
    return result;
  } catch (error) {
    console.error('[AnimationSync] Error setting animation override:', error);
    return frameLayersMap;
  }
}

/**
 * Synchronizes all animations between linked layers
 * 
 * @param frameLayersMap Record of frame ID to array of layers in that frame
 * @returns Object mapping frame IDs to updated layer arrays
 */
export function syncAllLinkedLayerAnimations(
  frameLayersMap: Record<string, AnimationLayer[]>
): Record<string, AnimationLayer[]> {
  try {
    console.log(`[AnimationSync] Syncing all animations for all linked layers`);
    
    // Keep track of which layers we've processed to avoid circular syncing
    const processedLayers = new Set<string>();
    
    // Start with the original data
    let result = { ...frameLayersMap };
    
    // For each frame
    Object.keys(frameLayersMap).forEach(frameId => {
      const frameLayers = frameLayersMap[frameId];
      
      // Function to process a layer and all its animations
      const processLayerAnimations = (layer: AnimationLayer) => {
        // Skip if already processed
        if (processedLayers.has(layer.id)) return;
        
        // Only process linked layers
        if (layer.isLinked && layer.linkedLayer && layer.animations && layer.animations.length > 0) {
          // Process each animation
          layer.animations.forEach(animation => {
            // Sync this animation to all linked layers
            result = syncLinkedLayerAnimations(result, layer.id, animation);
          });
          
          // Mark as processed
          processedLayers.add(layer.id);
        }
        
        // Process children recursively
        if (layer.children && layer.children.length > 0) {
          layer.children.forEach(processLayerAnimations);
        }
      };
      
      // Process all layers in the frame
      frameLayers.forEach(processLayerAnimations);
    });
    
    return result;
  } catch (error) {
    console.error('[AnimationSync] Error syncing all animations:', error);
    return frameLayersMap;
  }
}