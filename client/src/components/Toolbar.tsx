import { Download, Settings, HelpCircle } from 'lucide-react';

interface ToolbarProps {
  onExport: () => void;
}

const Toolbar = ({ onExport }: ToolbarProps) => {
  return (
    <div className="h-12 bg-[#0A0A0A] border-b border-neutral-800 px-4 flex items-center justify-between">
      <div className="flex items-center">
        <div className="text-lg font-medium text-white mr-6">
          Figma Animation
        </div>
        
        <div className="flex space-x-1">
          {/* Save button removed - saving happens automatically with useAutoSave */}
          
          {/* Load button removed - loading happens automatically when selecting an artboard */}
          
          <button 
            className="px-3 py-1.5 rounded text-sm text-neutral-300 hover:bg-neutral-800 flex items-center"
            onClick={onExport}
            title="Export Animation"
          >
            <Download size={16} className="mr-2" />
            Export
          </button>
        </div>
      </div>
      
      <div className="flex space-x-1">
        {/* Preview button removed */}
        
        <button 
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-800"
          title="Settings"
        >
          <Settings size={16} className="text-neutral-400" />
        </button>
        
        <button 
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-800"
          title="Help"
        >
          <HelpCircle size={16} className="text-neutral-400" />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;