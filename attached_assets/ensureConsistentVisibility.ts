/**
 * Helper function to ensure consistent visibility state across both
 * the hiddenLayers array and visible property.
 * 
 * This provides a single source of truth for visibility state
 * and ensures the two properties never contradict each other.
 */
export function ensureConsistentVisibility(
  frame: GifFrame,
  layerId: string,
  makeVisible: boolean,
  isBackgroundLayer: boolean = false
): GifFrame {
  // Create a deep copy to avoid mutation
  const updatedFrame = JSON.parse(JSON.stringify(frame));
  
  // Apply special handling for background layers by inverting the visibility
  // This fixes the common issue with background layers needing opposite states
  const actualVisibility = isBackgroundLayer ? !makeVisible : makeVisible;
  
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
        if (layers[i].children && layers[i].children.length > 0) {
          if (updateLayerVisibleProperty(layers[i].children, targetId, visible)) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    // Apply the update to the layer tree
    updateLayerVisibleProperty(updatedFrame.layers, layerId, actualVisibility);
  }
  
  // Return the updated frame with consistent visibility state
  return updatedFrame;
}