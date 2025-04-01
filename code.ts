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
  ERROR = 'ERROR'
}

// Global state for the plugin
let animationData: AnimationData = {
  layers: {},
  frames: {},
  duration: 3.0,
  selectedLayerId: null
};

// Initialize the plugin
figma.showUI(__html__, { width: 860, height: 600 });

// Listen for messages from the UI
figma.ui.onmessage = async (msg) => {
  try {
    const { type, ...data } = msg;

    switch (type) {
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

// Handle SELECT_LAYER message
function handleSelectLayerMessage(nodeId: string) {
  try {
    const node = figma.getNodeById(nodeId);
    if (node) {
      // Select the node in Figma
      figma.currentPage.selection = [node];
      animationData.selectedLayerId = nodeId;
    }
  } catch (error) {
    console.error('Error selecting layer:', error);
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
  
  // Update or add the animation
  const existingIndex = animationData.layers[nodeId].animations.findIndex(
    a => a.type === animation.type
  );
  
  if (existingIndex >= 0) {
    animationData.layers[nodeId].animations[existingIndex] = animation;
  } else {
    animationData.layers[nodeId].animations.push(animation);
  }
  
  // Auto-save the state
  savePluginState();
}

// Handle EXPORT_GIF message
function handleExportGifMessage(options: any) {
  // In a real plugin, we would generate a GIF here
  // For this implementation, we'll just show a notice that it would be exported
  figma.notify(`Exporting GIF at ${options.width}x${options.height} with quality ${options.quality}`);
  
  // Simulate a slight delay for "processing"
  setTimeout(() => {
    figma.notify('GIF export complete! (simulated)');
  }, 1500);
}

// Handle EXPORT_HTML message
function handleExportHtmlMessage(options: any) {
  // In a real plugin, we would generate HTML5 banner code here
  // For this implementation, we'll just show a notice that it would be exported
  figma.notify(`Exporting HTML5 banner at ${options.width}x${options.height}`);
  
  // Simulate a slight delay for "processing"
  setTimeout(() => {
    figma.notify('HTML5 export complete! (simulated)');
  }, 1500);
}

// Handle LOAD_STATE message
async function handleLoadStateMessage(key: string) {
  try {
    const data = await figma.clientStorage.getAsync(key);
    
    if (data) {
      // Update our local state
      animationData = data;
      
      // Notify the UI
      figma.ui.postMessage({
        type: MessageType.STATE_LOADED,
        data
      });
    }
  } catch (error) {
    console.error('Error loading state:', error);
    figma.ui.postMessage({
      type: MessageType.ERROR,
      message: 'Failed to load saved state'
    });
  }
}

// Handle SAVE_STATE message
async function handleSaveStateMessage(key: string, data: any) {
  try {
    // Update our local state
    if (data) {
      animationData = data;
    }
    
    // Save to client storage
    await figma.clientStorage.setAsync(key, animationData);
    
    // Notify the UI
    figma.ui.postMessage({
      type: MessageType.STATE_SAVED
    });
  } catch (error) {
    console.error('Error saving state:', error);
    figma.ui.postMessage({
      type: MessageType.ERROR,
      message: 'Failed to save state'
    });
  }
}

// Helper function to scan for frames in the current selection
async function scanForFrames() {
  const selection = figma.currentPage.selection;
  let foundFrames = false;
  
  // Look for frames in the selection
  for (const node of selection) {
    if (node.type === 'FRAME') {
      const frameId = node.id;
      
      // Check if we have saved animation data for this frame
      try {
        const savedData = await figma.clientStorage.getAsync(`frame-${frameId}`);
        
        if (savedData) {
          console.log(`Found saved animation data for frame ${frameId}, auto-loading...`);
          
          // Update our local state with the saved data
          if (savedData.animationData) {
            // We have animation data specific to this frame
            animationData = savedData.animationData;
          }
          
          // Notify the UI about the loaded state
          figma.ui.postMessage({
            type: MessageType.STATE_LOADED,
            data: animationData,
            frameId: frameId
          });
          
          figma.notify(`Loaded animation settings for "${node.name}"`, { timeout: 2000 });
        } else {
          console.log(`No saved animation data found for frame ${frameId}`);
        }
      } catch (error) {
        console.error(`Error checking for saved frame data: ${error}`);
      }
      
      // Register this frame
      animationData.frames[frameId] = {
        selected: true, // First found frame is selected by default
        width: node.width,
        height: node.height
      };
      
      // Set all other frames to unselected
      for (const id in animationData.frames) {
        if (id !== frameId) {
          animationData.frames[id].selected = false;
        }
      }
      
      // Scan layers in this frame
      scanLayersInFrame(node as FrameNode);
      
      foundFrames = true;
      break;
    }
  }
  
  // If no frames found in selection but we have stored frames, use the first one
  if (!foundFrames && Object.keys(animationData.frames).length > 0) {
    const firstFrameId = Object.keys(animationData.frames)[0];
    animationData.frames[firstFrameId].selected = true;
    
    // Try to select it in the UI
    const frame = figma.getNodeById(firstFrameId);
    if (frame) {
      figma.currentPage.selection = [frame];
    }
  }
  
  // If still no frames, look for frames on the current page
  if (!foundFrames && Object.keys(animationData.frames).length === 0) {
    for (const node of figma.currentPage.children) {
      if (node.type === 'FRAME') {
        // Register this frame
        animationData.frames[node.id] = {
          selected: true, // First found frame is selected by default
          width: node.width,
          height: node.height
        };
        
        // Scan layers in this frame
        scanLayersInFrame(node as FrameNode);
        
        break;
      }
    }
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
    if (node.type === 'RECTANGLE') layerType = 'rectangle';
    if (node.type === 'TEXT') layerType = 'text';
    if (node.type === 'ELLIPSE') layerType = 'shape';
    if (node.type === 'VECTOR') layerType = 'vector';
    if (node.type === 'GROUP') layerType = 'group';
    
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
    // Save the global animation state
    await figma.clientStorage.setAsync('animationState', animationData);
    
    // Find the currently selected frame
    let selectedFrameId = null;
    for (const frameId in animationData.frames) {
      if (animationData.frames[frameId].selected) {
        selectedFrameId = frameId;
        break;
      }
    }
    
    // If there's a selected frame, save its data separately for quick loading
    if (selectedFrameId) {
      const frameSpecificData = {
        animationData: animationData,
        timestamp: new Date().toISOString(),
        frameId: selectedFrameId
      };
      
      // Save with the frame ID as part of the key for quick retrieval
      await figma.clientStorage.setAsync(`frame-${selectedFrameId}`, frameSpecificData);
      
      console.log(`Saved frame-specific animation data for frame ${selectedFrameId}`);
    }
  } catch (error) {
    console.error('Error auto-saving state:', error);
  }
}

// Add selection change event listener to auto-detect frame selections
figma.on('selectionchange', () => {
  console.log('Selection changed, checking for frames...');
  scanForFrames();
});

// Clean up when the plugin is closed
figma.on('close', () => {
  // Auto-save state when plugin closes
  savePluginState();
});
