'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Circle, Square, RectangleHorizontal, Minus, Armchair, Sofa,
  TreePine, Wine, DoorOpen, PanelTop, Flower2, Tag, ChefHat, Trash2,
  LayoutGrid, ChevronDown, ChevronUp
} from 'lucide-react';
import { OBJECT_PRESETS } from '@/lib/floor-plan-types';

interface ObjectLibraryProps {
  onAddObject: (preset: string) => void;
}

const CATEGORIES = [
  {
    name: 'Tables',
    icon: LayoutGrid,
    items: [
      { key: 'round_4', label: 'Round 4', icon: Circle, desc: '4 seats' },
      { key: 'round_6', label: 'Round 6', icon: Circle, desc: '6 seats' },
      { key: 'round_8', label: 'Round 8', icon: Circle, desc: '8 seats' },
      { key: 'square_4', label: 'Square 4', icon: Square, desc: '4 seats' },
      { key: 'rectangle_4', label: 'Rectangle 4', icon: RectangleHorizontal, desc: '4 seats' },
      { key: 'rectangle_6', label: 'Rectangle 6', icon: RectangleHorizontal, desc: '6 seats' },
      { key: 'rectangle_8', label: 'Rectangle 8', icon: RectangleHorizontal, desc: '8 seats' },
      { key: 'long_8', label: 'Long Table', icon: Minus, desc: '8 seats' },
      { key: 'long_12', label: 'Banquet', icon: Minus, desc: '12 seats' },
    ],
  },
  {
    name: 'Seating',
    icon: Armchair,
    items: [
      { key: 'booth_4', label: 'Booth 4', icon: Sofa, desc: 'Bench seating' },
      { key: 'booth_6', label: 'Booth 6', icon: Sofa, desc: 'Large booth' },
      { key: 'bar_stool', label: 'Bar Stool', icon: Armchair, desc: 'Single seat' },
    ],
  },
  {
    name: 'Structure',
    icon: DoorOpen,
    items: [
      { key: 'wall', label: 'Wall', icon: Minus, desc: 'Divider' },
      { key: 'door', label: 'Door', icon: DoorOpen, desc: 'Entrance' },
      { key: 'window', label: 'Window', icon: PanelTop, desc: 'Window' },
    ],
  },
  {
    name: 'Areas',
    icon: Wine,
    items: [
      { key: 'bar', label: 'Bar Area', icon: Wine, desc: 'Bar zone' },
      { key: 'kitchen', label: 'Kitchen', icon: ChefHat, desc: 'Kitchen area' },
    ],
  },
  {
    name: 'Decor',
    icon: Flower2,
    items: [
      { key: 'plant', label: 'Plant', icon: TreePine, desc: 'Decoration' },
      { key: 'label', label: 'Label', icon: Tag, desc: 'Text label' },
    ],
  },
];

export default function ObjectLibrary({ onAddObject }: ObjectLibraryProps) {
  const [expandedCat, setExpandedCat] = useState<string | null>('Tables');

  return (
    <div className="space-y-1">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Object Library</h3>
      {CATEGORIES.map((cat) => {
        const isExpanded = expandedCat === cat.name;
        return (
          <div key={cat.name}>
            <button
              onClick={() => setExpandedCat(isExpanded ? null : cat.name)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-2">
                <cat.icon className="w-3.5 h-3.5 text-orange-500" />
                {cat.name}
              </div>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-1 px-2 pb-2">
                    {cat.items.map((item) => (
                      <motion.button
                        key={item.key}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onAddObject(item.key)}
                        className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:border-orange-200 dark:hover:border-orange-500/20 transition-all group"
                      >
                        <item.icon className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
                        <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200">{item.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
