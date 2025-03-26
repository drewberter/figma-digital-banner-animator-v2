import { useState } from 'react';
import { useAnimationContext } from '../context/AnimationContext';
import { exportGif, exportHtml } from '../utils/exportUtils';

interface ExportModalProps {
  onClose: () => void;
}

type ExportType = 'gif' | 'html';

interface ExportSize {
  width: number;
  height: number;
  name: string;
}

const standardSizes: ExportSize[] = [
  { width: 300, height: 250, name: '300 × 250 (Medium Rectangle)' },
  { width: 320, height: 50, name: '320 × 50 (Mobile Banner)' },
  { width: 728, height: 90, name: '728 × 90 (Leaderboard)' },
  { width: 160, height: 600, name: '160 × 600 (Wide Skyscraper)' },
  { width: 300, height: 600, name: '300 × 600 (Half Page)' },
  { width: 970, height: 250, name: '970 × 250 (Billboard)' },
];

const ExportModal = ({ onClose }: ExportModalProps) => {
  const [exportType, setExportType] = useState<ExportType>('gif');
  const [selectedSize, setSelectedSize] = useState<string>(standardSizes[0].name);
  const [quality, setQuality] = useState<number>(85);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const [customWidth, setCustomWidth] = useState<number>(300);
  const [customHeight, setCustomHeight] = useState<number>(250);
  
  const { frames } = useAnimationContext();

  const handleExport = async () => {
    // Get size to use for export
    let size: ExportSize;
    if (selectedSize === 'custom') {
      size = { width: customWidth, height: customHeight, name: 'Custom' };
    } else {
      size = standardSizes.find(s => s.name === selectedSize) || standardSizes[0];
    }
    
    // Export based on selected type
    if (exportType === 'gif') {
      await exportGif({
        frames,
        quality: quality / 100,
        width: size.width,
        height: size.height
      });
    } else {
      await exportHtml({
        frames,
        width: size.width,
        height: size.height
      });
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg w-96 max-w-full">
        <div className="border-b border-neutral-700 p-3 flex items-center justify-between">
          <h3 className="font-medium">Export Animation</h3>
          <button 
            className="text-neutral-400 hover:text-white"
            onClick={onClose}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="p-4">
          {/* Export Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Export Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                className={`${exportType === 'gif' ? 'bg-primary border-primary' : 'bg-neutral-700 hover:bg-neutral-600 border-neutral-600'} border rounded p-2 flex flex-col items-center justify-center`}
                onClick={() => setExportType('gif')}
              >
                <i className="fas fa-file-image text-lg mb-1"></i>
                <span className="text-xs">Animated GIF</span>
              </button>
              <button 
                className={`${exportType === 'html' ? 'bg-primary border-primary' : 'bg-neutral-700 hover:bg-neutral-600 border-neutral-600'} border rounded p-2 flex flex-col items-center justify-center`}
                onClick={() => setExportType('html')}
              >
                <i className="fas fa-code text-lg mb-1"></i>
                <span className="text-xs">HTML5 Banner</span>
              </button>
            </div>
          </div>
          
          {/* Size Options */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Size</label>
            <select 
              className="w-full bg-neutral-700 border border-neutral-600 rounded text-xs p-2"
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
            >
              {standardSizes.map((size) => (
                <option key={size.name} value={size.name}>
                  {size.name}
                </option>
              ))}
              <option value="custom">Custom Size...</option>
            </select>
            
            {selectedSize === 'custom' && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-xs mb-1">Width</label>
                  <input 
                    type="number" 
                    className="w-full bg-neutral-700 border border-neutral-600 rounded text-xs p-1"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">Height</label>
                  <input 
                    type="number" 
                    className="w-full bg-neutral-700 border border-neutral-600 rounded text-xs p-1"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(parseInt(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Quality Options - only show for GIF */}
          {exportType === 'gif' && (
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <label className="block text-sm font-medium">Quality</label>
                <span className="text-xs text-neutral-300">{quality}%</span>
              </div>
              <input 
                type="range" 
                className="w-full bg-neutral-700 rounded-lg appearance-none h-2"
                min="0" 
                max="100" 
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
              />
            </div>
          )}
          
          {/* Advanced Options */}
          <div className="mb-4">
            <button 
              className="flex items-center text-sm text-neutral-300 hover:text-white"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            >
              <i className="fas fa-cog text-xs mr-1"></i>
              <span>Advanced Options</span>
              <i className={`fas fa-chevron-${isAdvancedOpen ? 'up' : 'down'} text-xs ml-1`}></i>
            </button>
            
            {isAdvancedOpen && (
              <div className="mt-2 p-2 bg-neutral-700 rounded text-xs">
                {exportType === 'gif' && (
                  <>
                    <div className="mb-2">
                      <label className="block mb-1">Dithering</label>
                      <select className="w-full bg-neutral-700 border border-neutral-600 rounded p-1">
                        <option value="none">None</option>
                        <option value="pattern">Pattern</option>
                        <option value="diffusion">Diffusion</option>
                      </select>
                    </div>
                    <div className="mb-2">
                      <label className="block mb-1">Color Depth</label>
                      <select className="w-full bg-neutral-700 border border-neutral-600 rounded p-1">
                        <option value="8">8-bit (256 colors)</option>
                        <option value="16">16-bit (65,536 colors)</option>
                        <option value="24">24-bit (16.7M colors)</option>
                      </select>
                    </div>
                  </>
                )}
                {exportType === 'html' && (
                  <>
                    <div className="mb-2">
                      <div className="flex items-center">
                        <label className="flex-1">Include Click Tag</label>
                        <input type="checkbox" className="h-3 w-3" defaultChecked />
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="flex items-center">
                        <label className="flex-1">Optimize for Ad Networks</label>
                        <input type="checkbox" className="h-3 w-3" defaultChecked />
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="flex items-center">
                        <label className="flex-1">Generate Fallback Image</label>
                        <input type="checkbox" className="h-3 w-3" defaultChecked />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="border-t border-neutral-700 p-3 flex items-center justify-end space-x-2">
          <button 
            className="bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1.5 rounded text-xs"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="bg-primary hover:bg-secondary text-white px-4 py-1.5 rounded text-xs font-medium"
            onClick={handleExport}
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
