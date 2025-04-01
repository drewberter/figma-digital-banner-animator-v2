import { useState, useRef, useEffect } from 'react';
import { X, Download, ChevronUp, ChevronDown, Play, Pause } from 'lucide-react';
import { AdPlatform, exportGif, exportHtml, exportMp4, exportWebm } from '../utils/exportUtils';
import { AnimationFrame, AnimationLayer } from '../types/animation';
import FrameSelector from './FrameSelector';
import FrameEditDialog from './FrameEditDialog';
import { useAnimationContext } from '../context/AnimationContext';

interface ExportModalProps {
  onClose: () => void;
}

type ExportType = 'gif' | 'html' | 'mp4' | 'webm';

const ExportModal = ({ onClose }: ExportModalProps) => {
  // Get frames, currentFrame, and layers from context
  const { frames, currentFrame, layers } = useAnimationContext();
  const [exportType, setExportType] = useState<ExportType>('gif');
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [fps, setFps] = useState(30);
  const [includeFallback, setIncludeFallback] = useState(true);
  const [optimizeForAdNetworks, setOptimizeForAdNetworks] = useState(true);
  const [videoBitrate, setVideoBitrate] = useState(5000); // kbps
  const [videoFormat, setVideoFormat] = useState<'h264' | 'vp9'>('h264'); // Codec selection
  const [transparent, setTransparent] = useState(false); // For WebM transparency
  const [specialGifFormat, setSpecialGifFormat] = useState(false); // Special client GIF format
  
  // HTML5 Export Advanced Options
  const [generatePreviewPage, setGeneratePreviewPage] = useState(true);
  const [previewPageLayout, setPreviewPageLayout] = useState<'masonry' | 'grid' | 'list'>('masonry');
  const [useDarkMode, setUseDarkMode] = useState(false);
  const [addBorder, setAddBorder] = useState(false);
  const [borderColor, setBorderColor] = useState('#000000');
  const [addPreloaderAnimation, setAddPreloaderAnimation] = useState(false);
  const [infiniteLoop, setInfiniteLoop] = useState(false);
  const [addBackupJpg, setAddBackupJpg] = useState(false);
  const [renderRetina, setRenderRetina] = useState(false);
  const [maxFileSizeTarget, setMaxFileSizeTarget] = useState(150);
  const [uploadToNetlify, setUploadToNetlify] = useState(false);
  const [customHtml, setCustomHtml] = useState('');
  const [customCss, setCustomCss] = useState('');
  const [minifyCode, setMinifyCode] = useState(true);
  const [injectCustomCode, setInjectCustomCode] = useState(false);
  const [includeZipFiles, setIncludeZipFiles] = useState(true);
  const [usePTagsInsteadOfSvg, setUsePTagsInsteadOfSvg] = useState(false);
  const [bannerLink, setBannerLink] = useState('https://example.com');
  const [compressionSpeed, setCompressionSpeed] = useState<'faster' | 'balanced' | 'smaller'>('faster');
  const [adPlatform, setAdPlatform] = useState<AdPlatform>('standard-css');
  
  // Advanced GIF options
  const [showAdvancedGifOptions, setShowAdvancedGifOptions] = useState(false);
  const [frameCount, setFrameCount] = useState(0); // 0 = all frames, otherwise specific count
  const [frameDelay, setFrameDelay] = useState(100); // in milliseconds
  const [disposalMethod, setDisposalMethod] = useState<'none' | 'background' | 'previous'>('none');
  const [dithering, setDithering] = useState<'none' | 'pattern' | 'diffusion'>('diffusion');
  const [compression, setCompression] = useState(7); // 1-10 scale
  
  // GIF Preview
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewFrame, setPreviewFrame] = useState(0);
  const previewInterval = useRef<number | null>(null);
  
  // Animation frame management for multiple GIF frames 
  const [gifFrames, setGifFrames] = useState<AnimationFrame[]>([]);
  const [selectedGifFrameId, setSelectedGifFrameId] = useState<string | null>(null);
  const [isFrameDialogOpen, setIsFrameDialogOpen] = useState(false);
  const [editingFrameId, setEditingFrameId] = useState<string | null>(null);
  
  // Frame management functions
  const handleAddFrame = () => {
    setEditingFrameId(null);
    setIsFrameDialogOpen(true);
  };
  
  const handleEditFrame = (frameId: string) => {
    setEditingFrameId(frameId);
    setIsFrameDialogOpen(true);
  };
  
  const handleDeleteFrame = (frameId: string) => {
    setGifFrames(gifFrames.filter(frame => frame.id !== frameId));
    if (selectedGifFrameId === frameId) {
      setSelectedGifFrameId(gifFrames.length > 1 ? gifFrames[0].id : null);
    }
  };
  
  const handleSelectFrame = (frameId: string) => {
    setSelectedGifFrameId(frameId);
  };
  
  const handleSaveFrame = (frameData: { name: string, headlineText: string, description?: string, hiddenLayers?: string[] }) => {
    if (editingFrameId) {
      // Update existing frame
      setGifFrames(gifFrames.map(frame => 
        frame.id === editingFrameId 
          ? { 
              ...frame, 
              name: frameData.name, 
              headlineText: frameData.headlineText,
              description: frameData.description,
              hiddenLayers: frameData.hiddenLayers
            }
          : frame
      ));
    } else {
      // Add new frame
      const newFrame: AnimationFrame = {
        id: `gif-frame-${Date.now()}`,
        name: frameData.name,
        selected: false,
        width: currentFrame?.width || 300,
        height: currentFrame?.height || 250,
        headlineText: frameData.headlineText,
        description: frameData.description,
        hiddenLayers: frameData.hiddenLayers
      };
      
      const updatedFrames = [...gifFrames, newFrame];
      setGifFrames(updatedFrames);
      setSelectedGifFrameId(newFrame.id);
    }
    
    setIsFrameDialogOpen(false);
  };
  
  // When frameCount is active, disable the fps control
  const isFpsDisabled = specialGifFormat || (showAdvancedGifOptions && frameCount > 0);
  
  // Use selected frame dimensions
  const getFrameDimensions = () => {
    if (!currentFrame) {
      // Default dimensions if no frame is selected
      return { width: 300, height: 250 };
    }
    return {
      width: currentFrame.width,
      height: currentFrame.height
    };
  };
  
  // Cleanup preview interval on unmount
  useEffect(() => {
    return () => {
      if (previewInterval.current) {
        clearInterval(previewInterval.current);
      }
    };
  }, []);
  
  // Toggle GIF preview playback
  const togglePreview = () => {
    if (previewPlaying) {
      if (previewInterval.current) {
        clearInterval(previewInterval.current);
        previewInterval.current = null;
      }
      setPreviewPlaying(false);
    } else {
      setPreviewPlaying(true);
      const delay = specialGifFormat ? 2500 : showAdvancedGifOptions ? frameDelay : (1000 / fps);
      
      // Using appropriate frame source for preview
      const frameSource = gifFrames.length > 0 ? gifFrames : frames;
      
      if (frameSource.length > 0) {
        previewInterval.current = window.setInterval(() => {
          setPreviewFrame(prev => (prev + 1) % frameSource.length);
        }, delay);
      }
    }
  };
  
  // Handle export
  const handleExport = () => {
    const { width, height } = getFrameDimensions();
    
    // Prepare export options based on export type
    const commonOptions = {
      width,
      height,
      fps
    };
    
    if (exportType === 'gif') {
      // Check if we're using custom content frames or original Figma frames
      const useContentFrames = gifFrames.length > 0;
      const framesSource = useContentFrames ? gifFrames : frames;
      
      if (specialGifFormat) {
        // Extract exactly 3 frames for the special format client requirements
        // If there are more than 3 frames, take beginning, middle and end frames
        let selectedFrames = [...framesSource];
        if (framesSource.length > 3) {
          const middle = Math.floor(framesSource.length / 2);
          selectedFrames = [
            framesSource[0],
            framesSource[middle],
            framesSource[framesSource.length - 1]
          ];
        } else if (framesSource.length < 3) {
          // If less than 3 frames, duplicate the last frame to make up 3
          while (selectedFrames.length < 3) {
            selectedFrames.push(framesSource[framesSource.length - 1] || framesSource[0]);
          }
        }
        
        const specialGifOptions = {
          frames: selectedFrames,
          ...commonOptions,
          quality: 1, // Always use high quality for client special format
          dithering: 'diffusion' as 'diffusion' | 'pattern' | 'none',
          colorDepth: 24 as 8 | 16 | 24, 
          loop: true,
          disposal: 'none' as 'none' | 'background' | 'previous',
          delay: 2500, // 2.5 seconds between frames
          useCustomContent: useContentFrames
        };
        
        console.log('Exporting as Special Client GIF Format:', specialGifOptions);
        exportGif(specialGifOptions);
      } else {
        // Select frames if frameCount is specified in advanced options
        let selectedFrames = [...framesSource];
        if (showAdvancedGifOptions && frameCount > 0 && frameCount < framesSource.length) {
          // Calculate frames to include with even distribution
          const step = framesSource.length / frameCount;
          selectedFrames = [];
          
          for (let i = 0; i < frameCount; i++) {
            const index = Math.min(Math.floor(i * step), framesSource.length - 1);
            selectedFrames.push(framesSource[index]);
          }
        }
        
        const gifOptions = {
          frames: selectedFrames,
          ...commonOptions,
          quality: quality === 'high' ? 1 : quality === 'medium' ? 0.6 : 0.3,
          dithering: showAdvancedGifOptions ? dithering : 
                    (quality === 'high' ? 'diffusion' : 
                     quality === 'medium' ? 'pattern' : 'none') as 'diffusion' | 'pattern' | 'none',
          colorDepth: (quality === 'high' ? 24 : quality === 'medium' ? 16 : 8) as 8 | 16 | 24,
          loop: true,
          useCustomContent: useContentFrames,
          // Add advanced options if they're visible
          ...(showAdvancedGifOptions && {
            delay: frameDelay,
            disposal: disposalMethod,
            // Apply compression by adjusting quality
            quality: quality === 'high' ? 
                     (1 - (compression - 1) * 0.05) : // Scale from 0.95 (compression=1) to 0.5 (compression=10)
                     quality === 'medium' ? 
                     (0.6 - (compression - 1) * 0.03) : // Scale medium quality
                     (0.3 - (compression - 1) * 0.02)  // Scale low quality
          })
        };
        
        console.log('Exporting as GIF with advanced options:', gifOptions);
        exportGif(gifOptions);
      }
    } 
    else if (exportType === 'html') {
      const htmlOptions = {
        frames,
        ...commonOptions,
        // Banner options
        addBorder,
        borderColor,
        addPreloaderAnimation,
        infiniteLoop,
        addBackupJpg,
        renderRetina,
        maxFileSizeTarget,
        
        // Preview page options
        generatePreviewPage,
        previewPageLayout,
        useDarkMode,
        uploadToNetlify,
        customHtml,
        customCss,
        
        // Code output settings
        minifyCode,
        injectCustomCode,
        includeZipFiles,
        usePTagsInsteadOfSvg,
        bannerLink,
        compressionSpeed,
        
        // Ad platform options (new)
        adPlatform,
        
        // Legacy options (maintaining backwards compatibility)
        includeClickTag: includeFallback,
        optimizeForAdNetworks,
        generateFallback: includeFallback
      };
      
      console.log('Exporting as HTML5 for platform:', adPlatform, htmlOptions);
      exportHtml(htmlOptions);
    }
    else if (exportType === 'mp4') {
      const mp4Options = {
        frames,
        ...commonOptions,
        videoBitrate,
        codec: 'h264' as 'h264'  // Type assertion to match the expected type
      };
      
      console.log('Exporting as MP4:', mp4Options);
      exportMp4(mp4Options);
    }
    else if (exportType === 'webm') {
      const webmOptions = {
        frames,
        ...commonOptions,
        videoBitrate,
        codec: 'vp9' as 'vp9',  // Type assertion to match the expected type
        transparent
      };
      
      console.log('Exporting as WebM:', webmOptions);
      exportWebm(webmOptions);
    }
    
    // Close the modal after export
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
      <div className="bg-[#111111] rounded-lg w-[500px] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Export Animation</h2>
          <button 
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-800"
            onClick={onClose}
          >
            <X size={18} className="text-neutral-400" />
          </button>
        </div>
        
        <div className="p-5 space-y-5 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm text-neutral-300 mb-2">Export Format</label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                className={`py-3 rounded-md border ${exportType === 'gif' ? 'border-[#4A7CFF] bg-[#1a1a1a]' : 'border-neutral-700 bg-[#151515]'} flex flex-col items-center justify-center`}
                onClick={() => setExportType('gif')}
              >
                <div className={`text-lg font-medium ${exportType === 'gif' ? 'text-[#4A7CFF]' : 'text-neutral-400'}`}>GIF</div>
                <div className="text-xs text-neutral-500 mt-1">Universal compatibility</div>
              </button>
              
              <button
                className={`py-3 rounded-md border ${exportType === 'html' ? 'border-[#4A7CFF] bg-[#1a1a1a]' : 'border-neutral-700 bg-[#151515]'} flex flex-col items-center justify-center`}
                onClick={() => setExportType('html')}
              >
                <div className={`text-lg font-medium ${exportType === 'html' ? 'text-[#4A7CFF]' : 'text-neutral-400'}`}>HTML5</div>
                <div className="text-xs text-neutral-500 mt-1">Advanced animations</div>
              </button>
              
              <button
                className={`py-3 rounded-md border ${exportType === 'mp4' ? 'border-[#4A7CFF] bg-[#1a1a1a]' : 'border-neutral-700 bg-[#151515]'} flex flex-col items-center justify-center`}
                onClick={() => setExportType('mp4')}
              >
                <div className={`text-lg font-medium ${exportType === 'mp4' ? 'text-[#4A7CFF]' : 'text-neutral-400'}`}>MP4</div>
                <div className="text-xs text-neutral-500 mt-1">High quality video</div>
              </button>
              
              <button
                className={`py-3 rounded-md border ${exportType === 'webm' ? 'border-[#4A7CFF] bg-[#1a1a1a]' : 'border-neutral-700 bg-[#151515]'} flex flex-col items-center justify-center`}
                onClick={() => setExportType('webm')}
              >
                <div className={`text-lg font-medium ${exportType === 'webm' ? 'text-[#4A7CFF]' : 'text-neutral-400'}`}>WebM</div>
                <div className="text-xs text-neutral-500 mt-1">Optimized web video</div>
              </button>
            </div>
          </div>
          
          {/* Frame Size information removed as Ad size will dictate export dimensions */}
          
          {/* Add GIF Preview for gif export type */}
          {exportType === 'gif' && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-neutral-300">Preview</label>
                <button 
                  onClick={togglePreview}
                  className="flex items-center text-xs text-[#4A7CFF] hover:text-[#5A8CFF]"
                >
                  {previewPlaying ? (
                    <>
                      <Pause size={14} className="mr-1" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play size={14} className="mr-1" />
                      Play
                    </>
                  )}
                </button>
              </div>
              <div className="bg-black rounded-md h-[120px] flex items-center justify-center overflow-hidden">
                {/* Show custom content frames if available, otherwise show animation frames */}
                {gifFrames.length > 0 ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className="text-xs text-neutral-500 absolute bottom-2 right-2">
                      Frame {previewFrame + 1}/{gifFrames.length}
                    </div>
                    <div className="w-[80%] h-[80%] bg-[#1a1a1a] flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-neutral-200 font-medium mb-1">
                          {gifFrames[previewFrame % gifFrames.length]?.headlineText || 'No headline'}
                        </div>
                        {gifFrames[previewFrame % gifFrames.length]?.description && (
                          <div className="text-neutral-400 text-xs">
                            {gifFrames[previewFrame % gifFrames.length]?.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : frames.length > 0 ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className="text-xs text-neutral-500 absolute bottom-2 right-2">
                      Frame {previewFrame + 1}/{frames.length}
                    </div>
                    <div className="w-[80%] h-[80%] bg-[#1a1a1a] flex items-center justify-center">
                      {/* Here you would show the actual frame preview */}
                      <div className="text-center text-neutral-400">
                        Frame preview: {frames[previewFrame]?.name || 'No frames'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-neutral-500 text-sm">No frames available</div>
                )}
              </div>
            </div>
          )}
          
          {exportType === 'gif' && (
            <>
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Quality</label>
                <div className="flex rounded-md overflow-hidden border border-neutral-700">
                  <button
                    className={`flex-1 py-2 ${quality === 'low' ? 'bg-[#1a1a1a] text-neutral-200' : 'bg-[#151515] text-neutral-400'}`}
                    onClick={() => setQuality('low')}
                    disabled={specialGifFormat}
                  >
                    Low
                  </button>
                  <button
                    className={`flex-1 py-2 ${quality === 'medium' ? 'bg-[#1a1a1a] text-neutral-200' : 'bg-[#151515] text-neutral-400'}`}
                    onClick={() => setQuality('medium')}
                    disabled={specialGifFormat}
                  >
                    Medium
                  </button>
                  <button
                    className={`flex-1 py-2 ${quality === 'high' ? 'bg-[#1a1a1a] text-neutral-200' : 'bg-[#151515] text-neutral-400'}`}
                    onClick={() => setQuality('high')}
                    disabled={specialGifFormat}
                  >
                    High
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Frame Rate (FPS)</label>
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="1"
                  value={fps}
                  onChange={(e) => setFps(parseInt(e.target.value))}
                  className="w-full"
                  disabled={isFpsDisabled}
                />
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>15 fps</span>
                  <span className="text-neutral-300">
                    {specialGifFormat 
                      ? "0.4 fps (2.5s delay)" 
                      : (showAdvancedGifOptions && frameCount > 0)
                        ? `Using frame delay (${frameDelay}ms)` 
                        : `${fps} fps`}
                  </span>
                  <span>60 fps</span>
                </div>
              </div>
              
              {/* Frame Content Selector removed - GIFs will be created in the GIF Frame animator instead */}
              
              <div className="flex items-center px-3 py-3 mt-2 bg-[#1a1a1a] rounded border border-[#4A7CFF] border-opacity-30">
                <input
                  type="checkbox"
                  id="specialGifFormat"
                  checked={specialGifFormat}
                  onChange={(e) => setSpecialGifFormat(e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <label htmlFor="specialGifFormat" className="text-sm text-neutral-200 font-medium">
                    Client Special Format
                  </label>
                  <p className="text-xs text-neutral-400 mt-1">
                    3 frames, 2.5s between frames, no disposal
                  </p>
                </div>
              </div>
              
              <div className="mt-5">
                <button
                  onClick={() => setShowAdvancedGifOptions(!showAdvancedGifOptions)}
                  className="flex items-center text-sm text-neutral-300 hover:text-white"
                >
                  <span className="mr-1">Advanced Options</span>
                  {showAdvancedGifOptions ? (
                    <ChevronUp size={16} className="text-neutral-500" />
                  ) : (
                    <ChevronDown size={16} className="text-neutral-500" />
                  )}
                </button>
                
                {showAdvancedGifOptions && !specialGifFormat && (
                  <div className="mt-4 space-y-4 rounded-md bg-[#1a1a1a] p-4 border border-neutral-700 max-h-[300px] overflow-y-auto">
                    <div>
                      <label className="block text-sm text-neutral-300 mb-2">Frame Count</label>
                      <div className="flex items-center">
                        <input
                          type="range"
                          min="0"
                          max={Math.max(20, frames.length)}
                          step="1"
                          value={frameCount}
                          onChange={(e) => setFrameCount(parseInt(e.target.value))}
                          className="flex-1 mr-3"
                        />
                        <div className="w-16 text-center text-sm text-neutral-300">
                          {frameCount === 0 ? 'All' : frameCount}
                        </div>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">Set to 0 to use all frames</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-neutral-300 mb-2">Frame Delay (ms)</label>
                      <div className="flex items-center">
                        <input
                          type="range"
                          min="10"
                          max="3000"
                          step="10"
                          value={frameDelay}
                          onChange={(e) => setFrameDelay(parseInt(e.target.value))}
                          className="flex-1 mr-3"
                        />
                        <div className="w-16 text-center text-sm text-neutral-300">
                          {frameDelay} ms
                        </div>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">Time between frames</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-neutral-300 mb-2">Disposal Method</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          className={`py-2 px-1 rounded ${disposalMethod === 'none' ? 'bg-[#2a2a2a] text-white' : 'bg-[#191919] text-neutral-400'}`}
                          onClick={() => setDisposalMethod('none')}
                        >
                          None
                        </button>
                        <button
                          className={`py-2 px-1 rounded ${disposalMethod === 'background' ? 'bg-[#2a2a2a] text-white' : 'bg-[#191919] text-neutral-400'}`}
                          onClick={() => setDisposalMethod('background')}
                        >
                          Background
                        </button>
                        <button
                          className={`py-2 px-1 rounded ${disposalMethod === 'previous' ? 'bg-[#2a2a2a] text-white' : 'bg-[#191919] text-neutral-400'}`}
                          onClick={() => setDisposalMethod('previous')}
                        >
                          Previous
                        </button>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">How frames are cleared</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-neutral-300 mb-2">Dithering</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          className={`py-2 px-1 rounded ${dithering === 'none' ? 'bg-[#2a2a2a] text-white' : 'bg-[#191919] text-neutral-400'}`}
                          onClick={() => setDithering('none')}
                        >
                          None
                        </button>
                        <button
                          className={`py-2 px-1 rounded ${dithering === 'pattern' ? 'bg-[#2a2a2a] text-white' : 'bg-[#191919] text-neutral-400'}`}
                          onClick={() => setDithering('pattern')}
                        >
                          Pattern
                        </button>
                        <button
                          className={`py-2 px-1 rounded ${dithering === 'diffusion' ? 'bg-[#2a2a2a] text-white' : 'bg-[#191919] text-neutral-400'}`}
                          onClick={() => setDithering('diffusion')}
                        >
                          Diffusion
                        </button>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">Color blending technique</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-neutral-300 mb-2">Compression ({compression})</label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={compression}
                        onChange={(e) => setCompression(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-neutral-500">
                        <span>Low (Larger file)</span>
                        <span>High (Smaller file)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          
          {exportType === 'html' && (
            <>
              {/* Preview Page Options */}
              <div className="border-b border-neutral-800 pb-4 mb-4">
                <h3 className="text-white text-sm font-medium mb-3">Preview Page Options</h3>
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="relative inline-block w-10 mr-2 align-middle">
                      <input 
                        type="checkbox" 
                        id="generatePreviewPage" 
                        checked={generatePreviewPage}
                        onChange={(e) => setGeneratePreviewPage(e.target.checked)}
                        className="opacity-0 w-0 h-0 absolute"
                      />
                      <label 
                        htmlFor="generatePreviewPage"
                        className={`block overflow-hidden h-6 rounded-full bg-neutral-700 cursor-pointer transition-colors duration-200 ${generatePreviewPage ? 'bg-[#4A7CFF]' : ''}`}
                      >
                        <span 
                          className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ${generatePreviewPage ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                      </label>
                    </div>
                    <label htmlFor="generatePreviewPage" className="text-sm text-neutral-300">
                      Generate Preview Page
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="relative inline-block w-10 mr-2 align-middle">
                      <input 
                        type="checkbox" 
                        id="useDarkMode" 
                        checked={useDarkMode}
                        onChange={(e) => setUseDarkMode(e.target.checked)}
                        className="opacity-0 w-0 h-0 absolute"
                      />
                      <label 
                        htmlFor="useDarkMode"
                        className={`block overflow-hidden h-6 rounded-full bg-neutral-700 cursor-pointer transition-colors duration-200 ${useDarkMode ? 'bg-[#4A7CFF]' : ''}`}
                      >
                        <span 
                          className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ${useDarkMode ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                      </label>
                    </div>
                    <label htmlFor="useDarkMode" className="text-sm text-neutral-300">
                      Use Dark Mode
                    </label>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm text-neutral-300 mb-1">Preview Page Layout</label>
                    <select 
                      value={previewPageLayout}
                      onChange={(e) => setPreviewPageLayout(e.target.value as 'masonry' | 'grid' | 'list')}
                      className="w-full bg-[#1a1a1a] text-neutral-300 border border-neutral-700 rounded p-2 text-sm"
                    >
                      <option value="masonry">Masonry Grid</option>
                      <option value="grid">Standard Grid</option>
                      <option value="list">List View</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-neutral-300 mb-1">Banner Labels</label>
                    <select 
                      className="w-full bg-[#1a1a1a] text-neutral-300 border border-neutral-700 rounded p-2 text-sm"
                    >
                      <option value="dimensions">Frame Dimensions</option>
                      <option value="name">Frame Name</option>
                      <option value="both">Both</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="uploadToNetlify"
                    checked={uploadToNetlify}
                    onChange={(e) => setUploadToNetlify(e.target.checked)}
                    className="mr-3"
                  />
                  <label htmlFor="uploadToNetlify" className="text-sm text-neutral-300">
                    Upload Preview Page URL to Netlify
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm text-neutral-300 mb-1">Custom HTML (inserted after &lt;/body&gt; tag)</label>
                  <textarea
                    value={customHtml}
                    onChange={(e) => setCustomHtml(e.target.value)}
                    rows={4}
                    className="w-full bg-[#1a1a1a] text-neutral-300 border border-neutral-700 rounded p-2 text-sm font-mono"
                    placeholder="<!-- Insert custom HTML here -->"
                  />
                </div>
                
                <div className="mt-3">
                  <label className="block text-sm text-neutral-300 mb-1">Custom CSS (no &lt;style&gt;&lt;/style&gt; tags required)</label>
                  <textarea
                    value={customCss}
                    onChange={(e) => setCustomCss(e.target.value)}
                    rows={4}
                    className="w-full bg-[#1a1a1a] text-neutral-300 border border-neutral-700 rounded p-2 text-sm font-mono"
                    placeholder="/* Insert custom CSS here */"
                  />
                </div>
              </div>
              
              {/* Banner Options */}
              <div className="border-b border-neutral-800 pb-4 mb-4">
                <h3 className="text-white text-sm font-medium mb-3">Banner Options</h3>
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="relative inline-block w-10 mr-2 align-middle">
                      <input 
                        type="checkbox" 
                        id="addBorder" 
                        checked={addBorder}
                        onChange={(e) => setAddBorder(e.target.checked)}
                        className="opacity-0 w-0 h-0 absolute"
                      />
                      <label 
                        htmlFor="addBorder"
                        className={`block overflow-hidden h-6 rounded-full bg-neutral-700 cursor-pointer transition-colors duration-200 ${addBorder ? 'bg-[#4A7CFF]' : ''}`}
                      >
                        <span 
                          className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ${addBorder ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                      </label>
                    </div>
                    <label htmlFor="addBorder" className="text-sm text-neutral-300">
                      Add 1px border
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input 
                      type="color" 
                      value={borderColor}
                      onChange={(e) => setBorderColor(e.target.value)}
                      disabled={!addBorder}
                      className="w-8 h-8 p-0 rounded border-none bg-transparent"
                    />
                    <input 
                      type="text" 
                      value={borderColor}
                      onChange={(e) => setBorderColor(e.target.value)}
                      disabled={!addBorder}
                      placeholder="eg. #000000"
                      className="w-32 ml-2 bg-[#1a1a1a] text-neutral-300 border border-neutral-700 rounded p-1 text-xs font-mono"
                    />
                  </div>
                </div>
                
                <div className="flex items-center mb-3">
                  <div className="relative inline-block w-10 mr-2 align-middle">
                    <input 
                      type="checkbox" 
                      id="addPreloaderAnimation" 
                      checked={addPreloaderAnimation}
                      onChange={(e) => setAddPreloaderAnimation(e.target.checked)}
                      className="opacity-0 w-0 h-0 absolute"
                    />
                    <label 
                      htmlFor="addPreloaderAnimation"
                      className={`block overflow-hidden h-6 rounded-full bg-neutral-700 cursor-pointer transition-colors duration-200 ${addPreloaderAnimation ? 'bg-[#4A7CFF]' : ''}`}
                    >
                      <span 
                        className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ${addPreloaderAnimation ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </label>
                  </div>
                  <label htmlFor="addPreloaderAnimation" className="text-sm text-neutral-300">
                    Add preloader animation to all banners
                  </label>
                </div>
                
                <div className="flex items-center mb-3">
                  <div className="relative inline-block w-10 mr-2 align-middle">
                    <input 
                      type="checkbox" 
                      id="infiniteLoop" 
                      checked={infiniteLoop}
                      onChange={(e) => setInfiniteLoop(e.target.checked)}
                      className="opacity-0 w-0 h-0 absolute"
                    />
                    <label 
                      htmlFor="infiniteLoop"
                      className={`block overflow-hidden h-6 rounded-full bg-neutral-700 cursor-pointer transition-colors duration-200 ${infiniteLoop ? 'bg-[#4A7CFF]' : ''}`}
                    >
                      <span 
                        className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ${infiniteLoop ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </label>
                  </div>
                  <label htmlFor="infiniteLoop" className="text-sm text-neutral-300">
                    Infinitely loop all banners
                  </label>
                </div>
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="relative inline-block w-10 mr-2 align-middle">
                      <input 
                        type="checkbox" 
                        id="addBackupJpg" 
                        checked={addBackupJpg}
                        onChange={(e) => setAddBackupJpg(e.target.checked)}
                        className="opacity-0 w-0 h-0 absolute"
                      />
                      <label 
                        htmlFor="addBackupJpg"
                        className={`block overflow-hidden h-6 rounded-full bg-neutral-700 cursor-pointer transition-colors duration-200 ${addBackupJpg ? 'bg-[#4A7CFF]' : ''}`}
                      >
                        <span 
                          className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ${addBackupJpg ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                      </label>
                    </div>
                    <label htmlFor="addBackupJpg" className="text-sm text-neutral-300">
                      Add "backup.jpg"
                    </label>
                  </div>
                  
                  <input 
                    type="number" 
                    value={maxFileSizeTarget}
                    onChange={(e) => setMaxFileSizeTarget(Number(e.target.value))}
                    min={50}
                    max={500}
                    className="w-20 bg-[#1a1a1a] text-neutral-300 border border-neutral-700 rounded p-1 text-xs text-center"
                  />
                  <span className="text-sm text-neutral-300 ml-2">KB Size Target</span>
                </div>
                
                <div className="flex items-center mb-3">
                  <div className="relative inline-block w-10 mr-2 align-middle">
                    <input 
                      type="checkbox" 
                      id="renderRetina" 
                      checked={renderRetina}
                      onChange={(e) => setRenderRetina(e.target.checked)}
                      className="opacity-0 w-0 h-0 absolute"
                    />
                    <label 
                      htmlFor="renderRetina"
                      className={`block overflow-hidden h-6 rounded-full bg-neutral-700 cursor-pointer transition-colors duration-200 ${renderRetina ? 'bg-[#4A7CFF]' : ''}`}
                    >
                      <span 
                        className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ${renderRetina ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </label>
                  </div>
                  <label htmlFor="renderRetina" className="text-sm text-neutral-300">
                    Render banner images @2x retina
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <label className="text-sm text-neutral-300 mr-2">
                      Maximum file size target for each banner
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input 
                      type="number" 
                      value={maxFileSizeTarget}
                      onChange={(e) => setMaxFileSizeTarget(Number(e.target.value))}
                      min={50}
                      max={500}
                      className="w-20 bg-[#1a1a1a] text-neutral-300 border border-neutral-700 rounded p-1 text-xs text-center"
                    />
                    <span className="text-sm text-neutral-300 ml-2 mr-2">KB Size Target</span>
                    
                    <select 
                      value={compressionSpeed}
                      onChange={(e) => setCompressionSpeed(e.target.value as any)}
                      className="bg-[#1a1a1a] text-neutral-300 border border-neutral-700 rounded p-1 text-xs"
                    >
                      <option value="faster">Faster (Default)</option>
                      <option value="balanced">Balanced</option>
                      <option value="smaller">Smaller Size</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Code Output Settings */}
              <div>
                <h3 className="text-white text-sm font-medium mb-3">Code Output Settings</h3>
                
                <div className="mb-3">
                  <label className="block text-sm text-neutral-300 mb-2">Export Format & Platform</label>
                  <div className="flex items-center">
                    <span className="inline-block w-6 h-6 mr-2 text-center text-[#E44D26]">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M3 2h18l-1.8 18-7.1 2-7.1-2z"/>
                        <path d="M17.2 8H7.4l.3 3h9.2l-.8 8-4 1.2-4-1.2-.3-3h3l.2 1.5 2.1.5 2.1-.5.2-2.5H7.9l-.8-8z" fill="#FFFFFF"/>
                      </svg>
                    </span>
                    <select 
                      value={adPlatform}
                      onChange={(e) => setAdPlatform(e.target.value as AdPlatform)}
                      className="flex-1 bg-[#1a1a1a] text-neutral-300 border border-neutral-700 rounded p-2 text-sm"
                    >
                      {/* Non-Platform Specific */}
                      <optgroup label="Non-Platform Specific">
                        <option value="standard-css">HTML/JS (CSS @keyframes)</option>
                        <option value="standard-gsap">HTML/JS (GSAP/Greensock)</option>
                      </optgroup>
                      
                      {/* Platforms with clickTag */}
                      <optgroup label="Platforms (with clickTag)">
                        <option value="adform">AdForm</option>
                        <option value="adform-mraid">AdForm Mobile (MRAID)</option>
                        <option value="adition">Adition</option>
                        <option value="adroll">AdRoll</option>
                        <option value="adobe-ad-cloud">Adobe Ad Cloud</option>
                        <option value="appnexus">AppNexus</option>
                        <option value="basis">Basis</option>
                        <option value="bidtheatre">BidTheatre</option>
                        <option value="delta-projects">Delta Projects</option>
                        <option value="doubleclick-dcm">DoubleClick (DCM)</option>
                        <option value="doubleclick-studio">DoubleClick Studio</option>
                        <option value="dv360">DV360</option>
                        <option value="flashtalking">FlashTalking</option>
                        <option value="google-ads">Google Ads</option>
                        <option value="google-display-network">Google Display Network</option>
                        <option value="iab">IAB</option>
                        <option value="jivox-gsap">Jivox Dynamic Creative (GSAP)</option>
                        <option value="jivox-css">Jivox Dynamic Creative (CSS)</option>
                        <option value="responsive-display-ad">Responsive Display Ad</option>
                        <option value="6sense">6sense Dynamic Creative</option>
                        <option value="sizmek">Sizmek</option>
                        <option value="stackadapt">StackAdapt</option>
                        <option value="terminus">Terminus</option>
                        <option value="trade-desk">The Trade Desk</option>
                        <option value="ussd-sms">USSD (Tap to SMS)</option>
                        <option value="ussd-call">USSD (Tap to Call)</option>
                        <option value="yandex">Yandex</option>
                      </optgroup>
                      
                      {/* Other */}
                      <optgroup label="Other">
                        <option value="scalable">Scaleable HTML/JS (CSS @keyframes)</option>
                        <option value="responsive">Responsive HTML/JS (CSS @keyframes)</option>
                      </optgroup>
                    </select>
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm text-neutral-300 mb-1">&lt;a&gt; tag banner link (eg. https://example.com)</label>
                  <input 
                    type="text" 
                    value={bannerLink}
                    onChange={(e) => setBannerLink(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-[#1a1a1a] text-neutral-300 border border-neutral-700 rounded p-2 text-sm"
                  />
                </div>
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="relative inline-block w-10 mr-2 align-middle">
                      <input 
                        type="checkbox" 
                        id="minifyCode" 
                        checked={minifyCode}
                        onChange={(e) => setMinifyCode(e.target.checked)}
                        className="opacity-0 w-0 h-0 absolute"
                      />
                      <label 
                        htmlFor="minifyCode"
                        className={`block overflow-hidden h-6 rounded-full bg-neutral-700 cursor-pointer transition-colors duration-200 ${minifyCode ? 'bg-[#4A7CFF]' : ''}`}
                      >
                        <span 
                          className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ${minifyCode ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                      </label>
                    </div>
                    <label htmlFor="minifyCode" className="text-sm text-neutral-300">
                      Minified Code
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="relative inline-block w-10 mr-2 align-middle">
                      <input 
                        type="checkbox" 
                        id="injectCustomCode" 
                        checked={injectCustomCode}
                        onChange={(e) => setInjectCustomCode(e.target.checked)}
                        className="opacity-0 w-0 h-0 absolute"
                      />
                      <label 
                        htmlFor="injectCustomCode"
                        className={`block overflow-hidden h-6 rounded-full bg-neutral-700 cursor-pointer transition-colors duration-200 ${injectCustomCode ? 'bg-[#4A7CFF]' : ''}`}
                      >
                        <span 
                          className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ${injectCustomCode ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                      </label>
                    </div>
                    <label htmlFor="injectCustomCode" className="text-sm text-neutral-300">
                      Inject Custom Code
                    </label>
                  </div>
                </div>
                
                <div className="flex items-center mb-3">
                  <div className="relative inline-block w-10 mr-2 align-middle">
                    <input 
                      type="checkbox" 
                      id="includeZipFiles" 
                      checked={includeZipFiles}
                      onChange={(e) => setIncludeZipFiles(e.target.checked)}
                      className="opacity-0 w-0 h-0 absolute"
                    />
                    <label 
                      htmlFor="includeZipFiles"
                      className={`block overflow-hidden h-6 rounded-full bg-neutral-700 cursor-pointer transition-colors duration-200 ${includeZipFiles ? 'bg-[#4A7CFF]' : ''}`}
                    >
                      <span 
                        className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ${includeZipFiles ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </label>
                  </div>
                  <label htmlFor="includeZipFiles" className="text-sm text-neutral-300">
                    Include individual .zip files for each banner
                  </label>
                </div>
                
                <div className="flex items-center">
                  <div className="relative inline-block w-10 mr-2 align-middle">
                    <input 
                      type="checkbox" 
                      id="usePTagsInsteadOfSvg" 
                      checked={usePTagsInsteadOfSvg}
                      onChange={(e) => setUsePTagsInsteadOfSvg(e.target.checked)}
                      className="opacity-0 w-0 h-0 absolute"
                    />
                    <label 
                      htmlFor="usePTagsInsteadOfSvg"
                      className={`block overflow-hidden h-6 rounded-full bg-neutral-700 cursor-pointer transition-colors duration-200 ${usePTagsInsteadOfSvg ? 'bg-[#4A7CFF]' : ''}`}
                    >
                      <span 
                        className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ${usePTagsInsteadOfSvg ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </label>
                  </div>
                  <label htmlFor="usePTagsInsteadOfSvg" className="text-sm text-neutral-300">
                    Export text as &lt;p&gt; tags instead of &lt;svg&gt; (BETA)
                  </label>
                </div>
                
                <div className="flex items-center mt-3">
                  <div className="relative inline-block w-10 mr-2 align-middle">
                    <input 
                      type="checkbox" 
                      id="includeFallback" 
                      checked={includeFallback}
                      onChange={(e) => setIncludeFallback(e.target.checked)}
                      className="opacity-0 w-0 h-0 absolute"
                    />
                    <label 
                      htmlFor="includeFallback"
                      className={`block overflow-hidden h-6 rounded-full bg-neutral-700 cursor-pointer transition-colors duration-200 ${includeFallback ? 'bg-[#4A7CFF]' : ''}`}
                    >
                      <span 
                        className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ${includeFallback ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </label>
                  </div>
                  <label htmlFor="includeFallback" className="text-sm text-neutral-300">
                    Add "backup.jpg" to individual zip files
                  </label>
                </div>
              </div>
            </>
          )}
          
          {(exportType === 'mp4' || exportType === 'webm') && (
            <>
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Frame Rate (FPS)</label>
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="1"
                  value={fps}
                  onChange={(e) => setFps(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>15 fps</span>
                  <span className="text-neutral-300">{fps} fps</span>
                  <span>60 fps</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Video Bitrate</label>
                <input
                  type="range"
                  min="1000"
                  max="10000"
                  step="500"
                  value={videoBitrate}
                  onChange={(e) => setVideoBitrate(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>1 Mbps</span>
                  <span className="text-neutral-300">{videoBitrate/1000} Mbps</span>
                  <span>10 Mbps</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Video Format</label>
                <div className="flex rounded-md overflow-hidden border border-neutral-700">
                  <button
                    className={`flex-1 py-2 ${videoFormat === 'h264' ? 'bg-[#1a1a1a] text-neutral-200' : 'bg-[#151515] text-neutral-400'}`}
                    onClick={() => setVideoFormat('h264')}
                  >
                    H.264 (MP4)
                  </button>
                  <button
                    className={`flex-1 py-2 ${videoFormat === 'vp9' ? 'bg-[#1a1a1a] text-neutral-200' : 'bg-[#151515] text-neutral-400'}`}
                    onClick={() => setVideoFormat('vp9')}
                  >
                    VP9 (WebM)
                  </button>
                </div>
              </div>
              
              {exportType === 'webm' && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="transparent"
                    checked={transparent}
                    onChange={(e) => setTransparent(e.target.checked)}
                    className="mr-3"
                  />
                  <label htmlFor="transparent" className="text-sm text-neutral-300">
                    Enable transparency (WebM only)
                  </label>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="p-4 border-t border-neutral-800 flex justify-end space-x-3">
          <button
            className="px-4 py-2 rounded text-neutral-300 hover:bg-neutral-800"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-[#4A7CFF] hover:bg-[#3A6CEE] text-white flex items-center"
            onClick={handleExport}
          >
            <Download size={16} className="mr-2" />
            Export
          </button>
        </div>
      </div>
      
      {/* Frame Edit Dialog for adding/editing GIF content frames */}
      <FrameEditDialog
        isOpen={isFrameDialogOpen}
        onClose={() => setIsFrameDialogOpen(false)}
        onSave={handleSaveFrame}
        frame={editingFrameId ? gifFrames.find(f => f.id === editingFrameId) : undefined}
        isEditing={!!editingFrameId}
        availableLayers={layers}
      />
    </div>
  );
};

export default ExportModal;