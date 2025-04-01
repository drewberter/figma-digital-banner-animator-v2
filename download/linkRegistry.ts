/**
 * Link Registry - Central linking system for managing linked layers
 * 
 * This module provides a centralized system for managing layer links
 * across different modes (Animation Mode and GIF Frame Mode), ensuring
 * they remain properly isolated while allowing the correct behavior in each.
 */

import { AnimationLayer, GifFrame, AnimationFrame } from '../types/animation';
import { isLayerLinked, setLayerLinkStatus, findLayerById } from './safeLayerOperations';
import { v4 as uuidv4 } from 'uuid';
import { ILinkRegistry, AnimationModeData, GifFrameModeData } from './linkRegistryInterfaces';
import type { LinkGroup } from './linkRegistryInterfaces';

/**
 * Link group interface is imported from linkRegistryInterfaces.ts
 */

/**
 * Link Registry class for managing linked layers
 * 
 * Implements the ILinkRegistry interface from linkRegistryInterfaces.ts
 */
export class LinkRegistry implements ILinkRegistry {
  private linkGroups: Map<string, LinkGroup>;
  private layerToGroupMap: Map<string, string>;
  
  // Public properties required by the interface
  public animationMode: AnimationModeData = { 
    linkedLayers: {}, 
    syncModes: {} 
  };
  
  public gifFrameMode: GifFrameModeData = { 
    layersByName: {}, 
    framesByNumber: {}, 
    overrides: {}, 
    overrideStatus: {} 
  };
  
  public layerNameMap: Record<string, string> = {};
  public frameNumberMap: Record<string, string> = {};
  
  /**
   * Creates a new LinkRegistry instance
   * 
   * Initializes separate tracking for animation mode and GIF mode
   * to ensure complete isolation between the two modes
   */
  constructor() {
    this.linkGroups = new Map<string, LinkGroup>();
    this.layerToGroupMap = new Map<string, string>();
    console.log('[LayerSync][Registry] Layer Link Registry initialized', this.getDebugStats());
  }
  
  /**
   * Determines if a group ID belongs to GIF mode
   * 
   * @param groupId The group ID to check
   * @returns True if this is a GIF mode group ID
   */
  isGifModeGroup(groupId: string): boolean {
    return groupId.startsWith('gif-link-');
  }
  
  /**
   * Determines if a linkedLayer belongs to the current mode
   * Used to filter out cross-mode links
   * 
   * @param groupId The group ID from the linkedLayer
   * @param currentMode The current mode being operated in
   * @returns True if the linkedLayer belongs to the current mode
   */
  isLinkInCurrentMode(groupId: string, currentMode: 'animation' | 'gif'): boolean {
    const isGifGroup = this.isGifModeGroup(groupId);
    return currentMode === 'gif' ? isGifGroup : !isGifGroup;
  }
  
  /**
   * Check if a layer has any linked layers
   * 
   * @param layerId The ID of the layer to check
   * @returns True if the layer is linked with others
   */
  hasLinkedLayers(layerId: string): boolean {
    return this.layerToGroupMap.has(layerId);
  }
  
  /**
   * Get the link group name for a layer
   * 
   * @param layerId The ID of the layer to check
   * @returns The name of the link group or null if not found
   */
  getLinkGroupName(layerId: string): string | null {
    const groupId = this.layerToGroupMap.get(layerId);
    if (!groupId) return null;
    
    const group = this.linkGroups.get(groupId);
    return group ? group.name : null;
  }
  
  /**
   * Gets debugging statistics about the registry
   */
  private getDebugStats(): string {
    return `Groups: ${this.linkGroups.size}, Mapped Layers: ${this.layerToGroupMap.size}`;
  }
  
  /**
   * Creates a new link group and adds layers to it
   * 
   * @param name The name of the link group
   * @param layerIds The IDs of layers to add to the group
   * @param mode The mode this link group belongs to (animation or gif)
   * @param mainLayerId The ID of the main layer in the group (optional)
   * @returns The ID of the created link group
   */
  createLinkGroup(
    name: string, 
    layerIds: string[], 
    mode: 'animation' | 'gif',
    mainLayerId?: string
  ): string {
    // Generate a unique ID for the group
    const groupId = mode === 'gif' ? `gif-link-${uuidv4()}` : uuidv4();
    
    // Create the group
    const group: LinkGroup = {
      id: groupId,
      name,
      mode,
      layerIds: [...layerIds], // Copy to avoid external mutation
      main: mainLayerId
    };
    
    // Add to registry
    this.linkGroups.set(groupId, group);
    
    // Update layer to group mapping
    layerIds.forEach(layerId => {
      this.layerToGroupMap.set(layerId, groupId);
    });
    
    console.log(`[LayerSync][Registry] Created ${mode} link group "${name}" with ${layerIds.length} layers`);
    return groupId;
  }
  
  /**
   * Adds a layer to an existing link group
   * 
   * @param groupId The ID of the link group to add to
   * @param layerId The ID of the layer to add
   * @returns True if successful, false if the group doesn't exist
   */
  addLayerToGroup(groupId: string, layerId: string): boolean {
    const group = this.linkGroups.get(groupId);
    if (!group) return false;
    
    // Check if the layer is already in a group, and if so, remove it
    const existingGroupId = this.layerToGroupMap.get(layerId);
    if (existingGroupId && existingGroupId !== groupId) {
      this.removeLayerFromGroup(existingGroupId, layerId);
    }
    
    // Add to group if not already there
    if (!group.layerIds.includes(layerId)) {
      group.layerIds.push(layerId);
      this.layerToGroupMap.set(layerId, groupId);
    }
    
    return true;
  }
  
  /**
   * Removes a layer from a link group
   * 
   * @param groupId The ID of the link group to remove from
   * @param layerId The ID of the layer to remove
   * @returns True if successful, false if the group doesn't exist
   */
  removeLayerFromGroup(groupId: string, layerId: string): boolean {
    const group = this.linkGroups.get(groupId);
    if (!group) return false;
    
    // Remove from group
    group.layerIds = group.layerIds.filter(id => id !== layerId);
    
    // Remove from mapping
    if (this.layerToGroupMap.get(layerId) === groupId) {
      this.layerToGroupMap.delete(layerId);
    }
    
    // Delete the group if it's now empty
    if (group.layerIds.length === 0) {
      this.linkGroups.delete(groupId);
    }
    
    return true;
  }
  
  /**
   * Gets the link group a layer belongs to
   * 
   * @param layerId The ID of the layer to check
   * @param mode The mode to check (animation or gif)
   * @returns The link group or null if not found
   */
  getLayerGroup(layerId: string, mode: 'animation' | 'gif'): LinkGroup | null {
    const groupId = this.layerToGroupMap.get(layerId);
    if (!groupId) return null;
    
    const group = this.linkGroups.get(groupId);
    if (!group) return null;
    
    // Check if the group matches the requested mode
    if (group.mode !== mode) return null;
    
    return group;
  }
  
  /**
   * Gets all other layers in the same group as the specified layer
   * 
   * @param layerId The ID of the layer to check
   * @param mode The mode to check (animation or gif)
   * @returns Array of layer IDs that are linked to the specified layer
   */
  getLinkedLayers(layerId: string, mode: 'animation' | 'gif'): string[] {
    // First try the standard link group approach
    const group = this.getLayerGroup(layerId, mode);
    
    if (group) {
      // Return all layers except the specified one
      return group.layerIds.filter(id => id !== layerId);
    }
    
    // If no link group was found but we're in GIF mode, check the layersByName mapping
    if (mode === 'gif') {
      // Find which layer name this layer has
      const layerName = this.findLayerNameById(layerId);
      
      if (layerName && this.gifFrameMode.layersByName[layerName]) {
        // Return all layers with this name except the current one
        return this.gifFrameMode.layersByName[layerName].filter(id => id !== layerId);
      }
    }
    
    // No links found
    return [];
  }
  
  /**
   * Helper method to find a layer's name by its ID
   * Used by getLinkedLayers for GIF mode
   * 
   * @param layerId The ID of the layer to find the name for
   * @returns The layer name or null if not found
   */
  private findLayerNameById(layerId: string): string | null {
    // Check all layer name entries
    for (const [name, ids] of Object.entries(this.gifFrameMode.layersByName)) {
      if (ids.includes(layerId)) {
        return name;
      }
    }
    return null;
  }
  
  /**
   * Gets all layers in all link groups for a specific mode
   * 
   * @param mode The mode to check (animation or gif)
   * @returns Map of layer IDs to their group IDs
   */
  getAllLinkedLayers(mode: 'animation' | 'gif'): Map<string, string> {
    const result = new Map<string, string>();
    
    this.linkGroups.forEach((group, groupId) => {
      if (group.mode === mode) {
        group.layerIds.forEach(layerId => {
          result.set(layerId, groupId);
        });
      }
    });
    
    return result;
  }
  
  /**
   * Updates layers in a list with their link status based on the registry
   * 
   * @param layers The layers to update
   * @param mode The mode to update for (animation or gif)
   * @returns The updated layers with correct link properties
   */
  syncLayerLinkStates(layers: AnimationLayer[], mode: 'animation' | 'gif'): AnimationLayer[] {
    // Get all linked layers for this mode
    const linkedLayers = this.getAllLinkedLayers(mode);
    
    // Helper function to process layers recursively
    const updateLayersRecursively = (layerList: AnimationLayer[]): AnimationLayer[] => {
      return layerList.map(layer => {
        // Create a new layer object to avoid mutations
        let updatedLayer = { ...layer };
        
        // Check if this layer is in the registry
        const groupId = linkedLayers.get(layer.id);
        
        if (groupId) {
          // Layer is linked, set link properties
          const group = this.linkGroups.get(groupId);
          const isMain = group?.main === layer.id;
          
          updatedLayer = setLayerLinkStatus(
            updatedLayer,
            true, // Set as linked
            groupId,
            mode,
            isMain
          );
        } else if (isLayerLinked(layer, mode)) {
          // Layer is marked as linked but not in registry - remove link properties
          updatedLayer = setLayerLinkStatus(
            updatedLayer,
            false, // Remove link
            '', // Empty group ID
            mode,
            false
          );
        }
        
        // Process children recursively if they exist
        if (updatedLayer.children && updatedLayer.children.length > 0) {
          updatedLayer.children = updateLayersRecursively(updatedLayer.children);
        }
        
        return updatedLayer;
      });
    };
    
    // Start the recursive update
    return updateLayersRecursively(layers);
  }
  
  /**
   * Find all frames with the same frame number
   * 
   * @param frameNumber The frame number to search for
   * @returns Array of frame IDs with the same frame number
   */
  findFramesByNumber(frameNumber: string): string[] {
    // Check if we have frames linked by this frame number
    if (this.gifFrameMode.framesByNumber[frameNumber]) {
      console.log(`[LinkRegistry][findFramesByNumber] Found ${this.gifFrameMode.framesByNumber[frameNumber].length} frames for number ${frameNumber}`);
      return [...this.gifFrameMode.framesByNumber[frameNumber]];
    }
    console.log(`[LinkRegistry][findFramesByNumber] No frames found for number ${frameNumber}`);
    return [];
  }
  
  /**
   * Updates GIF frames with link status information
   * 
   * @param frames The GIF frames to update
   * @returns The updated frames with correct link properties
   */
  syncGifFrameLinkStates(frames: GifFrame[]): GifFrame[] {
    return frames.map(frame => {
      // Skip frames without layers
      if (!frame.layers || frame.layers.length === 0) return frame;
      
      // Update the layers in this frame
      const updatedLayers = this.syncLayerLinkStates(frame.layers, 'gif');
      
      // Check if this frame is linked by frame number
      let isLinked = false;
      let linkedFrames: string[] = [];
      
      if (frame.frameNumber) {
        linkedFrames = this.findFramesByNumber(frame.frameNumber).filter(id => id !== frame.id);
        isLinked = linkedFrames.length > 0;
      }
      
      // Create a new frame to avoid mutations
      return {
        ...frame,
        layers: updatedLayers,
        isLinked,
        linkedFrames
      };
    });
  }
  
  /**
   * Updates Animation frames with link status information
   * 
   * @param frames The Animation frames to update
   * @returns The updated frames with correct link properties
   */
  syncAnimationFrameLinkStates(frames: AnimationFrame[]): AnimationFrame[] {
    return frames.map(frame => {
      // Skip frames without layers
      if (!frame.layers || frame.layers.length === 0) return frame;
      
      // Update the layers in this frame
      const updatedLayers = this.syncLayerLinkStates(frame.layers, 'animation');
      
      // Create a new frame to avoid mutations
      return {
        ...frame,
        layers: updatedLayers
      };
    });
  }
  
  /**
   * Links two or more layers together in a specified mode
   * 
   * @param layerName The name of the layer (used as group name)
   * @param layerIds The IDs of the layers to link
   * @param mode The mode to link in (animation or gif)
   * @param mainLayerId The ID of the main layer in the group (optional)
   * @returns The ID of the created link group
   */
  linkLayers(
    layerName: string, 
    layerIds: string[], 
    mode?: 'animation' | 'gif',
    mainLayerId?: string
  ): string {
    // Skip if there are less than 2 layers to link
    if (layerIds.length < 2) return '';
    
    // Default to animation mode if not specified
    const effectiveMode = mode || 'animation';
    
    // Create the link group and return its ID
    return this.createLinkGroup(layerName, layerIds, effectiveMode, mainLayerId);
  }
  
  /**
   * Links layers together and updates their state properties
   * 
   * @param layerIds The IDs of the layers to link
   * @param groupName The name to give the link group (usually the layer name)
   * @param mode The mode to link in (animation or gif)
   * @param layers The full layers array to update link status in
   * @param mainLayerId The ID of the main layer in the group (optional)
   * @returns The updated layers with correct link properties
   */
  linkLayersAndUpdate(
    layerIds: string[], 
    groupName: string, 
    mode: 'animation' | 'gif',
    layers: AnimationLayer[],
    mainLayerId?: string
  ): AnimationLayer[] {
    // Skip if there are less than 2 layers to link
    if (layerIds.length < 2) return layers;
    
    // Create the link group
    this.createLinkGroup(groupName, layerIds, mode, mainLayerId);
    
    // Update the layer properties
    return this.syncLayerLinkStates(layers, mode);
  }
  
  /**
   * Unlinks a layer from its group in a specified mode
   * 
   * @param layerId The ID of the layer to unlink
   * @param mode The mode to unlink in (animation or gif)
   * @param layers The full layers array to update link status in
   * @returns The updated layers with correct link properties
   */
  unlinkLayer(layerId: string, mode: 'animation' | 'gif', layers: AnimationLayer[]): AnimationLayer[] {
    // Check if the layer is in a group
    const group = this.getLayerGroup(layerId, mode);
    if (!group) return layers;
    
    // Remove the layer from its group
    this.removeLayerFromGroup(group.id, layerId);
    
    // Update the layer properties
    return this.syncLayerLinkStates(layers, mode);
  }
  
  /**
   * Auto-links layers with the same name across different ad sizes
   * 
   * @param framesByAdSize Object mapping ad size IDs to their frames
   * @param mode The mode to auto-link in (animation or gif)
   * @returns The updated frames with auto-linked layers
   */
  autoLinkLayers(
    framesByAdSize: Record<string, AnimationFrame[] | GifFrame[]>,
    mode: 'animation' | 'gif'
  ): Record<string, AnimationFrame[] | GifFrame[]> {
    console.log(`[LinkRegistry][autoLinkLayers] Starting auto-linking for frames`, 
      Object.keys(framesByAdSize).join(', '));
      
    // Create a mapping of layer names to their occurrences across ad sizes
    // Key: layer name, Value: { adSizeId: { frameIndex: layerId } }
    const layerNameMap: Record<string, Record<string, Record<number, string>>> = {};
    
    // Track all layer names and their corresponding layers for easier debugging
    const allNamedLayers: Record<string, { id: string, adSize: string, frameIndex: number }[]> = {};
    
    // First pass: collect all layer names and their IDs
    Object.entries(framesByAdSize).forEach(([adSizeId, frames]) => {
      console.log(`[LinkRegistry][autoLinkLayers] Processing ${frames.length} layers for frame ${adSizeId}`);
      
      frames.forEach((frame, frameIndex) => {
        if (!frame.layers) {
          console.log(`[LinkRegistry][autoLinkLayers] Frame at index ${frameIndex} has no layers, skipping`);
          return;
        }
        
        // Helper function to process layers recursively
        const processLayersRecursively = (layers: AnimationLayer[], path: string[] = []) => {
          layers.forEach(layer => {
            const layerName = layer.name;
            if (!layerName) {
              console.log(`[LinkRegistry][autoLinkLayers] Layer ${layer.id} has no name, skipping`);
              return;
            }
            
            // Track this layer - Don't track paths for GIF mode
            if (!allNamedLayers[layerName]) {
              allNamedLayers[layerName] = [];
            }
            allNamedLayers[layerName].push({
              id: layer.id,
              adSize: adSizeId,
              frameIndex
            });
            
            // Initialize layer name entry if it doesn't exist
            if (!layerNameMap[layerName]) {
              layerNameMap[layerName] = {};
            }
            
            // Initialize ad size entry if it doesn't exist
            if (!layerNameMap[layerName][adSizeId]) {
              layerNameMap[layerName][adSizeId] = {};
            }
            
            // Store layer ID by frame index
            layerNameMap[layerName][adSizeId][frameIndex] = layer.id;
            
            // Debug log - Skip path printing for GIF mode
            const shouldShowPath = mode === 'animation'; // Only show path for animation mode
            const pathStr = shouldShowPath && path.length > 0 ? ` (path: ${path.join('/')})` : '';
            console.log(`[LinkRegistry][autoLinkLayers] Mapped layer "${layerName}" (${layer.id}) in adSize ${adSizeId}, frameIndex ${frameIndex}${pathStr}`);
            
            // Process children recursively
            // For GIF frame mode, we still need to process children
            // but don't use path for identification, only for traversal
            if (layer.children && layer.children.length > 0) {
              const nextPath = mode === 'animation' ? [...path, layer.id] : []; // Empty path for GIF mode
              processLayersRecursively(layer.children, nextPath);
            }
          });
        };
        
        processLayersRecursively(frame.layers);
      });
    });
    
    // Log all layer names for better debugging
    console.log(`[LinkRegistry][autoLinkLayers] Found ${Object.keys(allNamedLayers).length} unique layer names`);
    Object.entries(allNamedLayers).forEach(([name, instances]) => {
      console.log(`[LinkRegistry][autoLinkLayers] Layer "${name}" appears ${instances.length} times across all frames`);
    });
    
    // Second pass: create link groups for layers with same name across ad sizes
    // but within the same frame index
    Object.entries(layerNameMap).forEach(([layerName, adSizeMap]) => {
      // Skip layers that don't appear in multiple ad sizes
      const adSizeCount = Object.keys(adSizeMap).length;
      if (adSizeCount < 2) {
        console.log(`[LinkRegistry][autoLinkLayers] Skipping "${layerName}" - only appears in ${adSizeCount} ad sizes`);
        return;
      }
      
      console.log(`[LinkRegistry][autoLinkLayers] Layer "${layerName}" appears in ${adSizeCount} ad sizes - eligible for linking`);
      
      // For each frame index, link layers with the same name across ad sizes
      const frameIndices = new Set<number>();
      
      // Collect all frame indices
      Object.values(adSizeMap).forEach(frameMap => {
        Object.keys(frameMap).forEach(index => frameIndices.add(parseInt(index)));
      });
      
      console.log(`[LinkRegistry][autoLinkLayers] Layer "${layerName}" appears in ${frameIndices.size} frame indices`);
      
      // Process each frame index separately
      frameIndices.forEach(frameIndex => {
        const layersToLink: string[] = [];
        const framesForLinking: { id: string, frameNumber: string }[] = [];
        
        // Collect layers from this frame index across all ad sizes
        Object.entries(adSizeMap).forEach(([adSize, frameMap]) => {
          if (frameMap[frameIndex]) {
            const layerId = frameMap[frameIndex];
            layersToLink.push(layerId);
            
            // Keep track of which layer belongs to which ad size for better logging
            console.log(`[LinkRegistry][autoLinkLayers] Adding layer ${layerId} from ad size ${adSize} to link group for "${layerName}"`);
            
            // If we're in GIF mode, collect frame information as well for frame-by-number linking
            if (mode === 'gif') {
              // Look up frames from this ad size
              const frames = framesByAdSize[adSize] as GifFrame[];
              if (frames && frames.length > 0) {
                // Find the frame containing this layer
                for (const frame of frames) {
                  const hasLayer = frame.layers && frame.layers.some(layer => layer.id === layerId);
                  
                  // If this frame contains the layer and has a valid frameNumber
                  if (hasLayer && frame.frameNumber) {
                    framesForLinking.push({
                      id: frame.id,
                      frameNumber: frame.frameNumber
                    });
                    console.log(`[LinkRegistry][autoLinkLayers] Found frame ${frame.id} with frameNumber ${frame.frameNumber} containing layer ${layerId}`);
                    break; // Found the frame, move to next ad size
                  }
                }
              }
            }
          }
        });
        
        // Skip if less than 2 layers to link
        if (layersToLink.length < 2) {
          console.log(`[LinkRegistry][autoLinkLayers] Skipping frame index ${frameIndex} for "${layerName}" - only has ${layersToLink.length} layers`);
          return;
        }
        
        console.log(`[LinkRegistry][autoLinkLayers] Creating link group for "${layerName}" with ${layersToLink.length} layers`);
        
        // Create a link group for these layers
        const groupId = this.createLinkGroup(
          layerName,
          layersToLink,
          mode,
          layersToLink[0] // First layer is the main layer
        );
        
        // Store these links for immediate access (without waiting for sync functions)
        layersToLink.forEach(layerId => {
          this.layerToGroupMap.set(layerId, groupId);
        });
        
        // Store in the appropriate data structure for the mode
        if (mode === 'gif') {
          // Store by layer name (existing approach)
          this.gifFrameMode.layersByName[layerName] = layersToLink;
          
          // Enhanced: Also link frames by frame number if we have collected frame information
          if (framesForLinking.length >= 2) {
            // Group frames by their frameNumber
            const framesByNumberMap: Record<string, string[]> = {};
            
            framesForLinking.forEach(frameInfo => {
              if (!framesByNumberMap[frameInfo.frameNumber]) {
                framesByNumberMap[frameInfo.frameNumber] = [];
              }
              framesByNumberMap[frameInfo.frameNumber].push(frameInfo.id);
            });
            
            // Store in the registry for each frame number
            Object.entries(framesByNumberMap).forEach(([frameNumber, frameIds]) => {
              if (frameIds.length >= 2) {
                console.log(`[LinkRegistry][autoLinkLayers] Linking ${frameIds.length} frames with frameNumber ${frameNumber}`);
                this.gifFrameMode.framesByNumber[frameNumber] = frameIds;
              }
            });
          }
          
          // Log detailed information about the created link for GIF mode
          console.log(`[LinkRegistry][autoLinkLayers] Created GIF link group for "${layerName}":`, {
            groupId,
            mode,
            layerCount: layersToLink.length,
            layerIds: layersToLink,
            frameIndex,
            framesLinked: framesForLinking.length,
            layersByName: Object.keys(this.gifFrameMode.layersByName).length,
            framesByNumber: Object.keys(this.gifFrameMode.framesByNumber).length
          });
        } else {
          // Store in Animation mode data for specialized operations
          if (!this.animationMode.linkedLayers[layerName]) {
            this.animationMode.linkedLayers[layerName] = [];
          }
          
          // Avoid duplicate entries
          layersToLink.forEach(layerId => {
            if (!this.animationMode.linkedLayers[layerName].includes(layerId)) {
              this.animationMode.linkedLayers[layerName].push(layerId);
            }
          });
          
          console.log(`[LinkRegistry][autoLinkLayers] Created animation link group for "${layerName}" with ${layersToLink.length} layers in frame ${frameIndex}`);
        }
      });
    });
    
    // Third pass: update all frames with link information
    const updatedFramesByAdSize: Record<string, AnimationFrame[] | GifFrame[]> = {};
    
    Object.entries(framesByAdSize).forEach(([adSizeId, frames]) => {
      if (mode === 'animation') {
        updatedFramesByAdSize[adSizeId] = this.syncAnimationFrameLinkStates(frames as AnimationFrame[]);
      } else {
        updatedFramesByAdSize[adSizeId] = this.syncGifFrameLinkStates(frames as GifFrame[]);
      }
    });
    
    return updatedFramesByAdSize;
  }
}

// Export a singleton instance
export const linkRegistry = new LinkRegistry();