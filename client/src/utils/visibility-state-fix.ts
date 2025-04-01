/**
 * Visibility State Management Utilities
 * 
 * These functions ensure consistent visibility state across both the hiddenLayers array
 * and the visible property of layers, which helps prevent sync issues.
 */

import { AnimationLayer, GifFrame } from '../types/animation';

/**
 * Helper function to find a layer by ID in a nested structure
 * 
 * @param layers Array of layers to search through
 * @param targetId ID of the layer to find
 * @returns The found layer or null if not found
 */
export function findLayerById(layers: AnimationLayer[], targetId: string): AnimationLayer | null {
  if (!layers || !Array.isArray(layers)) {
    return null;
  }
  
  for (const layer of layers) {
    // Safely check if layer exists and has an id before comparison
    if (layer && layer.id && layer.id === targetId) {
      return layer;
    }
    
    // Check children recursively
    if (layer && layer.children && Array.isArray(layer.children) && layer.children.length > 0) {
      const result = findLayerById(layer.children, targetId);
      if (result) return result;
    }
  }
  
  return null;
}

/**
 * Helper function to ensure consistent visibility state
 * This keeps both the hiddenLayers array and the layer.visible property in sync
 * to avoid inconsistent state that can lead to layer visibility bugs
 * 
 * @param frame The GIF frame to update
 * @param layerId ID of the layer to update
 * @param isVisible Whether the layer should be visible (true) or hidden (false)
 * @param isBackgroundLayer Optional. If true, special background layer handling is applied
 * @returns Updated frame with consistent visibility state
 */
export function setLayerVisibility(
  frame: GifFrame,
  layerId: string,
  isVisible: boolean,
  isBackgroundLayer: boolean = false
): GifFrame {
  // Create a copy to avoid mutation
  const updatedFrame = { ...frame };
  
  // Handle background layers differently - they have inverted visibility logic
  const targetVisibility = isBackgroundLayer ? !isVisible : isVisible;
  
  // Initialize hiddenLayers if it doesn't exist
  if (!updatedFrame.hiddenLayers) {
    updatedFrame.hiddenLayers = [];
  }
  
  // Get current layer reference
  const layerToUpdate = findLayerById(updatedFrame.layers || [], layerId);
  
  // If layer doesn't exist, return unchanged frame
  if (!layerToUpdate) {
    console.warn(`Layer ${layerId} not found in frame ${frame.id}`);
    return updatedFrame;
  }
  
  // Update layer's visible property
  layerToUpdate.visible = targetVisibility;
  
  // Update hiddenLayers array to match
  if (targetVisibility) {
    // Remove from hiddenLayers if it's now visible
    updatedFrame.hiddenLayers = updatedFrame.hiddenLayers.filter(id => id !== layerId);
  } else {
    // Add to hiddenLayers if not already there
    if (!updatedFrame.hiddenLayers.includes(layerId)) {
      updatedFrame.hiddenLayers.push(layerId);
    }
  }
  
  // Update lastUpdated timestamp for tracking changes
  layerToUpdate.lastUpdated = Date.now();
  
  return updatedFrame;
}

/**
 * Toggles the visibility of a layer in a GIF frame
 * 
 * @param frame The GIF frame containing the layer
 * @param layerId ID of the layer to toggle visibility
 * @param isBackgroundLayer Optional. If true, special background layer handling is applied
 * @returns Updated frame with the layer's visibility toggled
 */
export function toggleLayerVisibility(
  frame: GifFrame,
  layerId: string,
  isBackgroundLayer: boolean = false
): GifFrame {
  // First check the current visibility state
  const isCurrentlyVisible = isLayerVisible(frame, layerId, isBackgroundLayer);
  
  // Then set the opposite state
  return setLayerVisibility(frame, layerId, !isCurrentlyVisible, isBackgroundLayer);
}

/**
 * Updates all layers in a frame to ensure their visibility state is consistent
 * between the hiddenLayers array and the visible property
 * 
 * @param frame The GIF frame to normalize
 * @param backgroundLayerIds Optional array of layer IDs that should be treated as background layers
 * @returns Updated frame with consistent visibility state
 */
export function normalizeLayerVisibility(
  frame: GifFrame, 
  backgroundLayerIds: string[] = []
): GifFrame {
  // Create a copy to avoid mutation
  const updatedFrame = { ...frame };
  
  // Ensure hiddenLayers exists
  if (!updatedFrame.hiddenLayers) {
    updatedFrame.hiddenLayers = [];
  }
  
  // Helper to process layers recursively
  const normalizeLayer = (layer: AnimationLayer): AnimationLayer => {
    if (!layer) return layer;
    
    const isBackgroundLayer = backgroundLayerIds.includes(layer.id);
    const shouldBeHidden = updatedFrame.hiddenLayers?.includes(layer.id) || false;
    
    // Apply visibility rule, accounting for background layer special handling
    if (isBackgroundLayer) {
      // Background layers have inverted logic
      layer.visible = shouldBeHidden;
    } else {
      // Normal layers have direct logic
      layer.visible = !shouldBeHidden;
    }
    
    // Process children recursively
    if (layer.children && Array.isArray(layer.children) && layer.children.length > 0) {
      layer.children = layer.children.map(normalizeLayer);
    }
    
    return layer;
  };
  
  // Apply normalization to all layers
  if (updatedFrame.layers && Array.isArray(updatedFrame.layers)) {
    updatedFrame.layers = updatedFrame.layers.map(normalizeLayer);
  }
  
  return updatedFrame;
}

/**
 * Helper function to check if a layer is visible in a frame
 * Checks both the hiddenLayers array and the visible property
 * 
 * @param frame The GIF frame containing the layer
 * @param layerId ID of the layer to check
 * @param isBackgroundLayer Optional. If true, applies special background layer visibility logic
 * @returns true if the layer is visible, false if hidden
 */
export function isLayerVisible(
  frame: GifFrame, 
  layerId: string,
  isBackgroundLayer: boolean = false
): boolean {
  // Find the layer
  const layer = findLayerById(frame.layers || [], layerId);
  if (!layer) return false;
  
  // Check if it's in the hiddenLayers array
  const isInHiddenLayers = (frame.hiddenLayers || []).includes(layerId);
  
  // Apply special logic for background layers
  if (isBackgroundLayer) {
    // Background layers have inverted visibility logic
    return isInHiddenLayers;
  } else {
    // Normal layers - visible if not in hiddenLayers
    return !isInHiddenLayers;
  }
}

/**
 * Utility function to detect if a layer is likely a background layer
 * based on its name and position in the hierarchy
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