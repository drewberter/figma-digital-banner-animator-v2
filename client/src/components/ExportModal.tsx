import { useState } from 'react';
import { X, Download } from 'lucide-react';
import { exportGif, exportHtml, exportMp4, exportWebm } from '../utils/exportUtils';
import { useAnimationContext } from '../context/AnimationContext';

interface ExportModalProps {
  onClose: () => void;
}

type ExportType = 'gif' | 'html' | 'mp4' | 'webm';

interface ExportSize {
  width: number;
  height: number;
  name: string;
}

const ExportModal = ({ onClose }: ExportModalProps) => {
  const { frames } = useAnimationContext();
  const [exportType, setExportType] = useState<ExportType>('gif');
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [fps, setFps] = useState(30);
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(0);
  const [includeFallback, setIncludeFallback] = useState(true);
  const [optimizeForAdNetworks, setOptimizeForAdNetworks] = useState(true);
  const [videoBitrate, setVideoBitrate] = useState(5000); // kbps
  const [videoFormat, setVideoFormat] = useState<'h264' | 'vp9'>('h264'); // Codec selection
  const [transparent, setTransparent] = useState(false); // For WebM transparency
  
  // Common banner sizes
  const sizes: ExportSize[] = [
    { width: 300, height: 250, name: 'Medium Rectangle (300×250)' },
    { width: 728, height: 90, name: 'Leaderboard (728×90)' },
    { width: 320, height: 50, name: 'Mobile Leaderboard (320×50)' },
    { width: 160, height: 600, name: 'Wide Skyscraper (160×600)' },
    { width: 300, height: 600, name: 'Half Page (300×600)' },
    { width: 320, height: 100, name: 'Large Mobile Banner (320×100)' }
  ];
  
  // Handle export
  const handleExport = () => {
    let size: ExportSize = sizes[selectedSizeIndex];
    
    // Prepare export options based on export type
    const commonOptions = {
      width: size.width,
      height: size.height,
      fps
    };
    
    if (exportType === 'gif') {
      const gifOptions = {
        frames,
        ...commonOptions,
        quality: quality === 'high' ? 1 : quality === 'medium' ? 0.6 : 0.3,
        dithering: quality === 'high' ? 'diffusion' : quality === 'medium' ? 'pattern' : 'none',
        colorDepth: quality === 'high' ? 24 : quality === 'medium' ? 16 : 8,
        loop: true
      };
      
      console.log('Exporting as GIF:', gifOptions);
      exportGif(gifOptions);
    } 
    else if (exportType === 'html') {
      const htmlOptions = {
        frames,
        ...commonOptions,
        includeClickTag: includeFallback,
        optimizeForAdNetworks,
        generateFallback: includeFallback,
        adPlatform: optimizeForAdNetworks ? 'google' : 'generic'
      };
      
      console.log('Exporting as HTML5:', htmlOptions);
      exportHtml(htmlOptions);
    }
    else if (exportType === 'mp4') {
      const mp4Options = {
        frames,
        ...commonOptions,
        videoBitrate,
        codec: 'h264'
      };
      
      console.log('Exporting as MP4:', mp4Options);
      exportMp4(mp4Options);
    }
    else if (exportType === 'webm') {
      const webmOptions = {
        frames,
        ...commonOptions,
        videoBitrate,
        codec: 'vp9',
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
          
          <div>
            <label className="block text-sm text-neutral-300 mb-2">Size</label>
            <select
              className="w-full bg-[#191919] text-neutral-200 rounded px-3 py-2 text-sm border border-neutral-700"
              value={selectedSizeIndex}
              onChange={(e) => setSelectedSizeIndex(parseInt(e.target.value))}
            >
              {sizes.map((size, index) => (
                <option key={index} value={index}>
                  {size.name} - {size.width}×{size.height}
                </option>
              ))}
            </select>
          </div>
          
          {exportType === 'gif' && (
            <>
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Quality</label>
                <div className="flex rounded-md overflow-hidden border border-neutral-700">
                  <button
                    className={`flex-1 py-2 ${quality === 'low' ? 'bg-[#1a1a1a] text-neutral-200' : 'bg-[#151515] text-neutral-400'}`}
                    onClick={() => setQuality('low')}
                  >
                    Low
                  </button>
                  <button
                    className={`flex-1 py-2 ${quality === 'medium' ? 'bg-[#1a1a1a] text-neutral-200' : 'bg-[#151515] text-neutral-400'}`}
                    onClick={() => setQuality('medium')}
                  >
                    Medium
                  </button>
                  <button
                    className={`flex-1 py-2 ${quality === 'high' ? 'bg-[#1a1a1a] text-neutral-200' : 'bg-[#151515] text-neutral-400'}`}
                    onClick={() => setQuality('high')}
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
                />
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>15 fps</span>
                  <span className="text-neutral-300">{fps} fps</span>
                  <span>60 fps</span>
                </div>
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