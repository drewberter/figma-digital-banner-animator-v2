/**
 * Safe Layer Operations - Type-safe utilities for layer manipulation
 * 
 * This module provides functions for safely manipulating layers while
 * maintaining type safety and proper isolation between Animation Mode
 * and GIF Frame Mode.
 */

import { AnimationLayer, GifFrame, LinkSyncMode } from '../types/animation';
import { parseGifFrameId } from './linkingUtils';

/**
 * Safely determines if a layer is linked, handling both Animation and GIF modes
 * 
 * @param layer The layer to check
 * @param mode 'animation' for Animation mode, 'gif' for GIF Frame mode
 * @returns Boolean indicating if the layer is linked in the specified mode
 */
export function isLayerLinked(layer: AnimationLayer, mode: 'animation' | 'gif'): boolean {
  if (!layer) return false;
  
  // First check the explicit isLinked flag - this is the most reliable indicator
  // and should be kept in sync with the linkedLayer property
  if (layer.isLinked === true) {
    // Additional check to ensure mode consistency
    if (layer.linkedLayer && layer.linkedLayer.groupId) {
      const isGifGroupId = layer.linkedLayer.groupId.startsWith('gif-link-');
      // Make sure the mode matches the group ID format
      if ((mode === 'gif' && isGifGroupId) || (mode === 'animation' && !isGifGroupId)) {
        return true;
      }
    }
  }
  
  // Fall back to traditional check for backward compatibility
  if (mode === 'gif') {
    // In GIF mode, ONLY consider links with the 'gif-link-' prefix valid
    // This is a STRICT check - no Animation mode links should affect GIF mode
    return !!layer.linkedLayer && 
           !!layer.linkedLayer.groupId && 
           layer.linkedLayer.groupId.startsWith('gif-link-');
  } else {
    // In Animation mode, ONLY consider links WITHOUT the 'gif-link-' prefix valid
    // This is a STRICT check - no GIF mode links should affect Animation mode
    return !!layer.linkedLayer && 
           !!layer.linkedLayer.groupId &&
           !layer.linkedLayer.groupId.startsWith('gif-link-');
  }
}

/**
 * Sets a layer's linked status properly for the given mode
 * 
 * @param layer The layer to modify
 * @param isLinked Whether the layer should be linked
 * @param groupId The group ID for the link
 * @param mode 'animation' for Animation mode, 'gif' for GIF Frame mode
 * @param isMain Whether this is the main layer in the group
 * @returns The updated layer with consistent link properties
 */
export function setLayerLinkStatus(
  layer: AnimationLayer, 
  isLinked: boolean, 
  groupId: string, 
  mode: 'animation' | 'gif',
  isMain: boolean = false
): AnimationLayer {
  // Create a copy to avoid mutation
  const updatedLayer = { ...layer };
  
  if (isLinked) {
    // Ensure we use the right prefix for the mode
    const finalGroupId = mode === 'gif' 
      ? (groupId.startsWith('gif-link-') ? groupId : `gif-link-${groupId}`)
      : (groupId.startsWith('gif-link-') ? groupId.substring(9) : groupId);
    
    // Set the linkedLayer property
    updatedLayer.linkedLayer = {
      groupId: finalGroupId,
      isMain,
      syncMode: LinkSyncMode.Full,
      overrides: []
    };
    
    // Set the isLinked property explicitly
    updatedLayer.isLinked = true;
    
    // Always set locked=true for linked layers regardless of mode
    updatedLayer.locked = true;
  } else {
    // Remove link properties
    delete updatedLayer.linkedLayer;
    updatedLayer.isLinked = false;
    updatedLayer.locked = false;
  }
  
  return updatedLayer;
}

/**
 * Updates the visibility of a layer properly for the given mode
 * 
 * @param layer The layer to modify
 * @param isVisible Whether the layer should be visible
 * @param mode 'animation' for Animation mode, 'gif' for GIF Frame mode
 * @returns The updated layer with consistent visibility properties
 */
export function setLayerVisibility(
  layer: AnimationLayer, 
  isVisible: boolean,
  mode: 'animation' | 'gif'
): AnimationLayer {
  // Create a copy to avoid mutation
  const updatedLayer = { ...layer };
  
  // Always update the visible property for UI purposes
  updatedLayer.visible = isVisible;
  
  return updatedLayer;
}

/**
 * Updates a GIF frame's hiddenLayers array based on layer visibility
 * Handles nested layer relationships and properly enforces mode isolation
 * 
 * @param frame The GIF frame to update
 * @param layerId The ID of the layer to update
 * @param isVisible Whether the layer should be visible
 * @returns The updated GIF frame
 */
export function updateGifFrameLayerVisibility(
  frame: GifFrame,
  layerId: string,
  isVisible: boolean
): GifFrame {
  // Create a deep copy to avoid mutation
  const updatedFrame = JSON.parse(JSON.stringify(frame));
  
  // Initialize hiddenLayers if it doesn't exist
  if (!updatedFrame.hiddenLayers) {
    updatedFrame.hiddenLayers = [];
  }
  
  // Enhanced debug logging
  const debugLog = (message: string) => {
    console.log(`[GifLayerVisibility] ${message}`);
  };
  
  debugLog(`Starting visibility update for layer ${layerId} in frame ${frame.id} - Making ${isVisible ? 'visible' : 'hidden'}`);
  
  // Helper to update the hiddenLayers array
  const updateHiddenLayersArray = (id: string, makeVisible: boolean) => {
    const wasHidden = updatedFrame.hiddenLayers.includes(id);
    
    if (makeVisible) {
      // Remove from hiddenLayers
      if (wasHidden) {
        updatedFrame.hiddenLayers = updatedFrame.hiddenLayers.filter((hiddenId: string) => hiddenId !== id);
        debugLog(`Removed layer ${id} from hiddenLayers`);
      }
    } else {
      // Add to hiddenLayers if not already there
      if (!wasHidden) {
        updatedFrame.hiddenLayers.push(id);
        debugLog(`Added layer ${id} to hiddenLayers`);
      }
    }
  };
  
  // Function to recursively process a layer and its children
  const updateVisibilityRecursively = (
    layer: AnimationLayer, 
    makeVisible: boolean,
    isTargetLayer: boolean = false,
    parentPath: string = '',
    depth: number = 0
  ): AnimationLayer => {
    // Create a deep copy of the layer to avoid mutation
    const updatedLayer = JSON.parse(JSON.stringify(layer));
    
    // Log with proper indentation to show hierarchy
    const indent = '  '.repeat(depth);
    const layerDebug = (message: string) => {
      debugLog(`${indent}${message}`);
    };
    
    layerDebug(`Processing layer "${updatedLayer.name}" (${updatedLayer.id}) - Current visible=${!!updatedLayer.visible}`);
    
    // Important: For GIF frames, we must PURGE any animation mode linking
    // This enforces STRICT MODE SEPARATION between Animation and GIF Frame modes
    if (updatedLayer.linkedLayer) {
      // Only keep the link if it's a GIF mode link (starts with 'gif-link-')
      if (!updatedLayer.linkedLayer.groupId.startsWith('gif-link-')) {
        layerDebug(`PURGING animation mode link for "${updatedLayer.name}" (${updatedLayer.id}) - STRICT MODE SEPARATION`);
        delete updatedLayer.linkedLayer;
      }
    }
    
    // CRITICAL FIX: Check if this is an expanded container in GIF frame mode
    // If it's expanded, we don't need to cascade visibility - each child manages its own visibility
    const isContainer = (updatedLayer.isGroup || updatedLayer.isFrame || 
                         updatedLayer.type === 'group' || updatedLayer.type === 'frame');
    const isExpandedContainer = isContainer && !!updatedLayer.isExpanded;
    
    if (isExpandedContainer) {
      layerDebug(`"${updatedLayer.name}" is an EXPANDED container`);
    } else if (isContainer) {
      layerDebug(`"${updatedLayer.name}" is a COLLAPSED container`);
    }
    
    // Update this layer's visibility in these cases:
    // 1. It's the target layer being directly toggled, OR
    // 2. It's a child of a container that's being hidden AND the container is not expanded
    if (isTargetLayer) {
      // Target layer is always updated directly
      updatedLayer.visible = makeVisible;
      updateHiddenLayersArray(updatedLayer.id, makeVisible);
      layerDebug(`Direct toggle: Making "${updatedLayer.name}" ${makeVisible ? 'visible' : 'hidden'}`);
    } else if (parentPath !== '' && !isExpandedContainer) {
      // This is a child of a non-expanded container being toggled
      updatedLayer.visible = makeVisible;
      updateHiddenLayersArray(updatedLayer.id, makeVisible);
      layerDebug(`Cascade: Making "${updatedLayer.name}" ${makeVisible ? 'visible' : 'hidden'} (from parent)`);
    } else if (isExpandedContainer && parentPath !== '') {
      // Special case: This is an expanded container whose parent is being toggled
      // For expanded containers, we should NOT hide them when their parent is hidden
      // but we SHOULD reflect their parent becoming visible
      if (makeVisible) {
        updatedLayer.visible = true;
        updateHiddenLayersArray(updatedLayer.id, true);
        layerDebug(`Special Case: Making expanded container "${updatedLayer.name}" visible because parent is now visible`);
      } else {
        layerDebug(`EXPANDED container "${updatedLayer.name}" stays visible even though parent is hidden`);
      }
    }
    
    // Process children if this is a container
    if (updatedLayer.children && updatedLayer.children.length > 0) {
      layerDebug(`Processing ${updatedLayer.children.length} children of "${updatedLayer.name}"`);
      
      // Don't cascade visibility if the container is expanded (children are independent)
      const shouldCascadeToChildren = !updatedLayer.isExpanded;
      
      if (isTargetLayer) {
        if (shouldCascadeToChildren) {
          layerDebug(`Target is a COLLAPSED container - cascading ${makeVisible ? 'visibility' : 'hiding'} to ALL children`);
        } else {
          layerDebug(`Target is an EXPANDED container - NOT cascading visibility changes to children`);
        }
      }
      
      // IMPORTANT: If we're in a GIF frame and the layer name is "Background", 
      // we need to fix the special inverse visibility bug
      if (isTargetLayer && updatedLayer.name === "Background" && frame.id.startsWith('gif-frame-')) {
        // Explicitly set the real visibility we want
        console.log(`[CRITICAL FIX] Background layer fix: actually making it ${makeVisible ? 'VISIBLE' : 'HIDDEN'}`);
        // Force the correct isVisible value
        makeVisible = isVisible;
      }
      
      // When the target is being toggled and container is NOT expanded, cascade to all children
      // When a parent's visibility cascades and container is NOT expanded, respect the cascaded value
      const cascadeVisibility = (isTargetLayer && shouldCascadeToChildren) ? 
        makeVisible : 
        (parentPath !== '' && shouldCascadeToChildren) ? 
          makeVisible : 
          updatedLayer.visible;
          
      const newParentPath = isTargetLayer ? updatedLayer.id : parentPath;
      
      // Recursively process each child with cascading visibility
      updatedLayer.children = updatedLayer.children.map((child: AnimationLayer) => 
        updateVisibilityRecursively(
          child, 
          cascadeVisibility, 
          false, 
          newParentPath, 
          depth + 1
        )
      );
      
      // Important: For containers, visibility logic depends on expanded state
      if (!isTargetLayer) {
        if (isExpandedContainer) {
          // Expanded containers should always appear visible in the UI
          // so users can continue to access child visibility controls
          updatedLayer.visible = true;
          updateHiddenLayersArray(updatedLayer.id, true);
          layerDebug(`EXPANDED container "${updatedLayer.name}" is forced visible for UI access to children`);
        } else {
          // For collapsed containers, visibility depends on children
          const hasVisibleChildren = updatedLayer.children.some((child: AnimationLayer) => child.visible);
          
          if (hasVisibleChildren && !updatedLayer.visible) {
            updatedLayer.visible = true;
            updateHiddenLayersArray(updatedLayer.id, true);
            layerDebug(`COLLAPSED container "${updatedLayer.name}" made visible because it has visible children`);
          } else if (!hasVisibleChildren && updatedLayer.visible && parentPath !== '') {
            updatedLayer.visible = false;
            updateHiddenLayersArray(updatedLayer.id, false);
            layerDebug(`COLLAPSED container "${updatedLayer.name}" made hidden because it has no visible children`);
          }
        }
      }
    }
    
    return updatedLayer;
  };
  
  // Find and update the target layer and its descendants
  if (updatedFrame.layers) {
    // Find the target layer in the nested structure
    const findTargetAndUpdate = (layers: AnimationLayer[]): AnimationLayer[] => {
      return layers.map(layer => {
        // If this is the target layer, update it and its descendants
        if (layer.id === layerId) {
          return updateVisibilityRecursively(layer, isVisible, true);
        }
        
        // If this is a group/container, search its children
        if (layer.children && layer.children.length > 0) {
          const updatedChildren = findTargetAndUpdate(layer.children);
          
          // Check if any children were updated (target found in descendants)
          const childrenUpdated = JSON.stringify(updatedChildren) !== JSON.stringify(layer.children);
          
          if (childrenUpdated) {
            // Create a copy with updated children
            const updatedLayer = {
              ...layer,
              children: updatedChildren
            };
            
            // CRITICAL FIX: Special handling for expanded containers
            // For expanded containers, ONLY update the container's visibility based on children
            // if the container is collapsed. If expanded, children have independent visibility.
            if (updatedLayer.isGroup && updatedLayer.isExpanded) {
              console.log(`FrameCardGrid: Group ${updatedLayer.name} (${updatedLayer.id}) is EXPANDED - child visibility changes won't affect group visibility`);
              // For expanded containers, the container is always visible regardless of children visibility
              updatedLayer.visible = true;
              // Remove from hiddenLayers if it's there since expanded containers should always be visible
              updateHiddenLayersArray(updatedLayer.id, true);
            } else {
              // Regular behavior for collapsed containers - If any children are visible, parent should be visible too
              const hasVisibleChildren = updatedChildren.some((child: AnimationLayer) => child.visible);
              
              if (hasVisibleChildren && !updatedLayer.visible) {
                console.log(`FrameCardGrid: Collapsed group ${updatedLayer.name} (${updatedLayer.id}) has visible children, updating parent visibility state`);
                updatedLayer.visible = true;
                
                // Remove from hiddenLayers if it's there, since it should appear visually visible
                updateHiddenLayersArray(updatedLayer.id, true);
              }
            }
            
            return updatedLayer;
          }
        }
        
        // No changes to this layer
        return layer;
      });
    };
    
    // Update the layer tree starting from the top level
    updatedFrame.layers = findTargetAndUpdate(updatedFrame.layers);
  }
  
  return updatedFrame;
}

/**
 * Finds the ad size ID from a GIF frame ID
 * 
 * @param gifFrameId The GIF frame ID to parse
 * @returns The ad size ID or null if parsing fails
 */
export function getAdSizeFromGifFrameId(gifFrameId: string): string | null {
  if (!gifFrameId.startsWith('gif-frame-')) return null;
  
  const parsed = parseGifFrameId(gifFrameId);
  return parsed.isValid ? parsed.adSizeId : null;
}

/**
 * Finds a layer in a nested layer structure by its ID
 * 
 * @param layers Array of layers to search
 * @param layerId ID of the layer to find
 * @returns The found layer or null if not found
 */
export function findLayerById(
  layers: AnimationLayer[], 
  layerId: string
): AnimationLayer | null {
  // Check direct children first
  for (const layer of layers) {
    if (layer.id === layerId) {
      return layer;
    }
    
    // If this layer has children, search them recursively
    if (layer.children && layer.children.length > 0) {
      const foundInChildren = findLayerById(layer.children, layerId);
      if (foundInChildren) {
        return foundInChildren;
      }
    }
  }
  
  return null;
}

/**
 * Finds all layers with a matching name in a nested layer structure
 * 
 * @param layers Array of layers to search
 * @param layerName Name of the layers to find
 * @returns Array of layers with matching names
 */
export function findLayersByName(
  layers: AnimationLayer[], 
  layerName: string
): AnimationLayer[] {
  const results: AnimationLayer[] = [];
  
  // Helper function for recursive search
  const searchInLayers = (currentLayers: AnimationLayer[]) => {
    for (const layer of currentLayers) {
      // Check if this layer matches
      if (layer.name === layerName) {
        results.push(layer);
      }
      
      // If this layer has children, search them recursively
      if (layer.children && layer.children.length > 0) {
        searchInLayers(layer.children);
      }
    }
  };
  
  // Start the search from the top level
  searchInLayers(layers);
  return results;
}

/**
 * Determines if a layer has been overridden in a GIF frame
 * 
 * @param frame The GIF frame to check
 * @param layerId The ID of the layer to check
 * @returns Boolean indicating if the layer has an override
 */
export function hasLayerOverride(frame: GifFrame, layerId: string): boolean {
  return frame.overrides?.layerVisibility?.[layerId]?.overridden || false;
}

/**
 * Sets the override status for a layer in a GIF frame
 * 
 * @param frame The GIF frame to update
 * @param layerId The ID of the layer to update
 * @param isOverridden Whether the layer should be overridden
 * @returns The updated GIF frame
 */
export function setLayerOverride(
  frame: GifFrame,
  layerId: string,
  isOverridden: boolean
): GifFrame {
  // Create a copy to avoid mutation
  const updatedFrame = { ...frame };
  
  // Initialize overrides if they don't exist
  if (!updatedFrame.overrides) {
    updatedFrame.overrides = { layerVisibility: {} };
  }
  
  if (!updatedFrame.overrides.layerVisibility) {
    updatedFrame.overrides.layerVisibility = {};
  }
  
  // Create or update the override
  updatedFrame.overrides.layerVisibility[layerId] = {
    overridden: isOverridden
  };
  
  return updatedFrame;
}