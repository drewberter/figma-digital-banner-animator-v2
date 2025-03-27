import { useState } from 'react';
import { PlusCircle, Edit, Trash, Plus } from 'lucide-react';
import { AnimationFrame, AnimationLayer } from '../types/animation';
import FrameEditDialog from './FrameEditDialog';

interface FrameSelectorProps {
  frames: AnimationFrame[];
  layers: AnimationLayer[];
  onFrameAdd: (frameData: { name: string, headlineText: string, description?: string, hiddenLayers?: string[] }) => void;
  onFrameEdit: (frameId: string, frameData: { name: string, headlineText: string, description?: string, hiddenLayers?: string[] }) => void;
  onFrameDelete: (frameId: string) => void;
  onFrameSelect: (frameId: string) => void;
  selectedFrameId: string | null;
}

const FrameSelector = ({
  frames,
  layers,
  onFrameAdd,
  onFrameEdit,
  onFrameDelete,
  onFrameSelect,
  selectedFrameId
}: FrameSelectorProps) => {
  const [isHovered, setIsHovered] = useState<string | null>(null);
  const [isAddingFrame, setIsAddingFrame] = useState(false);
  const [editingFrameId, setEditingFrameId] = useState<string | null>(null);

  const handleAddFrame = () => {
    setIsAddingFrame(true);
  };

  const handleEditFrame = (frameId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingFrameId(frameId);
  };

  const handleSaveNewFrame = (frameData: { name: string, headlineText: string, description?: string, hiddenLayers?: string[] }) => {
    onFrameAdd(frameData);
    setIsAddingFrame(false);
  };

  const handleUpdateFrame = (frameData: { name: string, headlineText: string, description?: string, hiddenLayers?: string[] }) => {
    if (editingFrameId) {
      onFrameEdit(editingFrameId, frameData);
      setEditingFrameId(null);
    }
  };

  const handleCloseDialog = () => {
    setIsAddingFrame(false);
    setEditingFrameId(null);
  };

  // Find the frame being edited
  const frameBeingEdited = editingFrameId 
    ? frames.find(frame => frame.id === editingFrameId) 
    : undefined;

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm text-neutral-300">Banner Content Frames</label>
        <button
          onClick={handleAddFrame}
          className="flex items-center text-xs text-[#4A7CFF] hover:text-[#5A8CFF]"
        >
          <Plus size={14} className="mr-1" />
          Add Frame
        </button>
      </div>
      
      {/* Frame Edit Dialog */}
      <FrameEditDialog
        isOpen={isAddingFrame || editingFrameId !== null}
        onClose={handleCloseDialog}
        onSave={editingFrameId ? handleUpdateFrame : handleSaveNewFrame}
        frame={frameBeingEdited}
        isEditing={editingFrameId !== null}
        availableLayers={layers}
      />
      
      {frames.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
          {frames.map((frame) => (
            <div
              key={frame.id}
              className={`relative rounded-md p-3 border cursor-pointer ${
                selectedFrameId === frame.id
                  ? 'border-[#4A7CFF] bg-[#1a1a1a]'
                  : 'border-neutral-700 bg-[#151515] hover:bg-[#191919]'
              }`}
              onClick={() => onFrameSelect(frame.id)}
              onMouseEnter={() => setIsHovered(frame.id)}
              onMouseLeave={() => setIsHovered(null)}
            >
              <div className="text-sm font-medium text-neutral-200 truncate pr-16">
                {frame.name}
              </div>
              
              <div className="text-xs text-neutral-400 mt-1 truncate">
                {frame.headlineText || 'No headline text'}
              </div>
              
              {/* Actions */}
              {(isHovered === frame.id || selectedFrameId === frame.id) && (
                <div className="absolute right-2 top-2 flex space-x-1">
                  <button
                    className="p-1.5 rounded hover:bg-neutral-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditFrame(frame.id, e);
                    }}
                  >
                    <Edit size={14} className="text-neutral-400" />
                  </button>
                  
                  <button
                    className="p-1.5 rounded hover:bg-neutral-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFrameDelete(frame.id);
                    }}
                  >
                    <Trash size={14} className="text-neutral-400" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center rounded-md border border-dashed border-neutral-700 py-6 px-4 mt-1 cursor-pointer hover:bg-[#191919]"
          onClick={handleAddFrame}
        >
          <PlusCircle size={24} className="text-neutral-500 mb-2" />
          <div className="text-sm text-neutral-400">Add content frames to create banner variations</div>
          <div className="text-xs text-neutral-500 mt-1">Each frame can have different headline text</div>
        </div>
      )}
    </div>
  );
};

export default FrameSelector;