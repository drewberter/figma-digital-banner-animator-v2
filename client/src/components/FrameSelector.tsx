import { useState } from 'react';
import { PlusCircle, Edit, Trash, Plus } from 'lucide-react';
import { AnimationFrame } from '../types/animation';

interface FrameSelectorProps {
  frames: AnimationFrame[];
  onFrameAdd: () => void;
  onFrameEdit: (frameId: string) => void;
  onFrameDelete: (frameId: string) => void;
  onFrameSelect: (frameId: string) => void;
  selectedFrameId: string | null;
}

const FrameSelector = ({
  frames,
  onFrameAdd,
  onFrameEdit,
  onFrameDelete,
  onFrameSelect,
  selectedFrameId
}: FrameSelectorProps) => {
  const [isHovered, setIsHovered] = useState<string | null>(null);

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm text-neutral-300">Banner Content Frames</label>
        <button
          onClick={onFrameAdd}
          className="flex items-center text-xs text-[#4A7CFF] hover:text-[#5A8CFF]"
        >
          <Plus size={14} className="mr-1" />
          Add Frame
        </button>
      </div>
      
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
                      onFrameEdit(frame.id);
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
          onClick={onFrameAdd}
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