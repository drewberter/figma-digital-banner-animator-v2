import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Layers } from 'lucide-react';
import { AnimationFrame, AnimationLayer, TimelineMode } from '../types/animation';

interface FrameEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (frameData: { 
    name: string, 
    headlineText: string, 
    description?: string,
    hiddenLayers?: string[],
    width?: number,
    height?: number
  }) => void;
  frame?: AnimationFrame;
  isEditing: boolean;
  availableLayers?: AnimationLayer[]; // Pass layers from parent
  timelineMode?: TimelineMode;
}

const FrameEditDialog = ({
  isOpen,
  onClose,
  onSave,
  frame,
  isEditing,
  availableLayers = [],
  timelineMode = TimelineMode.Animation
}: FrameEditDialogProps) => {
  const [name, setName] = useState('');
  const [headlineText, setHeadlineText] = useState('');
  const [description, setDescription] = useState('');
  const [hiddenLayers, setHiddenLayers] = useState<string[]>([]);
  const [width, setWidth] = useState<number>(300);
  const [height, setHeight] = useState<number>(250);

  useEffect(() => {
    if (frame) {
      setName(frame.name);
      setHeadlineText(frame.headlineText || '');
      setDescription(frame.description || '');
      setHiddenLayers(frame.hiddenLayers || []);
      setWidth(frame.width || 300);
      setHeight(frame.height || 250);
    } else {
      // Reset form for a new frame
      setName('');
      setHeadlineText('');
      setDescription('');
      setHiddenLayers([]);
      // Default size for a standard digital ad
      setWidth(300);
      setHeight(250);
    }
  }, [frame, isOpen]);

  const toggleLayerVisibility = (layerId: string) => {
    setHiddenLayers(prevHidden => 
      prevHidden.includes(layerId)
        ? prevHidden.filter(id => id !== layerId)
        : [...prevHidden, layerId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSave({
      name: name.trim() || 'Untitled Frame',
      headlineText: headlineText.trim(),
      description: description.trim() || undefined,
      hiddenLayers: hiddenLayers.length > 0 ? hiddenLayers : undefined,
      width,
      height
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-[#111111] rounded-lg w-[400px] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white flex items-center">
            {timelineMode === TimelineMode.FrameStyle ? (
              <Layers size={18} className="mr-2 text-neutral-400" />
            ) : null}
            {isEditing 
              ? (timelineMode === TimelineMode.FrameStyle ? 'Edit Frame Layers' : 'Edit Frame Content')
              : (timelineMode === TimelineMode.FrameStyle ? 'Add New Frame Layers' : 'Add New Frame Content')
            }
          </h2>
          <button 
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-800"
            onClick={onClose}
          >
            <X size={18} className="text-neutral-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-5 flex-1 overflow-y-auto">
          {/* Only show frame name input in Animation mode */}
          {timelineMode === TimelineMode.Animation && (
            <div>
              <label htmlFor="name" className="block text-sm text-neutral-300 mb-2">
                Frame Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter frame name"
                className="w-full bg-[#191919] text-neutral-200 rounded px-3 py-2 text-sm border border-neutral-700 focus:border-[#4A7CFF] focus:outline-none"
              />
            </div>
          )}
          
          {timelineMode === TimelineMode.Animation && (
            <>
              <div>
                <label htmlFor="headlineText" className="block text-sm text-neutral-300 mb-2">
                  Headline Text
                </label>
                <input
                  id="headlineText"
                  type="text"
                  value={headlineText}
                  onChange={(e) => setHeadlineText(e.target.value)}
                  placeholder="Enter headline text"
                  className="w-full bg-[#191919] text-neutral-200 rounded px-3 py-2 text-sm border border-neutral-700 focus:border-[#4A7CFF] focus:outline-none"
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm text-neutral-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description text"
                  rows={3}
                  className="w-full bg-[#191919] text-neutral-200 rounded px-3 py-2 text-sm border border-neutral-700 focus:border-[#4A7CFF] focus:outline-none resize-none"
                />
              </div>
              
              {/* Frame dimensions */}
              <div className="flex space-x-4">
                <div className="w-1/2">
                  <label htmlFor="frameWidth" className="block text-sm text-neutral-300 mb-2">
                    Width (px)
                  </label>
                  <input
                    id="frameWidth"
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(Math.max(100, Math.min(1200, parseInt(e.target.value) || 300)))}
                    placeholder="300"
                    min="100"
                    max="1200"
                    className="w-full bg-[#191919] text-neutral-200 rounded px-3 py-2 text-sm border border-neutral-700 focus:border-[#4A7CFF] focus:outline-none"
                  />
                </div>
                <div className="w-1/2">
                  <label htmlFor="frameHeight" className="block text-sm text-neutral-300 mb-2">
                    Height (px)
                  </label>
                  <input
                    id="frameHeight"
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Math.max(100, Math.min(1200, parseInt(e.target.value) || 250)))}
                    placeholder="250"
                    min="100"
                    max="1200"
                    className="w-full bg-[#191919] text-neutral-200 rounded px-3 py-2 text-sm border border-neutral-700 focus:border-[#4A7CFF] focus:outline-none"
                  />
                </div>
              </div>
              
              <div className="mt-1 text-xs text-neutral-500">
                Common ad sizes: 300×250, 336×280, 250×250, 120×600, 160×600, 300×600, 728×90, 970×90
              </div>
            </>
          )}
          
          {/* Layer Visibility Controls */}
          {availableLayers.length > 0 && (
            <div className={timelineMode === TimelineMode.FrameStyle ? "mt-3" : ""}>
              <label className="block text-sm text-neutral-300 mb-2 flex items-center">
                {timelineMode === TimelineMode.FrameStyle && <Eye size={16} className="mr-2 text-neutral-400" />}
                Layer Visibility
              </label>
              {timelineMode === TimelineMode.FrameStyle && (
                <p className="text-xs text-neutral-500 mb-3">
                  Select which layers should be visible in this frame. This helps you create variations without duplicating layers.
                </p>
              )}
              <div className={`bg-[#191919] rounded border ${timelineMode === TimelineMode.FrameStyle ? "border-neutral-600" : "border-neutral-700"} p-1 ${timelineMode === TimelineMode.FrameStyle ? "max-h-[200px]" : "max-h-[150px]"} overflow-y-auto`}>
                {availableLayers.map(layer => (
                  <div 
                    key={layer.id}
                    className={`flex items-center justify-between p-2 hover:bg-[#222] rounded ${timelineMode === TimelineMode.FrameStyle ? "mb-1" : ""}`}
                  >
                    <div className="text-sm text-neutral-300 flex items-center">
                      {timelineMode === TimelineMode.FrameStyle && (
                        <span className="w-2 h-2 rounded-full bg-neutral-500 mr-2 flex-shrink-0"></span>
                      )}
                      {layer.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleLayerVisibility(layer.id)}
                      className={`p-1 rounded ${hiddenLayers.includes(layer.id) ? 'text-neutral-500' : 'text-[#4A7CFF]'}`}
                    >
                      {hiddenLayers.includes(layer.id) ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                ))}
                {availableLayers.length === 0 && (
                  <div className="p-2 text-sm text-neutral-500">No layers available</div>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-2 flex items-center">
                {hiddenLayers.length > 0 
                  ? (
                    <>
                      <EyeOff size={14} className="mr-1.5 text-neutral-500" />
                      {`${hiddenLayers.length} layer${hiddenLayers.length > 1 ? 's' : ''} hidden in this frame`}
                    </>
                  ) : (
                    <>
                      <Eye size={14} className="mr-1.5 text-neutral-400" />
                      All layers visible in this frame
                    </>
                  )}
              </p>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              className="px-4 py-2 rounded text-neutral-300 hover:bg-neutral-800"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-[#4A7CFF] hover:bg-[#3A6CEE] text-white"
            >
              {isEditing 
                ? (timelineMode === TimelineMode.FrameStyle ? 'Update Layer Visibility' : 'Update Frame')
                : (timelineMode === TimelineMode.FrameStyle ? 'Create Frame with Layers' : 'Add Frame')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FrameEditDialog;