// This file handles communication with the Figma plugin API

// Check if we're running in the Figma environment
const isFigma = typeof parent !== 'undefined' && parent.postMessage;

// Messages we can send to the plugin code
export enum MessageType {
  READY = 'READY',
  GET_FRAMES = 'GET_FRAMES',
  SELECT_LAYER = 'SELECT_LAYER',
  UPDATE_ANIMATION = 'UPDATE_ANIMATION',
  EXPORT_GIF = 'EXPORT_GIF',
  EXPORT_HTML = 'EXPORT_HTML',
  EXPORT_MP4 = 'EXPORT_MP4',
  EXPORT_WEBM = 'EXPORT_WEBM',
  LOAD_STATE = 'LOAD_STATE',
  SAVE_STATE = 'SAVE_STATE',
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
  } else {
    console.warn('Not running in Figma environment');
  }
}

// Send a message to the plugin code
export function sendToPlugin(type: MessageType, data?: any): void {
  if (isFigma) {
    parent.postMessage({ pluginMessage: { type, ...data } }, '*');
  } else {
    console.warn(`Cannot send message (${type}) outside Figma environment`);
  }
}

// Handle messages from the plugin
function handlePluginMessage(message: any): void {
  const { type, ...data } = message;
  
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

// Get frames from the current selection
export function getFrames(): void {
  sendToPlugin(MessageType.GET_FRAMES);
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

// Export current animation as MP4
export function exportMp4(options: any): void {
  sendToPlugin(MessageType.EXPORT_MP4, { options });
}

// Export current animation as WebM
export function exportWebm(options: any): void {
  sendToPlugin(MessageType.EXPORT_WEBM, { options });
}
