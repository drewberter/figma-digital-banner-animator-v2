import React, { useState, useMemo } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { Search } from 'lucide-react';
import { AnimationType, AnimationMode } from '../types/animation';

// Animation category definitions
const animationCategories = {
  'Basic': [
    AnimationType.FadeIn,
    AnimationType.FadeOut,
    AnimationType.SlideIn,
    AnimationType.SlideOut,
    AnimationType.ScaleUp,
    AnimationType.ScaleDown,
    AnimationType.Rotate,
  ],
  'Scale Animations': [
    AnimationType.ScaleUpBL,
    AnimationType.ScaleUpBR,
    AnimationType.ScaleUpBottom,
    AnimationType.ScaleUpCenter,
    AnimationType.ScaleUpHorCenter,
    AnimationType.ScaleUpHorLeft,
    AnimationType.ScaleUpHorRight,
    AnimationType.ScaleUpLeft,
    AnimationType.ScaleUpRight,
    AnimationType.ScaleUpTL,
    AnimationType.ScaleUpTR,
    AnimationType.ScaleUpTop,
    AnimationType.ScaleUpVerBottom,
    AnimationType.ScaleUpVerCenter,
    AnimationType.ScaleUpVerTop,
    AnimationType.ScaleDownBL,
    AnimationType.ScaleDownBR,
    AnimationType.ScaleDownBottom,
    AnimationType.ScaleDownCenter,
    AnimationType.ScaleDownHorCenter,
    AnimationType.ScaleDownHorLeft,
    AnimationType.ScaleDownHorRight,
    AnimationType.ScaleDownLeft,
    AnimationType.ScaleDownRight,
    AnimationType.ScaleDownTL,
    AnimationType.ScaleDownTR,
    AnimationType.ScaleDownTop,
    AnimationType.ScaleDownVerBottom,
    AnimationType.ScaleDownVerCenter,
    AnimationType.ScaleDownVerTop,
  ],
  'Rotate Animations': [
    AnimationType.RotateBL,
    AnimationType.RotateBottom,
    AnimationType.RotateBR,
    AnimationType.RotateCenter,
    AnimationType.RotateDiagonal1,
  ],
  'Simple Animations': [
    AnimationType.SimpleFadeIn,
    AnimationType.SimpleFadeOut,
    AnimationType.InstantShow,
    AnimationType.InstantHide,
  ],
  'Special Effects': [
    AnimationType.Custom
  ]
};

interface AnimationTypeMenuProps {
  onSelect: (type: AnimationType, mode?: AnimationMode) => void;
  mode?: AnimationMode;
  className?: string;
}

const AnimationTypeMenu: React.FC<AnimationTypeMenuProps> = ({ 
  onSelect, 
  mode = AnimationMode.Entrance, 
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Filter animation types based on search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) {
      return animationCategories;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered: Record<string, AnimationType[]> = {};

    Object.entries(animationCategories).forEach(([category, types]) => {
      const matchingTypes = types.filter(type => 
        type.toLowerCase().includes(searchLower)
      );

      if (matchingTypes.length > 0) {
        filtered[category] = matchingTypes;
      }
    });

    return filtered;
  }, [searchTerm]);

  // Determine if any search results exist
  const hasResults = useMemo(() => {
    return Object.values(filteredCategories).some(types => types.length > 0);
  }, [filteredCategories]);

  return (
    <div className={`bg-neutral-800 border border-neutral-700 rounded-md shadow-lg overflow-hidden ${className}`}>
      {/* Search input */}
      <div className="p-2 border-b border-neutral-700">
        <div className="relative">
          <Search className="absolute left-2 top-2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search animations..."
            className="w-full bg-neutral-700 text-white rounded py-1.5 pl-8 pr-2 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Animation list with categories */}
      <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
        {!hasResults && (
          <div className="p-3 text-center text-neutral-400 text-sm">
            No animations found
          </div>
        )}
        
        {Object.entries(filteredCategories).map(([category, types]) => 
          types.length > 0 && (
            <div key={category}>
              <div className="px-3 py-1.5 text-xs font-semibold text-neutral-400 bg-neutral-900">
                {category}
              </div>
              {types.map((type) => (
                <ContextMenu.Item 
                  key={type}
                  className="text-sm text-white px-3 py-2 hover:bg-blue-600 cursor-pointer focus:outline-none focus:bg-blue-600"
                  onClick={() => onSelect(type, mode)}
                >
                  {type}
                </ContextMenu.Item>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default AnimationTypeMenu;