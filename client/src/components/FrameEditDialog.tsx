import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { AnimationFrame, AnimationLayer } from '../types/animation';

interface FrameEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (frameData: { 
    name: string, 
    headlineText: string, 
    description?: string,
    hiddenLayers?: string[] 
  }) => void;
  frame?: AnimationFrame;
  isEditing: boolean;
  availableLayers?: AnimationLayer[]; // Pass layers from parent
}

const FrameEditDialog = ({
  isOpen,
  onClose,
  onSave,
  frame,
  isEditing,
  availableLayers = []
}: FrameEditDialogProps) => {
  const [name, setName] = useState('');
  const [headlineText, setHeadlineText] = useState('');
  const [description, setDescription] = useState('');
  const [hiddenLayers, setHiddenLayers] = useState<string[]>([]);

  useEffect(() => {
    if (frame) {
      setName(frame.name);
      setHeadlineText(frame.headlineText || '');
      setDescription(frame.description || '');
      setHiddenLayers(frame.hiddenLayers || []);
    } else {
      // Reset form for a new frame
      setName('');
      setHeadlineText('');
      setDescription('');
      setHiddenLayers([]);
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
      hiddenLayers: hiddenLayers.length > 0 ? hiddenLayers : undefined
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-[#111111] rounded-lg w-[400px] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">
            {isEditing ? 'Edit Frame Content' : 'Add New Frame Content'}
          </h2>
          <button 
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-800"
            onClick={onClose}
          >
            <X size={18} className="text-neutral-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-5 flex-1 overflow-y-auto">
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
          
          {/* Layer Visibility Controls */}
          {availableLayers.length > 0 && (
            <div>
              <label className="block text-sm text-neutral-300 mb-2">
                Layer Visibility
              </label>
              <div className="bg-[#191919] rounded border border-neutral-700 p-1 max-h-[150px] overflow-y-auto">
                {availableLayers.map(layer => (
                  <div 
                    key={layer.id}
                    className="flex items-center justify-between p-2 hover:bg-[#222] rounded"
                  >
                    <div className="text-sm text-neutral-300">{layer.name}</div>
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
              <p className="text-xs text-neutral-500 mt-1">
                {hiddenLayers.length > 0 
                  ? `${hiddenLayers.length} layer${hiddenLayers.length > 1 ? 's' : ''} hidden in this frame` 
                  : `All layers visible in this frame`}
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
              {isEditing ? 'Update' : 'Add'} Frame
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FrameEditDialog;