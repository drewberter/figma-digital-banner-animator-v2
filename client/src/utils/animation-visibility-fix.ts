/**
 * Animation Visibility State Management Utilities
 * 
 * These utilities help maintain consistent visibility state for animation layers
 * by ensuring proper synchronization between hiddenLayers arrays and visible properties.
 */

import { GifFrame, AnimationLayer } from '../types/animation';

/**
 * Updates the visibility of a layer within a frame, ensuring consistency
 * between hiddenLayers array and visible property
 * 
 * @param frames All frames in the animation
 * @param frameId ID of the frame containing the layer
 * @param layerId ID of the layer to update
 * @param isVisible Whether the layer should be visible
 * @returns Updated frames with consistent visibility state
 */
export function updateLayerVisibilityInFrames(
  frames: GifFrame[],
  frameId: string,
  layerId: string,
  isVisible: boolean
): GifFrame[] {
  if (!frames || frames.length === 0) {
    return frames;
  }

  const updatedFrames = JSON.parse(JSON.stringify(frames)) as GifFrame[];
  const frameIndex = updatedFrames.findIndex((frame: GifFrame) => frame.id === frameId);
  
  if (frameIndex === -1) {
    console.warn(`Frame with ID ${frameId} not found`);
    return frames;
  }
  
  const frame = updatedFrames[frameIndex];
  const layer = findLayerInFrameById(frame, layerId);
  
  if (!layer) {
    console.warn(`Layer with ID ${layerId} not found in frame ${frameId}`);
    return frames;
  }
  
  // Update the layer's visible property
  layer.visible = isVisible;
  
  // Update the hiddenLayers array to maintain consistency
  if (isVisible) {
    // Remove from hiddenLayers if it's there
    const hiddenIndex = frame.hiddenLayers.indexOf(layerId);
    if (hiddenIndex !== -1) {
      frame.hiddenLayers.splice(hiddenIndex, 1);
    }
  } else {
    // Add to hiddenLayers if it's not already there
    if (!frame.hiddenLayers.includes(layerId)) {
      frame.hiddenLayers.push(layerId);
    }
  }
  
  // Update visible layer count
  frame.visibleLayerCount = countVisibleLayers(frame.layers);
  
  return updatedFrames;
}

/**
 * Helper function to find a layer by ID within a frame
 * 
 * @param frame The frame containing the layer
 * @param layerId ID of the layer to find
 * @returns The layer if found, null otherwise
 */
export function findLayerInFrameById(frame: GifFrame, layerId: string): AnimationLayer | null {
  if (!frame || !frame.layers) {
    return null;
  }
  
  const searchLayer = (layers: AnimationLayer[]): AnimationLayer | null => {
    for (const layer of layers) {
      if (layer.id === layerId) {
        return layer;
      }
      
      if (layer.children && layer.children.length > 0) {
        const found = searchLayer(layer.children);
        if (found) {
          return found;
        }
      }
    }
    
    return null;
  };
  
  return searchLayer(frame.layers);
}

/**
 * Normalizes all frames to ensure consistent visibility state
 * 
 * @param frames All frames in the animation
 * @returns Updated frames with consistent visibility state
 */
export function normalizeAllFramesVisibility(frames: GifFrame[]): GifFrame[] {
  if (!frames || frames.length === 0) {
    return frames;
  }
  
  const updatedFrames = JSON.parse(JSON.stringify(frames)) as GifFrame[];
  
  updatedFrames.forEach((frame: GifFrame) => {
    // First, ensure all layers in hiddenLayers have visible=false
    frame.hiddenLayers.forEach(layerId => {
      const layer = findLayerInFrameById(frame, layerId);
      if (layer && layer.visible) {
        layer.visible = false;
      }
    });
    
    // Then, ensure all layers with visible=false are in hiddenLayers
    const checkLayerVisibility = (layers: AnimationLayer[]) => {
      layers.forEach(layer => {
        if (!layer.visible && !frame.hiddenLayers.includes(layer.id)) {
          frame.hiddenLayers.push(layer.id);
        }
        
        if (layer.children && layer.children.length > 0) {
          checkLayerVisibility(layer.children);
        }
      });
    };
    
    checkLayerVisibility(frame.layers);
    
    // Update visible layer count
    frame.visibleLayerCount = countVisibleLayers(frame.layers);
  });
  
  return updatedFrames;
}

/**
 * Counts the number of visible layers in a frame
 * 
 * @param layers Array of layers to count
 * @returns The number of visible layers
 */
function countVisibleLayers(layers: AnimationLayer[]): number {
  let count = 0;
  
  const countLayer = (layer: AnimationLayer) => {
    if (layer.visible) {
      count++;
    }
    
    if (layer.children && layer.children.length > 0) {
      layer.children.forEach(countLayer);
    }
  };
  
  layers.forEach(countLayer);
  
  return count;
}

/**
 * Checks if a layer is visible in a frame
 * 
 * @param frame The frame containing the layer
 * @param layerId ID of the layer to check
 * @returns true if the layer is visible, false otherwise
 */
export function isLayerVisibleInFrame(frame: GifFrame, layerId: string): boolean {
  if (!frame) {
    return false;
  }
  
  // Check if the layer is in hiddenLayers
  if (frame.hiddenLayers.includes(layerId)) {
    return false;
  }
  
  // Check the visible property
  const layer = findLayerInFrameById(frame, layerId);
  return layer ? layer.visible : false;
}

/**
 * Tests consistency between hiddenLayers array and visible property
 * This is a utility function for debugging and testing
 * 
 * @param layers Array of layers to test for consistency
 */
export function testVisibilityConsistency(layers: AnimationLayer[]): void {
  const checkLayer = (layer: AnimationLayer, path: string = ''): void => {
    console.log(`Layer ${layer.name} (${layer.id}) at ${path}: visible=${layer.visible}`);
    
    if (layer.children && layer.children.length > 0) {
      layer.children.forEach((child, index) => {
        checkLayer(child, `${path}/${index}`);
      });
    }
  };
  
  layers.forEach((layer, index) => {
    checkLayer(layer, `${index}`);
  });
}

/**
 * Toggles the visibility of a layer
 * 
 * @param frame The frame containing the layer
 * @param layerId ID of the layer to toggle
 * @param isBackgroundLayer Optional flag for special background layer handling
 * @returns Updated frame with toggled layer visibility
 */
export function toggleLayerVisibility(
  frame: GifFrame,
  layerId: string,
  isBackgroundLayer: boolean = false
): GifFrame {
  if (!frame) {
    return frame;
  }
  
  const updatedFrame = JSON.parse(JSON.stringify(frame)) as GifFrame;
  const layer = findLayerInFrameById(updatedFrame, layerId);
  
  if (!layer) {
    console.warn(`Layer with ID ${layerId} not found in frame ${frame.id}`);
    return frame;
  }
  
  // Toggle visibility
  const newVisibility = !layer.visible;
  layer.visible = newVisibility;
  
  // Update hiddenLayers array to maintain consistency
  const hiddenIndex = updatedFrame.hiddenLayers.indexOf(layerId);
  
  if (newVisibility) {
    // Remove from hiddenLayers if it's there
    if (hiddenIndex !== -1) {
      updatedFrame.hiddenLayers.splice(hiddenIndex, 1);
    }
  } else {
    // Add to hiddenLayers if it's not already there
    if (hiddenIndex === -1) {
      updatedFrame.hiddenLayers.push(layerId);
    }
  }
  
  // Handle special background layer logic if needed
  if (isBackgroundLayer) {
    // For background layers, often we want the opposite behavior for certain operations
    // This can be customized based on project needs
  }
  
  // Update visible layer count
  updatedFrame.visibleLayerCount = countVisibleLayers(updatedFrame.layers);
  
  return updatedFrame;
}