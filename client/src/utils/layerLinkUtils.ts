/**
 * Layer Linking Utilities
 * 
 * Standardized functions for managing layer linking across animation and GIF frame modes
 */

import { v4 as uuidv4 } from 'uuid';
import { AnimationLayer, LinkedLayerInfo, LinkSyncMode, TimelineMode } from '../types/animation';

/**
 * Standardized function to set linking properties consistently
 * 
 * @param layer The layer to update
 * @param isLinked Whether the layer should be linked
 * @param mode Current timeline mode (animation or gifFrames)
 * @param groupId Optional group ID for linking (required if isLinked is true)
 * @param isMain Whether this is the main layer in the group
 * @param frameId The frame ID that contains this layer
 * @returns Updated layer with consistent link properties
 */
export function setLayerLinkProperties(
  layer: AnimationLayer, 
  isLinked: boolean, 
  mode: TimelineMode, 
  groupId?: string, 
  isMain: boolean = false,
  frameId: string = ''
): AnimationLayer {
  if (isLinked && groupId) {
    return {
      ...layer,
      isLinked: true,
      locked: true,
      linkedLayer: {
        layerId: layer.id,
        frameId: frameId,
        name: layer.name || '',
        hasOverride: false,
        groupId: groupId,
        syncMode: LinkSyncMode.Full,
        isMain: isMain,
        overrides: []
      }
    };
  } else {
    // When unlinking, completely remove linkedLayer property
    const { linkedLayer, ...rest } = layer as any;
    return {
      ...rest,
      isLinked: false,
      locked: false
    };
  }
}

/**
 * Generate a consistent link group ID based on layer name and timeline mode
 * 
 * @param layerName Name of the layer
 * @param mode Current timeline mode
 * @returns A consistent link group ID with appropriate prefix
 */
export function generateLinkGroupId(layerName: string, mode: TimelineMode): string {
  const sanitizedName = layerName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const uniqueSuffix = uuidv4().substring(0, 8);
  
  if (mode === 'gifFrames') {
    return `gif-link-${sanitizedName}-${uniqueSuffix}`;
  } else {
    return `anim-link-${sanitizedName}-${uniqueSuffix}`;
  }
}

/**
 * Generate a deterministic group ID based on layer name
 * This ensures the same layer name always generates the same group ID
 * 
 * @param layerName Name of the layer
 * @param mode Current timeline mode
 * @returns A deterministic link group ID
 */
export function generateDeterministicGroupId(layerName: string, mode: TimelineMode): string {
  // Create a deterministic hash of the layer name
  let hash = 0;
  for (let i = 0; i < layerName.length; i++) {
    const char = layerName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to positive hex string
  const positiveHash = Math.abs(hash).toString(16).substring(0, 8);
  
  // Create a prefix based on the mode
  const prefix = mode === 'gifFrames' ? 'gif-link' : 'anim-link';
  
  // Sanitize layer name for ID use
  const sanitizedName = layerName.toLowerCase().replace(/[^a-z0-9]/gi, '-');
  
  return `${prefix}-${sanitizedName}-${positiveHash}`;
}

/**
 * Check if a link group ID belongs to GIF mode
 * 
 * @param groupId The group ID to check
 * @returns True if this is a GIF mode link
 */
export function isGifModeLink(groupId: string | undefined): boolean {
  return !!groupId && groupId.startsWith('gif-link');
}

/**
 * Check if a link group ID belongs to Animation mode
 * 
 * @param groupId The group ID to check
 * @returns True if this is an Animation mode link
 */
export function isAnimationModeLink(groupId: string | undefined): boolean {
  return !!groupId && groupId.startsWith('anim-link');
}

/**
 * Find a layer by ID recursively, including in nested layers
 * 
 * @param layers Array of layers to search
 * @param layerId The layer ID to find
 * @returns The found layer or null
 */
export function findLayerById(layers: AnimationLayer[], layerId: string): AnimationLayer | null {
  if (!layers || !Array.isArray(layers)) return null;
  
  for (const layer of layers) {
    if (layer.id === layerId) {
      return layer;
    }
    
    // Check children if they exist
    if (layer.children && layer.children.length > 0) {
      const foundInChildren = findLayerById(layer.children, layerId);
      if (foundInChildren) return foundInChildren;
    }
  }
  
  return null;
}

/**
 * Verify the consistency of layer link properties
 * 
 * @param layers Array of layers to check
 * @returns Array of inconsistency reports
 */
export function validateLayerLinkConsistency(layers: AnimationLayer[]): string[] {
  const inconsistencies: string[] = [];
  const linkGroups: Record<string, { ids: string[], names: string[] }> = {};
  
  // Helper to process layers recursively
  const processLayer = (layer: AnimationLayer) => {
    // Check if linked but missing properties
    if (layer.isLinked && (!layer.locked || !layer.linkedLayer)) {
      inconsistencies.push(
        `Layer "${layer.name}" (${layer.id}) is marked as linked but missing required properties: ` +
        `locked=${layer.locked}, hasLinkedLayer=${!!layer.linkedLayer}`
      );
    }
    
    // Check if has linkedLayer but not marked as linked/locked
    if (layer.linkedLayer && (!layer.isLinked || !layer.locked)) {
      inconsistencies.push(
        `Layer "${layer.name}" (${layer.id}) has linkedLayer but missing required properties: ` +
        `isLinked=${layer.isLinked}, locked=${layer.locked}`
      );
    }
    
    // Collect group data if linked
    if (layer.linkedLayer?.groupId) {
      const { groupId } = layer.linkedLayer;
      if (!linkGroups[groupId]) {
        linkGroups[groupId] = { ids: [], names: [] };
      }
      linkGroups[groupId].ids.push(layer.id);
      if (layer.name) linkGroups[groupId].names.push(layer.name);
    }
    
    // Check children recursively
    if (layer.children && layer.children.length > 0) {
      layer.children.forEach(processLayer);
    }
  };
  
  // Process all layers
  layers.forEach(processLayer);
  
  // Check for inconsistencies in collected groups
  Object.entries(linkGroups).forEach(([groupId, group]) => {
    // All layers in the same group should have the same name
    const uniqueNames = [...new Set(group.names)];
    if (uniqueNames.length > 1) {
      inconsistencies.push(
        `Link group ${groupId} contains layers with different names: ${uniqueNames.join(', ')}`
      );
    }
  });
  
  return inconsistencies;
} 