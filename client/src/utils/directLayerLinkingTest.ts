/**
 * Test utility to verify layer linking is working correctly
 */
import { GifFrame, AnimationLayer } from '../types/animation';
import { buildDirectLinkTable, hasVisibilityOverride, getDirectLinkTable } from './directLayerLinking-fixed';
import { parseGifFrameId } from './linkingUtils';

export function testLayerLinking(
  gifFrames: GifFrame[],
  targetLayerName?: string
): void {
  // Clear console for cleaner output
  console.clear();
  console.log('%c === GIF FRAME LAYER LINKING TEST ===', 'background: #333; color: #fff; padding: 5px; font-weight: bold;');
  
  // Build the link table
  buildDirectLinkTable(gifFrames);
  
  // Log all frames
  console.log(`Total frames: ${gifFrames.length}`);
  
  // Parse each frame for better debugging
  const framesByNumber: Record<string, GifFrame[]> = {};
  
  gifFrames.forEach(frame => {
    const parsedId = parseGifFrameId(frame.id);
    if (parsedId.isValid) {
      const { frameNumber, adSizeId } = parsedId;
      
      if (!framesByNumber[frameNumber]) {
        framesByNumber[frameNumber] = [];
      }
      
      framesByNumber[frameNumber].push(frame);
      
      console.log(`Frame: ${frame.id} (Number: ${frameNumber}, AdSize: ${adSizeId})`);
    } else {
      console.log(`Frame with invalid ID format: ${frame.id}`);
    }
  });
  
  // Log frames grouped by number
  console.log('Frames grouped by frame number:');
  Object.entries(framesByNumber).forEach(([number, frames]) => {
    console.log(`  Frame Number ${number}: ${frames.length} frames across ad sizes`);
  });
  
  // Find and log all unique layer names across frames
  const allLayerNames = new Set<string>();
  const layerNameCounts: Record<string, number> = {};
  
  // Helper to process layers recursively
  const processLayers = (layers: AnimationLayer[] | undefined) => {
    if (!layers) return;
    
    layers.forEach(layer => {
      if (layer.name) {
        const normalizedName = layer.name.toLowerCase();
        allLayerNames.add(normalizedName);
        
        if (!layerNameCounts[normalizedName]) {
          layerNameCounts[normalizedName] = 0;
        }
        
        layerNameCounts[normalizedName]++;
      }
      
      // Process children
      if (layer.children) {
        processLayers(layer.children);
      }
    });
  };
  
  // Process all frames
  gifFrames.forEach(frame => {
    processLayers(frame.layers);
  });
  
  // Log layer names and counts
  console.log(`Found ${allLayerNames.size} unique layer names across all frames:`);
  
  const sortedNames = Object.entries(layerNameCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
  
  sortedNames.forEach(({ name, count }) => {
    console.log(`  "${name}": appears ${count} times`);
  });
  
  // If a specific layer name was provided, analyze it in detail
  if (targetLayerName) {
    const normalizedTargetName = targetLayerName.toLowerCase();
    
    console.log(`%c DETAILED ANALYSIS FOR LAYER: "${targetLayerName}" `, 'background: #007acc; color: #fff; padding: 3px;');
    
    if (!layerNameCounts[normalizedTargetName]) {
      console.log(`No layers found with name "${targetLayerName}"`);
      return;
    }
    
    // Find all instances of this layer across frames
    interface LayerInstance {
      frameId: string;
      layerId: string;
      frameNumber: string;
      adSizeId: string;
      isVisible: boolean;
      hasOverride: boolean;
      isLinked: boolean;
      path: string[];
    }
    
    const instances: LayerInstance[] = [];
    
    // Helper to find layers with the target name
    const findLayersByName = (
      layers: AnimationLayer[] | undefined, 
      frameId: string,
      frame: GifFrame,
      parentPath: string[] = []
    ) => {
      if (!layers) return;
      
      layers.forEach(layer => {
        if (layer.name && layer.name.toLowerCase() === normalizedTargetName) {
          const parsedId = parseGifFrameId(frameId);
          const path = [...parentPath, layer.name];
          
          instances.push({
            frameId,
            layerId: layer.id,
            frameNumber: parsedId.isValid ? String(parsedId.frameNumber) : 'unknown',
            adSizeId: parsedId.isValid ? parsedId.adSizeId : 'unknown',
            isVisible: !(frame.hiddenLayers || []).includes(layer.id),
            hasOverride: hasVisibilityOverride(frame, layer.id),
            isLinked: !!layer.isLinked || !!layer.linkedLayer,
            path
          });
        }
        
        // Process children
        if (layer.children) {
          findLayersByName(layer.children, frameId, frame, [...parentPath, layer.name || 'unnamed']);
        }
      });
    };
    
    // Process all frames
    gifFrames.forEach(frame => {
      findLayersByName(frame.layers, frame.id, frame);
    });
    
    // Group by frame number
    const instancesByFrameNumber: Record<string, LayerInstance[]> = {};
    
    instances.forEach(instance => {
      if (!instancesByFrameNumber[instance.frameNumber]) {
        instancesByFrameNumber[instance.frameNumber] = [];
      }
      
      instancesByFrameNumber[instance.frameNumber].push(instance);
    });
    
    // Log instances grouped by frame number
    console.log(`Found ${instances.length} instances of layer "${targetLayerName}" across frames:`);
    
    Object.entries(instancesByFrameNumber).forEach(([frameNumber, frameInstances]) => {
      console.log(`%c Frame Number ${frameNumber}: ${frameInstances.length} instances `, 'background: #444; color: #fff;');
      
      frameInstances.forEach(instance => {
        const bgColor = instance.isVisible ? '#060' : '#600';
        const linkIcon = instance.isLinked ? '🔗' : '⛓️';
        const overrideIcon = instance.hasOverride ? '🔒' : '';
        
        console.log(
          `%c ${instance.isVisible ? 'VISIBLE' : 'HIDDEN'} %c ${linkIcon} %c ${overrideIcon} `,
          `background: ${bgColor}; color: #fff; padding: 2px;`,
          'background: #007; color: #fff; padding: 2px;',
          'background: #700; color: #fff; padding: 2px;',
          `Ad Size: ${instance.adSizeId}, Path: ${instance.path.join(' > ')}, ID: ${instance.layerId}`
        );
      });
      
      // Check if visibility is consistent across instances in this frame number
      const allVisible = frameInstances.every(i => i.isVisible);
      const allHidden = frameInstances.every(i => !i.isVisible);
      
      if (allVisible) {
        console.log(`%c ✅ CONSISTENT (all visible) `, 'background: #060; color: #fff;');
      } else if (allHidden) {
        console.log(`%c ✅ CONSISTENT (all hidden) `, 'background: #060; color: #fff;');
      } else {
        console.log(`%c ❌ INCONSISTENT VISIBILITY `, 'background: #900; color: #fff;');
        
        // Log visibility map for easier debugging
        const visMap = frameInstances.map(i => 
          `${i.adSizeId}: ${i.isVisible ? 'visible' : 'hidden'}${i.hasOverride ? ' (overridden)' : ''}`
        ).join(', ');
        
        console.log(`Visibility Map: ${visMap}`);
      }
    });
    
    // Direct link table info
    console.log('Direct link table entries for this layer:');
    
    // Get access to the direct link table via the getter function
    const linkTable = getDirectLinkTable();
    
    Object.entries(linkTable).forEach(([name, frameMap]) => {
      if (name.toLowerCase() === normalizedTargetName) {
        console.log(`  Link table entry for "${name}":`);
        // Ensure proper typing with the as keyword for Object.entries
        (Object.entries(frameMap) as [string, string][]).forEach(([frameId, layerId]) => {
          const frame = gifFrames.find(f => f.id === frameId);
          const isVisible = frame && frame.hiddenLayers ? 
            !frame.hiddenLayers.includes(layerId) : 
            true;
          
          console.log(`    Frame ${frameId} → Layer ${layerId} (${isVisible ? 'visible' : 'hidden'})`);
        });
      }
    });
  }
  
  console.log('%c === TEST COMPLETE ===', 'background: #333; color: #fff; padding: 5px; font-weight: bold;');
}

// Add a global function for easy testing from the browser console
if (typeof window !== 'undefined') {
  (window as any).testLayerLinking = (layerName?: string) => {
    // This assumes you have access to gifFrames from somewhere
    // You'll need to adapt this to your application structure
    const frames = (window as any).getGifFrames?.() || [];
    testLayerLinking(frames, layerName);
  };
  
  console.log('Added global testLayerLinking function to window. Call window.testLayerLinking("layer name") to analyze layer linking');
}

// Helper function to verify container link display icons are correctly shown
export function verifyContainerLinkDisplay(frames: GifFrame[]): void {
  console.log('Verifying container link display...');
  buildDirectLinkTable(frames);
  
  frames.forEach(frame => {
    if (!frame.layers) return;
    
    const findContainers = (layers: AnimationLayer[], path: string = '') => {
      layers.forEach(layer => {
        if (layer.children && layer.children.length > 0) {
          const newPath = path ? `${path} > ${layer.name}` : layer.name || '';
          console.log(`Container: ${layer.name} (ID: ${layer.id}, Path: ${newPath})`);
          
          // Check if any children are linked
          const hasLinkedChildren = layer.children.some(child => 
            child.isLinked || (child.children && child.children.some(c => c.isLinked))
          );
          
          if (hasLinkedChildren) {
            console.log(`✅ Container ${layer.name} has linked children - should show link icon`);
          } else {
            console.log(`❌ Container ${layer.name} has NO linked children - should NOT show link icon`);
          }
          
          findContainers(layer.children, newPath);
        }
      });
    };
    
    console.log(`Analyzing frame: ${frame.id}`);
    findContainers(frame.layers);
  });
}