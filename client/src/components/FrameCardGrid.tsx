import { useState, useEffect } from 'react';
import { Plus, Eye, EyeOff, Copy, Trash2, Edit, Clock } from 'lucide-react';
import { AnimationFrame, AnimationLayer } from '../types/animation';
import { v4 as uuidv4 } from 'uuid';

interface FrameCardGridProps {
  frames: Record<string, AnimationFrame>;
  layers: Record<string, AnimationLayer[]>;
  selectedFrameId: string | null;
  onFrameSelect: (frameId: string) => void;
  onToggleLayerVisibility: (frameId: string, layerId: string) => void;
  onAddFrame: () => void;
  onDuplicateFrame: (frameId: string) => void;
  onDeleteFrame: (frameId: string) => void;
}

const FrameCardGrid = ({
  frames,
  layers,
  selectedFrameId,
  onFrameSelect,
  onToggleLayerVisibility,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame
}: FrameCardGridProps) => {
  // Create an array of frame entries for easier mapping
  const frameEntries = Object.entries(frames).map(([id, frame]) => ({
    ...frame
  }));

  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto">
      {/* Frame cards */}
      {frameEntries.map((frame) => (
        <FrameCard 
          key={frame.id}
          frame={frame}
          layers={layers[frame.id] || []}
          isSelected={frame.id === selectedFrameId}
          onSelect={() => onFrameSelect(frame.id)}
          onToggleLayerVisibility={(layerId) => onToggleLayerVisibility(frame.id, layerId)}
          onDuplicate={() => onDuplicateFrame(frame.id)}
          onDelete={() => onDeleteFrame(frame.id)}
        />
      ))}

      {/* Add frame card */}
      <div 
        className="border border-dashed border-neutral-700 bg-neutral-900 rounded-md h-[220px] flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-800 hover:border-neutral-600 transition-colors"
        onClick={onAddFrame}
      >
        <Plus size={24} className="text-neutral-400 mb-2" />
        <span className="text-sm text-neutral-400">Add New Frame</span>
      </div>
    </div>
  );
};

interface FrameCardProps {
  frame: AnimationFrame;
  layers: AnimationLayer[];
  isSelected: boolean;
  onSelect: () => void;
  onToggleLayerVisibility: (layerId: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDelayChange?: (frameId: string, delay: number) => void;
}

const FrameCard = ({
  frame,
  layers,
  isSelected,
  onSelect,
  onToggleLayerVisibility,
  onDuplicate,
  onDelete,
  onDelayChange
}: FrameCardProps) => {
  const [isLayerListOpen, setIsLayerListOpen] = useState(false);
  const [showDelayInput, setShowDelayInput] = useState(false);
  const [delay, setDelay] = useState(frame.delay || 0);

  return (
    <div 
      className={`bg-neutral-900 rounded-md overflow-hidden border-2 ${
        isSelected ? 'border-[#4A7CFF]' : 'border-transparent'
      } hover:border-[#4A7CFF] transition-colors`}
    >
      {/* Frame preview area */}
      <div 
        className="h-[140px] bg-neutral-800 flex items-center justify-center relative cursor-pointer"
        onClick={onSelect}
      >
        {/* Frame thumbnail - this would ideally be a preview of the animation frame */}
        <div className="text-center">
          <span className="text-lg font-semibold text-white">{frame.name}</span>
          <div className="text-xs text-neutral-400 mt-1">
            {`${frame.width} × ${frame.height}`}
          </div>
        </div>

        {/* Frame info badge */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full px-2 py-0.5 text-xs text-white">
          {layers.filter(l => l.visible).length}/{layers.length} layers visible
        </div>
      </div>

      {/* Card controls */}
      <div className="p-3 border-t border-neutral-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-white truncate">{frame.name}</h3>
          <div className="flex space-x-1">
            <button 
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400"
              onClick={onDuplicate}
              title="Duplicate frame"
            >
              <Copy size={16} />
            </button>
            <button 
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400"
              onClick={onDelete}
              title="Delete frame"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Delay control */}
        <div className="my-2 flex items-center text-xs text-neutral-300">
          <Clock size={12} className="mr-1.5" />
          <span className="mr-1">Delay:</span>
          {showDelayInput ? (
            <input
              type="number"
              className="w-12 bg-neutral-800 text-white font-mono text-xs rounded px-1 py-0.5 border border-neutral-700"
              value={delay}
              min={0}
              max={10}
              step={0.1}
              autoFocus
              onChange={(e) => {
                const newDelay = Math.max(0, Math.min(10, Number(e.target.value)));
                setDelay(newDelay);
                if (onDelayChange) {
                  onDelayChange(frame.id, newDelay);
                }
              }}
              onBlur={() => setShowDelayInput(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setShowDelayInput(false);
                }
              }}
            />
          ) : (
            <span 
              className="font-mono cursor-pointer hover:text-white hover:underline" 
              onClick={() => setShowDelayInput(true)}
              title="Click to change delay"
            >
              {delay.toFixed(1)}s
            </span>
          )}
        </div>

        {/* Layer toggle button */}
        <button 
          className="w-full text-sm px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-between"
          onClick={() => setIsLayerListOpen(!isLayerListOpen)}
        >
          <span className="flex items-center">
            <Eye size={14} className="mr-1.5" />
            Toggle Layer Visibility
          </span>
          <span>{isLayerListOpen ? '▲' : '▼'}</span>
        </button>

        {/* Layer visibility list */}
        {isLayerListOpen && (
          <div className="mt-2 bg-neutral-800 rounded-md max-h-[150px] overflow-y-auto">
            {layers.map(layer => (
              <div 
                key={layer.id}
                className="flex items-center justify-between px-3 py-2 hover:bg-neutral-700"
              >
                <span className="text-xs text-neutral-300">{layer.name}</span>
                <button
                  className={`p-1 rounded ${layer.visible ? 'text-green-400' : 'text-neutral-500'}`}
                  onClick={() => onToggleLayerVisibility(layer.id)}
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                >
                  {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FrameCardGrid;