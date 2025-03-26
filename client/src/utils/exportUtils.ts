import { exportGif as pluginExportGif, exportHtml as pluginExportHtml } from '../lib/figmaPlugin';
import { AnimationFrame } from '../types/animation';

// GIF Export options
interface GifExportOptions {
  frames: AnimationFrame[];
  width: number;
  height: number;
  quality: number;
  dithering?: 'none' | 'pattern' | 'diffusion';
  colorDepth?: 8 | 16 | 24;
  disposal?: 'none' | 'background' | 'previous';
  delay?: number;
  loop?: number | boolean;
}

// HTML5 Export options
interface HtmlExportOptions {
  frames: AnimationFrame[];
  width: number;
  height: number;
  includeClickTag?: boolean;
  optimizeForAdNetworks?: boolean;
  generateFallback?: boolean;
  adPlatform?: 'google' | 'meta' | 'generic';
}

// Export animation as GIF
export async function exportGif(options: GifExportOptions): Promise<void> {
  try {
    // Forward the export request to the plugin
    pluginExportGif(options);
  } catch (error) {
    console.error('Error exporting GIF:', error);
    throw error;
  }
}

// Export animation as HTML5 ad
export async function exportHtml(options: HtmlExportOptions): Promise<void> {
  try {
    // Forward the export request to the plugin
    pluginExportHtml(options);
  } catch (error) {
    console.error('Error exporting HTML5:', error);
    throw error;
  }
}

// Helper function to generate HTML5 template
export function generateHtml5Template(
  width: number, 
  height: number, 
  includeClickTag: boolean = true
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HTML5 Ad</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    #ad {
      width: ${width}px;
      height: ${height}px;
      position: relative;
      overflow: hidden;
      background-color: white;
    }
    /* Responsive scaling */
    @media only screen and (max-width: ${width}px) {
      #ad {
        width: 100%;
        height: auto;
        aspect-ratio: ${width} / ${height};
      }
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.0/gsap.min.js"></script>
</head>
<body>
  <div id="ad">
    <!-- Ad content will be inserted here -->
  </div>
  ${includeClickTag ? `
  <script>
    // Click tag implementation
    var clickTag = "";
    document.getElementById('ad').addEventListener('click', function() {
      window.open(clickTag || 'https://example.com', '_blank');
    });
  </script>
  ` : ''}
  <script>
    // Animation script will be inserted here
  </script>
</body>
</html>`;
}

// Helper function to get Google Ads compliant HTML5
export function getGoogleAdsCompliantHtml(html: string): string {
  // Add Google Ads specific meta tags and requirements
  return html.replace('</head>', `
  <meta name="ad.size" content="width=${width},height=${height}">
  <script type="text/javascript">
    var clickTag = "";
  </script>
</head>`);
}
