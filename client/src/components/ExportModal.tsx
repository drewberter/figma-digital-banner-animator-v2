import { useState, useRef, useEffect } from 'react';
import { X, Download, ChevronUp, ChevronDown, Play, Pause } from 'lucide-react';
import { exportGif, exportHtml, exportMp4, exportWebm } from '../utils/exportUtils';
import { useAnimationContext } from '../context/AnimationContext';

interface ExportModalProps {
  onClose: () => void;
}

type ExportType = 'gif' | 'html' | 'mp4' | 'webm';

const ExportModal = ({ onClose }: ExportModalProps) => {
  const { frames, currentFrame } = useAnimationContext();
  const [exportType, setExportType] = useState<ExportType>('gif');
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [fps, setFps] = useState(30);
  const [includeFallback, setIncludeFallback] = useState(true);
  const [optimizeForAdNetworks, setOptimizeForAdNetworks] = useState(true);
  const [videoBitrate, setVideoBitrate] = useState(5000); // kbps
  const [videoFormat, setVideoFormat] = useState<'h264' | 'vp9'>('h264'); // Codec selection
  const [transparent, setTransparent] = useState(false); // For WebM transparency
  const [specialGifFormat, setSpecialGifFormat] = useState(false); // Special client GIF format
  
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
      previewInterval.current = window.setInterval(() => {
        setPreviewFrame(prev => (prev + 1) % frames.length);
      }, delay);
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
      if (specialGifFormat) {
        // Extract exactly 3 frames for the special format client requirements
        // If there are more than 3 frames, take beginning, middle and end frames
        let selectedFrames = [...frames];
        if (frames.length > 3) {
          const middle = Math.floor(frames.length / 2);
          selectedFrames = [
            frames[0],
            frames[middle],
            frames[frames.length - 1]
          ];
        } else if (frames.length < 3) {
          // If less than 3 frames, duplicate the last frame to make up 3
          while (selectedFrames.length < 3) {
            selectedFrames.push(frames[frames.length - 1]);
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
          delay: 2500 // 2.5 seconds between frames
        };
        
        console.log('Exporting as Special Client GIF Format:', specialGifOptions);
        exportGif(specialGifOptions);
      } else {
        // Select frames if frameCount is specified in advanced options
        let selectedFrames = [...frames];
        if (showAdvancedGifOptions && frameCount > 0 && frameCount < frames.length) {
          // Calculate frames to include with even distribution
          const step = frames.length / frameCount;
          selectedFrames = [];
          
          for (let i = 0; i < frameCount; i++) {
            const index = Math.min(Math.floor(i * step), frames.length - 1);
            selectedFrames.push(frames[index]);
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
        includeClickTag: includeFallback,
        optimizeForAdNetworks,
        generateFallback: includeFallback,
        adPlatform: (optimizeForAdNetworks ? 'google' : 'generic') as 'google' | 'meta' | 'generic'
      };
      
      console.log('Exporting as HTML5:', htmlOptions);
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
      <div className="bg-[#111111] rounded-lg w-[500px] flex flex-col">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Export Animation</h2>
          <button 
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-800"
            onClick={onClose}
          >
            <X size={18} className="text-neutral-400" />
          </button>
        </div>
        
        <div className="p-5 space-y-5">
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
          
          {/* Show frame dimensions information */}
          <div>
            <label className="block text-sm text-neutral-300 mb-2">Frame Size</label>
            <div className="w-full bg-[#191919] text-neutral-200 rounded px-3 py-2 text-sm border border-neutral-700">
              {currentFrame 
                ? `Original Figma frame: ${currentFrame.width}×${currentFrame.height}`
                : "Using original Figma frame dimensions"}
            </div>
          </div>
          
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
                {frames.length > 0 ? (
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
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeFallback"
                  checked={includeFallback}
                  onChange={(e) => setIncludeFallback(e.target.checked)}
                  className="mr-3"
                />
                <label htmlFor="includeFallback" className="text-sm text-neutral-300">
                  Include static fallback image
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="optimizeForAdNetworks"
                  checked={optimizeForAdNetworks}
                  onChange={(e) => setOptimizeForAdNetworks(e.target.checked)}
                  className="mr-3"
                />
                <label htmlFor="optimizeForAdNetworks" className="text-sm text-neutral-300">
                  Optimize for ad networks (Google, Meta)
                </label>
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
    </div>
  );
};

export default ExportModal;