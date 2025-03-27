// This is the main code that runs in the Figma environment

// Required interfaces for our plugin
interface AnimationData {
  layers: {
    [nodeId: string]: {
      animations: Animation[];
      keyframes: Keyframe[];
    }
  };
  frames: {
    [nodeId: string]: {
      selected: boolean;
      width: number;
      height: number;
    }
  };
  duration: number;
  selectedLayerId: string | null;
}

interface Animation {
  type: string;
  startTime: number;
  duration: number;
  delay?: number;
  easing: string;
  direction?: string;
  opacity?: number;
  scale?: number;
  rotation?: number;
  positionOverride?: boolean;
  position?: {
    x: number;
    y: number;
  };
  customData?: Record<string, any>;
}

interface Keyframe {
  time: number;
  properties: Record<string, any>;
}

// Plugin message types
enum MessageType {
  READY = 'READY',
  READY_RESPONSE = 'READY_RESPONSE',
  GET_FRAMES = 'GET_FRAMES',
  FRAMES_RESPONSE = 'FRAMES_RESPONSE',
  GET_LAYERS = 'GET_LAYERS',
  LAYERS_RESPONSE = 'LAYERS_RESPONSE',
  SELECT_LAYER = 'SELECT_LAYER',
  UPDATE_ANIMATION = 'UPDATE_ANIMATION',
  EXPORT_GIF = 'EXPORT_GIF',
  EXPORT_HTML = 'EXPORT_HTML',
  LOAD_STATE = 'LOAD_STATE',
  STATE_LOADED = 'STATE_LOADED',
  SAVE_STATE = 'SAVE_STATE',
  STATE_SAVED = 'STATE_SAVED',
  SELECT_FRAME = 'SELECT_FRAME',
  ERROR = 'ERROR'
}

// Initialize animation data
let animationData: AnimationData = {
  layers: {},
  frames: {},
  duration: 5,
  selectedLayerId: null
};

// Set up the Figma UI
figma.showUI(__html__, { width: 800, height: 600 });

// Process messages from the UI
figma.ui.onmessage = async (msg) => {
  try {
    const { type, ...data } = msg;
    
    switch(type) {
      case MessageType.READY:
        handleReadyMessage();
        break;
      
      case MessageType.GET_FRAMES:
        handleGetFramesMessage();
        break;
      
      case MessageType.GET_LAYERS:
        handleGetLayersMessage();
        break;
      
      case MessageType.SELECT_LAYER:
        handleSelectLayerMessage(data.nodeId);
        break;
      
      case MessageType.SELECT_FRAME:
        handleSelectFrameMessage(data.nodeId);
        break;
      
      case MessageType.UPDATE_ANIMATION:
        handleUpdateAnimationMessage(data.nodeId, data.animationData);
        break;
      
      case MessageType.EXPORT_GIF:
        handleExportGifMessage(data.options);
        break;
      
      case MessageType.EXPORT_HTML:
        handleExportHtmlMessage(data.options);
        break;
      
      case MessageType.LOAD_STATE:
        handleLoadStateMessage(data.key);
        break;
      
      case MessageType.SAVE_STATE:
        handleSaveStateMessage(data.key, data.data);
        break;
      
      default:
        console.error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error('Error processing message:', error);
    figma.ui.postMessage({
      type: MessageType.ERROR,
      message: error.message || 'An unknown error occurred'
    });
  }
};

// Handle READY message
function handleReadyMessage() {
  // Scan the current selection for frames
  scanForFrames();
  
  // Respond that we're ready
  figma.ui.postMessage({
    type: MessageType.READY_RESPONSE
  });
}

// Handle GET_FRAMES message
function handleGetFramesMessage() {
  scanForFrames();
  
  figma.ui.postMessage({
    type: MessageType.FRAMES_RESPONSE,
    frames: Object.keys(animationData.frames).map(nodeId => {
      const node = figma.getNodeById(nodeId) as FrameNode;
      const frameData = animationData.frames[nodeId];
      
      return {
        id: nodeId,
        name: node.name,
        selected: frameData.selected,
        width: frameData.width,
        height: frameData.height
      };
    })
  });
}

// Handle GET_LAYERS message
function handleGetLayersMessage() {
  const selectedFrameId = Object.keys(animationData.frames).find(
    id => animationData.frames[id].selected
  );
  
  if (!selectedFrameId) {
    figma.ui.postMessage({
      type: MessageType.LAYERS_RESPONSE,
      layers: []
    });
    return;
  }
  
  const frame = figma.getNodeById(selectedFrameId) as FrameNode;
  const layers = scanLayersInFrame(frame);
  
  figma.ui.postMessage({
    type: MessageType.LAYERS_RESPONSE,
    layers
  });
}

// Handle SELECT_FRAME message
function handleSelectFrameMessage(nodeId: string) {
  try {
    const node = figma.getNodeById(nodeId);
    if (!node || node.type !== 'FRAME') {
      throw new Error('Invalid frame node');
    }
    
    // Mark this frame as selected and all others as deselected
    Object.keys(animationData.frames).forEach(id => {
      animationData.frames[id].selected = (id === nodeId);
    });
    
    // Select the frame in Figma UI
    figma.currentPage.selection = [node];
    
    // Save state to persist selection
    savePluginState();
    
    // Notify UI of frame selection
    figma.ui.postMessage({
      type: MessageType.FRAMES_RESPONSE,
      frames: Object.keys(animationData.frames).map(id => {
        const frameNode = figma.getNodeById(id) as FrameNode;
        const frameData = animationData.frames[id];
        
        return {
          id,
          name: frameNode.name,
          selected: frameData.selected,
          width: frameData.width,
          height: frameData.height
        };
      })
    });
    
    // Also send the updated layer list for this frame
    const frame = figma.getNodeById(nodeId) as FrameNode;
    const layers = scanLayersInFrame(frame);
    
    figma.ui.postMessage({
      type: MessageType.LAYERS_RESPONSE,
      layers
    });
    
  } catch (error) {
    console.error('Error selecting frame:', error);
    figma.ui.postMessage({
      type: MessageType.ERROR,
      message: `Error selecting frame: ${error.message}`
    });
  }
}

// Handle SELECT_LAYER message
function handleSelectLayerMessage(nodeId: string) {
  try {
    const node = figma.getNodeById(nodeId);
    if (node) {
      // Select the node in Figma
      figma.currentPage.selection = [node];
      animationData.selectedLayerId = nodeId;
      
      // Save state to persist selection
      savePluginState();
    }
  } catch (error) {
    console.error('Error selecting layer:', error);
    figma.ui.postMessage({
      type: MessageType.ERROR,
      message: `Error selecting layer: ${error.message}`
    });
  }
}

// Handle UPDATE_ANIMATION message
function handleUpdateAnimationMessage(nodeId: string, animation: Animation) {
  if (!animationData.layers[nodeId]) {
    animationData.layers[nodeId] = {
      animations: [],
      keyframes: []
    };
  }
  
  // Find if an animation of this type already exists
  const existingIndex = animationData.layers[nodeId].animations.findIndex(
    a => a.type === animation.type
  );
  
  if (existingIndex >= 0) {
    // Replace existing animation
    animationData.layers[nodeId].animations[existingIndex] = animation;
  } else {
    // Add new animation
    animationData.layers[nodeId].animations.push(animation);
  }
  
  // Save updated state
  savePluginState();
}

// Handle EXPORT_GIF message
function handleExportGifMessage(options: any) {
  // TODO: Implement GIF export
  console.log('Export GIF requested with options:', options);
}

// Handle EXPORT_HTML message
function handleExportHtmlMessage(options: any) {
  // TODO: Implement HTML export
  console.log('Export HTML requested with options:', options);
}

// Handle LOAD_STATE message
async function handleLoadStateMessage(key: string) {
  try {
    const data = await figma.clientStorage.getAsync(key);
    
    if (data) {
      // Parse the stored data
      animationData = JSON.parse(data);
      
      // Notify UI that state was loaded
      figma.ui.postMessage({
        type: MessageType.STATE_LOADED,
        key
      });
    }
  } catch (error) {
    console.error(`Error loading state for key ${key}:`, error);
    figma.ui.postMessage({
      type: MessageType.ERROR,
      message: `Error loading state: ${error.message}`
    });
  }
}

// Handle SAVE_STATE message
async function handleSaveStateMessage(key: string, data: any) {
  try {
    // Store the provided data
    await figma.clientStorage.setAsync(key, JSON.stringify(data));
    
    // Notify UI that state was saved
    figma.ui.postMessage({
      type: MessageType.STATE_SAVED,
      key
    });
  } catch (error) {
    console.error(`Error saving state for key ${key}:`, error);
    figma.ui.postMessage({
      type: MessageType.ERROR,
      message: `Error saving state: ${error.message}`
    });
  }
}

// Scan for frames in the document
function scanForFrames() {
  // Clear existing frames data or initialize if needed
  const existingFrameIds = new Set(Object.keys(animationData.frames));
  
  // Check current selection for frames
  for (const node of figma.currentPage.selection) {
    if (node.type === 'FRAME') {
      processFrame(node as FrameNode);
      existingFrameIds.delete(node.id);
    }
  }
  
  // Also check for top-level frames on the current page
  for (const node of figma.currentPage.children) {
    if (node.type === 'FRAME') {
      // Only include frames that are empty or contain elements
      if (node.children.length > 0) {
        processFrame(node as FrameNode);
        existingFrameIds.delete(node.id);
      }
    }
  }
  
  // If no frames were found, try to use any frame
  if (Object.keys(animationData.frames).length === 0) {
    for (const node of figma.currentPage.children) {
      if (node.type === 'FRAME') {
        processFrame(node as FrameNode);
        break;
      }
    }
  }
  
  // Auto-select a frame if none is selected
  const hasSelectedFrame = Object.values(animationData.frames).some(frame => frame.selected);
  if (!hasSelectedFrame && Object.keys(animationData.frames).length > 0) {
    const firstFrameId = Object.keys(animationData.frames)[0];
    animationData.frames[firstFrameId].selected = true;
  }
  
  // Save updated state
  savePluginState();
}

// Process a frame node and add it to animation data
function processFrame(frame: FrameNode) {
  // Common advertising frame sizes we want to prioritize
  const adSizes = [
    { width: 300, height: 250 }, // Medium Rectangle
    { width: 728, height: 90 },  // Leaderboard
    { width: 300, height: 600 }, // Half Page
    { width: 320, height: 50 },  // Mobile Leaderboard
    { width: 970, height: 90 },  // Large Leaderboard
    { width: 160, height: 600 }, // Wide Skyscraper
  ];
  
  // Check if this is a common ad size
  const isAdSize = adSizes.some(size => 
    Math.abs(frame.width - size.width) < 5 && 
    Math.abs(frame.height - size.height) < 5
  );
  
  // Skip frames that aren't close to ad sizes unless we explicitly want them
  const shouldInclude = isAdSize || 
                        figma.currentPage.selection.includes(frame) || 
                        frame.name.toLowerCase().includes('banner') || 
                        frame.name.toLowerCase().includes('ad');
  
  if (!shouldInclude) {
    return;
  }
  
  // Add or update frame in animation data
  if (!animationData.frames[frame.id]) {
    animationData.frames[frame.id] = {
      selected: false,
      width: Math.round(frame.width),
      height: Math.round(frame.height)
    };
  } else {
    // Update dimensions in case they changed
    animationData.frames[frame.id].width = Math.round(frame.width);
    animationData.frames[frame.id].height = Math.round(frame.height);
  }
}

// Helper function to scan layers in a frame
function scanLayersInFrame(frame: FrameNode) {
  const layers = [];
  
  // Process immediate children of the frame
  for (const node of frame.children) {
    // Skip if node is not visible
    if (node.visible === false) continue;
    
    // Determine layer type based on node type
    let layerType = node.type.toLowerCase();
    
    // Map Figma node types to our simplified layer types
    switch (node.type) {
      case 'RECTANGLE':
        // Check if this might be a button based on name or styles
        if (node.name.toLowerCase().includes('button') || 
            node.name.toLowerCase().includes('cta') ||
            node.cornerRadius !== undefined && node.cornerRadius > 0) {
          layerType = 'button';
        } else {
          layerType = 'rectangle';
        }
        break;
      
      case 'TEXT':
        // Check if this is a headline, subhead, or body text based on style or name
        if (node.name.toLowerCase().includes('headline') || 
            node.name.toLowerCase().includes('title') ||
            (node.fontSize !== undefined && node.fontSize >= 18)) {
          layerType = 'headline';
        } else if (node.name.toLowerCase().includes('subhead') || 
                  node.name.toLowerCase().includes('subtitle') ||
                  (node.fontSize !== undefined && node.fontSize >= 14)) {
          layerType = 'subhead';
        } else {
          layerType = 'text';
        }
        break;
      
      case 'ELLIPSE':
        layerType = 'shape';
        break;
      
      case 'VECTOR':
      case 'STAR':
      case 'POLYGON':
      case 'LINE':
        layerType = 'vector';
        break;
      
      case 'GROUP':
        // Check if this is a logo based on name
        if (node.name.toLowerCase().includes('logo')) {
          layerType = 'logo';
        } else {
          layerType = 'group';
        }
        break;
      
      case 'INSTANCE':
      case 'COMPONENT':
        layerType = 'component';
        break;
      
      case 'IMAGE':
        layerType = 'image';
        break;
    }
    
    // Check if we have animation data for this layer
    if (!animationData.layers[node.id]) {
      animationData.layers[node.id] = {
        animations: [],
        keyframes: []
      };
    }
    
    // Create layer info
    const layer = {
      id: node.id,
      name: node.name,
      type: layerType,
      visible: node.visible !== false,
      locked: node.locked || false,
      animations: animationData.layers[node.id].animations,
      keyframes: animationData.layers[node.id].keyframes
    };
    
    layers.push(layer);
  }
  
  return layers;
}

// Helper function to save the plugin state
async function savePluginState() {
  try {
    await figma.clientStorage.setAsync('animation-plugin-state', JSON.stringify(animationData));
    console.log('Plugin state saved');
  } catch (error) {
    console.error('Error saving plugin state:', error);
  }
}

// Initialize the plugin by loading saved state
async function initializePlugin() {
  try {
    const savedState = await figma.clientStorage.getAsync('animation-plugin-state');
    if (savedState) {
      animationData = JSON.parse(savedState);
      console.log('Loaded saved plugin state');
    }
  } catch (error) {
    console.error('Error loading saved state:', error);
  }
  
  // Scan for frames to ensure we're up to date
  scanForFrames();
}

// Start initialization
initializePlugin();