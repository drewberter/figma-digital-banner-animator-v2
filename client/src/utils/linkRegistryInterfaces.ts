/**
 * Link Registry Interfaces
 */

import { AnimationLayer, GifFrame } from '../types/animation';

/**
 * Interface for a group of linked layers
 */
export interface LinkGroup {
  id: string;
  name: string;
  mainLayerId?: string;
  layerIds: string[];
  frameToLayerMap: { [frameId: string]: string };
  mode: 'animation' | 'gif';
}

/**
 * Registry for managing linked layers
 */
export class LinkRegistry {
  // Maps layer IDs to their group IDs
  private layerToGroupMap: { [layerId: string]: string } = {};
  
  // Maps group IDs to their link groups
  private groups: { [groupId: string]: LinkGroup } = {};
  
  // Initialization flag
  private initialized = false;
  
  /**
   * Initializes the registry
   */
  public initialize(): void {
    this.layerToGroupMap = {};
    this.groups = {};
    this.initialized = true;
    console.log('Link registry initialized');
  }
  
  /**
   * Checks if the registry is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Gets a link group by ID
   */
  public getGroup(groupId: string): LinkGroup | null {
    return this.groups[groupId] || null;
  }
  
  /**
   * Gets all link groups
   */
  public getAllGroups(): LinkGroup[] {
    return Object.values(this.groups);
  }
  
  /**
   * Gets the link group for a layer
   */
  public getLayerGroup(layerId: string): LinkGroup | null {
    const groupId = this.layerToGroupMap[layerId];
    return groupId ? this.groups[groupId] : null;
  }
  
  /**
   * Creates a new link group
   */
  public createGroup(
    name: string,
    mainLayerId?: string,
    mode: 'animation' | 'gif' = 'animation'
  ): LinkGroup {
    // Create a deterministic group ID based on the layer name and mode to ensure consistency
    // This ensures the same layer name always gets the same group ID within each mode
    // We'll use the layer name hash without the timestamp to make it fully deterministic
    const layerHash = name.toLowerCase().split('').reduce((hash, char) => char.charCodeAt(0) + ((hash << 5) - hash), 0);
    const seedValue = Math.abs(layerHash % 1000);
    const modeIndicator = mode === 'gif' ? 'g' : 'a';
    
    // Make group ID fully deterministic based on name and mode, removing the timestamp
    // to ensure the same layer name always gets exactly the same group ID
    const groupId = `link-group-${layerHash}-${seedValue}${modeIndicator}`;
    
    // Add detailed logging to help trace group creation
    console.log(`Creating link group with fully deterministic ID: ${groupId}`);
    console.log(`  - Layer name: "${name}" (hash: ${layerHash})`);
    console.log(`  - Mode: ${mode}, Main layer: ${mainLayerId || 'none'}`);
    console.log(`  - seedValue: ${seedValue}, modeIndicator: ${modeIndicator}`);
    
    const newGroup: LinkGroup = {
      id: groupId,
      name,
      mainLayerId,
      layerIds: mainLayerId ? [mainLayerId] : [],
      frameToLayerMap: {},
      mode
    };
    
    this.groups[groupId] = newGroup;
    
    if (mainLayerId) {
      this.layerToGroupMap[mainLayerId] = groupId;
    }
    
    console.log(`Created link group "${name}" with ID ${groupId}`);
    return newGroup;
  }
  
  /**
   * Adds a layer to a link group
   */
  public addLayerToGroup(
    groupId: string,
    layerId: string,
    frameId?: string
  ): boolean {
    const group = this.groups[groupId];
    if (!group) {
      console.error(`Link group ${groupId} not found`);
      return false;
    }
    
    // Add to group's layers
    if (!group.layerIds.includes(layerId)) {
      group.layerIds.push(layerId);
    }
    
    // Set the mapping
    this.layerToGroupMap[layerId] = groupId;
    
    // If frame ID is provided, add to the frame map
    if (frameId) {
      group.frameToLayerMap[frameId] = layerId;
    }
    
    console.log(`Added layer ${layerId} to group "${group.name}"`);
    return true;
  }
  
  /**
   * Removes a layer from its link group
   */
  public removeLayer(layerId: string): boolean {
    const groupId = this.layerToGroupMap[layerId];
    if (!groupId) {
      console.error(`Layer ${layerId} is not in any link group`);
      return false;
    }
    
    const group = this.groups[groupId];
    if (!group) {
      console.error(`Link group ${groupId} not found`);
      return false;
    }
    
    // Remove from group's layers
    group.layerIds = group.layerIds.filter(id => id !== layerId);
    
    // Remove from frame map
    for (const frameId in group.frameToLayerMap) {
      if (group.frameToLayerMap[frameId] === layerId) {
        delete group.frameToLayerMap[frameId];
      }
    }
    
    // Remove from layer map
    delete this.layerToGroupMap[layerId];
    
    // If this was the main layer, set a new one
    if (group.mainLayerId === layerId) {
      group.mainLayerId = group.layerIds[0];
    }
    
    // If the group is now empty, remove it
    if (group.layerIds.length === 0) {
      delete this.groups[groupId];
      console.log(`Removed empty link group "${group.name}"`);
    } else {
      console.log(`Removed layer ${layerId} from group "${group.name}"`);
    }
    
    return true;
  }
  
  /**
   * Gets all layers in the same group as a layer
   */
  public getLinkedLayers(
    layerId: string,
    allLayers: Record<string, AnimationLayer[]>
  ): AnimationLayer[] {
    const groupId = this.layerToGroupMap[layerId];
    if (!groupId) {
      return [];
    }
    
    const group = this.groups[groupId];
    if (!group) {
      return [];
    }
    
    const result: AnimationLayer[] = [];
    
    // Helper function to find a layer by ID
    const findLayerById = (
      layers: AnimationLayer[],
      id: string
    ): AnimationLayer | null => {
      for (const layer of layers) {
        if (layer.id === id) {
          return layer;
        }
        if (layer.children) {
          const found = findLayerById(layer.children, id);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };
    
    // Find each linked layer
    group.layerIds.forEach(id => {
      // Skip the source layer
      if (id === layerId) {
        return;
      }
      
      // Find the layer in all frame layers
      for (const frameId in allLayers) {
        const layers = allLayers[frameId];
        const layer = findLayerById(layers, id);
        if (layer) {
          result.push(layer);
          break;
        }
      }
    });
    
    return result;
  }
  
  /**
   * Checks if two layers are linked
   */
  public areLayersLinked(layerId1: string, layerId2: string): boolean {
    const groupId1 = this.layerToGroupMap[layerId1];
    const groupId2 = this.layerToGroupMap[layerId2];
    
    return groupId1 !== undefined && groupId1 === groupId2;
  }
  
  /**
   * Serializes the registry to JSON
   */
  public serialize(): string {
    return JSON.stringify({
      layerToGroupMap: this.layerToGroupMap,
      groups: this.groups,
      initialized: this.initialized
    });
  }
  
  /**
   * Deserializes from JSON
   */
  public deserialize(json: string): void {
    try {
      const data = JSON.parse(json);
      this.layerToGroupMap = data.layerToGroupMap || {};
      this.groups = data.groups || {};
      this.initialized = data.initialized || false;
      console.log('Link registry deserialized');
    } catch (error) {
      console.error('Error deserializing link registry:', error);
    }
  }
}