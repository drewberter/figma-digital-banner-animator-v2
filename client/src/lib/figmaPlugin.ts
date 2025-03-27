// This file handles communication with the Figma plugin API

// Check if we're running in the Figma environment
const isFigma = typeof parent !== 'undefined' && parent.postMessage;

// Messages we can send to the plugin code
export enum MessageType {
  READY = 'READY',
  GET_FRAMES = 'GET_FRAMES',
  GET_LAYERS = 'GET_LAYERS',
  SELECT_LAYER = 'SELECT_LAYER',
  UPDATE_ANIMATION = 'UPDATE_ANIMATION',
  EXPORT_GIF = 'EXPORT_GIF',
  EXPORT_HTML = 'EXPORT_HTML',
  LOAD_STATE = 'LOAD_STATE',
  SAVE_STATE = 'SAVE_STATE',
  SELECT_FRAME = 'SELECT_FRAME', // New message type for selecting frames
}

// Initialize plugin communication
export function initializePlugin(): void {
  if (isFigma) {
    // Listen for messages from the plugin
    window.onmessage = (event) => {
      if (event.data.pluginMessage) {
        handlePluginMessage(event.data.pluginMessage);
      }
    };
    
    // Tell the plugin we're ready
    parent.postMessage({ pluginMessage: { type: MessageType.READY } }, '*');
    console.log('Figma plugin initialized');
  } else {
    console.warn('Not running in Figma environment, using mock data');
  }
}

// Send a message to the plugin code
export function sendToPlugin(type: MessageType, data?: any): void {
  if (isFigma) {
    parent.postMessage({ pluginMessage: { type, ...data } }, '*');
    console.log(`Sent message to plugin: ${type}`, data);
  } else {
    console.warn(`Using mock data (${type}) outside Figma environment`);
  }
}

// Handle messages from the plugin
function handlePluginMessage(message: any): void {
  const { type, ...data } = message;
  
  console.log(`Received message from plugin: ${type}`, data);
  
  // Dispatch message to registered listeners
  const event = new CustomEvent(`figma:${type}`, { detail: data });
  window.dispatchEvent(event);
}

// Register a listener for plugin messages
export function onPluginMessage(type: string, callback: (data: any) => void): () => void {
  const eventType = `figma:${type}`;
  const handler = (event: CustomEvent) => callback(event.detail);
  
  window.addEventListener(eventType, handler as EventListener);
  
  // Return a function to remove the listener
  return () => window.removeEventListener(eventType, handler as EventListener);
}

// Save state to Figma clientStorage
export async function saveToClientStorage(key: string, data: any): Promise<void> {
  sendToPlugin(MessageType.SAVE_STATE, { key, data });
}

// Load state from Figma clientStorage
export function loadFromClientStorage(key: string): void {
  sendToPlugin(MessageType.LOAD_STATE, { key });
}

// Get all frames from the current page
export function getFrames(): void {
  sendToPlugin(MessageType.GET_FRAMES);
}

// Get all layers in the selected frame
export function getLayers(): void {
  sendToPlugin(MessageType.GET_LAYERS);
}

// Select a specific frame in Figma
export function selectFrame(nodeId: string): void {
  sendToPlugin(MessageType.SELECT_FRAME, { nodeId });
}

// Select a specific layer in Figma
export function selectLayer(nodeId: string): void {
  sendToPlugin(MessageType.SELECT_LAYER, { nodeId });
}

// Update animation for a layer
export function updateAnimation(nodeId: string, animationData: any): void {
  sendToPlugin(MessageType.UPDATE_ANIMATION, { nodeId, animationData });
}

// Export current animation as GIF
export function exportGif(options: any): void {
  sendToPlugin(MessageType.EXPORT_GIF, { options });
}

// Export current animation as HTML5
export function exportHtml(options: any): void {
  sendToPlugin(MessageType.EXPORT_HTML, { options });
}