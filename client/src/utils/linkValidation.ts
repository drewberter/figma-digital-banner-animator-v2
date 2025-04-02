/**
 * Layer Linking Validation Utilities
 * 
 * Provides debugging and validation tools for layer linking
 */

import { AnimationLayer, GifFrame, TimelineMode } from '../types/animation';
import { isGifModeLink, isAnimationModeLink } from './layerLinkUtils';

/**
 * Run comprehensive validation on layer linking
 * Identifies inconsistencies between link state, properties, and group associations
 * 
 * @param layers The layers to validate
 * @param mode Current timeline mode
 * @returns Array of validation errors/warnings
 */
export function validateLayerLinking(layers: AnimationLayer[], mode: TimelineMode): string[] {
  const issues: string[] = [];
  const linkGroups: Record<string, { ids: string[], names: string[] }> = {};
  
  // Helper function to check a single layer
  const validateLayer = (layer: AnimationLayer, path: string = ''): void => {
    const currentPath = path ? `${path} > ${layer.name}` : layer.name;
    
    // Check for inconsistent link properties
    if (layer.isLinked && !layer.locked) {
      issues.push(`${currentPath} (${layer.id}): Layer is marked as linked but not locked.`);
    }
    
    if (layer.locked && !layer.isLinked && layer.linkedLayer) {
      issues.push(`${currentPath} (${layer.id}): Layer is locked with linkedLayer but isLinked=false.`);
    }
    
    if (layer.isLinked && !layer.linkedLayer) {
      issues.push(`${currentPath} (${layer.id}): Layer is marked as linked but missing linkedLayer object.`);
    }
    
    // Check for correct mode linking (GIF vs Animation)
    if (layer.linkedLayer) {
      const groupId = layer.linkedLayer.groupId || '';
      const expectedMode = mode === 'gifFrames' ? 'GIF' : 'Animation';
      const actualMode = isGifModeLink(groupId) ? 'GIF' : (isAnimationModeLink(groupId) ? 'Animation' : 'Unknown');
      
      if (mode === 'gifFrames' && !isGifModeLink(groupId)) {
        issues.push(`${currentPath} (${layer.id}): Using ${actualMode} mode link (${groupId}) in ${expectedMode} mode.`);
      }
      
      if (mode === 'animation' && !isAnimationModeLink(groupId) && isGifModeLink(groupId)) {
        issues.push(`${currentPath} (${layer.id}): Using ${actualMode} mode link (${groupId}) in ${expectedMode} mode.`);
      }
      
      // Track link groups for group-level checks
      if (groupId && !linkGroups[groupId]) {
        linkGroups[groupId] = { ids: [], names: [] };
      }
      
      if (groupId) {
        linkGroups[groupId].ids.push(layer.id);
        linkGroups[groupId].names.push(layer.name || 'Unnamed Layer');
      }
    }
    
    // Check children recursively
    if (layer.children && layer.children.length > 0) {
      layer.children.forEach(child => validateLayer(child, currentPath));
    }
  };
  
  // Process all layers
  layers.forEach(layer => validateLayer(layer));
  
  // Group-level validations
  Object.entries(linkGroups).forEach(([groupId, group]) => {
    // Check that all layers in the same group have the same name
    const uniqueNames = Array.from(new Set(group.names));
    if (uniqueNames.length > 1) {
      issues.push(`Group ${groupId}: Contains layers with different names: ${uniqueNames.join(', ')}.`);
    }
    
    // Check if the group has at least one main layer
    const hasMainLayer = layers.some(layer => {
      if (!layer.linkedLayer) return false;
      return layer.linkedLayer.groupId === groupId && layer.linkedLayer.isMain === true;
    });
    
    if (!hasMainLayer && group.ids.length > 0) {
      issues.push(`Group ${groupId}: No layer is marked as main (isMain=true).`);
    }
  });
  
  return issues;
}

/**
 * Add validation utilities to the window object for testing
 */
export function exposeValidationTools(): void {
  if (typeof window !== 'undefined') {
    (window as any).validateLayerLinking = validateLayerLinking;
    
    // Convenience function to validate current layers and log results
    (window as any).checkLayerLinking = (layers: AnimationLayer[], mode: TimelineMode) => {
      const issues = validateLayerLinking(layers, mode);
      
      console.log(`==== LAYER LINKING VALIDATION (${mode} mode) ====`);
      
      if (issues.length === 0) {
        console.log('✅ No issues found.');
        return true;
      } else {
        console.log(`❌ Found ${issues.length} issues:`);
        issues.forEach((issue, index) => {
          console.log(`${index + 1}. ${issue}`);
        });
        return false;
      }
    };
    
    console.log('Layer link validation tools added to window. Use window.checkLayerLinking(layers, mode) to run validation.');
  }
} 