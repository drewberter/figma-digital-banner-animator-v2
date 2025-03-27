import { useState, useEffect } from 'react';
import { Check, RefreshCw } from 'lucide-react';

interface AutoSaveIndicatorProps {
  lastSaved?: Date | null;
  saving?: boolean;
}

const AutoSaveIndicator = ({ 
  lastSaved = null, 
  saving = false 
}: AutoSaveIndicatorProps) => {
  const [visible, setVisible] = useState(false);
  
  // Show indicator when saving state changes
  useEffect(() => {
    if (saving || lastSaved) {
      setVisible(true);
      
      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [saving, lastSaved]);
  
  if (!visible) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-neutral-800 border border-neutral-700 rounded-md shadow-lg py-2 px-3 text-sm text-white flex items-center gap-2 transition-opacity duration-300 z-50">
      {saving ? (
        <>
          <RefreshCw size={16} className="animate-spin" />
          <span>Saving...</span>
        </>
      ) : (
        <>
          <Check size={16} className="text-green-500" />
          <span>
            {lastSaved 
              ? `Saved at ${lastSaved.toLocaleTimeString()}` 
              : 'Changes saved'}
          </span>
        </>
      )}
    </div>
  );
};

export default AutoSaveIndicator;