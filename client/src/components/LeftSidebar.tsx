import React, { useState, useEffect, useReducer } from 'react';
import { ChevronDown, ChevronRight, ChevronLeftSquare, ChevronRightSquare, Eye, EyeOff, Square, CheckSquare, Image, Type, Box, Layout, Layers } from 'lucide-react';
import { mockFrames, mockLayers } from '../mock/animationData';
import { AdSize, AnimationLayer, AnimationFrame } from '../types/animation';
import { AnimationLayerWithUI } from '../types/animationExtensions';
import PropertiesPanel from './PropertiesPanel';
import { useAnimationContext } from '../context/AnimationContext';

interface LeftSidebarProps {
  onSelectFrame?: (frameId: string) => void;
  selectedAdSizeId?: string;
}

const LeftSidebar = ({ onSelectFrame, selectedAdSizeId = 'frame-1' }: LeftSidebarProps) => {
  // Get animation context for layer management
  const { 
    toggleLayerVisibility: contextToggleLayerVisibility, 
    toggleLayerExpanded: contextToggleLayerExpanded,
    toggleLayerHiddenInTimeline: contextToggleLayerHiddenInTimeline,
    frames,
    timelineRefreshKey
  } = useAnimationContext();
  
  // Add forceUpdate to ensure UI refreshes when layer visibility changes
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [frameListExpanded, setFrameListExpanded] = useState(true);
  const [layerListExpanded, setLayerListExpanded] = useState(true);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    mockLayers['frame-1']?.length > 0 ? mockLayers['frame-1'][0].id : null
  );
  
  // Expanded states for ad sizes
  const [expandedAdSizes, setExpandedAdSizes] = useState<Record<string, boolean>>({
    'adsize-300x250': true,
    'adsize-728x90': true,
  });
  
  // Toggle expanded state for a specific ad size
  const toggleAdSizeExpanded = (adSizeId: string) => {
    setExpandedAdSizes(prev => ({
      ...prev,
      [adSizeId]: !prev[adSizeId]
    }));
  };
  
  // Mock ad sizes - in a real app, these would come from the context
  const [adSizes, setAdSizes] = useState<AdSize[]>([
    {
      id: 'adsize-300x250',
      name: '300 × 250',
      width: 300,
      height: 250,
      frames: [],
      selected: true
    },
    {
      id: 'adsize-728x90',
      name: '728 × 90',
      width: 728,
      height: 90,
      frames: [],
      selected: false
    }
  ]);
  
  // Mock add ad size function
  const addAdSize = (adSizeData: { name: string, width: number, height: number }) => {
    const newAdSize: AdSize = {
      id: `adsize-${adSizeData.width}x${adSizeData.height}-${Date.now()}`,
      name: adSizeData.name,
      width: adSizeData.width,
      height: adSizeData.height,
      frames: [],
      selected: false
    };
    
    setAdSizes(prev => {
      // Deselect all other ad sizes
      const updatedAdSizes = prev.map(size => ({ ...size, selected: false }));
      return [...updatedAdSizes, { ...newAdSize, selected: true }];
    });
    
    // Update the app's state through the provided callback
    if (onSelectFrame) {
      onSelectFrame(newAdSize.id);
    }
  };
  
  // Get the current layers for the selected ad size
  const currentLayers = mockLayers[selectedAdSizeId] || [];

  // State for expanded/collapsed layer groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  // Add state for properties panel
  const [propertiesExpanded, setPropertiesExpanded] = useState(true);
  
  // Toggle sidebar collapsed state
  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  // Toggle a group's expanded state
  const toggleGroupExpanded = (groupId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Update local state for UI
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
    
    // Use the AnimationContext to toggle the layer's expanded state
    // This will update the layer in the shared state and force a timeline refresh
    const frameId = selectedAdSizeId || '';
    try {
      contextToggleLayerExpanded(frameId, groupId);
      console.log(`LeftSidebar: Called context.toggleLayerExpanded(${frameId}, ${groupId})`);
    } catch (error) {
      console.error('Error calling contextToggleLayerExpanded:', error);
    }
    
    // Find the layer in the current frame's layers to update its isExpanded property
    // This ensures the timeline and layer panel stay in sync
    const currentLayers = mockLayers[selectedAdSizeId] || [];
    
    // Helper function to recursively find and update a layer in the tree
    const updateLayerExpanded = (layers: AnimationLayer[], targetId: string): boolean => {
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        
        // Check if this is the target layer
        if (layer.id === targetId) {
          // Toggle the isExpanded property
          layer.isExpanded = !layer.isExpanded;
          console.log(`LeftSidebar: Set layer ${layer.name} (${layer.id}) isExpanded to ${layer.isExpanded}`);
          return true;
        }
        
        // If this layer has children, search in them
        if (layer.children && layer.children.length > 0) {
          const found = updateLayerExpanded(layer.children, targetId);
          if (found) return true;
        }
      }
      
      return false;
    };
    
    // Update the layer's isExpanded property in the data model
    updateLayerExpanded(currentLayers, groupId);
  };
  
  // Select a frame and pass the event to parent
  const handleSelectFrame = (frameId: string) => {
    console.log('Selected frame:', frameId);
    
    // Reset selected layer when changing frames
    const frameLayers = mockLayers[frameId] || [];
    if (frameLayers.length > 0) {
      setSelectedLayerId(frameLayers[0].id);
    } else {
      setSelectedLayerId(null);
    }
    
    // Update the preview via App.tsx
    if (onSelectFrame) {
      onSelectFrame(frameId);
    }
  };
  
  // Select a layer
  const handleSelectLayer = (layerId: string) => {
    console.log('Selected layer:', layerId);
    setSelectedLayerId(layerId);
  };
  
  // Toggle layer visibility using the AnimationContext
  const toggleLayerVisibility = (layerId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Find the current selected frame
    const selectedFrame = frames.find((frame: AnimationFrame) => frame.selected);
    if (selectedFrame) {
      // Add more debugging to diagnose issues
      console.log('[LeftSidebar][toggleLayerVisibility] Current selected frame:', selectedFrame.id);
      console.log('[LeftSidebar][toggleLayerVisibility] Toggling layer:', layerId);
      
      // Add a timestamp to force React to detect the change
      const timestamp = Date.now();
      console.log(`[LeftSidebar][toggleLayerVisibility] Using timestamp: ${timestamp}`);
      
      try {
        // Call the context function with the current frame ID and layer ID
        contextToggleLayerVisibility(selectedFrame.id, layerId);
        console.log('[LeftSidebar][toggleLayerVisibility] Successfully called context toggle for layer:', layerId);
        
        // Force update of timeline and sidebar to ensure UI consistency
        if (timelineRefreshKey) {
          console.log('[LeftSidebar][toggleLayerVisibility] Forcing timeline refresh');
        }
        
        // Force the sidebar to re-render as well
        forceUpdate();
        console.log('[LeftSidebar][toggleLayerVisibility] Forced sidebar re-render');
      } catch (error) {
        console.error('[LeftSidebar][toggleLayerVisibility] Error toggling layer visibility:', error);
      }
    } else {
      console.error('[LeftSidebar][toggleLayerVisibility] No frame selected for layer visibility toggle');
    }
  };
  
  // Toggle layer hidden in timeline (UI-only visibility)
  const toggleLayerHiddenInTimeline = (layerId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Find the current selected frame
    const selectedFrame = frames.find((frame: AnimationFrame) => frame.selected);
    if (selectedFrame) {
      try {
        // Call the context function with the current frame ID and layer ID
        contextToggleLayerHiddenInTimeline(selectedFrame.id, layerId);
        console.log('[LeftSidebar][toggleLayerHiddenInTimeline] Toggled UI-only visibility for layer:', layerId);
        
        // Force the sidebar to re-render to ensure UI consistency
        forceUpdate();
        console.log('[LeftSidebar][toggleLayerHiddenInTimeline] Forced sidebar re-render');
      } catch (error) {
        console.error('[LeftSidebar][toggleLayerHiddenInTimeline] Error:', error);
      }
    } else {
      console.error('[LeftSidebar][toggleLayerHiddenInTimeline] No frame selected');
    }
  };
  
  // Function to get all expandable groups and frames
  // Set their initial expanded state
  useEffect(() => {
    const newExpandedGroups: Record<string, boolean> = {};
    
    // Helper function to recursively process layers
    const processLayerExpansion = (layers: AnimationLayer[]) => {
      layers.forEach(layer => {
        // Only process container layers
        if (layer.isGroup || layer.isFrame) {
          // If the isExpanded property isn't set yet, initialize it to true
          if (layer.isExpanded === undefined) {
            layer.isExpanded = true;
          }
          
          // Sync our UI state with the data model
          newExpandedGroups[layer.id] = layer.isExpanded;
          
          // Process children recursively
          if (layer.children && layer.children.length > 0) {
            processLayerExpansion(layer.children);
          }
        }
      });
    };
    
    // Process all layers recursively
    processLayerExpansion(currentLayers);
    
    // Update the expandedGroups state
    setExpandedGroups(prev => ({
      ...prev,
      ...newExpandedGroups
    }));
    
    console.log("LeftSidebar: Synced expandedGroups with layer.isExpanded properties");
  }, [selectedAdSizeId, currentLayers]);
  
  // Get layer icon based on type
  function getLayerIcon(type: string, isGroup: boolean = false, isFrame: boolean = false) {
    if (isGroup) return <Layers size={14} />;
    if (isFrame) return <Layout size={14} />;
    
    switch (type.toLowerCase()) {
      case 'image':
        return <Image size={14} />;
      case 'text':
        return <Type size={14} />;
      case 'rectangle':
        return <Box size={14} />;
      case 'button':
        return <Layout size={14} />;
      default:
        return <Box size={14} />;
    }
  }
  
  // Function to recursively render layers with hierarchy
  const renderLayer = (layer: AnimationLayer, index: number) => {
    const isSelected = selectedLayerId === layer.id;
    const isExpandable = layer.isGroup || layer.isFrame;
    
    // Get the expanded state from the layer's isExpanded property first, 
    // then fall back to the UI state in expandedGroups
    const isExpanded = layer.isExpanded !== undefined 
      ? layer.isExpanded 
      : expandedGroups[layer.id] !== false;
      
    const hasChildren = layer.children && layer.children.length > 0;
    const indentLevel = layer.level || 0;
    const paddingLeft = 4 + (indentLevel * 12); // Base padding + indent per level
    
    // Determine if the layer is selectable for animation
    // Groups and frames are only selectable when collapsed
    const isSelectable = !isExpandable || (isExpandable && !isExpanded);
    
    return (
      <div key={layer.id} className="layer-item-container">
        <div 
          className={`pr-2 py-1 flex items-center justify-between ${isSelectable ? 'cursor-pointer' : ''} hover:bg-neutral-800 ${isSelected ? 'bg-neutral-800' : ''}`}
          onClick={() => isSelectable ? handleSelectLayer(layer.id) : null}
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          <div className="flex items-center flex-1 min-w-0">
            {/* Expand/collapse control for groups/frames */}
            {isExpandable && hasChildren && (
              <button 
                className="mr-1 text-neutral-400 hover:text-neutral-200"
                onClick={(e) => toggleGroupExpanded(layer.id, e)}
              >
                {isExpanded ? 
                  <ChevronDown size={14} className="text-neutral-400" /> : 
                  <ChevronRight size={14} className="text-neutral-400" />
                }
              </button>
            )}
            
            {/* If not expandable, add some spacing for alignment */}
            {!isExpandable && (
              <div className="w-4 mr-1"></div>
            )}
            
            <div className="flex-1 text-sm flex items-center min-w-0 mr-2">
              <span className="mr-2 text-neutral-500 flex-shrink-0">
                {getLayerIcon(layer.type, layer.isGroup, layer.isFrame)}
              </span>
              <span className={`truncate ${
                isSelected 
                  ? "text-white font-medium" 
                  : isSelectable 
                    ? "text-neutral-300" 
                    : "text-neutral-500"
              }`}>
                {layer.name}
                {isExpandable && isExpanded && hasChildren && 
                  <span className="text-xs ml-1 text-neutral-500">(container)</span>
                }
              </span>
            </div>
          </div>
          
          {/* Show visibility toggle only for selectable layers (not expanded containers) */}
          {isSelectable && (
            <div className="flex items-center">
              {/* Single unified visibility toggle with three states */}
              <button
                onClick={(e) => {
                  // Alt/Option or Shift click toggles hiddenInTimeline
                  if (e.altKey || e.shiftKey) {
                    toggleLayerHiddenInTimeline(layer.id, e);
                  } else {
                    // Regular click toggles main visibility
                    toggleLayerVisibility(layer.id, e);
                  }
                }}
                onContextMenu={(e) => {
                  // Right click also toggles hiddenInTimeline
                  e.preventDefault();
                  toggleLayerHiddenInTimeline(layer.id, e);
                }}
                className={`hover:text-neutral-200 px-2 ${
                  // Different classes based on layer visibility state
                  layer.visible 
                    ? (layer as AnimationLayerWithUI).hiddenInTimeline 
                      ? 'text-blue-400 opacity-60' // blue for hidden in timeline only
                      : 'text-blue-500' // active, fully visible
                    : 'text-neutral-700' // fully hidden
                }`}
                title={!layer.visible 
                  ? "Hidden in animation (Click to show)" 
                  : (layer as AnimationLayerWithUI).hiddenInTimeline 
                    ? "Visible in animation but hidden in timeline (Click to toggle visibility, Shift+click to show in timeline)" 
                    : "Fully visible (Click to hide in animation, Shift+click to hide in timeline only)"}
              >
                {/* Icon changes based on visibility state - add lastUpdated check to force a render */}
                {(layer.visible || (layer.lastUpdated && layer.visible))
                  ? <Eye size={14} className={(layer as AnimationLayerWithUI).hiddenInTimeline ? "opacity-60" : ""} />
                  : <EyeOff size={14} />}
              </button>
            </div>
          )}
        </div>
        
        {/* Render children if expanded */}
        {isExpandable && hasChildren && isExpanded && (
          <div>
            {layer.children && layer.children.map((child: AnimationLayer, childIndex: number) => 
              renderLayer(child, childIndex)
            )}
          </div>
        )}
      </div>
    );
  };
  
  // If collapsed, show a narrow sidebar with just the collapse/expand button
  if (isCollapsed) {
    return (
      <div className="w-10 bg-[#111111] border-r border-neutral-800 flex flex-col items-center">
        <div className="p-2 border-b border-neutral-800 w-full flex justify-center">
          <button 
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-700"
            onClick={toggleCollapsed}
            title="Expand Sidebar"
          >
            <ChevronRightSquare size={16} className="text-neutral-400" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center pt-2">
          {mockFrames.map((frame) => (
            <div 
              key={frame.id}
              className={`w-6 h-6 mb-1 rounded-sm flex items-center justify-center cursor-pointer ${selectedAdSizeId === frame.id ? 'bg-[#4A7CFF]' : 'bg-neutral-800 hover:bg-neutral-700'}`}
              onClick={() => handleSelectFrame(frame.id)}
              title={`${frame.name} (${frame.width}×${frame.height})`}
            >
              <span className="text-xs font-bold text-white">
                {frame.id.charAt(frame.id.length - 1)}
              </span>
            </div>
          ))}
        </div>

      </div>
    );
  }
  
  // Regular expanded sidebar
  return (
    <div className="w-64 bg-[#111111] border-r border-neutral-800 flex flex-col h-full">
      {/* Header - Fixed at top */}
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-medium text-neutral-300">Timeline</h3>
        <div className="flex">
          <button 
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-700"
            onClick={toggleCollapsed}
            title="Collapse Sidebar"
          >
            <ChevronLeftSquare size={16} className="text-neutral-400" />
          </button>
        </div>
      </div>
      
      {/* Scrollable content container */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Ad Sizes Section - Has fixed max height */}
        <div className="border-b border-neutral-800 flex-shrink-0">
          <div 
            className="p-2 flex items-center justify-between cursor-pointer hover:bg-neutral-800"
            onClick={() => setFrameListExpanded(!frameListExpanded)}
          >
            {frameListExpanded ? 
              <ChevronDown size={16} className="text-neutral-400 mr-1" /> : 
              <ChevronRight size={16} className="text-neutral-400 mr-1" />
            }
            <span className="text-xs font-medium text-neutral-300 flex-1">AD SIZES</span>
          </div>
          
          {frameListExpanded && (
            <div className="max-h-32 overflow-y-auto scrollbar scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-900 hover:scrollbar-thumb-neutral-500">
              {/* Use mockFrames directly since frames ARE ad sizes */}
              {mockFrames.map((adSize) => {
                const isAdSizeSelected = selectedAdSizeId === adSize.id;
                
                return (
                  <div key={adSize.id} className="mb-1">
                    <div 
                      className={`pl-4 pr-2 py-1 flex items-center cursor-pointer hover:bg-neutral-800 ${isAdSizeSelected ? 'bg-neutral-800' : ''}`}
                      onClick={() => handleSelectFrame(adSize.id)}
                    >
                      <div className="mr-2">
                        {isAdSizeSelected ? (
                          <CheckSquare size={16} className="text-[#4A7CFF]" />
                        ) : (
                          <Square size={16} className="text-neutral-500" />
                        )}
                      </div>
                      <div className="flex-1 text-sm truncate flex">
                        <span className={isAdSizeSelected ? "text-white" : "text-neutral-300"}>
                          {adSize.name}
                        </span>
                        <span className="ml-2 text-neutral-500 text-xs flex items-center">
                          {adSize.width}×{adSize.height}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Layers Section - Can take flexible space */}
        <div className="border-b border-neutral-800 flex-shrink-0 flex flex-col">
          <div 
            className="p-2 flex items-center justify-between cursor-pointer hover:bg-neutral-800"
            onClick={() => setLayerListExpanded(!layerListExpanded)}
          >
            {layerListExpanded ? 
              <ChevronDown size={16} className="text-neutral-400 mr-1" /> : 
              <ChevronRight size={16} className="text-neutral-400 mr-1" />
            }
            <span className="text-xs font-medium text-neutral-300 flex-1">LAYERS</span>
          </div>
          
          {layerListExpanded && (
            <div className="overflow-y-auto max-h-[30vh] scrollbar scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-900 hover:scrollbar-thumb-neutral-500">
              {currentLayers.map((layer, index) => renderLayer(layer, index))}
            </div>
          )}
        </div>
        
        {/* Properties Section - Takes remaining space */}
        <div className="flex-1 flex flex-col min-h-0">
          <div 
            className="p-2 flex items-center justify-between cursor-pointer hover:bg-neutral-800 flex-shrink-0"
            onClick={() => setPropertiesExpanded(!propertiesExpanded)}
          >
            {propertiesExpanded ? 
              <ChevronDown size={16} className="text-neutral-400 mr-1" /> : 
              <ChevronRight size={16} className="text-neutral-400 mr-1" />
            }
            <span className="text-xs font-medium text-neutral-300 flex-1">PROPERTIES</span>
          </div>
          
          {propertiesExpanded && selectedLayerId && (
            <div className="flex-1 overflow-y-auto min-h-0 scrollbar scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-900 hover:scrollbar-thumb-neutral-500">
              <div className="px-2 py-1">
                <PropertiesPanel isInSidebar={true} />
              </div>
            </div>
          )}
          
          {propertiesExpanded && !selectedLayerId && (
            <div className="flex-1 flex items-center justify-center text-sm text-neutral-500 p-4 text-center">
              Select a layer to view and edit its properties
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;