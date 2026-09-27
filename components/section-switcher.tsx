'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Plus, LayoutGrid, TreePine, Waves, Wine, Star, Coffee } from 'lucide-react';
import type { FloorPlanSectionData } from '@/lib/floor-plan-types';

interface SectionSwitcherProps {
  sections: FloorPlanSectionData[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

const SECTION_ICONS: Record<string, any> = {
  dining: LayoutGrid, outdoor: TreePine, vip: Star, bar: Wine, terrace: Waves, default: Coffee,
};

function getSectionIcon(icon: string | null) {
  if (!icon) return LayoutGrid;
  const lower = icon.toLowerCase();
  for (const [key, Icon] of Object.entries(SECTION_ICONS)) {
    if (lower.includes(key)) return Icon;
  }
  return LayoutGrid;
}

export default function SectionSwitcher({ sections, activeId, onSelect, onAdd }: SectionSwitcherProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
      {sections.map((section) => {
        const Icon = getSectionIcon(section.icon);
        const isActive = section.id === activeId;
        return (
          <motion.button
            key={section.id}
            onClick={() => onSelect(section.id)}
            whileTap={{ scale: 0.97 }}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              isActive
                ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-md'
                : 'bg-white/60 dark:bg-white/5 text-slate-500 hover:bg-white dark:hover:bg-white/10 border border-black/5 dark:border-white/5'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{section.name}</span>
            {isActive && (
              <motion.div
                layoutId="activeSectionIndicator"
                className="absolute inset-0 bg-slate-900 dark:bg-white rounded-xl -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
          </motion.button>
        );
      })}
      <button
        onClick={onAdd}
        className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-all whitespace-nowrap"
      >
        <Plus className="w-3.5 h-3.5" /> Add Section
      </button>
    </div>
  );
}
