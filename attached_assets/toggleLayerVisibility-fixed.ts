/**
 * Replace the existing toggleLayerVisibility method with this version
 * that uses our new ensureConsistentVisibility helper function
 */

/**
 * Main function to toggle layer visibility with consistency guarantees
 */
export function toggleLayerVisibility(
  frame: GifFrame, 
  layerId: string,
  syncAcrossFrames: boolean = true,
  frames: GifFrame[] = []
): GifFrame | GifFrame[] {
  // Find the layer to determine its current state
  const layer = findLayerById(frame.layers || [], layerId);
  if (!layer) {
    console.error(`[toggleLayerVisibility] Layer ${layerId} not found in frame ${frame.id}`);
    return frame;
  }
  
  // Determine current visibility and invert it
  const isCurrentlyVisible = frame.hiddenLayers ? !frame.hiddenLayers.includes(layerId) : true;
  const makeVisible = !isCurrentlyVisible;
  
  console.log(`[toggleLayerVisibility] Toggling ${layer.name} (${layerId}) to ${makeVisible ? 'visible' : 'hidden'}`);
  
  // Check if this is likely a background layer
  const bgPatterns = ['background', 'bg', 'backdrop', 'back layer', 'bkgd', 'background layer'];
  const isBackgroundLayer = layer.name ? bgPatterns.some(pattern => 
    layer.name.toLowerCase().includes(pattern)
  ) : false;
  
  if (isBackgroundLayer) {
    console.log(`[toggleLayerVisibility] Background layer detected: ${layer.name}. Special handling enabled.`);
  }
  
  // If syncing across frames is requested, use the full sync function
  if (syncAcrossFrames && frames.length > 0) {
    console.log(`[toggleLayerVisibility] Syncing visibility across frames`);
    return syncLayersByNameConsistent(layerId, frame.id, frames, makeVisible);
  }
  
  // Otherwise just update this single frame
  console.log(`[toggleLayerVisibility] Updating only this frame (${frame.id})`);
  return ensureConsistentVisibility(frame, layerId, makeVisible, isBackgroundLayer);
}