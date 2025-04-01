/**
 * Utility functions for layer operations
 */

import { AnimationLayer } from '../types/animation';

/**
 * Checks if a layer or any of its children are linked
 * 
 * Enhanced to check multiple link properties:
 * - isLinked: Explicit flag
 * - locked: Lock flag that correlates with linking
 * - linkedLayer: Presence of link metadata
 * 
 * This function is used to determine if the link icon should be displayed
 */
export function isLayerOrChildrenLinked(layer: AnimationLayer): boolean {
  // For better debugging, expand the logging
  const logLayerStatus = (l: AnimationLayer, isLinked: boolean) => {
    console.log(`Layer ${l.name} (${l.id}) link status:`, {
      isLinked: !!l.isLinked,
      locked: !!l.locked,
      hasLinkedLayer: !!l.linkedLayer,
      linkedLayerProps: l.linkedLayer || 'none'
    });
    return isLinked;
  };

  // Check if this layer is linked through any of the link indicators
  // Use explicit boolean checks to ensure proper type handling
  if (layer.isLinked === true || layer.locked === true || layer.linkedLayer !== undefined) {
    return logLayerStatus(layer, true);
  }
  
  // Check children recursively
  if (layer.children && layer.children.length > 0) {
    for (const child of layer.children) {
      if (isLayerOrChildrenLinked(child)) {
        // If a child is linked, log the parent too for better debugging
        return logLayerStatus(layer, true);
      }
    }
  }
  
  return false;
}

/**
 * Gets a layer's path in the layer hierarchy
 */
export function getLayerPath(layers: AnimationLayer[], layerId: string): string[] {
  const findPath = (currentLayers: AnimationLayer[], path: string[] = []): string[] | null => {
    for (const layer of currentLayers) {
      const currentPath = [...path, layer.name];
      
      if (layer.id === layerId) {
        return currentPath;
      }
      
      if (layer.children && layer.children.length > 0) {
        const foundPath = findPath(layer.children, currentPath);
        if (foundPath) {
          return foundPath;
        }
      }
    }
    
    return null;
  };
  
  const path = findPath(layers);
  return path || [];
}

/**
 * Gets all descendants of a layer
 */
export function getAllDescendants(layer: AnimationLayer): AnimationLayer[] {
  const descendants: AnimationLayer[] = [];
  
  if (!layer.children || layer.children.length === 0) {
    return descendants;
  }
  
  // Add immediate children
  descendants.push(...layer.children);
  
  // Add all descendants of children
  for (const child of layer.children) {
    descendants.push(...getAllDescendants(child));
  }
  
  return descendants;
}

/**
 * Gets all ancestors of a layer by ID
 */
export function getAncestors(
  layers: AnimationLayer[],
  layerId: string
): AnimationLayer[] {
  const ancestors: AnimationLayer[] = [];
  
  const findAncestors = (
    currentLayers: AnimationLayer[],
    targetId: string,
    path: AnimationLayer[] = []
  ): AnimationLayer[] | null => {
    for (const layer of currentLayers) {
      const currentPath = [...path, layer];
      
      if (layer.id === targetId) {
        return path;
      }
      
      if (layer.children && layer.children.length > 0) {
        const foundPath = findAncestors(layer.children, targetId, currentPath);
        if (foundPath) {
          return foundPath;
        }
      }
    }
    
    return null;
  };
  
  const path = findAncestors(layers, layerId);
  return path || [];
}