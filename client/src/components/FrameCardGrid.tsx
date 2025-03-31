import { useState, useEffect } from 'react';
import { Plus, Eye, EyeOff, Copy, Trash2, Edit, Clock } from 'lucide-react';
import { AnimationFrame, AnimationLayer, GifFrame } from '../types/animation';
import { v4 as uuidv4 } from 'uuid';
import { parseGifFrameId } from '../utils/linkingUtils';
import { useAnimationContext } from '../context/AnimationContext';
import { debugLog, errorLog } from '../utils/linkSyncManager';
import { mockFrames, mockLayers } from '../mock/animationData';

interface FrameCardGridProps {
  frames: Record<string, AnimationFrame>;
  layers: Record<string, AnimationLayer[]>;
  selectedFrameId: string | null;
  onFrameSelect: (frameId: string) => void;
  onToggleLayerVisibility: (frameId: string, layerId: string) => void;
  onAddFrame: () => void;
  onDuplicateFrame: (frameId: string) => void;
  onDeleteFrame: (frameId: string) => void;
  onDelayChange?: (frameId: string, delay: number) => void;
  onToggleLayerOverride?: (layerId: string) => void;
  onToggleLayerLock?: (layerId: string) => void;
}

/**
 * Enhanced helper function to get or generate layers for a frame
 * - Handles both regular frames and GIF frames
 * - Ensures layer hierarchy consistency
 * - Caches generated layer trees in GIF frames for better performance
 * - Preserves container expansion states
 */
const getLayersForFrame = (
  frameId: string, 
  layersMap: Record<string, AnimationLayer[]>, 
  frames?: Record<string, AnimationFrame>
): AnimationLayer[] => {
  const frame = frames ? frames[frameId] : undefined;
  
  // Handle GIF frames
  if (frameId.startsWith('gif-frame-')) {
    // Cast to GifFrame to access GIF-specific properties
    const gifFrame = frame as unknown as GifFrame;
    
    // If the GIF frame already has a valid layers array, use it directly
    if (gifFrame?.layers && Array.isArray(gifFrame.layers) && gifFrame.layers.length > 0) {
      console.log(`FrameCardGrid: Using existing layers array for frame ${frameId} with ${gifFrame.layers.length} layers`);
      
      // Ensure layer.visible property matches hiddenLayers array
      if (gifFrame.hiddenLayers && Array.isArray(gifFrame.hiddenLayers)) {
        const hiddenLayers = gifFrame.hiddenLayers;
        const updatedLayers = gifFrame.layers.map(layer => {
          // Create a proper layer copy
          const updatedLayer = { ...layer };
          
          // Set visibility based on hiddenLayers
          updatedLayer.visible = !hiddenLayers.includes(layer.id);
          
          // For GIF frames, we need to modify the linked layer property to separate GIF mode from animation mode
          // This prevents cross-mode linking which causes animation bugs
          if (updatedLayer.linkedLayer) {
            // Get the linked group ID to identify what type of linking this is
            const linkedGroupId = updatedLayer.linkedLayer.groupId || '';
            
            // If this is an animation mode link (not a GIF frame internal link), remove it
            // GIF frame links typically have 'gif-link-' prefix
            if (!linkedGroupId.startsWith('gif-link-')) {
              console.log(`FrameCardGrid: Removing animation mode link from GIF frame layer ${updatedLayer.name} (${updatedLayer.id})`);
              delete updatedLayer.linkedLayer;
              updatedLayer.locked = false;
            } else {
              // It's an internal GIF mode link, preserve it
              updatedLayer.locked = true;
              console.log(`FrameCardGrid: Preserving GIF-specific link for ${updatedLayer.name} in existing layer array`);
            }
          }
          
          return updatedLayer;
        });
        
        // Update the GIF frame's layers array with the visibility-corrected version
        gifFrame.layers = updatedLayers;
      }
      
      return gifFrame.layers;
    }
    
    // Parse the frame ID to get information
    const parsedFrameId = parseGifFrameId(frameId);
    if (!parsedFrameId.isValid) {
      console.error("Invalid GIF frame ID format:", frameId);
      return [];
    }
    
    const { adSizeId, frameNumber } = parsedFrameId;
    console.log(`FrameCardGrid: Creating layers for GIF frame ${frameId}, adSizeId: ${adSizeId}, frameNumber: ${frameNumber}`);
    
    // Get parent layers from the ad size
    const parentLayers = layersMap[adSizeId] || [];
    
    // Create a deep clone of the parent layers to avoid reference issues
    // Pass true to indicate these layers are for a GIF frame (to prevent cross-mode linking)
    const clonedLayers = deepCloneLayersWithStructure(parentLayers, true);
    
    // Apply visibility based on hiddenLayers array
    if (gifFrame?.hiddenLayers && Array.isArray(gifFrame.hiddenLayers)) {
      const hiddenLayerIds = [...gifFrame.hiddenLayers];
      
      const applyVisibility = (layer: AnimationLayer) => {
        layer.visible = !hiddenLayerIds.includes(layer.id);
        
        if (layer.children && Array.isArray(layer.children)) {
          layer.children.forEach(applyVisibility);
        }
        return layer;
      };
      
      clonedLayers = clonedLayers.map(applyVisibility);
        
        // For GIF frames, we need to modify the linked layer property to separate GIF mode from animation mode
        // Make sure we only have GIF mode links (with 'gif-link-' prefix) in GIF frames
        if (updatedLayer.linkedLayer) {
          // Get the linked group ID
          const linkedGroupId = updatedLayer.linkedLayer.groupId || '';
          
          // If this is an animation mode link (not a GIF frame internal link), remove it
          if (!linkedGroupId.startsWith('gif-link-')) {
            console.log(`FrameCardGrid: Removing animation mode link from new GIF frame layer ${updatedLayer.name} (${updatedLayer.id})`);
            delete updatedLayer.linkedLayer;
            updatedLayer.locked = false;
          } else {
            // It's an internal GIF mode link, preserve it
            updatedLayer.locked = true;
            console.log(`FrameCardGrid: Preserving GIF-specific link for ${updatedLayer.name} in newly created layer array`);
          }
        }
        
        return updatedLayer;
      });
      
      // Store the updated layers in the GIF frame
      gifFrame.layers = layersWithVisibility;
      
      console.log(`FrameCardGrid: Created ${layersWithVisibility.length} layers for frame ${frameId} with correct visibility`);
      return layersWithVisibility;
    }
    
    // If this is a new frame without layers, initialize with parent layers but set all to visible
    if (!gifFrame.layers) {
      gifFrame.layers = clonedLayers;
      console.log(`FrameCardGrid: Initialized layers array for frame ${frameId} with ${clonedLayers.length} layers`);
      return gifFrame.layers;
    }
    
    return clonedLayers;
  }
  
  // Regular ad size frame, return its layers directly
  return layersMap[frameId] || [];
};

/**
 * Deep clone layers with their hierarchy structure
 * Important for preserving container relationships
 */
const deepCloneLayersWithStructure = (layers: AnimationLayer[], isForGifFrame: boolean = false): AnimationLayer[] => {
  return layers.map(layer => {
    // Create a proper deep clone, including all properties
    const clonedLayer = { ...layer };
    
    if (isForGifFrame) {
      // STRICT ENFORCEMENT OF MODE SEPARATION:
      // For GIF mode, we need to deliberately discard ALL Animation Mode link properties
      // and ONLY preserve GIF mode links (those with "gif-link-" prefix)
      if (layer.linkedLayer) {
        const groupId = layer.linkedLayer.groupId;
        
        // A valid GIF mode link MUST start with "gif-link-" prefix
        const isGifModeLink = groupId && groupId.startsWith('gif-link-');
        
        if (!isGifModeLink) {
          console.log(`FrameCardGrid: PURGING animation mode link for ${layer.name} (${layer.id}) in GIF frame - STRICT MODE SEPARATION`);
          
          // COMPLETELY remove animation mode linkedLayer property in GIF frame mode
          delete clonedLayer.linkedLayer;
          
          // Reset locked status - animation mode locks have NO EFFECT in GIF mode
          clonedLayer.locked = false;
        } else {
          console.log(`FrameCardGrid: Preserving GIF mode link for ${layer.name} (${layer.id}) in GIF frame - groupId: ${layer.linkedLayer.groupId}`);
          
          // Keep GIF-specific links as they are
          clonedLayer.locked = true; // Ensure locked status for GIF mode links
        }
      }
    } else {
      // Regular animation mode - preserve linkedLayer property if it exists
      if (layer.linkedLayer) {
        clonedLayer.linkedLayer = { ...layer.linkedLayer };
        
        // Ensure the layer is marked as locked if it has a linkedLayer
        clonedLayer.locked = true;
        
        console.log(`FrameCardGrid: Preserving link for ${layer.name} in newly created layer array`);
      }
    }
    
    // Clone children if they exist
    if (layer.children && layer.children.length > 0) {
      clonedLayer.children = deepCloneLayersWithStructure(layer.children, isForGifFrame);
    }
    
    return clonedLayer;
  });
};

const FrameCardGrid = ({
  frames,
  layers,
  selectedFrameId,
  onFrameSelect,
  onToggleLayerVisibility,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onDelayChange,
  onToggleLayerOverride,
  onToggleLayerLock
}: FrameCardGridProps) => {
  // Create an array of frame entries for easier mapping
  const frameEntries = Object.entries(frames).map(([id, frame]) => ({
    ...frame
  }));
  
  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto max-h-[calc(100vh-180px)]">
      {/* Frame cards */}
      {frameEntries.map((frame) => (
        <FrameCard 
          key={frame.id}
          frame={frame}
          layers={getLayersForFrame(frame.id, layers, frames)}
          isSelected={frame.id === selectedFrameId}
          onSelect={() => onFrameSelect(frame.id)}
          onToggleLayerVisibility={(frameId, layerId) => onToggleLayerVisibility(frameId, layerId)}
          onDuplicate={() => onDuplicateFrame(frame.id)}
          onDelete={() => onDeleteFrame(frame.id)}
          onDelayChange={onDelayChange}
          onToggleLayerLock={onToggleLayerLock}
        />
      ))}

      {/* Add frame card */}
      <div 
        className="border border-dashed border-neutral-700 bg-neutral-900 rounded-md h-[220px] flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-800 hover:border-neutral-600 transition-colors"
        onClick={onAddFrame}
      >
        <Plus size={24} className="text-neutral-400 mb-2" />
        <span className="text-sm text-neutral-400">Add New Frame</span>
      </div>
    </div>
  );
};

interface FrameCardProps {
  frame: AnimationFrame;
  layers: AnimationLayer[];
  isSelected: boolean;
  onSelect: () => void;
  onToggleLayerVisibility: (frameId: string, layerId: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDelayChange?: (frameId: string, delay: number) => void;
  onToggleLayerLock?: (layerId: string) => void;
}

const FrameCard = ({
  frame,
  layers,
  isSelected,
  onSelect,
  onToggleLayerVisibility,
  onDuplicate,
  onDelete,
  onDelayChange,
  onToggleLayerLock
}: FrameCardProps) => {
  // If this is a GIF frame, we want to collapse properties by default
  const [isLayerListOpen, setIsLayerListOpen] = useState(false);
  const [showDelayInput, setShowDelayInput] = useState(false);
  const [delay, setDelay] = useState(frame.delay || 0);
  
  // Get the visibility counter and increment function from context to force re-renders
  const { visibilityUpdateCount, forceTimelineRefresh } = useAnimationContext();

  // Extract frame number for GIF frames using our new parser
  const getFrameNumber = (frameId: string): string | null => {
    if (!frameId.startsWith('gif-frame-')) return null;
    
    const parsedId = parseGifFrameId(frameId);
    return parsedId.isValid ? parsedId.frameNumber : null;
  };
  
  // Extract and display frame number for UI
  const frameNumber = getFrameNumber(frame.id);
  
  // State to track which layer groups are expanded
  const [expandedLayerGroups, setExpandedLayerGroups] = useState<Record<string, boolean>>({});
  
  // Toggle expanded state for layer groups
  const toggleLayerGroupExpanded = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Update UI state
    setExpandedLayerGroups(prev => ({
      ...prev,
      [layerId]: !prev[layerId]
    }));
    
    // Also update the layer data structure
    const updateLayerExpansion = (layers: AnimationLayer[]): AnimationLayer[] => {
      return layers.map(layer => {
        // If this is the target layer, toggle its expanded state
        if (layer.id === layerId) {
          const newExpandedState = !expandedLayerGroups[layerId];
          
          // Also update the actual layer object for persistence
          layer.isExpanded = newExpandedState;
          
          return { ...layer, isExpanded: newExpandedState };
        }
        
        // Recursively update children if they exist
        if (layer.children && layer.children.length > 0) {
          return { 
            ...layer, 
            children: updateLayerExpansion(layer.children) 
          };
        }
        
        // For other layers, just return them unchanged
        return layer;
      });
    };
    
    // Update the layer data with the new expansion states
    const updatedLayers = updateLayerExpansion([...layers]);
    
    // Log the change for debugging
    console.log(`FrameCardGrid: Toggled layer ${layerId} expansion state`);
  };
  
  // Recursive function to render layer items with hierarchy
  const renderLayerItem = (layer: AnimationLayer, frameId: string, depth: number) => {
    const isGroup = layer.isGroup || layer.isFrame;
    const hasChildren = layer.children && layer.children.length > 0;
    
    // Get or initialize expanded state
    const isExpanded = layer.isExpanded !== undefined 
      ? layer.isExpanded 
      : (expandedLayerGroups[layer.id] || false);
    
    // Calculate padding based on hierarchy depth for proper indentation
    const indentPadding = 8 + (depth * 12);
    
    // Render the layer header (common between expanded and collapsed groups)
    const layerHeader = (
      <div className="flex items-center justify-between px-3 py-1.5 hover:bg-neutral-700">
        <div className="flex items-center flex-1 min-w-0">
          {/* Expand/collapse button for groups */}
          {isGroup && hasChildren ? (
            <button
              className="mr-1 text-neutral-400 hover:text-neutral-200"
              onClick={(e) => toggleLayerGroupExpanded(layer.id, e)}
              style={{ marginLeft: `${indentPadding}px` }}
            >
              <svg 
                width="10" 
                height="10" 
                viewBox="0 0 10 10" 
                className="text-neutral-400"
                style={{ 
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
                  transition: 'transform 0.2s ease' 
                }}
              >
                <path d="M3 1L7 5L3 9" stroke="currentColor" fill="none" strokeWidth="1.5" />
              </svg>
            </button>
          ) : (
            <div style={{ marginLeft: `${indentPadding + 10}px` }}></div>
          )}
          
          {/* Layer name */}
          <span 
            className={`text-xs truncate ${isExpanded ? 'font-medium text-neutral-200' : 'text-neutral-300'}`}
          >
            {layer.name}
          </span>
        </div>
        
        {/* Layer controls: Link/Unlink toggle and Visibility toggle */}
        <div className="flex items-center space-x-1">
          {/* Link/Unlink button - Enhanced to support both linkedLayer and locked properties */}
          <button
            className={`p-1 rounded ${(layer.linkedLayer || layer.locked) ? 'bg-opacity-60 bg-blue-900 px-1 py-0.5 rounded-sm text-blue-500' : 'text-neutral-500'}`}
            onClick={(e) => {
              e.stopPropagation();
              
              // Enhanced logging to show both lock properties to help debug inconsistencies
              console.log(`FrameCardGrid: Toggle link state for layer ${layer.id}`, {
                name: layer.name,
                locked: layer.locked,
                linkedLayer: !!layer.linkedLayer,
                linkedLayerDetails: layer.linkedLayer || 'none'
              });
              
              // Let the parent component handle state updates properly
              if (onToggleLayerLock) {
                console.log(`FrameCardGrid: Calling onToggleLayerLock for layer ${layer.id}`);
                
                try {
                  // First check if this is a GIF frame
                  const isGifFrame = frameId.startsWith('gif-frame-');
                  const currentMode = isGifFrame ? 'gif' : 'animation';
                  
                  // Always process the toggle regardless of whether we find matching layers
                  // This ensures the UI is responsive and the icon actually toggles
                  
                  // Log the current link status
                  if (layer.linkedLayer || layer.locked) {
                    console.log(`FrameCardGrid: Unlinking layer ${layer.name} (${layer.id}) in ${currentMode} mode`);
                  } else {
                    console.log(`FrameCardGrid: Linking layer ${layer.name} (${layer.id}) in ${currentMode} mode`);
                    
                    // Verify if there are matching layers (just for logging, not blocking toggle)
                    let matchCount = 0;
                    
                    // Helper function to search for layer by name through all frames
                    const findAllLayersWithName = (layerName: string, skipFrameId: string, mode: 'gif' | 'animation'): string[] => {
                      const matchingLayerIds: string[] = [];
                      const frameIds = Object.keys(mockLayers).filter(fId => {
                        if (mode === 'gif') {
                          return fId.startsWith('gif-frame-') && fId !== skipFrameId;
                        } else {
                          return !fId.startsWith('gif-frame-') && fId !== skipFrameId;
                        }
                      });
                      
                      // Function to search nested layers
                      const searchNestedLayers = (layers: AnimationLayer[], targetName: string): string[] => {
                        const results: string[] = [];
                        
                        if (!layers || !Array.isArray(layers)) return results;
                        
                        for (const l of layers) {
                          // Check this layer's name
                          if (l.name === targetName) {
                            results.push(l.id);
                          }
                          
                          // Check children recursively
                          if (l.children && Array.isArray(l.children)) {
                            results.push(...searchNestedLayers(l.children, targetName));
                          }
                        }
                        
                        return results;
                      };
                      
                      // Search through all frames
                      frameIds.forEach(fId => {
                        const frameLayers = mockLayers[fId] || [];
                        const found = searchNestedLayers(frameLayers, layerName);
                        matchingLayerIds.push(...found);
                      });
                      
                      return matchingLayerIds;
                    };
                    
                    // Find all layers with the same name in other frames
                    const matchingLayerIds = findAllLayersWithName(layer.name, frameId, currentMode);
                    matchCount = matchingLayerIds.length;
                    
                    if (matchCount > 0) {
                      console.log(`FrameCardGrid: Found ${matchCount} matching layers for "${layer.name}" in other frames:`, matchingLayerIds);
                    } else {
                      console.warn(`FrameCardGrid: No matching layers found for "${layer.name}" in other frames`);
                    }
                  }
                  
                  // Call the toggle function - this updates the link status in the context
                  onToggleLayerLock(layer.id);
                  
                  // Force a timeline refresh to ensure UI updates properly
                  forceTimelineRefresh();
                  
                  // Log success
                  debugLog('FrameCardGrid', `Link toggle executed for layer ${layer.name} (${layer.id})`);
                } catch (err) {
                  errorLog('FrameCardGrid', `Error toggling link for layer ${layer.id}: ${err}`);
                  console.error('Error in layer link toggle:', err);
                }
              } else {
                errorLog('FrameCardGrid', `No onToggleLayerLock callback defined for layer ${layer.id}`);
                console.warn(`FrameCardGrid: onToggleLayerLock is not defined for layer ${layer.id}`);
              }
            }}
            title={(layer.linkedLayer || layer.locked) ? 'Unlink layer' : 'Link layer'}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill={(layer.linkedLayer || layer.locked) ? "#4A7CFF" : "none"} 
              stroke={(layer.linkedLayer || layer.locked) ? "#4A7CFF" : "currentColor"} 
              strokeWidth={(layer.linkedLayer || layer.locked) ? "3" : "2"}
              strokeLinecap="round" 
              strokeLinejoin="round"
              className={(layer.linkedLayer || layer.locked) ? "filter drop-shadow-sm" : ""}
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
          </button>
          
          {/* Visibility toggle button - IMPROVED: separate components for better click handling */}
          {layer.visible ? (
            <button
              className="p-1 rounded text-green-400"
              onClick={(e) => {
                e.stopPropagation();
                
                // Additional debug for child layer visibility in expanded containers
                const isChild = !!layer.parentId;
                const parentIsExpanded = isChild && layer.parentId && (expandedLayerGroups[layer.parentId] || false);
                console.log(`🔍 FrameCardGrid: HIDING layer ${layer.name} (${layer.id}) - isChild=${isChild}, parentExpanded=${parentIsExpanded}`);
                
                // Enhanced debug logging for layer visibility toggle
                console.log(`FrameCardGrid: Toggle visibility for layer ${layer.id} in frame ${frameId} (current: visible)`);
                debugLog('VisibilityToggle', `Attempting to toggle ${layer.name} (${layer.id}) in frame ${frameId}`);
                
                // Log parent-child relationships for nested layers
                if (layer.parentId) {
                  debugLog('VisibilityToggle', `Layer ${layer.name} is a child of parent ID: ${layer.parentId}`);
                }
                
                if (layer.children && layer.children.length > 0) {
                  debugLog('VisibilityToggle', `Layer ${layer.name} has ${layer.children.length} children`);
                }
                
                // Check if we have a callback before attempting to toggle
                if (onToggleLayerVisibility) {
                  // IMPORTANT: Don't manipulate the layer visibility directly
                  // Let the AnimationContext handle the state update and synchronization
                  // This ensures proper cross-frame visibility syncing
                  onToggleLayerVisibility(frameId, layer.id);
                  debugLog('VisibilityToggle', `Callback executed for ${layer.name} visibility toggle`);
                } else {
                  errorLog('VisibilityToggle', `No visibility toggle callback available for layer ${layer.id}`);
                }
                
                // Force a timeline refresh to ensure UI updates properly
                forceTimelineRefresh();
              }}
              title="Hide layer"
            >
              <Eye size={14} />
            </button>
          ) : (
            <button
              className="p-1 rounded text-neutral-500"
              onClick={(e) => {
                e.stopPropagation();
                
                // Additional debug for child layer visibility in expanded containers
                const isChild = !!layer.parentId;
                const parentIsExpanded = isChild && layer.parentId && (expandedLayerGroups[layer.parentId] || false);
                console.log(`🔍 FrameCardGrid: SHOWING layer ${layer.name} (${layer.id}) - isChild=${isChild}, parentExpanded=${parentIsExpanded}`);
                
                // Enhanced debug logging for layer visibility toggle
                console.log(`FrameCardGrid: Toggle visibility for layer ${layer.id} in frame ${frameId} (current: hidden)`);
                debugLog('VisibilityToggle', `Attempting to toggle ${layer.name} (${layer.id}) in frame ${frameId}`);
                
                // Log parent-child relationships for nested layers
                if (layer.parentId) {
                  debugLog('VisibilityToggle', `Layer ${layer.name} is a child of parent ID: ${layer.parentId}`);
                }
                
                if (layer.children && layer.children.length > 0) {
                  debugLog('VisibilityToggle', `Layer ${layer.name} has ${layer.children.length} children`);
                }
                
                // Check if we have a callback before attempting to toggle
                if (onToggleLayerVisibility) {
                  // IMPORTANT: Don't manipulate the layer visibility directly
                  // Let the AnimationContext handle the state update and synchronization
                  // This ensures proper cross-frame visibility syncing
                  onToggleLayerVisibility(frameId, layer.id);
                  debugLog('VisibilityToggle', `Callback executed for ${layer.name} visibility toggle`);
                } else {
                  errorLog('VisibilityToggle', `No visibility toggle callback available for layer ${layer.id}`);
                }
                
                // Force a timeline refresh to ensure UI updates properly
                forceTimelineRefresh();
              }}
              title="Show layer"
            >
              <EyeOff size={14} />
            </button>
          )}
        </div>
      </div>
    );
    
    // For expanded groups with children, ONLY show the children (not the group header)
    // This matches exactly how the sidebar works in Animation mode
    if (isGroup && hasChildren && isExpanded) {
      return (
        <div key={layer.id} className="expanded-group">
          {/* Show a simplified container header with the container name */}
          <div className="flex items-center justify-between px-3 py-1 bg-neutral-900 text-neutral-400 border-b border-neutral-800">
            <div className="flex items-center flex-1 min-w-0" style={{ marginLeft: `${indentPadding}px` }}>
              <button
                className="mr-1 text-neutral-400 hover:text-neutral-200"
                onClick={(e) => toggleLayerGroupExpanded(layer.id, e)}
              >
                <svg 
                  width="10" 
                  height="10" 
                  viewBox="0 0 10 10" 
                  className="text-neutral-400"
                  style={{ 
                    transform: 'rotate(90deg)', 
                    transition: 'transform 0.2s ease' 
                  }}
                >
                  <path d="M3 1L7 5L3 9" stroke="currentColor" fill="none" strokeWidth="1.5" />
                </svg>
              </button>
              <span className="text-xs font-medium truncate text-neutral-300">
                {layer.name}
              </span>
            </div>
          </div>
          
          {/* Show children with proper indentation */}
          <div className="nested-children bg-neutral-850 border-b border-neutral-800">
            {layer.children?.map(child => {
              // Add parent relationship explicitly for better click handling
              const childWithParent = {
                ...child,
                parentId: layer.id // Ensure parentId is always set for child layers
              };
              return renderLayerItem(childWithParent, frameId, depth + 1);
            })}
          </div>
        </div>
      );
    }
    
    // For collapsed groups or regular layers
    return (
      <div key={layer.id}>
        {layerHeader}
      </div>
    );
  };
  
  return (
    <div 
      className={`bg-neutral-900 rounded-md overflow-hidden border-2 ${
        isSelected ? 'border-[#4A7CFF]' : 'border-transparent'
      } hover:border-[#4A7CFF] transition-colors`}
    >
      {/* Frame preview area */}
      <div 
        className="h-[140px] bg-neutral-800 flex items-center justify-center relative cursor-pointer overflow-hidden"
        onClick={onSelect}
      >
        {/* Interactive frame preview that shows visible layers */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Background */}
          {layers.find(l => l.name === 'Background' && l.visible) && (
            <div className="absolute inset-0 bg-blue-900"></div>
          )}
          
          {/* Content elements - stacked in the right order */}
          <div className="relative z-10 p-3 flex flex-col items-center justify-center w-full h-full">
            {/* Find headline including within nested children */}
            {(() => {
              // Helper function to search for a named layer in nested structure
              const findVisibleLayerByName = (layers: AnimationLayer[], name: string): boolean => {
                if (!layers || !Array.isArray(layers)) return false;
                
                // Check direct children first
                const directLayer = layers.find(l => l.name === name && l.visible);
                if (directLayer) return true;
                
                // Then check inside visible containers
                for (const layer of layers) {
                  if (layer.visible && layer.children && Array.isArray(layer.children)) {
                    const foundInChildren = findVisibleLayerByName(layer.children, name);
                    if (foundInChildren) return true;
                  }
                }
                
                return false;
              };
              
              // Look for Headline in all layers (direct or nested)
              if (findVisibleLayerByName(layers, 'Headline')) {
                return (
                  <div className="text-lg font-bold text-white mb-1 text-center">
                    {frame.headlineText || "Headline Text"}
                  </div>
                );
              }
              
              return null;
            })()}
            
            {/* Find subhead including within nested children */}
            {(() => {
              // Reuse findVisibleLayerByName from headline section
              const findVisibleLayerByName = (layers: AnimationLayer[], name: string): boolean => {
                if (!layers || !Array.isArray(layers)) return false;
                
                // Check direct children first
                const directLayer = layers.find(l => l.name === name && l.visible);
                if (directLayer) return true;
                
                // Then check inside visible containers
                for (const layer of layers) {
                  if (layer.visible && layer.children && Array.isArray(layer.children)) {
                    const foundInChildren = findVisibleLayerByName(layer.children, name);
                    if (foundInChildren) return true;
                  }
                }
                
                return false;
              };
              
              // Look for Subhead in all layers (direct or nested)
              if (findVisibleLayerByName(layers, 'Subhead')) {
                return (
                  <div className="text-xs text-white mb-2 text-center">
                    {frame.description || "Subhead description text"}
                  </div>
                );
              }
              
              return null;
            })()}
            
            {/* CTA Button */}
            {(() => {
              // Reuse findVisibleLayerByName from headline section
              const findVisibleLayerByName = (layers: AnimationLayer[], name: string): boolean => {
                if (!layers || !Array.isArray(layers)) return false;
                
                // Check direct children first
                const directLayer = layers.find(l => l.name === name && l.visible);
                if (directLayer) return true;
                
                // Then check inside visible containers
                for (const layer of layers) {
                  if (layer.visible && layer.children && Array.isArray(layer.children)) {
                    const foundInChildren = findVisibleLayerByName(layer.children, name);
                    if (foundInChildren) return true;
                  }
                }
                
                return false;
              };
              
              // Look for CTA Button in all layers (direct or nested)
              if (findVisibleLayerByName(layers, 'CTA Button')) {
                return (
                  <div className="bg-yellow-500 text-black text-xs px-2 py-1 rounded mb-2">
                    {frame.buttonText || "Shop Now"}
                  </div>
                );
              }
              
              return null;
            })()}
            
            {/* Logo - check both direct layer and nested layers */}
            {(() => {
              // Reuse findVisibleLayerByName from headline section
              const findVisibleLayerByName = (layers: AnimationLayer[], name: string): boolean => {
                if (!layers || !Array.isArray(layers)) return false;
                
                // Check direct children first
                const directLayer = layers.find(l => l.name === name && l.visible);
                if (directLayer) return true;
                
                // Then check inside visible containers
                for (const layer of layers) {
                  if (layer.visible && layer.children && Array.isArray(layer.children)) {
                    const foundInChildren = findVisibleLayerByName(layer.children, name);
                    if (foundInChildren) return true;
                  }
                }
                
                return false;
              };
              
              // Look for Logo in all layers (direct or nested)
              if (findVisibleLayerByName(layers, 'Logo')) {
                return (
                  <div className="mt-auto text-xs bg-white text-black px-2 py-1 rounded-full">
                    {frame.logoText || "LOGO"}
                  </div>
                );
              }
              
              return null;
            })()}
          </div>
        </div>

        {/* Frame dimensions overlay */}
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 rounded px-1 py-0.5 text-xs text-white">
          {`${frame.width} × ${frame.height}`}
        </div>

        {/* Frame info badge - Updated to count all layers including children */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full px-2 py-0.5 text-xs text-white">
          {(() => {
            // Recursive function to count all visible layers including nested ones
            const countVisibleLayers = (layerArray: AnimationLayer[]): number => {
              if (!layerArray || !Array.isArray(layerArray)) return 0;
              
              return layerArray.reduce((count, layer) => {
                // Add 1 if this layer is visible
                const thisLayerCount = layer.visible ? 1 : 0;
                
                // Add counts from children if they exist
                const childrenCount = layer.children && Array.isArray(layer.children) 
                  ? countVisibleLayers(layer.children) 
                  : 0;
                  
                return count + thisLayerCount + childrenCount;
              }, 0);
            };
            
            // Count total layers including all nested children
            const countAllLayers = (layerArray: AnimationLayer[]): number => {
              if (!layerArray || !Array.isArray(layerArray)) return 0;
              
              return layerArray.reduce((count, layer) => {
                // Count this layer
                let totalCount = 1;
                
                // Add counts from children if they exist
                if (layer.children && Array.isArray(layer.children)) {
                  totalCount += countAllLayers(layer.children);
                }
                  
                return count + totalCount;
              }, 0);
            };
            
            const visibleCount = countVisibleLayers(layers);
            const totalCount = countAllLayers(layers);
            
            return `${visibleCount}/${totalCount} visible`;
          })()}
        </div>
        
        {/* Frame number badge for GIF frames - simplified without link icon */}
        {frameNumber && (
          <div className="absolute top-2 left-2 bg-neutral-800 bg-opacity-80 rounded-full px-2 py-0.5 text-xs text-white">
            <span>Frame {frameNumber}</span>
          </div>
        )}
      </div>

      {/* Card controls */}
      <div className="p-3 border-t border-neutral-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-white truncate">{frame.name}</h3>
          <div className="flex space-x-1">
            <button 
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400"
              onClick={onDuplicate}
              title="Duplicate frame"
            >
              <Copy size={16} />
            </button>
            <button 
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400"
              onClick={onDelete}
              title="Delete frame"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Delay control */}
        <div className="my-2 flex items-center text-xs text-neutral-300">
          <Clock size={12} className="mr-1.5" />
          <span className="mr-1">Delay:</span>
          {showDelayInput ? (
            <input
              type="number"
              className="w-12 bg-neutral-800 text-white font-mono text-xs rounded px-1 py-0.5 border border-neutral-700"
              value={delay}
              min={0}
              max={10}
              step={0.1}
              autoFocus
              onChange={(e) => {
                const newDelay = Math.max(0, Math.min(10, Number(e.target.value)));
                setDelay(newDelay);
                if (onDelayChange) {
                  onDelayChange(frame.id, newDelay);
                }
                
                // Also update the frame data directly for immediate feedback
                // This will be important for the frame sequence playback
                frame.delay = newDelay;
              }}
              onBlur={() => setShowDelayInput(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setShowDelayInput(false);
                }
              }}
            />
          ) : (
            <span 
              className="font-mono cursor-pointer hover:text-white hover:underline" 
              onClick={() => setShowDelayInput(true)}
              title="Click to change delay"
            >
              {delay.toFixed(1)}s
            </span>
          )}
        </div>

        {/* Layer toggle button */}
        <button 
          className="w-full text-sm px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-between"
          onClick={() => setIsLayerListOpen(!isLayerListOpen)}
        >
          <span className="flex items-center">
            <Eye size={14} className="mr-1.5" />
            Toggle Layer Visibility
          </span>
          <span>{isLayerListOpen ? '▲' : '▼'}</span>
        </button>

        {/* Layer visibility list */}
        {isLayerListOpen && (
          <div className="mt-2 bg-neutral-800 rounded-md max-h-[150px] overflow-y-auto">
            {layers.map(layer => renderLayerItem(layer, frame.id, 0))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FrameCardGrid;