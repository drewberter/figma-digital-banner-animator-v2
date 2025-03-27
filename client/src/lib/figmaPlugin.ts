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
  if (isFigma) {
    sendToPlugin(MessageType.EXPORT_GIF, { options });
  } else {
    // In development mode, fake a download by creating a demo GIF for testing
    console.log('Dev mode: Creating demo GIF download');
    try {
      // Log full options for debugging
      console.log('DEBUG: Full export options:', JSON.stringify(options));
      
      // Create a simple canvas with the frame content
      const canvas = document.createElement('canvas');
      canvas.width = options.width || 300;
      canvas.height = options.height || 250;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Draw a simple placeholder for the demo gif
        ctx.fillStyle = '#4A7CFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add some text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Demo GIF', canvas.width / 2, canvas.height / 2 - 20);
        
        // Add dimensions
        ctx.font = '14px Arial';
        ctx.fillText(`${canvas.width}x${canvas.height}`, canvas.width / 2, canvas.height / 2 + 20);
        
        // Convert to data URL and trigger download
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `animation-${Date.now()}.gif`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error('Error creating demo GIF download:', error);
    }
  }
}

// Export current animation as HTML5
export function exportHtml(options: any): void {
  if (isFigma) {
    sendToPlugin(MessageType.EXPORT_HTML, { options });
  } else {
    // In development mode, fake a download of HTML file for testing
    console.log('Dev mode: Creating demo HTML download');
    try {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Demo Animation</title>
  <style>
    body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #222; }
    .animation { width: ${options.width}px; height: ${options.height}px; background: linear-gradient(45deg, #4A7CFF, #6A5ACD); display: flex; flex-direction: column; justify-content: center; align-items: center; color: white; font-family: sans-serif; }
    .headline { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
    .description { font-size: 14px; }
    .cta { margin-top: 20px; background: yellow; color: black; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="animation">
    <div class="headline">Demo Animation</div>
    <div class="description">This is a placeholder for your exported HTML5 animation</div>
    <div class="cta">Click Me</div>
  </div>
</body>
</html>`;
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `animation-${Date.now()}.html`;
      link.href = url;
      link.click();
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error('Error creating demo HTML download:', error);
    }
  }
}

// Export current animation as MP4
export function exportMp4(options: any): void {
  if (isFigma) {
    sendToPlugin(MessageType.EXPORT_MP4, { options });
  } else {
    console.log('Dev mode: MP4 export is not supported in development mode');
    alert('MP4 export is only available when running as a Figma plugin. This is a development mode simulation.');
  }
}

// Export current animation as WebM
export function exportWebm(options: any): void {
  if (isFigma) {
    sendToPlugin(MessageType.EXPORT_WEBM, { options });
  } else {
    console.log('Dev mode: WebM export is not supported in development mode');
    alert('WebM export is only available when running as a Figma plugin. This is a development mode simulation.');
  }
}
