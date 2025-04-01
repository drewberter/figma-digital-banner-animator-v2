/**
 * Test utilities for the hiddenInTimeline feature
 */

import { AnimationLayer } from '../types/animation';
import { AnimationLayerWithUI } from '../types/animationExtensions';
import { testVisibilityConsistency } from './animation-visibility-fix';

/**
 * Sets up a global test function for hiddenInTimeline feature
 */
export function setupHiddenInTimelineTest(): void {
  if (typeof window !== 'undefined') {
    (window as any).testHiddenInTimeline = (layers: AnimationLayer[]) => {
      console.log('=== HIDDEN IN TIMELINE TEST ===');
      
      // First run the consistency test
      testVisibilityConsistency(layers);
      
      // Count layers with various states
      const stats = {
        total: 0,
        visible: 0,
        hidden: 0,
        hiddenInTimeline: 0
      };
      
      // Track layers with hiddenInTimeline property
      const hiddenInTimelineLayers: {
        id: string;
        name: string;
        path: string;
        visible: boolean;
        hiddenInTimeline: boolean;
      }[] = [];
      
      // Helper to process layers
      const processLayer = (layer: AnimationLayer, path: string = ''): void => {
        stats.total++;
        
        if (layer.visible) {
          stats.visible++;
        } else {
          stats.hidden++;
        }
        
        // Check for hiddenInTimeline property
        const layerWithUI = layer as AnimationLayerWithUI;
        if (layerWithUI.hiddenInTimeline === true) {
          stats.hiddenInTimeline++;
          
          hiddenInTimelineLayers.push({
            id: layer.id,
            name: layer.name,
            path: path ? `${path} > ${layer.name}` : layer.name,
            visible: layer.visible,
            hiddenInTimeline: true
          });
        }
        
        // Process children
        if (layer.children && layer.children.length > 0) {
          const newPath = path ? `${path} > ${layer.name}` : layer.name;
          layer.children.forEach(child => processLayer(child, newPath));
        }
      };
      
      // Process all layers
      layers.forEach(layer => processLayer(layer));
      
      // Log summary
      console.log('Summary:');
      console.log(`- Total layers: ${stats.total}`);
      console.log(`- Visible layers: ${stats.visible}`);
      console.log(`- Hidden layers: ${stats.hidden}`);
      console.log(`- Hidden in timeline only: ${stats.hiddenInTimeline}`);
      
      // Log details of layers hidden in timeline only
      if (hiddenInTimelineLayers.length > 0) {
        console.log('\nLayers hidden in timeline only:');
        hiddenInTimelineLayers.forEach(layer => {
          console.log(`- ${layer.name} (${layer.id}) at path: ${layer.path}`);
          console.log(`  visible: ${layer.visible}, hiddenInTimeline: ${layer.hiddenInTimeline}`);
        });
      }
      
      // Return stats for programmatic use
      return {
        stats,
        hiddenInTimelineLayers
      };
    };
    
    console.log('Added global testHiddenInTimeline function. Use window.testHiddenInTimeline(layers) to test.');
  }
}