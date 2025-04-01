import { 
  exportGif as pluginExportGif, 
  exportHtml as pluginExportHtml,
  exportMp4 as pluginExportMp4,
  exportWebm as pluginExportWebm
} from '../lib/figmaPlugin';
import { AnimationFrame } from '../types/animation';

// Ad platform types
export type AdPlatform = 
  // Standard formats
  | 'standard-css' // HTML/JS (CSS @keyframes)
  | 'standard-gsap' // HTML/JS (GSAP/Greensock)
  // Platforms with clickTag
  | 'adform'
  | 'adform-mraid'
  | 'adition'
  | 'adroll'
  | 'adobe-ad-cloud'
  | 'amazon-ads'
  | 'appnexus'
  | 'basis'
  | 'bidtheatre'
  | 'delta-projects'
  | 'doubleclick-dcm'
  | 'doubleclick-studio'
  | 'dv360'
  | 'facebook-ads'
  | 'flashtalking'
  | 'google-ads'
  | 'google-display-network'
  | 'iab'
  | 'iab-standard'
  | 'jivox-gsap'
  | 'jivox-css'
  | 'meta-ads'
  | 'responsive-display-ad'
  | '6sense'
  | 'sizmek'
  | 'stackadapt'
  | 'terminus'
  | 'tiktok-ads'
  | 'trade-desk'
  | 'twitter-ads'
  | 'ussd-sms'
  | 'ussd-call'
  | 'yandex'
  // Other formats
  | 'scalable'
  | 'responsive'
  // Legacy support
  | 'google' 
  | 'meta' 
  | 'generic';

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
  useCustomContent?: boolean; // Whether frames are custom content frames
}

// HTML5 Export options
interface HtmlExportOptions {
  frames: AnimationFrame[];
  width: number;
  height: number;
  fps: number;
  
  // Banner options
  addBorder?: boolean;
  borderColor?: string;
  addPreloaderAnimation?: boolean;
  infiniteLoop?: boolean;
  addBackupJpg?: boolean;
  renderRetina?: boolean;
  maxFileSizeTarget?: number;
  
  // Preview page options
  generatePreviewPage?: boolean;
  previewPageLayout?: 'masonry' | 'grid' | 'list';
  useDarkMode?: boolean;
  uploadToNetlify?: boolean;
  customHtml?: string;
  customCss?: string;
  
  // Code output settings
  minifyCode?: boolean;
  injectCustomCode?: boolean;
  includeZipFiles?: boolean;
  usePTagsInsteadOfSvg?: boolean;
  bannerLink?: string;
  compressionSpeed?: 'faster' | 'balanced' | 'smaller';
  
  // Ad platform options
  adPlatform?: AdPlatform;
  
  // Legacy options (for backwards compatibility)
  includeClickTag?: boolean;
  optimizeForAdNetworks?: boolean;
  generateFallback?: boolean;
  
  // Internal use only - set by the export function
  templatePreview?: string;
  previewPage?: string;
}

// MP4 Export options
interface Mp4ExportOptions {
  frames: AnimationFrame[];
  width: number;
  height: number;
  fps: number;
  videoBitrate: number;
  codec: 'h264';
}

// WebM Export options
interface WebmExportOptions {
  frames: AnimationFrame[];
  width: number;
  height: number;
  fps: number;
  videoBitrate: number;
  codec: 'vp9';
  transparent?: boolean;
}

// Export animation as GIF
export async function exportGif(options: GifExportOptions): Promise<void> {
  try {
    console.log('exportGif called with options:', options);
    const { frames, useCustomContent, ...otherOptions } = options;
    
    // Make sure frames is always an array
    const frameArray = Array.isArray(frames) ? frames : [];
    
    if (frameArray.length === 0) {
      console.error('No frames provided for GIF export');
      alert('Error: No frames available for export. Please make sure you have frames selected.');
      return;
    }
    
    // If frames are custom content frames, we need to modify them for export
    if (useCustomContent) {
      // Create a modified version of frames that includes the custom content
      const processedFrames = frameArray.map(frame => {
        // Generate a frame with custom content from the original frame data
        return {
          ...frame,
          // Add custom content properties so the plugin can use them
          customContent: {
            headlineText: frame.headlineText || '',
            description: frame.description || '',
            isCustomContent: true
          }
        };
      });
      
      // Forward the export request to the plugin with processed frames
      pluginExportGif({ 
        ...otherOptions, 
        frames: processedFrames,
        // Include a flag to let the plugin know these are content-specific frames
        hasCustomContent: true
      });
    } else {
      // Standard animation frames, forward as is but make sure we're passing the array
      pluginExportGif({
        ...otherOptions,
        frames: frameArray
      });
    }
  } catch (error: any) {
    console.error('Error exporting GIF:', error);
    alert(`Export failed: ${error.message || 'Unknown error'}`);
  }
}

// Export animation as HTML5 ad
export async function exportHtml(options: HtmlExportOptions): Promise<void> {
  try {
    console.log('Generating HTML5 export with platform:', options.adPlatform);
    
    // Generate banner HTML template
    const bannerTemplate = generateHtml5Template(
      options.width,
      options.height,
      options.adPlatform,
      {
        addBorder: options.addBorder,
        borderColor: options.borderColor,
        addPreloaderAnimation: options.addPreloaderAnimation,
        infiniteLoop: options.infiniteLoop,
        renderRetina: options.renderRetina,
        bannerLink: options.bannerLink,
        usePTagsInsteadOfSvg: options.usePTagsInsteadOfSvg,
        injectCustomCode: options.injectCustomCode,
        customCode: options.customHtml // Use the custom HTML as custom code
      }
    );
    
    // Generate preview page if needed
    let previewPage: string | undefined = undefined;
    if (options.generatePreviewPage) {
      previewPage = generatePreviewPage(
        [{
          html: bannerTemplate,
          width: options.width,
          height: options.height,
          name: `HTML5 Ad ${options.width}x${options.height}`
        }],
        {
          layout: options.previewPageLayout,
          useDarkMode: options.useDarkMode,
          customCss: options.customCss
        }
      );
    }
    
    // Forward the export request to the plugin with the enhanced options
    pluginExportHtml({
      ...options,
      templatePreview: bannerTemplate,
      previewPage
    });
  } catch (error: any) {
    console.error('Error exporting HTML5:', error);
    alert(`HTML5 export failed: ${error.message || 'Unknown error'}`);
  }
}

// Helper function to generate HTML5 template
export function generateHtml5Template(
  width: number, 
  height: number, 
  adPlatform: AdPlatform = 'standard-css',
  options: {
    addBorder?: boolean;
    borderColor?: string;
    addPreloaderAnimation?: boolean;
    infiniteLoop?: boolean;
    renderRetina?: boolean;
    bannerLink?: string;
    usePTagsInsteadOfSvg?: boolean;
    injectCustomCode?: boolean;
    customCode?: string;
  } = {}
): string {
  const {
    addBorder = false,
    borderColor = '#000000',
    addPreloaderAnimation = false,
    infiniteLoop = false,
    renderRetina = false,
    bannerLink = 'https://example.com',
    usePTagsInsteadOfSvg = false,
    injectCustomCode = false,
    customCode = ''
  } = options;
  
  // Determine if we need to include GSAP
  const useGsap = adPlatform === 'standard-gsap' || 
                  adPlatform === 'jivox-gsap' || 
                  adPlatform.includes('gsap');
  
  // Determine correct click tag implementation based on platform
  const getClickTagImplementation = () => {
    switch (adPlatform) {
      // Google platforms (Google Ads, DV360, Display & Video 360)
      // Based on official Google documentation
      case 'google-ads':
      case 'google-display-network':
      case 'doubleclick-dcm':
      case 'doubleclick-studio':
      case 'dv360':
        return `
  <script type="text/javascript">
    // Define clickTag variable - this will be populated by Google's ad servers
    var clickTag = "";
        
    // Wait for DOM to be ready before adding event listeners
    window.addEventListener('load', function() {
      // Add click event to the container
      document.getElementById('ad').addEventListener('click', function() {
        // Use the clickTag value injected by the ad server, or fallback to default
        window.open(clickTag || '${bannerLink}', '_blank');
      });
    });
  </script>`;
        
      // AdForm platform - based on official AdForm documentation
      case 'adform':
        return `
  <script type="text/javascript">
    // With AdForm, clickTAG (uppercase TAG) is the standard format
    var clickTAG = "${bannerLink}";
    
    window.addEventListener('load', function() {
      document.getElementById('ad').addEventListener('click', function() {
        window.open(clickTAG, '_blank');
      });
    });
  </script>`;
      
      // AdForm MRAID (Mobile) - uses MRAID API
      case 'adform-mraid':
        return `
  <script type="text/javascript">
    function handleMraidClick() {
      if (typeof mraid !== 'undefined' && mraid.getState() === 'default') {
        mraid.open('${bannerLink}');
      } else {
        window.open('${bannerLink}', '_blank');
      }
    }
    
    window.addEventListener('load', function() {
      document.getElementById('ad').addEventListener('click', handleMraidClick);
    });
  </script>`;
        
      // Flashtalking - based on Flashtalking HTML5 documentation
      case 'flashtalking':
        return `
  <script type="text/javascript">
    // Flashtalking clicktag implementation
    function ftInit() {
      // Check if FT API is available
      if (typeof myFT === 'undefined') {
        // Fallback if Flashtalking API isn't available
        document.getElementById('ad').addEventListener('click', function() {
          window.open('${bannerLink}', '_blank');
        });
      } else {
        document.getElementById('ad').addEventListener('click', function() {
          myFT.clickTag(1, '${bannerLink}');
        });
      }
    }
    
    // Initialize when document is ready
    if (document.readyState === 'complete') {
      ftInit();
    } else {
      window.addEventListener('load', ftInit);
    }
  </script>`;
        
      // Sizmek - based on Sizmek HTML5 documentation
      case 'sizmek':
        return `
  <script type="text/javascript">
    function handleSizmekClick() {
      // Check if EB API is available
      if (typeof EB !== 'undefined' && typeof EB.clickthrough === 'function') {
        EB.clickthrough();
      } else {
        // Fallback if Sizmek API isn't available
        window.open('${bannerLink}', '_blank');
      }
    }
    
    window.addEventListener('load', function() {
      document.getElementById('ad').addEventListener('click', handleSizmekClick);
    });
  </script>`;
        
      // Trade Desk - based on Trade Desk HTML5 documentation
      case 'trade-desk':
        return `
  <script type="text/javascript">
    // Trade Desk uses CLICK_URL macro
    window.addEventListener('load', function() {
      document.getElementById('ad').addEventListener('click', function() {
        // Use CLICK_URL if available, otherwise fallback to default URL
        if (typeof CLICK_URL !== 'undefined') {
          window.open(CLICK_URL, '_blank');
        } else {
          window.open('${bannerLink}', '_blank');
        }
      });
    });
  </script>`;
      
      // Amazon Ads - based on Amazon Advertising documentation
      case 'amazon-ads':
        return `
  <script type="text/javascript">
    window.addEventListener('load', function() {
      document.getElementById('ad').addEventListener('click', function(e) {
        // Amazon Ads uses clickurl macro
        var clickUrl = '%%CLICK_URL_UNESC%%' + encodeURIComponent('${bannerLink}');
        // If not in an ad server environment, use the default URL
        if (clickUrl.indexOf('%%CLICK') === 0) {
          clickUrl = '${bannerLink}';
        }
        window.open(clickUrl, '_blank');
      });
    });
  </script>`;
      
      // Meta (Facebook) Ads - based on Meta's HTML5 ad requirements
      case 'meta-ads':
      case 'facebook-ads':
        return `
  <script type="text/javascript">
    window.addEventListener('load', function() {
      document.getElementById('ad').addEventListener('click', function() {
        // For Facebook/Meta ads, we'll open the URL and also
        // trigger a custom event that Meta's container can listen for
        window.open('${bannerLink}', '_blank');
        
        // Dispatch custom event for Meta's ad container
        if (window.parent) {
          var event = new CustomEvent('adClick', { detail: { url: '${bannerLink}' } });
          window.parent.document.dispatchEvent(event);
        }
      });
    });
  </script>`;
      
      // Mobile-specific implementations
      case 'ussd-sms':
        return `
  <script type="text/javascript">
    window.addEventListener('load', function() {
      document.getElementById('ad').addEventListener('click', function() {
        // SMS link format with placeholder - this should be replaced with actual SMS details
        window.open('sms:12345?body=I%20want%20to%20learn%20more', '_blank');
      });
    });
  </script>`;
      
      case 'ussd-call':
        return `
  <script type="text/javascript">
    window.addEventListener('load', function() {
      document.getElementById('ad').addEventListener('click', function() {
        // Tel link format with placeholder - this should be replaced with actual phone number
        window.open('tel:12345', '_blank');
      });
    });
  </script>`;
      
      // Twitter Ads - based on Twitter ad specs
      case 'twitter-ads':
        return `
  <script type="text/javascript">
    window.addEventListener('load', function() {
      document.getElementById('ad').addEventListener('click', function() {
        // Twitter uses CLICKURL macro
        var clickUrl = '${bannerLink}';
        if (typeof CLICKURL !== 'undefined') {
          clickUrl = CLICKURL;
        }
        window.open(clickUrl, '_blank');
      });
    });
  </script>`;
      
      // TikTok Ads - based on TikTok HTML5 ad specs
      case 'tiktok-ads':
        return `
  <script type="text/javascript">
    window.addEventListener('load', function() {
      document.getElementById('ad').addEventListener('click', function() {
        // TikTok uses __CLICK_URL__ macro
        var clickUrl = '${bannerLink}';
        if (typeof __CLICK_URL__ !== 'undefined') {
          clickUrl = __CLICK_URL__;
        }
        window.open(clickUrl, '_blank');
        
        // Also notify TikTok's ad container
        if (window.parent && window.parent.postMessage) {
          window.parent.postMessage('adClick', '*');
        }
      });
    });
  </script>`;
      
      // For other platforms or when no platform is specified
      default:
        return `
  <script type="text/javascript">
    // Standard implementation that works with most ad servers
    var clickTag = "${bannerLink}";
    
    window.addEventListener('load', function() {
      document.getElementById('ad').addEventListener('click', function() {
        window.open(clickTag, '_blank');
      });
    });
  </script>`;
    }
  };
  
  // Get platform-specific meta tags
  const getPlatformMetaTags = () => {
    // Base meta tags needed for all HTML5 ads
    const commonMeta = `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="ad.size" content="width=${width},height=${height}">`;
    
    switch (adPlatform) {
      // Google platforms - based on official documentation
      case 'google-ads':
      case 'google-display-network':
      case 'doubleclick-dcm':
      case 'doubleclick-studio':
      case 'dv360':
        return `${commonMeta}
  <meta name="GCD" content="YTk3ODQ3ZWZhN2I4NzZmMzBkNTEwZmQ2NmNmMmZlZTU="/>
  <meta name="google" content="notranslate">
  <meta name="format-detection" content="telephone=no">`;
      
      // Meta (Facebook) platforms
      case 'meta-ads':
      case 'facebook-ads':
        return `${commonMeta}
  <meta name="format-detection" content="telephone=no">
  <meta name="facebook-domain-verification" content="required-for-facebook-ads">
  <meta property="og:title" content="HTML5 Ad ${width}x${height}">
  <meta property="og:description" content="Interactive banner ad">`;
      
      // Twitter ads
      case 'twitter-ads':
        return `${commonMeta}
  <meta name="twitter:card" content="summary">
  <meta name="format-detection" content="telephone=no">`;
      
      // IAB standard compliant
      case 'iab-standard':
        return `${commonMeta}
  <meta name="format-detection" content="telephone=no">
  <meta name="author" content="Created with Figma Animation Plugin">
  <meta name="generator" content="Figma Animation Plugin">`;
      
      // AdForm platform
      case 'adform':
      case 'adform-mraid':
        return `${commonMeta}
  <meta name="format-detection" content="telephone=no">
  <meta name="generator" content="Figma Animation Plugin for AdForm">`;
      
      // Mobile-specific implementations
      case 'ussd-sms':
      case 'ussd-call':
        return `${commonMeta}
  <meta name="format-detection" content="telephone=yes">
  <meta name="apple-mobile-web-app-capable" content="yes">`;
      
      // TikTok Ads
      case 'tiktok-ads':
        return `${commonMeta}
  <meta name="format-detection" content="telephone=no">
  <meta name="bytedance-verification-code" content="required-for-tiktok-ads">`;
      
      // Amazon Ads
      case 'amazon-ads':
        return `${commonMeta}
  <meta name="format-detection" content="telephone=no">
  <meta name="generator" content="Figma Animation Plugin for Amazon Ads">`;
      
      // For responsive ads add viewport scale
      case 'responsive':
      case 'scalable':
        return `${commonMeta}
  <meta name="format-detection" content="telephone=no">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">`;
      
      // Default for other platforms
      default:
        return `${commonMeta}
  <meta name="format-detection" content="telephone=no">`;
    }
  };
  
  // Generate platform-specific structure
  return `<!DOCTYPE html>
<html lang="en">
<head>
${getPlatformMetaTags()}
  <title>HTML5 Ad ${width}x${height}</title>
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
      ${addBorder ? `border: 1px solid ${borderColor};` : ''}
    }
    /* Responsive scaling */
    ${adPlatform === 'responsive' || adPlatform === 'scalable' ? `
    @media only screen and (max-width: ${width}px) {
      #ad {
        width: 100%;
        height: auto;
        aspect-ratio: ${width} / ${height};
      }
    }` : ''}
    ${renderRetina ? `
    /* Retina support */
    @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
      #ad {
        /* Retina-specific styles */
        transform: scale(0.5);
        transform-origin: top left;
        width: ${width * 2}px;
        height: ${height * 2}px;
      }
    }` : ''}
    ${addPreloaderAnimation ? `
    /* Preloader styles */
    #preloader {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: white;
      z-index: 1000;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .loader {
      width: 30px;
      height: 30px;
      border: 3px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top-color: #3498db;
      animation: spin 1s ease-in-out infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }` : ''}
  </style>
  ${useGsap ? `<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.0/gsap.min.js"></script>` : ''}
  ${injectCustomCode && customCode ? customCode : ''}
</head>
<body>
  <div id="ad">
    ${addPreloaderAnimation ? `
    <div id="preloader">
      <div class="loader"></div>
    </div>` : ''}
    <!-- Ad content will be inserted here -->
  </div>
  
  ${getClickTagImplementation()}
  
  <script>
    // Animation script will be inserted here
    ${addPreloaderAnimation ? `
    // Hide preloader once content is loaded
    window.addEventListener('load', function() {
      const preloader = document.getElementById('preloader');
      if (preloader) {
        setTimeout(function() {
          preloader.style.opacity = '0';
          preloader.style.transition = 'opacity 0.5s ease';
          setTimeout(function() {
            preloader.style.display = 'none';
          }, 500);
        }, 500);
      }
    });` : ''}
    ${infiniteLoop ? `
    // Infinite loop animation
    function restartAnimation() {
      // Animation restart code will be inserted here
    }
    // Restart animation when it ends
    document.addEventListener('animationend', restartAnimation);` : ''}
  </script>
</body>
</html>`;
}

// Helper function for preview page generation
export function generatePreviewPage(
  banners: Array<{html: string, width: number, height: number, name: string}>,
  options: {
    layout?: 'masonry' | 'grid' | 'list',
    useDarkMode?: boolean,
    customCss?: string
  } = {}
): string {
  const { 
    layout = 'masonry', 
    useDarkMode = false,
    customCss = '' 
  } = options;
  
  const backgroundColor = useDarkMode ? '#121212' : '#ffffff';
  const textColor = useDarkMode ? '#ffffff' : '#000000';
  const borderColor = useDarkMode ? '#333333' : '#dddddd';
  
  const bannerHtml = banners.map(banner => {
    return `
      <div class="banner-container">
        <div class="banner-header">
          <h3>${banner.name || `${banner.width}x${banner.height}`}</h3>
          <span class="banner-size">${banner.width}x${banner.height}</span>
        </div>
        <div class="banner-content">
          <iframe 
            src="data:text/html;charset=utf-8,${encodeURIComponent(banner.html)}" 
            width="${banner.width}" 
            height="${banner.height}" 
            frameborder="0">
          </iframe>
        </div>
      </div>
    `;
  }).join('');
  
  const layoutClass = 
    layout === 'masonry' ? 'preview-masonry-layout' :
    layout === 'grid' ? 'preview-grid-layout' :
    'preview-list-layout';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HTML5 Banner Preview</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      margin: 0;
      padding: 20px;
      background-color: ${backgroundColor};
      color: ${textColor};
      transition: background-color 0.3s, color 0.3s;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid ${borderColor};
    }
    .theme-toggle {
      background: ${useDarkMode ? '#333' : '#eee'};
      border: none;
      color: ${textColor};
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .banner-container {
      background-color: ${useDarkMode ? '#1e1e1e' : '#f5f5f5'};
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 20px;
      border: 1px solid ${borderColor};
    }
    .banner-header {
      padding: 12px 15px;
      background-color: ${useDarkMode ? '#272727' : '#eaeaea'};
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .banner-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }
    .banner-size {
      font-size: 13px;
      color: ${useDarkMode ? '#aaa' : '#666'};
    }
    .banner-content {
      padding: 15px;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: ${useDarkMode ? '#333' : '#fff'};
    }
    .banner-content iframe {
      max-width: 100%;
      border: 1px solid ${borderColor};
      background-color: white;
    }
    
    /* Layout styles */
    .preview-masonry-layout {
      column-count: 2;
      column-gap: 20px;
    }
    .preview-masonry-layout .banner-container {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .preview-grid-layout {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    .preview-list-layout .banner-container {
      max-width: 800px;
      margin: 0 auto 20px;
    }
    
    @media (max-width: 768px) {
      .preview-masonry-layout {
        column-count: 1;
      }
      .preview-grid-layout {
        grid-template-columns: 1fr;
      }
    }
    
    ${customCss}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>HTML5 Banner Preview</h1>
      <button class="theme-toggle" onclick="toggleTheme()">
        <span>
          ${useDarkMode ? 'Light Mode' : 'Dark Mode'}
        </span>
      </button>
    </div>
    
    <div class="${layoutClass}">
      ${bannerHtml}
    </div>
  </div>
  
  <script>
    function toggleTheme() {
      // Save current URL
      const url = new URL(window.location.href);
      
      // Toggle dark mode parameter
      const isDarkMode = url.searchParams.get('dark') === 'true';
      url.searchParams.set('dark', isDarkMode ? 'false' : 'true');
      
      // Navigate to new URL to reload with different theme
      window.location.href = url.toString();
    }
  </script>
</body>
</html>`;
}

// Export animation as MP4 video
export async function exportMp4(options: Mp4ExportOptions): Promise<void> {
  try {
    // Forward the export request to the plugin
    pluginExportMp4(options);
  } catch (error: any) {
    console.error('Error exporting MP4:', error);
    alert(`MP4 export failed: ${error.message || 'Unknown error'}`);
  }
}

// Export animation as WebM video
export async function exportWebm(options: WebmExportOptions): Promise<void> {
  try {
    // Forward the export request to the plugin
    pluginExportWebm(options);
  } catch (error: any) {
    console.error('Error exporting WebM:', error);
    alert(`WebM export failed: ${error.message || 'Unknown error'}`);
  }
}
